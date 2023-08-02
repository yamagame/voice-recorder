import os
import shutil
import threading
from dotenv import load_dotenv

from pathlib import Path
from server_chat import ChatHistory

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from suppress_warning import suppress_warning

suppress_warning()

load_dotenv(dotenv_path=".env.local")

history_file = os.environ["VOICE_RECORDER_HISTORYFILE"]
transcribe_engine = os.environ["VOICE_RECORDER_ENGINE"]

app = FastAPI()
chat = ChatHistory()
chat.load(history_file)

lock = threading.Lock()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'])


def exec_transcribe(outputfile):
    lock.acquire()
    if transcribe_engine == "whisper":
        from server_whisper import whisperTranscribe
        text = whisperTranscribe(outputfile)  # whisperの場合
    else:
        from server_reazon import reazonTranscribe
        text = reazonTranscribe(outputfile)  # reazonの場合
    lock.release()
    return text


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):  # recieve data
    outputfile = os.path.join(os.environ.get(
        'WAVE_FILE_DIR', "./work"), Path(audio.filename).stem + ".wav")

    # wavファイルを書き出し
    upload_dir = open(outputfile, "wb+")
    shutil.copyfileobj(audio.file, upload_dir)
    upload_dir.close()
    print(outputfile)

    text = exec_transcribe(outputfile)
    return {"filename": audio.filename, "text": text}


class TranscribeRequest(BaseModel):
    filename: str


@app.post("/wav/transcribe")
async def transcribeFromAPI(audio: TranscribeRequest):  # recieve data
    outputfile = os.path.join(os.environ.get(
        'WAVE_FILE_DIR', "./work"), Path(audio.filename).stem + ".wav")

    text = exec_transcribe(outputfile)
    return {"filename": audio.filename, "text": text}


class MessageRequest(BaseModel):
    text: str
    mode: str


@app.post("/api/chat")
async def chatResponse(message: MessageRequest):  # recieve data
    return {"text": message.text, "content": chat.create(message.text, message.mode)}


@app.on_event("shutdown")
def save_history():
    chat.save(history_file)
