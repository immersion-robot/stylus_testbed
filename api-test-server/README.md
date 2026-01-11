# API 테스트 서버

포트 8888에서 실행되는 API 테스트 서버입니다.

## 설치

```bash
cd api-test-server
npm install
```

## 실행

```bash
npm start
# 또는
node server.js
```

서버가 시작되면 `http://localhost:8888`에서 접속할 수 있습니다.

## API 엔드포인트

### 1. 지갑 로그인
- **URL:** `POST /api/v1/auth/login/wallet`
- **Content-Type:** `application/json`
- **Request:**
  ```json
  {
    "walletAddress": "0x1234...",
    "chainID": "1234"
  }
  ```
- **Response:**
  ```json
  {
    "accessToken": "dummy_access_token_...",
    "refreshToken": "dummy_refresh_token_..."
  }
  ```

### 2. Presigned URL 발급
- **URL:** `POST /api/v1/uploads/presigned-url`
- **Header:** `Authorization: Bearer {AccessToken}`
- **Content-Type:** `application/json`
- **Request:**
  ```json
  {
    "filename": "test_video.mp4",
    "category": "AD_VIDEO",
    "contentType": "video/mp4"
  }
  ```
- **Response:**
  ```json
  {
    "uploadUrl": "https://s3.ap-northeast-2.amazonaws.com/...",
    "fileUrl": "https://cdn.adrobot.com/...",
    "fileId": "file_12345_abc"
  }
  ```

### 3. 광고 소재 등록
- **URL:** `POST /api/v1/ad-creatives`
- **Header:** `Authorization: Bearer {AccessToken}`
- **Content-Type:** `application/json`
- **Request:**
  ```json
  {
    "title": "설날 할인 영상_A안",
    "type": "VIDEO",
    "mediaUrl": "https://cdn.adrobot.com/videos/test.mp4",
    "thumbnailUrl": "https://cdn.adrobot.com/thumbs/test.jpg",
    "width": 1080,
    "height": 1920,
    "duration": 15.0
  }
  ```
- **Response:**
  ```json
  {
    "adCreativeId": "crt_12345",
    "status": "REVIEW_PENDING"
  }
  ```

### 4. Health Check
- **URL:** `GET /health`
- **Response:**
  ```json
  {
    "status": "ok",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "server": "API Test Server",
    "port": 8888
  }
  ```

## 테스트

프론트엔드에서 `http://localhost:9999/api-test` 페이지를 열어서 API를 테스트할 수 있습니다.

