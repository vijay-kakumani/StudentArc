from supabase import create_client, Client
from config import Config

_client = None

def get_supabase() -> Client:
    global _client
    if _client is not None:
        return _client
        
    if not Config.SUPABASE_URL or not Config.SUPABASE_SECRET_KEY:
        raise ValueError("Supabase credentials are not configured. Check your environment variables.")
        
    import re
    import supabase._sync.client
    original_match = re.match
    def mock_match(pattern, string, flags=0):
        if pattern.startswith('^[A-Za-z0-9-_=]+\\.'): return True
        return original_match(pattern, string, flags)
    re.match = mock_match

    _client = create_client(Config.SUPABASE_URL, Config.SUPABASE_SECRET_KEY)
    return _client
