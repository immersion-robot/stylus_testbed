# Stylus Testbed 가이드

이 프로젝트는 Blockscout과 Nitro devnode를 사용하여 Stylus 스마트 컨트랙트를 개발, 배포, 테스트하기 위한 환경을 제공합니다.

## 사전 요구사항

다음 도구들이 설치되어 있어야 합니다:

- **Docker** 및 **Docker Compose**: Blockscout 실행을 위해 필요
- **Rust** 및 **Cargo**: Stylus 컨트랙트 컴파일 및 배포
- **cargo-stylus**: Stylus 컨트랙트 배포 도구

## 스크립트 개요

### 1. setup-blockscout-nitro.sh

Blockscout과 Nitro devnode를 설정하고 시작하는 스크립트입니다.

#### 주요 기능

1. **Blockscout 서브모듈 설정**
   - Blockscout Git 서브모듈 초기화 및 업데이트
   - Nitro devnode와 호환되도록 Blockscout 설정 파일 수정
   - RPC URL을 `8545`에서 `8547`로 변경 (Nitro devnode 기본 포트)
   - Chain ID를 `412346`로 설정

2. **Nitro devnode 서브모듈 설정**
   - Nitro devnode Git 서브모듈 초기화 및 업데이트
   - `--http.vhosts="*"` 옵션 추가하여 모든 호스트 허용

3. **서비스 시작**
   - Nitro devnode 백그라운드 실행 (포트: 8547)
   - Blockscout Docker 컨테이너 시작

#### 실행 방법

```bash
chmod +x setup-blockscout-nitro.sh
./setup-blockscout-nitro.sh
```

#### 실행 결과

스크립트 실행 후 다음 서비스들이 시작됩니다:

- **Nitro-devnode**: `http://127.0.0.1:8547`
- **Blockscout**: `http://localhost`
- **Stats API**: `http://localhost:8080`

#### 로그 확인

- **Nitro-devnode**: 스크립트를 실행한 터미널에서 확인
- **Blockscout**: 
  ```bash
  cd blockscout/docker-compose && docker-compose logs -f
  ```

#### 서비스 중지

- **Nitro-devnode**: 
  ```bash
  docker stop nitro-dev
  ```
- **Blockscout**: 
  ```bash
  cd blockscout/docker-compose && docker-compose down
  ```

---

### 2. deploy-and-test.sh

Stylus 스마트 컨트랙트를 배포하고 테스트한 후 프론트엔드를 실행하는 스크립트입니다.

#### 주요 기능

1. **환경 변수 확인**
   - `PRIV_KEY` 환경 변수 또는 `Stylus/.env` 파일에서 개인 키 읽기

2. **cargo-stylus 설치 확인**
   - `cargo-stylus` 및 `cargo-stylus-check` 도구 설치 확인
   - 미설치 시 자동 설치

3. **MockToken 배포**
   - `MockToken` 디렉토리에서 Stylus 컨트랙트 배포

4. **Stylus 컨트랙트 배포**
   - `Stylus` 디렉토리에서 Stylus 컨트랙트 배포

5. **테스트 실행**
   - MockToken의 `test_erc20` 예제 실행
   - Stylus의 `test_client` 예제 실행

6. **프론트엔드 설정 및 실행**
   - 프론트엔드 의존성 설치 (`npm install`)
   - 개발 서버 시작 (`npm run dev`)

#### 사전 준비

**중요**: 스크립트 실행 전에 개인 키를 설정해야 합니다.

방법 1: 환경 변수로 설정
```bash
export PRIV_KEY="your_private_key_here"
```

방법 2: `Stylus/.env` 파일에 설정
```bash
echo "PRIV_KEY=your_private_key_here" > Stylus/.env
```

#### 실행 방법

```bash
chmod +x deploy-and-test.sh
./deploy-and-test.sh
```

#### 주의사항

- 스크립트는 에러 발생 시 자동으로 중단됩니다 (`set -e`)
- Nitro devnode가 실행 중이어야 합니다 (포트 8547)
- 개인 키는 안전하게 관리하세요. 절대 공개 저장소에 커밋하지 마세요

---

## 전체 워크플로우

### 1단계: 환경 설정

```bash
# Blockscout과 Nitro devnode 설정 및 시작
./setup-blockscout-nitro.sh
```

이 단계는 다음을 수행합니다:
- Blockscout과 Nitro devnode 서브모듈 초기화
- 설정 파일 자동 수정
- 서비스 시작 및 준비 대기

### 2단계: 컨트랙트 배포 및 테스트

```bash
# 개인 키 설정 (환경 변수 또는 Stylus/.env 파일)
export PRIV_KEY="your_private_key_here"

# 컨트랙트 배포 및 테스트, 프론트엔드 실행
./deploy-and-test.sh
```

이 단계는 다음을 수행합니다:
- Stylus 도구 설치 확인
- MockToken 및 Stylus 컨트랙트 배포
- 테스트 실행
- 프론트엔드 개발 서버 시작

---

## 문제 해결

### Nitro devnode가 시작되지 않는 경우

1. Docker가 실행 중인지 확인:
   ```bash
   docker info
   ```

2. 포트 8547이 사용 중인지 확인:
   ```bash
   lsof -i :8547
   ```

3. 기존 컨테이너 정리:
   ```bash
   docker stop nitro-dev
   docker rm nitro-dev
   ```

### Blockscout이 시작되지 않는 경우

1. Docker Compose 상태 확인:
   ```bash
   cd blockscout/docker-compose
   docker-compose ps
   ```

2. 로그 확인:
   ```bash
   docker-compose logs
   ```

3. 컨테이너 재시작:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### 컨트랙트 배포 실패 시

1. Nitro devnode가 실행 중인지 확인:
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' \
     http://127.0.0.1:8547
   ```

2. 개인 키가 올바르게 설정되었는지 확인:
   ```bash
   echo $PRIV_KEY
   # 또는
   cat Stylus/.env
   ```

3. RPC 연결 확인:
   - Blockscout이 정상적으로 Nitro devnode에 연결되어 있는지 확인

---

## 디렉토리 구조

```
stylus_testbed/
├── blockscout/              # Blockscout 서브모듈
├── nitro-devnode/           # Nitro devnode 서브모듈
├── MockToken/               # MockToken 컨트랙트
├── Stylus/                  # Stylus 컨트랙트
├── frontend/                # 프론트엔드 애플리케이션
├── setup-blockscout-nitro.sh    # 환경 설정 스크립트
└── deploy-and-test.sh            # 배포 및 테스트 스크립트
```

---

## 추가 정보

- **Blockscout**: 블록체인 탐색기로 트랜잭션, 블록, 컨트랙트 정보를 조회할 수 있습니다
- **Nitro devnode**: Arbitrum Nitro 기반 로컬 개발 노드입니다
- **Stylus**: Rust로 작성된 스마트 컨트랙트를 실행할 수 있는 환경입니다

---

## 라이선스

프로젝트의 라이선스는 각 서브모듈 및 컴포넌트의 라이선스를 따릅니다.

