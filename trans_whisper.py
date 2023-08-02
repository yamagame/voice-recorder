#!/usr/bin/env python3
import sys
from suppress_warning import suppress_warning
suppress_warning()


def transcribe():
    import whisper
    # tiny, base, small, medium
    model = whisper.load_model("medium", device="cpu")
    result = model.transcribe(sys.argv[1], fp16=False, language="ja")
    print(result)


transcribe()
