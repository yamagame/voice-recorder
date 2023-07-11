import sys
import reazonspeech as rs
from espnet2.bin.asr_inference import Speech2Text

model = Speech2Text.from_pretrained(
        "https://huggingface.co/reazon-research/reazonspeech-espnet-next",
        ctc_weight=0.3,
        lm_weight=0.3,
        beam_size=20,
        device="cpu")

for caption in rs.transcribe(sys.argv[1], model):
    print(caption)
