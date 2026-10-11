import requests
import os
import json
from dotenv import load_dotenv

load_dotenv('backend/.env')
url = f"{os.environ['SUPABASE_URL']}/rest/v1/?apikey={os.environ['SUPABASE_SECRET_KEY']}"
res = requests.get(url)
paths = res.json().get('paths', {})
rpc_paths = {k: v for k, v in paths.items() if '/rpc/' in k}
print(json.dumps(list(rpc_paths.keys()), indent=2))
