import requests
import uuid

BASE_URL = "http://localhost:5433"

def verify_user_history():
    user_a = f"user_{uuid.uuid4()}"
    user_b = f"user_{uuid.uuid4()}"
    
    print(f"User A: {user_a}")
    print(f"User B: {user_b}")

    # Generate Script for User A
    print("Generating script for User A...")
    steps_a = requests.post(f"{BASE_URL}/api/generate", data={
        "prompt": "Script for User A", 
        "user_id": user_a
    })
    
    if steps_a.status_code != 200:
        print(f"Failed to generate for A: {steps_a.text}")
        return

    # Generate Script for User B
    print("Generating script for User B...")
    steps_b = requests.post(f"{BASE_URL}/api/generate", data={
        "prompt": "Script for User B", 
        "user_id": user_b
    })

    if steps_b.status_code != 200:
        print(f"Failed to generate for B: {steps_b.text}")
        return

    # Fetch History for User A
    print("Fetching history for User A...")
    hist_a = requests.get(f"{BASE_URL}/api/history", params={"user_id": user_a}).json()
    
    # Assert A sees A's script
    titles_a = [s['title'] for s in hist_a]
    print(f"User A History: {titles_a}")
    if any("User A" in t for t in titles_a) and not any("User B" in t for t in titles_a):
        print("PASS: User A sees their own history.")
    else:
        print("FAIL: User A history incorrect.")

    # Fetch History for User B
    print("Fetching history for User B...")
    hist_b = requests.get(f"{BASE_URL}/api/history", params={"user_id": user_b}).json()
    
    # Assert B sees B's script
    titles_b = [s['title'] for s in hist_b]
    print(f"User B History: {titles_b}")
    if any("User B" in t for t in titles_b) and not any("User A" in t for t in titles_b):
        print("PASS: User B sees their own history.")
    else:
        print("FAIL: User B history incorrect.")

if __name__ == "__main__":
    try:
        verify_user_history()
    except Exception as e:
        print(f"Verification Failed: {e}")
