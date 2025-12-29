import sqlalchemy
from sqlalchemy import create_engine, text, inspect
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="apiKey.env")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/pixelplates")
engine = create_engine(DATABASE_URL)

def migrate():
    inspector = inspect(engine)
    columns = [c['name'] for c in inspector.get_columns('scripts')]
    
    if 'user_id' in columns:
        print("Column 'user_id' already exists.")
    else:
        print("Column 'user_id' not found. Adding it...")
        with engine.connect() as conn:
            with conn.begin(): # Start implicit transaction
                conn.execute(text("ALTER TABLE scripts ADD COLUMN user_id VARCHAR"))
        print("Successfully added 'user_id' column.")

if __name__ == "__main__":
    migrate()
