from pydantic import BaseModel, ConfigDict


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    claim_id: int
    uploader_id: int
    stored_filename: str
    original_name: str
    mime_type: str
    size_bytes: int
    kind: str
