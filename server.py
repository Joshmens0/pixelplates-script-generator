from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
from generator import ScriptGenerator
import os
import pypdf
import io
from sqlalchemy.orm import Session
from database import engine, get_db, Base
from models import Script, User
import json
import auth
from fastapi.security import OAuth2PasswordRequestForm
from auth import get_current_user

app = FastAPI()

# Create Tables (if engine is working)
if engine:
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"DB Error: {e}")

# Initialize Generator
prompt_location = Path.cwd() / "prompt.txt"
try:
    generator = ScriptGenerator(
        base_url="https://api.deepseek.com",
        model="deepseek-chat",
        system_prompt_path=prompt_location
    )
except Exception as e:
    print(f"Failed to initialize generator: {e}")
    generator = None

# Mount static files
static_dir = Path.cwd() / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/api/prompts")
async def get_prompts():
    return {"prompts": ScriptGenerator.get_available_prompts()}

@app.post("/api/register")
async def register(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(form_data.password)
    new_user = User(username=form_data.username, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    return {"msg": "User created successfully"}

@app.post("/api/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/")
async def read_index():
    return FileResponse('static/index.html')

@app.get("/api/history")
@app.get("/api/history")
async def get_history(
    limit: int = 50, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    scripts = db.query(Script).filter(Script.user_id == str(current_user.id)).order_by(Script.created_at.desc()).limit(limit).all()
    return scripts

@app.post("/api/generate")
async def generate_script(
    prompt: str = Form(...),
    prompt_file: str = Form(None),
    file: UploadFile = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not generator:
        raise HTTPException(status_code=500, detail="Generator not initialized")
    
    try:
        # Handle File Upload (RAG)
        reference_content = None
        input_type = "text"
        filename_str = None
        
        if file:
            input_type = "file"
            filename_str = file.filename
            try:
                contents = await file.read()
                filename = file.filename.lower()
                
                if filename.endswith('.pdf'):
                    # Parse PDF
                    pdf_file = io.BytesIO(contents)
                    reader = pypdf.PdfReader(pdf_file)
                    text = ""
                    for page in reader.pages:
                        text += page.extract_text() + "\n"
                    reference_content = text
                else:
                    # Assume text/md
                    reference_content = contents.decode('utf-8')
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")

        # Handle System Prompt File
        system_prompt_path = None
        if prompt_file:
             current_dir = Path.cwd()
             # Basic security check
             if ".." in prompt_file or "/" in prompt_file or "\\" in prompt_file:
                 raise HTTPException(status_code=400, detail="Invalid prompt filename")
             
             system_prompt_path = current_dir / prompt_file
             if not system_prompt_path.exists():
                 raise HTTPException(status_code=404, detail="Prompt file not found")

        result = generator.generate_json_script(prompt, system_prompt_path, reference_content)
        
        # Save to DB
        try:
            print("Attempting to save to DB...")
            # Try to extract title
            title = prompt[:30] # Default
            segments = result.get('segments') or result.get('script') or result
            
            # Save
            db_script = Script(
                title=title,
                prompt=prompt,
                content=result,
                generation_type=input_type,
                input_filename=filename_str,
                user_id=str(current_user.id)
            )
            db.add(db_script)
            db.commit()
            db.refresh(db_script)
            print(f"Saved script to DB with ID: {db_script.id}")
        except Exception as e:
            print(f"CRITICAL DB ERROR: Failed to save to DB: {e}")
            import traceback
            traceback.print_exc()
            # Don't fail the request if DB fails, just log it
            pass

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=5436)
