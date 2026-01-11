// API 테스트 서버
// 사용법: 
//   1. npm install (최초 1회)
//   2. npm start 또는 node server.js
// 포트: 8888

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 8888;

// CORS 설정 (프론트엔드에서 요청 허용)
app.use(cors());
app.use(express.json());

// 파일 업로드를 위한 multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 업로드된 파일을 저장할 디렉토리
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // query string 또는 body에서 fileId 가져오기
    const fileId = req.query.fileId || req.body.fileId || `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const ext = path.extname(file.originalname);
    // fileId와 원본 파일명 조합
    const originalName = path.basename(file.originalname, ext);
    cb(null, `${fileId}_${originalName}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB 제한
  }
});

// 요청 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('  Body:', JSON.stringify(req.body, null, 2));
  }
  if (req.headers.authorization) {
    console.log('  Authorization:', req.headers.authorization.substring(0, 30) + '...');
  }
  next();
});

// 1. 지갑 로그인 API
// POST /api/v1/auth/login/wallet
app.post('/api/v1/auth/login/wallet', (req, res) => {
  const { walletAddress, chainID } = req.body;
  
  console.log('  Wallet Login Request:', { walletAddress, chainID });
  
  if (!walletAddress || !chainID) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'walletAddress and chainID are required'
    });
  }

  // Mock 응답 (실제로는 데이터베이스에서 사용자 조회 및 토큰 생성)
  const response = {
    accessToken: 'dummy_access_token_' + Date.now(),
    refreshToken: 'dummy_refresh_token_' + Date.now()
  };

  console.log('  ✓ Response:', response);
  res.json(response);
});

// 2. Presigned URL 발급 API
// POST /api/v1/uploads/presigned-url
app.post('/api/v1/uploads/presigned-url', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authorization header with Bearer token is required'
    });
  }

  const { filename, category, contentType } = req.body;
  
  console.log('  Presigned URL Request:', { filename, category, contentType });
  
  if (!filename || !category || !contentType) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'filename, category, and contentType are required'
    });
  }

  // Category 검증
  const validCategories = ['AD_VIDEO', 'AD_IMAGE', 'THUMBNAIL'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({
      error: 'Invalid category',
      message: `category must be one of: ${validCategories.join(', ')}`
    });
  }

  // UUID 생성 (간단한 버전)
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const fileId = `file_${timestamp}_${random}`;
  
  // Mock S3 presigned URL (실제로는 AWS SDK로 생성)
  // 10분 후 만료되는 presigned URL 시뮬레이션
  const uploadUrl = `https://s3.ap-northeast-2.amazonaws.com/my-bucket/${category.toLowerCase()}/${fileId}_${filename}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=test%2F20240101%2Fap-northeast-2%2Fs3%2Faws4_request&X-Amz-Date=${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z&X-Amz-Expires=600&X-Amz-SignedHeaders=host&X-Amz-Signature=mock_signature_for_testing`;
  
  // Mock CDN URL (업로드 완료 후 사용할 깔끔한 URL)
  // 실제 환경에서는 S3에 업로드된 후 CDN URL을 반환하지만, 테스트 환경에서는 서버의 uploads 폴더를 가리킴
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${fileId}_${filename}`;

  const response = {
    uploadUrl: `${req.protocol}://${req.get('host')}/api/v1/uploads/upload?fileId=${fileId}&category=${category}`, // 테스트 서버의 업로드 엔드포인트로 변경
    fileUrl,
    fileId
  };

  console.log('  ✓ Response:', JSON.stringify(response, null, 2));
  res.json(response);
});

// 2-1. 파일 업로드 엔드포인트 (프록시 방식, S3 대신 서버에 저장)
// 파일 업로드 로깅 미들웨어 (multer 이전에 실행되어야 함)
app.use('/api/v1/uploads/upload', (req, res, next) => {
  if (req.method === 'POST') {
    console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log('  Query:', req.query);
    if (req.headers.authorization) {
      console.log('  Authorization:', req.headers.authorization.substring(0, 30) + '...');
    }
  }
  next();
});

app.post('/api/v1/uploads/upload', upload.single('file'), (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authorization header with Bearer token is required'
    });
  }

  const { fileId, category } = req.query;
  const file = req.file;

  console.log('  File Upload Request:', { 
    fileId, 
    category, 
    originalName: file?.originalname,
    filename: file?.filename,
    size: file?.size,
    mimetype: file?.mimetype
  });

  if (!file) {
    return res.status(400).json({
      error: 'No file uploaded',
      message: 'File is required'
    });
  }

  // 업로드 성공 응답
  const finalFileId = fileId || `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
  
  const response = {
    success: true,
    fileId: finalFileId,
    fileUrl,
    filename: file.filename,
    originalName: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
    category: category || 'UNKNOWN'
  };

  console.log('  ✓ File uploaded:', response);
  res.json(response);
});

// 업로드된 파일 서빙 (정적 파일)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 3. 광고 소재 등록 API
// POST /api/v1/ad-creatives
app.post('/api/v1/ad-creatives', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authorization header with Bearer token is required'
    });
  }

  const { title, type, mediaUrl, thumbnailUrl, width, height, duration } = req.body;
  
  console.log('  Ad Creative Request:', { 
    title, 
    type, 
    mediaUrl, 
    thumbnailUrl, 
    width, 
    height, 
    duration 
  });
  
  // 필수 필드 검증
  if (!title || !type || !mediaUrl || !width || !height) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'title, type, mediaUrl, width, and height are required'
    });
  }

  // Type 검증
  if (type !== 'VIDEO' && type !== 'IMAGE') {
    return res.status(400).json({
      error: 'Invalid type',
      message: 'type must be either VIDEO or IMAGE'
    });
  }

  // Width, Height 검증 (숫자여야 함)
  if (isNaN(Number(width)) || isNaN(Number(height))) {
    return res.status(400).json({
      error: 'Invalid dimensions',
      message: 'width and height must be valid numbers'
    });
  }

  // VIDEO 타입인데 duration이 없으면 경고 (필수는 아님)
  if (type === 'VIDEO' && !duration) {
    console.log('  ⚠ Warning: VIDEO type without duration');
  }

  // Mock 응답 (실제로는 데이터베이스에 저장하고 ID 생성)
  const adCreativeId = `crt_${Date.now()}`;
  const response = {
    adCreativeId,
    status: 'REVIEW_PENDING'
  };

  console.log('  ✓ Response:', response);
  res.json(response);
});

// 4. 결제 정보 저장 API
// POST /api/v1/payments
app.post('/api/v1/payments', (req, res) => {
  const authHeader = req.headers.authorization;
  
  // Authorization은 선택사항 (accessToken이 있을 수 있음)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('  Authorization:', authHeader.substring(0, 30) + '...');
  }

  const { customerEmail, location, date, timeSlot, paymentMethod, totalAmount } = req.body;
  
  console.log('  Payment Request:', { 
    customerEmail, 
    location, 
    date, 
    timeSlot, 
    paymentMethod, 
    totalAmount 
  });
  
  // 필수 필드 검증
  if (!customerEmail || !location || !date || !timeSlot || !paymentMethod || !totalAmount) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'customerEmail, location, date, timeSlot, paymentMethod, and totalAmount are required'
    });
  }

  // Email 형식 검증 (간단한 검증)
  if (!customerEmail.includes('@')) {
    return res.status(400).json({
      error: 'Invalid email format',
      message: 'customerEmail must be a valid email address'
    });
  }

  // Payment Method 검증
  if (paymentMethod !== 'USDT') {
    return res.status(400).json({
      error: 'Invalid payment method',
      message: 'paymentMethod must be USDT'
    });
  }

  // Total Amount 검증 (wei 단위, string 형식이어야 함)
  if (typeof totalAmount !== 'string' || !/^\d+$/.test(totalAmount)) {
    return res.status(400).json({
      error: 'Invalid totalAmount format',
      message: 'totalAmount must be a string containing only digits (wei unit)'
    });
  }

  // Date 형식 검증 (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      error: 'Invalid date format',
      message: 'date must be in YYYY-MM-DD format'
    });
  }

  // Time Slot 형식 검증 (HH:MM-HH:MM 또는 HH:MM)
  if (!/^\d{2}:\d{2}(-\d{2}:\d{2})?$/.test(timeSlot)) {
    return res.status(400).json({
      error: 'Invalid timeSlot format',
      message: 'timeSlot must be in HH:MM or HH:MM-HH:MM format'
    });
  }

  // Mock 응답 (실제로는 데이터베이스에 저장하고 ID 생성)
  const paymentId = `pay_${Date.now()}`;
  const response = {
    paymentId,
    status: 'COMPLETED',
    customerEmail,
    location,
    date,
    timeSlot,
    paymentMethod,
    totalAmount,
    timestamp: new Date().toISOString()
  };

  console.log('  ✓ Payment information saved:', response);
  res.json(response);
});

// Health check 엔드포인트
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'API Test Server',
    port: PORT
  });
});

// 루트 경로
app.get('/', (req, res) => {
  res.json({
    message: 'API Test Server is running',
    endpoints: {
      walletLogin: 'POST /api/v1/auth/login/wallet',
      presignedUrl: 'POST /api/v1/uploads/presigned-url',
      fileUpload: 'POST /api/v1/uploads/upload',
      adCreative: 'POST /api/v1/ad-creatives',
      payment: 'POST /api/v1/payments',
      health: 'GET /health'
    },
    port: PORT
  });
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
      availableEndpoints: [
      'POST /api/v1/auth/login/wallet',
      'POST /api/v1/uploads/presigned-url',
      'POST /api/v1/uploads/upload',
      'POST /api/v1/ad-creatives',
      'POST /api/v1/payments',
      'GET /health',
      'GET /'
    ]
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log('='.repeat(70));
  console.log(`🚀 API Test Server is running on http://localhost:${PORT}`);
  console.log('='.repeat(70));
  console.log('\n📋 Available endpoints:');
  console.log(`   POST   http://localhost:${PORT}/api/v1/auth/login/wallet`);
  console.log(`   POST   http://localhost:${PORT}/api/v1/uploads/presigned-url`);
  console.log(`   POST   http://localhost:${PORT}/api/v1/uploads/upload`);
  console.log(`   POST   http://localhost:${PORT}/api/v1/ad-creatives`);
  console.log(`   POST   http://localhost:${PORT}/api/v1/payments`);
  console.log(`   GET    http://localhost:${PORT}/health`);
  console.log(`   GET    http://localhost:${PORT}/`);
  console.log('\n💡 Press Ctrl+C to stop the server\n');
});

// 에러 핸들링
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

