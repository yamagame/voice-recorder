import os
import shutil
import threading

from pathlib import Path
# from server_whisper import whisperTranscribe
from server_reazon import reazonTranscribe

from fastapi import FastAPI,File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()
lock = threading.Lock()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'])

@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)): #recieve data
    outputfile = os.path.join(os.environ.get('WAVE_FILE_DIR', "./work"), Path(audio.filename).stem + ".wav")

    # wavファイルを書き出し
    upload_dir = open(outputfile, "wb+")
    shutil.copyfileobj(audio.file, upload_dir)
    upload_dir.close()
    print(outputfile)

    lock.acquire()

    # whisperの場合
    # text = whisperTranscribe(outputfile)

    # reazonの場合
    text = reazonTranscribe(outputfile)

    lock.release()
    return {"filename": audio.filename, "text": text}

class Transcribe(BaseModel):
    filename: str

@app.post("/wav/transcribe")
async def transcribeFromAPI(audio: Transcribe): #recieve data
    outputfile = os.path.join(os.environ.get('WAVE_FILE_DIR', "./work"), Path(audio.filename).stem + ".wav")

    # wavファイルを書き出し
    # upload_dir = open(outputfile, "wb+")
    # shutil.copyfileobj(audio.file, upload_dir)
    # upload_dir.close()
    # print(outputfile)

    lock.acquire()

    # whisperの場合
    # text = whisperTranscribe(outputfile)

    # reazonの場合
    text = reazonTranscribe(outputfile)

    lock.release()
    return {"filename": audio.filename, "text": text}
