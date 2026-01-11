# API Test Server

포트 8888에서 실행되는 API 테스트 서버입니다.

## API 엔드포인트

### 1. 지갑 로그인 API

**`POST /api/v1/auth/login/wallet`**

지갑 주소와 체인 ID를 사용하여 인증 토큰을 발급받습니다.

- **인증**: 불필요
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
    "accessToken": "dummy_access_token_1234567890",
    "refreshToken": "dummy_refresh_token_1234567890"
  }
  ```

---

### 2. Presigned URL 발급 API

**`POST /api/v1/uploads/presigned-url`**

파일 업로드를 위한 presigned URL을 발급받습니다.

- **인증**: Bearer Token 필요
- **Request:**
  ```json
  {
    "filename": "test_video.mp4",
    "category": "AD_VIDEO",
    "contentType": "video/mp4"
  }
  ```
  - `category`: `AD_VIDEO`, `AD_IMAGE`, `THUMBNAIL` 중 하나
- **Response:**
  ```json
  {
    "uploadUrl": "http://localhost:8888/api/v1/uploads/upload?fileId=file_12345_abc&category=AD_VIDEO",
    "fileUrl": "http://localhost:8888/uploads/file_12345_abc_test_video.mp4",
    "fileId": "file_12345_abc"
  }
  ```

---

### 3. 파일 업로드 API

**`POST /api/v1/uploads/upload`**

실제 파일을 업로드합니다. (FormData 사용)

- **인증**: Bearer Token 필요
- **Request:** FormData
  - `file`: 업로드할 파일
  - `fileId`: 파일 ID (query string 또는 body에 포함 가능)
  - `category`: 파일 카테고리 (query string 또는 body에 포함 가능)
- **Response:**
  ```json
  {
    "success": true,
    "fileId": "file_12345_abc",
    "fileUrl": "http://localhost:8888/uploads/file_12345_abc_test_video.mp4",
    "filename": "file_12345_abc_test_video.mp4",
    "originalName": "test_video.mp4",
    "size": 1024000,
    "mimetype": "video/mp4",
    "category": "AD_VIDEO"
  }
  ```

---

### 4. 광고 소재 등록 API (메타데이터 저장)

**`POST /api/v1/ad-creatives`**

프론트엔드에서 소재(미디어 파일)을 업로드한 이후에 업로드 링크를 백엔드 서버로 전송합니다.

- **인증**: Bearer Token 필요
- **Request:**
  ```json
  {
    "title": "설날 할인 영상_A안 (밝은 버전)",
    "type": "VIDEO",
    "mediaUrl": "https://cdn.adrobot.com/videos/2026_seollal_A.mp4",
    "thumbnailUrl": "https://cdn.adrobot.com/thumbs/2026_seollal_A.jpg",
    "width": 1080,
    "height": 1920,
    "duration": 15.0
  }
  ```
  - `type`: `VIDEO` 또는 `IMAGE`
  - `duration`: 영상 길이 (초 단위, VIDEO 타입인 경우 선택)
- **Response:**
  ```json
  {
    "adCreativeId": "crt_1234567890",
    "status": "Active"
  }
  ```
  - 소재는 등록 즉시 'Active' 상태로 저장됩니다.

---

### 5. 결제 정보 저장 API

**`POST /api/v1/payments`**

결제 정보를 저장합니다.

- **인증**: Bearer Token (선택)
- **Request:**
  ```json
  {
    "customerEmail": "customer@example.com",
    "location": "Gangnam, Seoul",
    "date": "2026-01-17",
    "timeSlot": "19:00",
    "paymentMethod": "USDT",
    "totalAmount": "50000000",
    "transactionHash": "0xd4b9e2de3d03f1077bae79312b492ffce8d58fda4019eff9a9d51b446deb7102",
    "title": "Content Title"
  }
  ```
  - `date`: YYYY-MM-DD 형식
  - `timeSlot`: HH:MM 또는 HH:MM-HH:MM 형식
  - `totalAmount`: wei 단위, 문자열 형식
  - `transactionHash`: 트랜잭션 해시 (선택)
  - `title`: 콘텐츠 제목 (선택)
- **Response:**
  ```json
  {
    "paymentId": "pay_1234567890",
    "status": "COMPLETED",
    "customerEmail": "customer@example.com",
    "location": "Gangnam, Seoul",
    "date": "2026-01-17",
    "timeSlot": "19:00",
    "paymentMethod": "USDT",
    "totalAmount": "50000000",
    "transactionHash": "0xd4b9e2de3d03f1077bae79312b492ffce8d58fda4019eff9a9d51b446deb7102",
    "title": "Content Title",
    "timestamp": "2026-01-17T10:00:00.000Z"
  }
  ```
  - 결제 정보는 `payments.json` 파일에 저장되며 서버 재시작 후에도 유지됩니다.

---

### 6. 결제 정보 조회 API

**`GET /api/v1/payments/:transactionHash`**

트랜잭션 해시를 사용하여 결제 정보를 조회합니다.

- **인증**: Bearer Token (선택)
- **Request:** URL 파라미터
  - `transactionHash`: 트랜잭션 해시
- **Response:**
  ```json
  {
    "paymentId": "pay_1234567890",
    "status": "COMPLETED",
    "customerEmail": "customer@example.com",
    "location": "Gangnam, Seoul",
    "date": "2026-01-17",
    "timeSlot": "19:00",
    "paymentMethod": "USDT",
    "totalAmount": "50000000",
    "transactionHash": "0xd4b9e2de3d03f1077bae79312b492ffce8d58fda4019eff9a9d51b446deb7102",
    "title": "Content Title",
    "timestamp": "2026-01-17T10:00:00.000Z"
  }
  ```
- **에러 응답 (404):**
  ```json
  {
    "error": "Not Found",
    "message": "Payment data not found for transaction hash: 0x..."
  }
  ```

---

### 7. Health Check API

**`GET /health`**

서버 상태를 확인합니다.

- **인증**: 불필요
- **Request:** 없음
- **Response:**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-01-17T10:00:00.000Z",
    "server": "API Test Server",
    "port": 8888
  }
  ```

---

## 데이터 저장

- **결제 정보**: `payments.json` 파일에 저장 (서버 재시작 후에도 유지)
- **업로드 파일**: `uploads/` 디렉토리에 저장
- **정적 파일 서빙**: `/uploads/` 경로로 업로드된 파일 접근 가능
