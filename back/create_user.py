"""
初期ユーザー作成スクリプト
使い方: python create_user.py <username> <password> [--admin]
"""
import sys
import bcrypt
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def create_user(username: str, password: str, is_admin: bool = False):
    db = SessionLocal()
    try:
        db.execute(text("SET search_path TO llmn"))
        password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        role = "admin" if is_admin else "user"
        db.execute(
            text("INSERT INTO users (username, password_hash, role) VALUES (:u, :p, :r)"),
            {"u": username, "p": password_hash, "r": role}
        )
        db.commit()
        print(f"✅ ユーザー作成成功: {username} (role={role})")
    except Exception as e:
        print(f"❌ エラー: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("使い方: python create_user.py <username> <password> [--admin]")
        sys.exit(1)
    username = sys.argv[1]
    password = sys.argv[2]
    is_admin = "--admin" in sys.argv
    create_user(username, password, is_admin)
