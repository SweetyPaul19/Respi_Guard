import os

# from langchain_community.document_loaders import PyPDFDirectoryLoader  <--- Dhapaaaaaa ha ha
from langchain_community.document_loaders import JSONLoader
from langchain_pinecone import PineconeVectorStore
from langchain_google_genai import GoogleGenerativeAIEmbeddings

# 1. Setup Embeddings
embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")



def metadata_func(record: dict, metadata: dict) -> dict:
    # 1. Identify the document type based on the JSON structure or filename
    if "pollutant_standards" in record or "general_health_risks" in record:
        metadata["doc_type"] = "Environmental_Standard"
        metadata["source"] = "WHO Air Quality Guidelines"
    elif "section_1_introduction" in record and "ATSDR" in str(record):
        metadata["doc_type"] = "Public_Health_Guidance"
        metadata["source"] = "ATSDR PM Guidance"
    elif "disease_definition" in record or "treatment_tracks" in record:
        metadata["doc_type"] = "Clinical_Asthma_Guide"
        metadata["source"] = "GINA 2023 Asthma Pocket Guide"
    elif "part_i_definitions" in record or "pheic" in str(record):
        metadata["doc_type"] = "International_Regulation"
        metadata["source"] = "WHO IHR 2005"
    
    return metadata




def ingest_docs():
    print("🚀 Starting Structured JSON Ingestion...")
    index_name = "respi-guard"
    docs_folder = "medical_docs"
    
    all_docs = []

    for filename in os.listdir(docs_folder):
        if filename.endswith(".json"):
            file_path = os.path.join(docs_folder, filename)
            
            # We use 3 different loaders for the 3 different parts of your JSON
            # This ensures each part is searchable independently
            
            # Loader A: Pollutant Standards (The core data)
            loader_pollutants = JSONLoader(
                file_path=file_path,
                jq_schema=".pollutant_standards[]",
                text_content=False,
                metadata_func=metadata_func
            )
            
            # Loader B: Health Risks
            loader_risks = JSONLoader(
                file_path=file_path,
                jq_schema=".general_health_risks",
                text_content=False,
                metadata_func=metadata_func
            )

            # Loader C: Good Practice Statements
            loader_practice = JSONLoader(
                file_path=file_path,
                jq_schema=".good_practice_statements[]",
                text_content=False,
                metadata_func=metadata_func
            )

            all_docs.extend(loader_pollutants.load())
            all_docs.extend(loader_risks.load())
            all_docs.extend(loader_practice.load())

    print(f"📄 Created {len(all_docs)} high-quality medical context objects.")

    # Upload to Pinecone
    print("⏳ Syncing with Pinecone...")
    PineconeVectorStore.from_documents(
        documents=all_docs,
        embedding=embeddings,
        index_name=index_name
    )
    print("✅ Success! Your RAG now understands WHO Pollutant Tables.")

if __name__ == "__main__":
    ingest_docs()