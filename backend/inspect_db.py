import os
import json
import urllib.request
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SECRET_KEY")

req = urllib.request.Request(f"{url}/rest/v1/raw_students_csv?limit=2", headers={
    "apikey": key,
    "Authorization": f"Bearer {key}"
})
with urllib.request.urlopen(req) as response:
    students = json.loads(response.read().decode())
print("students:", json.dumps(students, indent=2))

req = urllib.request.Request(f"{url}/rest/v1/raw_indicators_csv?limit=5", headers={
    "apikey": key,
    "Authorization": f"Bearer {key}"
})
with urllib.request.urlopen(req) as response:
    indicators = json.loads(response.read().decode())
print("indicators:", json.dumps(indicators, indent=2))
