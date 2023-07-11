#!/bin/bash
ffmpeg -v quiet -y -i ./work/blob.webm -c:a pcm_f32le ./work/blob.wav
