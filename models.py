from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from database import Base
from datetime import datetime

class Script(Base):
    __tablename__ = "scripts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    prompt = Column(Text)
    # Store the prompt file path or name if used
    prompt_file = Column(String, nullable=True)
    # Store the input file name if used
    input_filename = Column(String, nullable=True)
    
    # The actual generated script
    content = Column(JSON)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # To identify if it was text-only or RAG
    generation_type = Column(String, default="standard") # standard, rag

    # User Identification
    user_id = Column(String, index=True, nullable=True)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

