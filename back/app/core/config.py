import os
from dotenv import load_dotenv

load_dotenv(override=True)

JWT_SECRET = os.getenv("JWT_SECRET", "changeme")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
DATABASE_URL = os.getenv("DATABASE_URL", "")
