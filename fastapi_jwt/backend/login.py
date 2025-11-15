import os
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any, Literal

import jwt
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from pydantic import BaseModel

# to get a string like this run:
SECRET_KEY = str(os.environ.get("JWT_SECRET_KEY"))
DEFAULT_ADMIN_PASSWORD_HASH = str(os.environ.get("DEFAULT_ADMIN_PASSWORD_HASH")) 
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None


class User(BaseModel):
    username: str
    role: Literal["admin", "user"]
    disabled: bool | None = None


class UserInDB(User):
    hashed_password: str


class FakeUserDB:

    def __init__(self) -> None:
        self.db: dict[str, Any] = {
            "admin": {
                "username": "admin",
                "role": "admin",
                "hashed_password": DEFAULT_ADMIN_PASSWORD_HASH,  # password: admin
                "disabled": False,
            },
        }


    def get_user(self, username: str):
        if username in self.db:
            user_dict = self.db[username]
            return UserInDB(**user_dict)

user_db = FakeUserDB()
password_hash = PasswordHash.recommended()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI()


def verify_password(plain_password, hashed_password):
    return password_hash.verify(plain_password, hashed_password)


def get_password_hash(password):
    return password_hash.hash(password)


def get_user(db, username: str):
    if username in db:
        user_dict = db[username]
        return UserInDB(**user_dict)


def authenticate_user(username: str, password: str):
    user = user_db.get_user(username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
        
    except InvalidTokenError:
        raise credentials_exception

    if not isinstance(token_data.username, str):
        raise credentials_exception
    user = user_db.get_user(username=token_data.username)
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


