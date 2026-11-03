"""Aggregate v1 API router."""
from fastapi import APIRouter

from app.api.v1.routes import (
    agent,
    auth,
    claims,
    dashboard,
    documents,
    manager,
    ml,
    policies,
    users,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(policies.router)
api_router.include_router(claims.router)
api_router.include_router(agent.router)
api_router.include_router(manager.router)
api_router.include_router(dashboard.router)
api_router.include_router(documents.router)
api_router.include_router(ml.router)
