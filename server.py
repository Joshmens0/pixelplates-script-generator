from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path
from generator import ScriptGenerator
import os

app = FastAPI()

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

class GenerateRequest(BaseModel):
    prompt: str

@app.get("/")
async def read_index():
    return FileResponse('static/index.html')

@app.post("/api/generate")
async def generate_script(request: GenerateRequest):
    if not generator:
        raise HTTPException(status_code=500, detail="Generator not initialized")
    
    try:
        result = generator.generate_json_script(request.prompt)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
