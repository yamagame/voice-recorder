#!/bin/bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
docker-compose exec reazon-dev bash
