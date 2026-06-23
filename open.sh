#!/bin/bash

DIR="$(cd "$(dirname "$0")" && pwd)"

if lsof -i :3000 | grep LISTEN > /dev/null 2>&1; then
    echo "서버 이미 실행 중"
else
    echo "서버 시작 중..."
    node "$DIR/server.js" &
    sleep 1
fi

open "$DIR/index.html"
