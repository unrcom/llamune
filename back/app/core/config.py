import os
from dotenv import load_dotenv

load_dotenv(override=True)

INSTANCE_ID = os.getenv("INSTANCE_ID_ARG", "llamune-back-1")
INSTANCE_TYPE = os.getenv("INSTANCE_TYPE", "llamune")
MONKEY_URL = os.getenv("MONKEY_URL", "")
SELF_URL = os.getenv("SELF_URL", "")
DISPLAY_NAME = os.getenv("DISPLAY_NAME", INSTANCE_ID)
INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "")
HEARTBEAT_INTERVAL = int(os.getenv("HEARTBEAT_INTERVAL", "30"))
JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))
DATABASE_URL = os.getenv("DATABASE_URL", "")
