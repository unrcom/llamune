import os
from dotenv import load_dotenv

load_dotenv(override=True)

JWT_SECRET = os.getenv("JWT_SECRET", "changeme")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
DATABASE_URL = os.getenv("DATABASE_URL", "")
CHROMA_DB_DIR = os.getenv("CHROMA_DB_DIR", os.path.expanduser("~/dev/llamune/chroma_db"))
ADAPTER_DIR = os.getenv("ADAPTER_DIR", os.path.expanduser("~/dev/llamune/adapters"))
