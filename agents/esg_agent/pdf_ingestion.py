import os
from supabase.client import create_client
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
# 🚀 Change: Import Google instead of OpenAI
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

# 1. Initialize Supabase Client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY") 
supabase = create_client(supabase_url, supabase_key)

# 2. Setup Google Embeddings (AI Studio)
# 🚀 Change: Use GoogleGenerativeAIEmbeddings
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    google_api_key=os.getenv("GOOGLE_API_KEY"), # Ensure this is in your .env
    task_type='retrieval_document',
    output_dimensionality=768
)

# 3. Load and Split your Policy PDF
# Ensure "UTM_ESG_HVAC_Guidelines.pdf" is in the same directory
loader = PyPDFLoader("UTM_ESG_HVAC_Guidelines.pdf")
docs = loader.load()

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
chunks = text_splitter.split_documents(docs)

# 4. Blast the vectors up to Supabase!
print(f"📤 Starting ingestion of {len(chunks)} chunks...")

vectorstore = SupabaseVectorStore.from_documents(
    chunks,
    embeddings,
    client=supabase,
    table_name="documents",
    query_name="match_documents"
)

print("✅ Successfully ingested into Supabase pgvector using Google AI Studio!")