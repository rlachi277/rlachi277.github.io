from contextlib import asynccontextmanager
from .things import auth, test
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

@asynccontextmanager
async def lifespan(_: FastAPI):
	print("start")
	yield
	print("end")

app = FastAPI(lifespan=lifespan)
app.include_router(auth.app)
app.include_router(test.app)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?:\/\/localhost(?::\d+)?$|^https?:\/\/127\.0\.0\.1(?::\d+)?$|^https?:\/\/192.168.\d+.\d+(?::\d+)?$|https?:\/\/rlachi277.github.io",
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get('/')
def root():
	return {'ecyc': 'e'}

@app.get('/ping')
def ping():
	return {'ecyc': 'e', 'time': datetime.now().timestamp()}