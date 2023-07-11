import subprocess

# ffmpeg を使用して webm を wav に変換する（未使用）
def webm2wav(inputfile: str, outputfile: str):
  subprocess.run(f"ffmpeg -loglevel quiet -i {inputfile} -c:a pcm_f32le {outputfile}", shell=True)
