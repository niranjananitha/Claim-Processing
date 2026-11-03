"""Secure local file storage for claim documents."""
import hashlib
import secrets

import filetype
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.claim import Claim
from app.models.document import ClaimDocument
from app.models.user import User

MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB

# extension -> (kind, allowed sniffed mime types)
ALLOWED: dict[str, tuple[str, set[str]]] = {
    "jpg": ("image", {"image/jpeg"}),
    "jpeg": ("image", {"image/jpeg"}),
    "png": ("image", {"image/png"}),
    "webp": ("image", {"image/webp"}),
    "pdf": ("document", {"application/pdf"}),
}


def _ext(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def _reject(detail: str):
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def _can_access(user: User, claim: Claim) -> bool:
    if user.role == "manager":
        return True
    if user.role == "client":
        return claim.client_id == user.id
    if user.role == "agent":
        return claim.assigned_agent_id == user.id
    return False


def save_upload(db: Session, user: User, claim: Claim, upload: UploadFile, kind: str) -> ClaimDocument:
    name = upload.filename or ""
    # Reject unsafe original names outright.
    if not name or "/" in name or "\\" in name or ".." in name:
        _reject("Invalid filename")

    ext = _ext(name)
    if ext not in ALLOWED:
        _reject(f"File type '.{ext}' is not permitted")
    category, allowed_mimes = ALLOWED[ext]

    content = upload.file.read()
    if len(content) == 0:
        _reject("Empty file")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds the 25 MB limit")

    sniffed = filetype.guess(content)
    sniffed_mime = sniffed.mime if sniffed else None
    if sniffed_mime not in allowed_mimes:
        _reject("File content does not match its extension")

    subdir = "claim_images" if category == "image" else "documents"
    stored_filename = f"{secrets.token_hex(16)}.{ext}"
    dest_dir = get_settings().upload_root / subdir
    dest_dir.mkdir(parents=True, exist_ok=True)
    (dest_dir / stored_filename).write_bytes(content)

    doc = ClaimDocument(
        claim_id=claim.id,
        uploader_id=user.id,
        stored_filename=stored_filename,
        original_name=name,
        mime_type=sniffed_mime,
        size_bytes=len(content),
        kind=category,
        sha256=hashlib.sha256(content).hexdigest(),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def get_document(db: Session, user: User, doc_id: int) -> ClaimDocument:
    doc = db.get(ClaimDocument, doc_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    claim = db.get(Claim, doc.claim_id)
    if not claim or not _can_access(user, claim):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return doc


def document_path(doc: ClaimDocument):
    subdir = "claim_images" if doc.kind == "image" else "documents"
    return get_settings().upload_root / subdir / doc.stored_filename


def delete_document(db: Session, user: User, doc_id: int) -> None:
    doc = db.get(ClaimDocument, doc_id)
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if user.role != "manager" and doc.uploader_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    path = document_path(doc)
    path.unlink(missing_ok=True)
    db.delete(doc)
    db.commit()
