import os
import sys
from dotenv import load_dotenv

print(f"Python Executable: {sys.executable}")
print("Loading environment variables...")

# Force reload
load_dotenv("apiKey.env", override=True)

api_key = os.getenv("DEEPSEEK_API_KEY")
db_url = os.getenv("DATABASE_URL")

print(f"API Key found: {'Yes' if api_key else 'No'}")
if api_key:
    print(f"API Key length: {len(api_key)}")
    print(f"API Key starts with: {api_key[:5]}...")

print(f"DB URL found: {'Yes' if db_url else 'No'}")
if db_url:
    print(f"DB URL: {db_url}")

print("\nTesting Imports...")
try:
    import sqlalchemy
    import psycopg2
    print("SQLAlchemy and psycopg2 imports successful.")
except ImportError as e:
    print(f"IMPORT ERROR: {e}")
    sys.exit(1)

print("\nTesting DB Connection...")
from sqlalchemy import create_engine, text

if not db_url:
    print("CRITICAL: No DATABASE_URL found. Cannot test connection.")
    sys.exit(1)

try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print(f"Connection Successful! Result: {result.fetchone()}")
except Exception as e:
    print(f"CONNECTION FAILED: {e}")
