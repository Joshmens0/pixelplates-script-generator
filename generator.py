import json
import os
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from rich.console import Console
from rich.status import Status
from rich.panel import Panel
from rich.syntax import Syntax

class ScriptGenerator:
    def __init__(self, base_url: str, model: str, system_prompt_path: Path):
        self.base_url = base_url
        self.model = model
        self.console = Console()
        
        # Load API key
        load_dotenv(dotenv_path="apiKey.env")
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        if not self.api_key:
            raise ValueError("DEEPSEEK_API_KEY not found in apiKey.env")

        # Initialize OpenAI client
        self.client = OpenAI(api_key=self.api_key, base_url=self.base_url)

        # Load system prompt
        self.system_prompt_path = system_prompt_path
        if not self.system_prompt_path.exists():
             raise FileNotFoundError(f"System prompt file not found: {self.system_prompt_path}")
        
        with open(self.system_prompt_path, mode='r', encoding='utf-8') as f:
            self.system_prompt = f.read()

        # Setup output directory
        self.script_dir = Path.cwd() / "scripts"
        if not self.script_dir.exists():
            self.script_dir.mkdir(parents=True, exist_ok=True)
            self.console.print(f"[green]Directory created successfully at {self.script_dir}[/green]")
        else:
            self.console.print(f"[blue]Directory found at {self.script_dir}[/blue]")

    def generate_json_script(self, user_prompt: str) -> dict:
        self.console.print(f"\n[bold yellow]Generating JSON script for:[/bold yellow] {user_prompt}")
        
        try:
            with self.console.status("[bold green]Thinking...[/bold green]", spinner="dots"):
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": self.system_prompt},
                        {"role": "user", "content": f"""You are an elite Chef 
                            and AI trainer helping to create social media content,
                            practical chef food videos for a YouTube channel called PixelPlates.
                            Generate a detailed educational JSON script based on the {user_prompt} 
                            I provide. 
                            The script will later be used to produce an AI-generated
                            YouTube Short video using Veo 3.1."""}
                    ],
                    temperature=1.5,
                    response_format={'type': 'json_object'}
                )
                
                content = response.choices[0].message.content
            
            self.console.print("[bold green]Response received![/bold green]")
            
            # Parse and save JSON
            try:
                json_res = json.loads(content)
                
                # Simple sanitization for filename
                safe_title = "".join([c for c in user_prompt if c.isalnum() or c in (' ', '-', '_')]).strip()[:30]
                if not safe_title:
                    safe_title = "generated_script"
                
                output_file = self.script_dir / f"{safe_title}.json"
                
                with open(output_file, 'w', encoding='utf-8') as file:
                    json.dump(json_res, file, indent=4)
                
                self.console.print(f"[bold green]Script saved to:[/bold green] {output_file}")
                
                # Print formatted JSON
                json_str = json.dumps(json_res, indent=4)
                syntax = Syntax(json_str, "json", theme="monokai", line_numbers=True)
                self.console.print(Panel(syntax, title="Generated Script", border_style="green"))
                
                return json_res

            except json.JSONDecodeError:
                self.console.print("[bold red]Error: Failed to parse JSON response.[/bold red]")
                self.console.print(f"Raw response: {content}")
                raise
            except Exception as e:
                self.console.print(f"[bold red]Error saving file: {e}[/bold red]")
                raise

        except Exception as e:
            self.console.print(f"[bold red]API Request failed: {e}[/bold red]")
            raise

    def generate_text_script(self, user_prompt: str) -> str:
        self.console.print(f"\n[bold yellow]Generating text script for:[/bold yellow] {user_prompt}")
        try:
            with self.console.status("[bold green]Thinking...[/bold green]", spinner="dots"):
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": self.system_prompt},
                        {"role": "user", "content": f"""You are an elite Chef 
                            and AI trainer helping to create social media content,
                            practical chef food videos for a YouTube channel called PixelPlates.
                            Generate a detailed script based on {user_prompt}. 
                            The script will later be used to produce an AI-generated
                            YouTube Short video using Veo 3.1."""}
                    ],
                    temperature=1.5,
                    response_format={'type': 'text'}
                )
                
                content = response.choices[0].message.content
            
            self.console.print(Panel(content, title="Generated Script", border_style="blue"))
            return content
            
        except Exception as e:
            self.console.print(f"[bold red]API Request failed: {e}[/bold red]")
            raise
