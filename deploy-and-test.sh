#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 에러 발생 시 스크립트 중단
set -e

# PRIV_KEY 환경변수 확인
if [ -z "$PRIV_KEY" ]; then
    echo -e "${RED}오류: PRIV_KEY 환경변수가 설정되지 않았습니다.${NC}"
    echo "사용법: PRIV_KEY=your_private_key ./deploy-and-test.sh"
    exit 1
fi

echo -e "${GREEN}=== Stylus 배포 및 테스트 스크립트 시작 ===${NC}"

# 1. cargo stylus 설치 확인
echo -e "${YELLOW}[1/7] cargo stylus 설치 확인 중...${NC}"
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}오류: cargo가 설치되어 있지 않습니다.${NC}"
    exit 1
fi

if ! cargo stylus --version &> /dev/null; then
    echo -e "${YELLOW}cargo stylus가 설치되어 있지 않습니다. 설치 중...${NC}"
    cargo install --force cargo-stylus cargo-stylus-check
else
    echo -e "${GREEN}cargo stylus가 이미 설치되어 있습니다.${NC}"
fi

# 2. MockToken 디렉토리로 이동하여 deploy
echo -e "${YELLOW}[2/7] MockToken 배포 중...${NC}"
cd MockToken
cargo stylus deploy --private-key "$PRIV_KEY"
echo -e "${GREEN}MockToken 배포 완료${NC}"
cd ..

# 3. Stylus 디렉토리로 이동하여 deploy
echo -e "${YELLOW}[3/7] Stylus 배포 중...${NC}"
cd Stylus
cargo stylus deploy --private-key "$PRIV_KEY"
echo -e "${GREEN}Stylus 배포 완료${NC}"
cd ..

# 4. MockToken에서 test_erc20 실행
echo -e "${YELLOW}[4/7] MockToken 테스트 실행 중...${NC}"
cd MockToken
cargo run --example test_erc20
echo -e "${GREEN}MockToken 테스트 완료${NC}"
cd ..

# 5. Stylus에서 test_client 실행
echo -e "${YELLOW}[5/7] Stylus 테스트 실행 중...${NC}"
cd Stylus
cargo run --example test_client
echo -e "${GREEN}Stylus 테스트 완료${NC}"
cd ..

# 6. Frontend로 이동하여 npm install
echo -e "${YELLOW}[6/7] Frontend 의존성 설치 중...${NC}"
cd frontend
npm i
echo -e "${GREEN}Frontend 의존성 설치 완료${NC}"

# 7. Frontend 개발 서버 실행
echo -e "${YELLOW}[7/7] Frontend 개발 서버 시작 중...${NC}"
echo -e "${GREEN}모든 단계가 완료되었습니다! Frontend 개발 서버가 실행됩니다.${NC}"
npm run dev

