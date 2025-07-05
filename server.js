// Load environment variables in development
if (process.env.NODE_ENV !== 'production') {
  try {
    const { config } = await import('dotenv');
    config();
  } catch (error) {
    console.log('📝 dotenv not available, using environment variables');
  }
}

// Debug environment variables
console.log('🔍 Environment Check:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
console.log('- FRONTEND_URL:', process.env.FRONTEND_URL);

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';

// Import routes
import playerRoutes from './routes/playerRoutes.js';
import idcardRoutes from './routes/idcardRoutes.js';    

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1); // trust first proxy

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for development
  crossOriginEmbedderPolicy: false
}));
app.use(compression()); // Enable gzip compression

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
  // Add your production frontend URL here
  'https://your-frontend-app.onrender.com'
].filter(Boolean);

console.log('🌐 Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware with optimized limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb'
}));

// Serve static files with caching
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));
app.use('/idcards', express.static(path.join(__dirname, 'idcards'), {
  maxAge: '7d',
  etag: true,
  lastModified: true
}));

// Routes
app.use('/api/players', playerRoutes);
app.use('/api/idcards', idcardRoutes);

// Health check route with caching
app.get('/api/health', (req, res) => {
  res.set('Cache-Control', 'public, max-age=30');
  res.json({ 
    message: 'Para Sports ID Card API is running!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Test route
app.get('/api/test', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ 
    message: 'Server is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root route
app.get('/', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ 
    message: 'Para Sports ID Card Generator API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      test: '/api/test',
      players: '/api/players',
      idcards: '/api/idcards'
    }
  });
});

// Favicon handler to prevent 500 errors on /favicon.ico
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No Content
});

// Error handling middleware
app.use(errorHandler);

// Catch-all 404 handler (must be after all other routes)
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Remove or conditionally disable app.listen and server tuning for serverless
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.error('❌ MONGODB_URI not set in environment variables.');
      console.error('🔧 Please set MONGODB_URI in your Render environment variables.');
      throw new Error('MongoDB URI is required');
    }
    
    console.log('🌐 Attempting to connect to MongoDB...');
    console.log('🔗 MongoDB URI prefix:', mongoURI.substring(0, 30) + '...');
    
    // Add connection event listeners
    mongoose.connection.on('connected', () => {
      console.log('✅ Mongoose connected to MongoDB');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('📡 Mongoose disconnected');
    });
    
    await mongoose.connect(mongoURI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      w: 'majority',
    });
    
    isConnected = true;
    console.log('✅ Connected to MongoDB successfully!');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('🔍 Error details:', error);
    // Don't throw in production, let the app start without DB
    if (process.env.NODE_ENV === 'production') {
      console.error('🔄 Starting server without MongoDB connection...');
      return;
    }
    throw error;
  }
};

// Start the server for all environments (including Render)
const startServer = async () => {
  try {
    console.log('🚀 Starting Para Sports Backend Server...');
    console.log('📊 Environment:', process.env.NODE_ENV || 'development');
    console.log('🔧 Port:', PORT);
    
    // Connect to MongoDB first
    await connectDB();
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`🌐 Server URL: http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
    
    // Configure server settings
    server.maxConnections = 100;
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        mongoose.connection.close(() => {
          console.log('✅ MongoDB connection closed');
          process.exit(0);
        });
      });
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;

