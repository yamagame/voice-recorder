import sys
import whisper

model = whisper.load_model("medium")  # tiny, base, small, medium
result = model.transcribe(sys.argv[1])
print(result["text"])
