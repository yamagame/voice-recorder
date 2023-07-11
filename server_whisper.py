import whisper

def whisperTranscribe(wavfile: str):
    model = whisper.load_model("medium", device="cpu")
    result = model.transcribe(wavfile, fp16=False, language="ja")
    print(result["text"])
    return result["text"]
