from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional
from sqlmodel import Field, Session, SQLModel, create_engine
import jwt
from fastapi import Depends, APIRouter, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jwt.exceptions import InvalidTokenError, ExpiredSignatureError
from pwdlib import PasswordHash
from pydantic import BaseModel

from .hidden.secret import AUTH_SECRET_KEY
ALGORITHM = "HS256"
EXPIRE = 1440 * 7 # 알아서 바꾸세요

class Token(BaseModel):
	username: str
	access_token: str
	token_type: str
	is_admin: bool

class User(SQLModel):
	username: str | None = None
	is_admin: bool = False

class Account(User, table=True):
	username: str | None = Field(default=None, primary_key=True)
	pw_hash: str

class AccountRequest(BaseModel):
	username: str
	password: str | None

engine = create_engine("sqlite:///db/auth.sqlite", connect_args={"check_same_thread": False})

def get_session():
	with Session(engine) as session:
		yield session

SessionDep = Annotated[Session, Depends(get_session)]

@asynccontextmanager
async def lifespan(_: APIRouter):
	SQLModel.metadata.create_all(engine, [SQLModel.metadata.tables["account"]])
	yield

app = APIRouter(lifespan=lifespan)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login", auto_error=False)
password_hash = PasswordHash.recommended()

@app.post("/login")
async def login(
	form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
	session: SessionDep
) -> Token:
	if form_data.username.startswith("guest_"):
		to_encode = {"sub": form_data.username, "exp": datetime.now(timezone.utc)+timedelta(minutes=EXPIRE or 15)}
		token = jwt.encode(to_encode, AUTH_SECRET_KEY, algorithm=ALGORITHM)
		return Token(username=form_data.username, access_token=token, token_type="bearer", is_admin=False)
	user = session.get(Account, form_data.username)
	if user is None or user.username is None:
		raise HTTPException(401,detail="로그인 실패",
			headers={"WWW-Authenticate": "Bearer"},
		)
	if (not user.username.startswith("guest_") and
		not password_hash.verify(form_data.password, user.pw_hash)):
		raise HTTPException(401,detail="로그인 실패",
			headers={"WWW-Authenticate": "Bearer"},
		)
	to_encode = {"sub": user.username, "exp": datetime.now(timezone.utc)+timedelta(minutes=EXPIRE or 15)}
	token = jwt.encode(to_encode, AUTH_SECRET_KEY, algorithm=ALGORITHM)
	return Token(username=user.username, access_token=token, token_type="bearer", is_admin=user.is_admin)

@app.post("/auth")
async def auth(token: Annotated[str | None, Depends(oauth2_scheme)], session: SessionDep):
	if token is None:
		raise HTTPException(401, detail="로그인 필요",
			headers={"WWW-Authenticate": "Bearer"})
	fail = HTTPException(401, detail="인증 실패, 재로그인 필요",
		headers={"WWW-Authenticate": "Bearer"})
	try:
		payload = jwt.decode(token, AUTH_SECRET_KEY, algorithms=[ALGORITHM])
		username = payload.get("sub")
		if username is None:
			raise fail
	except ExpiredSignatureError:
		raise HTTPException(401, detail="인증 만료, 재로그인 필요",
			headers={"WWW-Authenticate": "Bearer"})
	except InvalidTokenError:
		raise fail
	if username is None:
		raise fail
	if username.startswith("guest_"):
		return User(username=username, is_admin=False)
	user = session.get(Account, username)
	if user is None:
		raise fail
	return User.model_validate(user)
AuthDep = Depends(auth)
Auth = Annotated[User, AuthDep]

async def auth_optional(token: Annotated[str | None, Depends(oauth2_scheme)], session: SessionDep):
	if token is None:
		return None
	return await auth(token, session)
AuthOptionalDep = Depends(auth_optional)
AuthOptional = Annotated[Optional[User], AuthOptionalDep]

async def auth_admin(user: Annotated[User, Depends(auth)]):
	if not user.is_admin:
		raise HTTPException(403, detail="권한 없음")
	return user
AuthAdminDep = Depends(auth_admin)
AuthAdmin = Annotated[User, AuthAdminDep]

def auth_same_user(cmp: User | str):
	async def _auth(user: Annotated[User, Depends(auth)]):
		return is_same_user(user, cmp)
	return _auth

def is_same_user(user: User, cmp: User | str):
	if (isinstance(cmp, User)):
		if cmp.username is None:
			raise HTTPException(400, detail="?? cmp.username이 None임")
		cmp = cmp.username
	if not user.is_admin and user.username != cmp:
		raise HTTPException(403, detail="권한 없음")
	return user

@app.post('/create-account', dependencies=[Depends(auth_admin)])
def create_account(req: AccountRequest, session: SessionDep):
	if req.username.startswith("guest_"):
		raise HTTPException(403, detail="계정명은 'guest_'로 시작할 수 없음")
	if req.password is None:
		raise HTTPException(403, detail="계정을 만드는데 비밀번호를 안 알려주면 뭐 어쩌자는거죠")
	# 해싱은 서버에서 합니다.
	# 종단간 암호화가 안 됐다고요?
	# https를 쓰면 괜찮습니다.
	# https가 안 된다고요?
	# 조용히 하세요
	result = session.get(Account, req.username)
	if result:
		raise HTTPException(403, detail="이미 계정 있음")
	added = Account(username=req.username, pw_hash=password_hash.hash(req.password))
	session.add(added)
	session.commit()
	session.refresh(added)
	return {"detail": "계정 생성 완료"}

@app.post('/change-password', dependencies=[Depends(auth_admin)])
def change_password(req: AccountRequest, session: SessionDep):
	if req.password is None:
		raise HTTPException(403, detail="비밀번호를 바꾸는데 비밀번호를 안 알려주면 뭐 어쩌자는거죠")
	result = session.get(Account, req.username)
	if result is None:
		raise HTTPException(404, detail="업서요")
	result.pw_hash = password_hash.hash(req.password)
	session.commit()
	return {"detail": "비밀번호 변경 완료"}

@app.post('/delete-account', dependencies=[Depends(auth_admin)])
def delete_account(req: AccountRequest, session: SessionDep):
	fordel = session.get(Account, req.username)
	if not fordel:
		raise HTTPException(404, detail="업서요")
	session.delete(fordel)
	session.commit()
	return {"detail": "계정 삭제 완료"}