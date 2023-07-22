#!/bin/bash
curl -X POST -d "{\"filename\":\"${1}\"}" --header "Content-Type:application/json" http://localhost:9002/wav/transcribe
