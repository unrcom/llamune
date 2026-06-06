import uuid
from fastapi import APIRouter, Depends, HTTPException
from typing import Annotated, Optional
from sqlalchemy.orm import Session as _Session
from pydantic import BaseModel
from app.db.database import get_db
from app.core.auth import get_current_user
from app.models.base import Project, User

DB = Annotated[_Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    display_name: str


class ProjectUpdate(BaseModel):
    rag_threshold: Optional[float] = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    display_name: str
    rag_threshold: float

    class Config:
        from_attributes = True


@router.get("", response_model=list[ProjectResponse], responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}, 500: {"description": "Internal Server Error"}})
def get_projects(
    db: DB,
    _: CurrentUser,
):
    return db.query(Project).order_by(Project.id).all()


@router.post("", response_model=ProjectResponse, status_code=201, responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}, 500: {"description": "Internal Server Error"}})
def create_project(
    project_in: ProjectCreate,
    db: DB,
    _: CurrentUser,
):
    auto_name = f"proj-{uuid.uuid4().hex[:12]}"
    project = Project(name=auto_name, display_name=project_in.display_name)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.patch("/{project_id}", response_model=ProjectResponse, responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}, 500: {"description": "Internal Server Error"}})
def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: DB,
    _: CurrentUser,
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    if project_in.rag_threshold is not None:
        project.rag_threshold = project_in.rag_threshold
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204, responses={400: {"description": "Bad Request"}, 404: {"description": "Not Found"}, 500: {"description": "Internal Server Error"}})
def delete_project(
    project_id: int,
    db: DB,
    _: CurrentUser,
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    db.delete(project)
    db.commit()
