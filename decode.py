import sys
import soundfile
from espnet2.bin.asr_inference import Speech2Text

speech2text = Speech2Text.from_pretrained(
  "reazon-research/reazonspeech-espnet-v1"
)

speech, rate = soundfile.read(sys.argv[1])
print(speech2text(speech)[0][0])
