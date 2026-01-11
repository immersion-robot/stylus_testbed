#!/bin/bash

# API 테스트 서버 시작 스크립트
# 사용법: ./start.sh

echo "🚀 Starting API Test Server on port 8888..."
echo ""

# 의존성이 설치되어 있는지 확인
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo ""
fi

# 서버 시작
echo "✅ Starting server..."
node server.js

