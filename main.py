import asyncio
import datetime
import random
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="SSE Dashboard", description="Real-time dashboard using SSE")

origins = ["http://localhost:8000", "http://127.0.0.1:8000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def stream_data():

    while True:

        timestamp = datetime.datetime.now().timestamp()
        value = random.random()
        data = {
            "timestamp": timestamp,
            "value": value,
        }

        data_str = f'{data}\n\n'
        data_str = data_str.replace("'", '"')
        yield data_str

        sleep_time = random.random() * 0.4 + 0.1

        await asyncio.sleep(sleep_time)

@app.get("/stream")
async def stream_sse():
    return StreamingResponse(
        stream_data(), 
        media_type="text/event-stream",
        #headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )


frontend_path = "./frontend"
app.mount("/", StaticFiles(directory=str(frontend_path), html=True), name="static")
