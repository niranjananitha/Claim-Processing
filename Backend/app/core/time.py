"""Timestamp helpers. Returns naive UTC datetimes for storage in DB columns."""
import datetime as dt


def utcnow() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc).replace(tzinfo=None)
