import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'), override=True)

class Config:
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY")
    FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "*")
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB limit
    
    @staticmethod
    def validate():
        missing = []
        if not Config.SUPABASE_URL:
            missing.append("SUPABASE_URL")
        if not Config.SUPABASE_SECRET_KEY:
            missing.append("SUPABASE_SECRET_KEY")
            
        if missing:
            print(f"WARNING: Missing environment variables: {', '.join(missing)}")
            print("The application will start, but database connections will fail.")
