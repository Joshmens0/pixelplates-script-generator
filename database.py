from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="apiKey.env")

# Use environment variable or default to local Postgres
# Make sure to create this database in your Postgres instance!
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/pixelplates")

# Create engine
try:
    engine = create_engine(DATABASE_URL)
except Exception as e:
    print(f"Warning: Could not create database engine. URL: {DATABASE_URL}")
    print(f"Error: {e}")
    # Fallback to None context if DB fails (to prevent app crash on import)
    engine = None

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency dependency
def get_db():
    if engine is None:
        raise Exception("Database not configured")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
