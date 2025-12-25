import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from langchain_google_genai import (
    GoogleGenerativeAIEmbeddings,
    ChatGoogleGenerativeAI,
)
from langchain_pinecone import PineconeVectorStore

from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

load_dotenv(override=True)


app = Flask(__name__)
CORS(app)

# ================== ENV ==================
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
PINECONE_INDEX_NAME = "respi-guard"

print("GOOGLE_API_KEY:", GOOGLE_API_KEY if GOOGLE_API_KEY else "NOT FOUND")

# ================== VECTOR STORE ==================
embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

vectorstore = PineconeVectorStore(
    index_name=PINECONE_INDEX_NAME,
    embedding=embeddings,
)

retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

# ================== LLM ==================
llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-pro",
    temperature=0.3,
)



# ================== AQI HELPER FUNCTION ==================
def get_live_aqi(lat, lon):
    # Ensure coordinates are floats
    lat_f = float(lat)
    lon_f = float(lon)
    
    url = f"http://api.openweathermap.org/data/2.5/air_pollution?lat={lat_f}&lon={lon_f}&appid={OPENWEATHER_API_KEY}"
    
    try:
        response = requests.get(url, timeout=10)
        data = response.json()

        # If the API returns an error (like 401 or 400), 'list' won't be there
        if "list" not in data:
            print(f"❌ OpenWeather Error: {data.get('message', 'Unknown Error')}")
            return None

        aqi_index = data["list"][0]["main"]["aqi"]
        pm2_5 = data["list"][0]["components"]["pm2_5"]

        return {"aqi_index": aqi_index, "pm2_5": pm2_5}

    except Exception as e:
        print(f"❌ [AQI HELPER CRASH]: {e}")
        return None
    
    



## 1st retrieve ->  format -> send to LLM! ### 

# ================== HELPER FUNCTION FOR CONTEXT ==================
def format_docs(docs):
    # This combines the JSON chunks and adds the source tag for the LLM
    formatted = []
    for doc in docs:
        source = doc.metadata.get("source", "Unknown Source")
        formatted.append(f"CONTENT: {doc.page_content}\nSOURCE: {source}\n---")
    return "\n".join(formatted)



# ================== PROMPT ==================
CUSTOM_PROMPT = PromptTemplate.from_template(
    """
You are Respi-Guard, a medical AI specialized in respiratory health.
Your goal is to provide specific, evidence-based advice grounded ONLY in the provided context.

CONTEXT FROM MEDICAL GUIDELINES:
{context}

USER HEALTH PROFILE:
{user_profile}

LIVE AIR QUALITY DATA:
{aqi_data}

USER QUESTION: 
{question}

INSTRUCTIONS:
1. If the context contains specific limits (like WHO targets) or treatments (like GINA steps), use them.
2. ALWAYS mention which source you are using (e.g., "Based on the GINA 2023 guidelines...").
3. If you don't know the answer based on the context, say: "I'm sorry, my current medical database doesn't have specific information on that."
4. Be empathetic but professional.

RESPONSE:
"""
)


# ================== RAG CHAIN updated to latest, ig, ig ==================
def build_rag_chain(user_profile, aqi_data):
    # This pipeline ensures the query goes through the retriever first,
    # then gets formatted, then sent to goog.
    return (
        {
            "context": retriever | format_docs,
            "question": RunnablePassthrough(),
            "user_profile": lambda _: user_profile,
            "aqi_data": lambda _: aqi_data,
        }
        | CUSTOM_PROMPT
        | llm
        | StrOutputParser()
    )





# =======================================================
# API 1: MORNING ADVISORY
# =======================================================
@app.route("/get-advisory", methods=["POST"])
def get_advisory():
    data = request.json

    lat = data.get("lat")
    lon = data.get("lon")
    user_profile = data.get("user_profile", "Healthy, no conditions")

    aqi_data = get_live_aqi(lat, lon)
    if not aqi_data:
        return jsonify({"error": "Failed to fetch AQI data"}), 500

    query = (
        f"Given PM2.5 = {aqi_data['pm2_5']} and AQI = {aqi_data['aqi_index']}, "
        f"what precautions should someone with {user_profile} take?"
    )

    rag_chain = build_rag_chain(
        user_profile=str(user_profile),
        aqi_data=str(aqi_data),
    )

    response = rag_chain.invoke(query)

    return jsonify(
        {
            "aqi": aqi_data,
            "advisory": response,
        }
    )



# =======================================================
# API 2: ASK DOCTOR (CHAT)
# =======================================================
@app.route("/ask-doctor", methods=["POST"])
def ask_doctor():
    data = request.json

    question = data.get("query")
    user_profile = data.get("user_profile", "General Public")
    aqi_context = data.get("aqi_context", "Unknown")

    rag_chain = build_rag_chain(
        user_profile=str(user_profile),
        aqi_data=str(aqi_context),
    )

    response = rag_chain.invoke(question)

    return jsonify({"response": response})




if __name__ == "__main__":
    app.run(debug=True, port=5000)
