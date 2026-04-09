import bcrypt
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.base import User, RefreshToken
from app.schemas.auth import LoginRequest, LoginResponse, RefreshRequest, RefreshResponse
from app.core.auth import create_access_token

REFRESH_TOKEN_EXPIRE_DAYS = 30

router = APIRouter(prefix="/auth", tags=["auth"])


def _create_refresh_token(db: Session, users_id: int) -> str:
    token = secrets.token_hex(32)
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    db_token = RefreshToken(users_id=users_id, token=token, expires_at=expires_at)
    db.add(db_token)
    db.commit()
    return token


@router.post("/login", response_model=LoginResponse)
def login(login_in: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == login_in.username).first()
    if not user or not bcrypt.checkpw(login_in.password.encode(), user.password_hash.encode()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ユーザー名またはパスワードが正しくありません",
        )
    access_token = create_access_token(
        user_id=user.id,
        username=user.username,
        is_admin=user.is_admin,
    )
    refresh_token = _create_refresh_token(db, user.id)
    return LoginResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=RefreshResponse)
def refresh(req: RefreshRequest, db: Session = Depends(get_db)):
    db_token = db.query(RefreshToken).filter(RefreshToken.token == req.refresh_token).first()
    if not db_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    if db_token.expires_at < datetime.utcnow():
        db.delete(db_token)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")
    user = db.query(User).filter(User.id == db_token.users_id).first()
    if not user:
        db.delete(db_token)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    db.delete(db_token)
    db.commit()
    access_token = create_access_token(
        user_id=user.id,
        username=user.username,
        is_admin=user.is_admin,
    )
    new_refresh_token = _create_refresh_token(db, user.id)
    return RefreshResponse(access_token=access_token, refresh_token=new_refresh_token)


@router.post("/logout")
def logout(req: RefreshRequest, db: Session = Depends(get_db)):
    db_token = db.query(RefreshToken).filter(RefreshToken.token == req.refresh_token).first()
    if db_token:
        db.delete(db_token)
        db.commit()
    return {"message": "Logged out successfully"}
