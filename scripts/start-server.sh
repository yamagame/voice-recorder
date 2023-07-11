#!/bin/bash
uvicorn server:app --host 0.0.0.0 --port 9002
# uvicorn server:app --reload --host 0.0.0.0 --port 9002
