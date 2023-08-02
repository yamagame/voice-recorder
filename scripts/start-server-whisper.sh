#!/bin/bash
export VOICE_RECORDER_ENGINE=whisper
export VOICE_RECORDER_HISTORYFILE=./work/history.csv
uvicorn server:app --host 0.0.0.0 --port 9002
