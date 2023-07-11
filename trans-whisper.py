import whisper

model = whisper.load_model("medium")  # tiny, base, small, medium
result = model.transcribe("./work/audio-20230710-090529.wav")
print(result["text"])
