import datetime as dt
import re

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.data.vehicle_catalog import CATEGORIES

# Indian registration plates, e.g. "TN 01 AB 1234", "KA05MX0001", "DL 3C AB 1234", BH series "22 BH 1234 AA".
_REG_RE = re.compile(r"^([A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}|\d{2}BH\d{4}[A-Z]{1,2})$")


class VehicleCreate(BaseModel):
    category: str
    make: str = Field(min_length=1, max_length=60)
    model: str = Field(min_length=1, max_length=60)
    year: int
    registration_number: str = Field(min_length=4, max_length=20)

    @field_validator("category")
    @classmethod
    def _category(cls, v: str) -> str:
        if v not in CATEGORIES:
            raise ValueError(f"category must be one of {', '.join(CATEGORIES)}")
        return v

    @field_validator("make", "model")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v

    @field_validator("year")
    @classmethod
    def _year(cls, v: int) -> int:
        if not 1980 <= v <= dt.date.today().year + 1:
            raise ValueError("year is out of range")
        return v

    @field_validator("registration_number")
    @classmethod
    def _reg(cls, v: str) -> str:
        compact = re.sub(r"[\s-]", "", v).upper()
        if not _REG_RE.match(compact):
            raise ValueError("enter a valid Indian registration number, e.g. TN 01 AB 1234")
        return compact


class VehicleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: str
    make: str
    model: str
    year: int
    registration_number: str
    is_custom: bool
    label: str
