FROM python:3.9.17-bullseye

WORKDIR /app

ARG HUGGINGFACE_TOKEN

RUN apt update
RUN apt upgrade -y
RUN apt install -y ffmpeg libsndfile1
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
RUN pip install --upgrade pip
RUN pip install --upgrade huggingface_hub
RUN huggingface-cli login --token ${HUGGINGFACE_TOKEN}
RUN pip install datasets
RUN pip install uvicorn fastapi python-multipart
RUN pip install pyworld==0.3.2

#RUN apt install -y nodejs npm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash

RUN . "$HOME/.bashrc" && \
  nvm install 18.15.0 && \
  nvm use 18.15.0 && \
  npm install -g npm && \
  npm install -g yarn

RUN . "$HOME/.cargo/env" && \
  pip install git+https://github.com/reazon-research/ReazonSpeech

COPY ./trans_reazon.py /tmp
COPY ./testdata/sample.wav /tmp
RUN python /tmp/trans_reazon.py /tmp/sample.wav

RUN huggingface-cli logout

COPY ./downloader.patch /tmp/downloader.patch
RUN patch /usr/local/lib/python3.9/site-packages/espnet_model_zoo/downloader.py /tmp/downloader.patch
