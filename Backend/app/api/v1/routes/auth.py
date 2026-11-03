"""Authentication routes: register, login, refresh, logout, me."""
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.rate_limit import limiter
from app.database.connection import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserOut, build_user_out
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE = "refresh_token"
_COOKIE_KW = dict(httponly=True, samesite="strict", secure=False, path="/api/v1/auth")


def _set_refresh_cookie(response: Response, raw: str) -> None:
    response.set_cookie(REFRESH_COOKIE, raw, **_COOKIE_KW)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    try:
        user = auth_service.register_client(
            db, payload.name, payload.email, payload.password, payload.policy_number
        )
    except auth_service.AuthError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    access, raw = auth_service.issue_tokens(db, user)
    _set_refresh_cookie(response, raw)
    return TokenResponse(access_token=access, user=build_user_out(user))


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = auth_service.authenticate(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access, raw = auth_service.issue_tokens(db, user)
    _set_refresh_cookie(response, raw)
    return TokenResponse(access_token=access, user=build_user_out(user))


@router.post("/refresh", response_model=TokenResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    raw = request.cookies.get(REFRESH_COOKIE)
    if not raw:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")
    try:
        access, new_raw, user = auth_service.rotate_refresh(db, raw)
    except auth_service.AuthError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    _set_refresh_cookie(response, new_raw)
    return TokenResponse(access_token=access, user=build_user_out(user))


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    auth_service.revoke_refresh(db, request.cookies.get(REFRESH_COOKIE))
    response.delete_cookie(REFRESH_COOKIE, path="/api/v1/auth")
    return {"detail": "logged out"}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return build_user_out(user)
