#!/bin/bash
# docker-compose build reazon-dev
# docker-compose build --no-cache reazon-dev
docker-compose up -d reazon-dev
docker-compose exec reazon-dev bash 
