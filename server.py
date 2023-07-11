import os
import shutil
import subprocess
import threading

from pathlib import Path
from typing import Annotated
# import whisper
import reazonspeech as rs
from espnet2.bin.asr_inference import Speech2Text
# import soundfile as sf

from fastapi import FastAPI,File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

origins = [
    'http://localhost:5173',
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'])

class Item(BaseModel):
    name: str

@app.post("/api") 
async def post(body: Item): #recieve data
    print(body.dict())
    return "OK"

# @app.post("/transcribe")
# async def transcribe(audio: Annotated[bytes, File(default=[], media_type="application/octet-stream")]): #recieve data
#     # upload_dir = open(os.path.join("./files", audio.filename), "wb+")
#     # shutil.copyfileobj(audio.file, upload_dir)
#     # upload_dir.close()
#     # return {"filename": audio.filename}
#     print(audio)
#     return "OK"

lock = threading.Lock()

reazonmodel = Speech2Text.from_pretrained(
        "https://huggingface.co/reazon-research/reazonspeech-espnet-next",
        ctc_weight=0.3,
        lm_weight=0.3,
        beam_size=20,
        device="cpu")

# , voice: Annotated[bytes, File(default=[], media_type="application/octet-stream")]
@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)): #recieve data
    inputfile = os.path.join("./work", audio.filename)
    outputfile = os.path.join("./work", Path(audio.filename).stem + ".wav")

    # upload_dir = open(inputfile, "wb+")
    upload_dir = open(outputfile, "wb+")
    shutil.copyfileobj(audio.file, upload_dir)
    upload_dir.close()

    print(outputfile)

    # subprocess.run(f"ffmpeg -loglevel quiet -i {inputfile} -c:a pcm_f32le {outputfile}", shell=True)

    # whisper
    # model = whisper.load_model("medium", device="cpu")
    # lock.acquire()
    # result = model.transcribe(outputfile, fp16=False, language="ja")
    # lock.release()
    # print(result["text"])
    # return {"filename": audio.filename, "text": result["text"]}

    # reazon
    lock.acquire()
    for caption in rs.transcribe(outputfile, reazonmodel):
        print(caption)
    lock.release()
    return {"filename": audio.filename, "text": caption.text}

    # return {"filename": audio.filename, "text": "OK"}
