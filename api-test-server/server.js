// API Test Server
// Usage:
//   1. npm install (first time only)
//   2. npm start or node server.js
// Port: 8888

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 8888;

// CORS configuration (allow requests from frontend)
app.use(cors());
app.use(express.json());

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Directory to store uploaded files
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Get fileId from query string or body
    const fileId = req.query.fileId || req.body.fileId || `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const ext = path.extname(file.originalname);
    // Combine fileId with original filename
    const originalName = path.basename(file.originalname, ext);
    cb(null, `${fileId}_${originalName}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Payment data storage file
const PAYMENTS_FILE = path.join(__dirname, 'payments.json');

// Load payments from JSON file
let paymentsStore = new Map();
function loadPayments() {
  try {
    if (fs.existsSync(PAYMENTS_FILE)) {
      const data = fs.readFileSync(PAYMENTS_FILE, 'utf8');
      const payments = JSON.parse(data);
      paymentsStore = new Map(Object.entries(payments));
      console.log(`  ✓ Loaded ${paymentsStore.size} payment(s) from ${PAYMENTS_FILE}`);
    } else {
      console.log(`  ✓ No existing payments file, starting fresh`);
    }
  } catch (error) {
    console.error('  ✗ Error loading payments:', error);
    paymentsStore = new Map();
  }
}

// Save payments to JSON file
function savePayments() {
  try {
    const paymentsObj = Object.fromEntries(paymentsStore);
    fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(paymentsObj, null, 2), 'utf8');
    console.log(`  ✓ Saved ${paymentsStore.size} payment(s) to ${PAYMENTS_FILE}`);
  } catch (error) {
    console.error('  ✗ Error saving payments:', error);
  }
}

// Load payments on server start
loadPayments();

// Request logging middleware
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

// 1. Wallet Login API
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

  // Mock response (in production, query user from database and generate tokens)
  const response = {
    accessToken: 'dummy_access_token_' + Date.now(),
    refreshToken: 'dummy_refresh_token_' + Date.now()
  };

  console.log('  ✓ Response:', response);
  res.json(response);
});

// 2. Presigned URL API
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

  // Category validation
  const validCategories = ['AD_VIDEO', 'AD_IMAGE', 'THUMBNAIL'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({
      error: 'Invalid category',
      message: `category must be one of: ${validCategories.join(', ')}`
    });
  }

  // Generate UUID (simple version)
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const fileId = `file_${timestamp}_${random}`;
  
  // Mock S3 presigned URL (in production, generate using AWS SDK)
  // Simulate presigned URL that expires after 10 minutes
  const uploadUrl = `https://s3.ap-northeast-2.amazonaws.com/my-bucket/${category.toLowerCase()}/${fileId}_${filename}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=test%2F20240101%2Fap-northeast-2%2Fs3%2Faws4_request&X-Amz-Date=${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z&X-Amz-Expires=600&X-Amz-SignedHeaders=host&X-Amz-Signature=mock_signature_for_testing`;
  
  // Mock CDN URL (clean URL to use after upload completion)
  // In production, return CDN URL after uploading to S3, but in test environment, point to server's uploads folder
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${fileId}_${filename}`;

  const response = {
    uploadUrl: `${req.protocol}://${req.get('host')}/api/v1/uploads/upload?fileId=${fileId}&category=${category}`, // Changed to test server's upload endpoint
    fileUrl,
    fileId
  };

  console.log('  ✓ Response:', JSON.stringify(response, null, 2));
  res.json(response);
});

// 2-1. File Upload Endpoint (proxy mode, save to server instead of S3)
// File upload logging middleware (must run before multer)
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

  // Upload success response
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

// Serve uploaded files (static files)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 3. Ad Creative Registration API
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
  
  // Required field validation
  if (!title || !type || !mediaUrl || !width || !height) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'title, type, mediaUrl, width, and height are required'
    });
  }

  // Type validation
  if (type !== 'VIDEO' && type !== 'IMAGE') {
    return res.status(400).json({
      error: 'Invalid type',
      message: 'type must be either VIDEO or IMAGE'
    });
  }

  // Width, Height validation (must be numbers)
  if (isNaN(Number(width)) || isNaN(Number(height))) {
    return res.status(400).json({
      error: 'Invalid dimensions',
      message: 'width and height must be valid numbers'
    });
  }

  // Warning if VIDEO type without duration (not required)
  if (type === 'VIDEO' && !duration) {
    console.log('  ⚠ Warning: VIDEO type without duration');
  }

  // Mock response (in production, save to database and generate ID)
  // Ad creatives are registered in 'Active' status immediately upon registration
  const adCreativeId = `crt_${Date.now()}`;
  const response = {
    adCreativeId,
    status: 'Active'
  };

  console.log('  ✓ Response:', response);
  res.json(response);
});

// 4. Payment Information Storage API
// POST /api/v1/payments
app.post('/api/v1/payments', (req, res) => {
  const authHeader = req.headers.authorization;
  
  // Authorization is optional (accessToken may be present)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('  Authorization:', authHeader.substring(0, 30) + '...');
  }

  const { customerEmail, location, date, timeSlot, paymentMethod, totalAmount, transactionHash, title } = req.body;
  
  console.log('  Payment Request:', { 
    customerEmail, 
    location, 
    date, 
    timeSlot, 
    paymentMethod, 
    totalAmount,
    transactionHash,
    title
  });
  
  // Required field validation
  if (!customerEmail || !location || !date || !timeSlot || !paymentMethod || !totalAmount) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'customerEmail, location, date, timeSlot, paymentMethod, and totalAmount are required'
    });
  }
  
  // Transaction hash validation (save if present)
  if (transactionHash && typeof transactionHash !== 'string') {
    return res.status(400).json({
      error: 'Invalid transactionHash format',
      message: 'transactionHash must be a string'
    });
  }

  // Email format validation (simple validation)
  if (!customerEmail.includes('@')) {
    return res.status(400).json({
      error: 'Invalid email format',
      message: 'customerEmail must be a valid email address'
    });
  }

  // Payment Method validation
  if (paymentMethod !== 'USDT') {
    return res.status(400).json({
      error: 'Invalid payment method',
      message: 'paymentMethod must be USDT'
    });
  }

  // Total Amount validation (wei unit, must be string format)
  if (typeof totalAmount !== 'string' || !/^\d+$/.test(totalAmount)) {
    return res.status(400).json({
      error: 'Invalid totalAmount format',
      message: 'totalAmount must be a string containing only digits (wei unit)'
    });
  }

  // Date format validation (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      error: 'Invalid date format',
      message: 'date must be in YYYY-MM-DD format'
    });
  }

  // Time Slot format validation (HH:MM-HH:MM or HH:MM)
  if (!/^\d{2}:\d{2}(-\d{2}:\d{2})?$/.test(timeSlot)) {
    return res.status(400).json({
      error: 'Invalid timeSlot format',
      message: 'timeSlot must be in HH:MM or HH:MM-HH:MM format'
    });
  }

  // Save payment data (in production, use a database)
  const paymentId = `pay_${Date.now()}`;
  const paymentData = {
    paymentId,
    status: 'COMPLETED',
    customerEmail,
    location,
    date,
    timeSlot,
    paymentMethod,
    totalAmount,
    transactionHash: transactionHash || null,
    title: title || null,
    timestamp: new Date().toISOString()
  };

  // Store payment data by transaction hash if available, otherwise by payment ID
  if (transactionHash) {
    paymentsStore.set(transactionHash.toLowerCase(), paymentData);
  }
  paymentsStore.set(paymentId, paymentData);

  // Save to JSON file
  savePayments();

  console.log('  ✓ Payment information saved:', paymentData);
  console.log(`  ✓ Total payments stored: ${paymentsStore.size}`);
  
  res.json(paymentData);
});

// 4-1. Payment Information Retrieval API
// GET /api/v1/payments/:transactionHash
app.get('/api/v1/payments/:transactionHash', (req, res) => {
  const authHeader = req.headers.authorization;
  
  // Authorization is optional (accessToken may be present)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('  Authorization:', authHeader.substring(0, 30) + '...');
  }

  const { transactionHash } = req.params;
  
  console.log('  Get Payment Request:', { transactionHash });
  
  if (!transactionHash) {
    return res.status(400).json({
      error: 'Missing transactionHash',
      message: 'transactionHash is required'
    });
  }

  // Find payment data by transaction hash
  const paymentData = paymentsStore.get(transactionHash.toLowerCase());
  
  if (!paymentData) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Payment data not found for transaction hash: ${transactionHash}`
    });
  }

  console.log('  ✓ Payment data found:', paymentData);
  res.json(paymentData);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'API Test Server',
    port: PORT
  });
});

// Root path
app.get('/', (req, res) => {
  res.json({
    message: 'API Test Server is running',
    endpoints: {
      walletLogin: 'POST /api/v1/auth/login/wallet',
      presignedUrl: 'POST /api/v1/uploads/presigned-url',
      fileUpload: 'POST /api/v1/uploads/upload',
      adCreative: 'POST /api/v1/ad-creatives',
      payment: 'POST /api/v1/payments',
      getPayment: 'GET /api/v1/payments/:transactionHash',
      health: 'GET /health'
    },
    port: PORT
  });
});

// 404 handler
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
      'GET /api/v1/payments/:transactionHash',
      'GET /health',
      'GET /'
    ]
  });
});

// Start server
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
  console.log(`   GET    http://localhost:${PORT}/api/v1/payments/:transactionHash`);
  console.log(`   GET    http://localhost:${PORT}/health`);
  console.log(`   GET    http://localhost:${PORT}/`);
  console.log('\n💡 Press Ctrl+C to stop the server\n');
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

