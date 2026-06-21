from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.auth import (
    create_session,
    get_current_account,
    hash_password,
    hash_token,
    normalize_email,
    security,
    validate_email,
    validate_password,
    verify_password,
)
from app.database import get_db
from app.models import AuthAccount, AuthSession, User
from app.schemas import (
    AuthResponse,
    AuthUserResponse,
    LoginRequest,
    PasswordChangeRequest,
    ProfileUpdateRequest,
    RegisterRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def to_user_response(account: AuthAccount) -> AuthUserResponse:
    return AuthUserResponse(
        id=account.id,
        name=account.name,
        email=account.email,
        goal=account.goal,
        created_at=account.created_at,
    )


@router.post("/register", response_model=AuthResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    email = normalize_email(request.email)
    validate_email(email)
    validate_password(request.password)

    if db.query(AuthAccount).filter(AuthAccount.email == email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user = User(
        username=email,
        age=25,
        weight=70,
        height=175,
        fitness_level="beginner",
        total_xp=0,
        level=1,
        streak=0,
    )
    db.add(user)
    db.flush()

    account = AuthAccount(
        user_id=user.id,
        name=request.name.strip(),
        email=email,
        goal=request.goal,
        password_hash=hash_password(request.password),
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    token = create_session(db, account)

    return AuthResponse(token=token, user=to_user_response(account))


@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    email = normalize_email(request.email)
    account = db.query(AuthAccount).filter(AuthAccount.email == email).first()
    if account is None or not verify_password(request.password, account.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_session(db, account)
    return AuthResponse(token=token, user=to_user_response(account))


@router.post("/logout")
def logout(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    if credentials is not None:
        db.query(AuthSession).filter(AuthSession.token_hash == hash_token(credentials.credentials)).delete()
        db.commit()
    return {"status": "logged_out"}


@router.get("/me", response_model=AuthUserResponse)
def me(account: AuthAccount = Depends(get_current_account)) -> AuthUserResponse:
    return to_user_response(account)


@router.patch("/me", response_model=AuthUserResponse)
def update_profile(
    request: ProfileUpdateRequest,
    account: AuthAccount = Depends(get_current_account),
    db: Session = Depends(get_db),
) -> AuthUserResponse:
    account.name = request.name.strip()
    db.commit()
    db.refresh(account)
    return to_user_response(account)


@router.post("/change-password")
def change_password(
    request: PasswordChangeRequest,
    account: AuthAccount = Depends(get_current_account),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    validate_password(request.new_password)
    if not verify_password(request.current_password, account.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    account.password_hash = hash_password(request.new_password)
    db.query(AuthSession).filter(AuthSession.account_id == account.id).delete()
    db.commit()
    return {"status": "password_changed"}
