"""Claim document upload / download / delete routes."""
from fastapi import APIRouter, Depends, Form, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.document import DocumentOut
from app.services import claim_service, file_service

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
def upload_document(
    file: UploadFile,
    claim_id: int = Form(...),
    kind: str = Form("image"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    claim = claim_service.get_claim(db, user, claim_id)  # access-checked (403/404)
    return file_service.save_upload(db, user, claim, file, kind)


@router.get("/{doc_id}")
def download_document(doc_id: int, user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    doc = file_service.get_document(db, user, doc_id)
    return FileResponse(
        path=file_service.document_path(doc),
        media_type=doc.mime_type,
        filename=doc.original_name,
    )


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(doc_id: int, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    file_service.delete_document(db, user, doc_id)
