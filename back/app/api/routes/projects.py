import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.core.auth import get_current_user
from app.models.base import Project

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    display_name: str


class ProjectResponse(BaseModel):
    id: int
    name: str
    display_name: str

    class Config:
        from_attributes = True


@router.get("", response_model=list[ProjectResponse])
def get_projects(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return db.query(Project).order_by(Project.id).all()


@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    auto_name = f"proj-{uuid.uuid4().hex[:12]}"
    project = Project(name=auto_name, display_name=project_in.display_name)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    db.delete(project)
    db.commit()
