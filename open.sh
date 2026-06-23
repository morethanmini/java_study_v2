#!/bin/bash

if lsof -i :3000 | grep LISTEN > /dev/null 2>&1; then
    echo "서버 이미 실행 중"
else
    echo "서버 시작 중..."
    node /Users/int_min/Documents/Dev/coding/Java_study_v2/server.js &
    sleep 1
fi

open /Users/int_min/Documents/Dev/coding/Java_study_v2/index.html
