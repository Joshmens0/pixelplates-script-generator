import requests
import uuid

BASE_URL = "http://localhost:5436"

def verify_auth_flow():
    username = f"user_{uuid.uuid4()}"
    password = "secret_password"
    
    print(f"Testing with User: {username}")

    # 1. Register
    print("1. Registering...")
    reg = requests.post(f"{BASE_URL}/api/register", data={"username": username, "password": password})
    if reg.status_code != 200:
        print(f"Registration Failed: {reg.text}")
        return

    # 2. Login
    print("2. Logging in...")
    login = requests.post(f"{BASE_URL}/api/login", data={"username": username, "password": password})
    if login.status_code != 200:
        print(f"Login Failed: {login.text}")
        return
    
    token = login.json().get("access_token")
    if not token:
        print("No token received!")
        return
    print("Token received.")
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Generate Securely
    print("3. Generating Script...")
    gen = requests.post(f"{BASE_URL}/api/generate", headers=headers, data={"prompt": "Auth Test Script"})
    if gen.status_code != 200:
        print(f"Generation Failed: {gen.text}")
        return
    
    # 4. Fetch History Securely
    print("4. Fetching History...")
    hist = requests.get(f"{BASE_URL}/api/history", headers=headers).json()
    titles = [s['title'] for s in hist]
    print(f"History: {titles}")

    if any("Auth Test Script" in t for t in titles):
        print("PASS: History verified.")
    else:
        print("FAIL: Script not found in history.")

    # 5. Unauthorized Access Test
    print("5. Testing Unauthorized Access...")
    unauth = requests.get(f"{BASE_URL}/api/history") # No header
    if unauth.status_code == 401:
        print("PASS: Unauthorized access blocked.")
    else:
        print(f"FAIL: Expected 401, got {unauth.status_code}")

if __name__ == "__main__":
    try:
        verify_auth_flow()
    except Exception as e:
        print(f"Verification Error: {e}")
