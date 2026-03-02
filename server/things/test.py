from contextlib import asynccontextmanager
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from sqlmodel import Field, Session, SQLModel, create_engine, select
from typing import Annotated
from .auth import is_same_user, AuthOptional

class Post(SQLModel, table=True):
	id: int | None = Field(default=None, primary_key=True)
	op: str | None = None
	date: float | None = Field(default=None, index=True)
	title: str
	content: str | None = None
	color: int = Field(default=0)

engine = create_engine("sqlite:///db/test.sqlite", connect_args={"check_same_thread": False})

def get_session():
	with Session(engine) as session:
		yield session

SessionDep = Annotated[Session, Depends(get_session)]

class PostRequest(BaseModel):
	title: str
	content: str | None = None
	color: int = 0

class DeleteRequest(BaseModel):
	id: int

@asynccontextmanager
async def lifespan(_: APIRouter):
	SQLModel.metadata.create_all(engine, tables=[SQLModel.metadata.tables["post"]])
	yield

app = APIRouter(prefix="/test-posts", lifespan=lifespan)

@app.get("/")
def get(session: SessionDep):
	return session.exec(select(Post)).all()

@app.get("/{id}")
def get_one(id: int, session: SessionDep):
	result = session.get(Post, id)
	if not result:
		raise HTTPException(404, detail="업서요")
	return result

@app.post("/")
def post(post: PostRequest, session: SessionDep, user: AuthOptional):
	added = Post(date=datetime.now().timestamp(),title=post.title,content=post.content,color=post.color)
	if user is not None:
		added.op = user.username
	session.add(added)
	session.commit()
	session.refresh(added)
	return get(session)

@app.delete("/")
def delete(req: DeleteRequest, session: SessionDep, user: AuthOptional):
	fordel = session.get(Post, req.id)
	if not fordel:
		raise HTTPException(404, detail="업서요")
	if fordel.op:
		if user is None:
			raise HTTPException(403, detail="로그인 필요")
		is_same_user(user, fordel.op)
	session.delete(fordel)
	session.commit()
	return get(session)