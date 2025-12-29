from langchain_core.memory import ConversationBufferWindowMemory

memory = ConversationBufferWindowMemory(
    k=4,
    return_messages=True
)