// Simple health check script for debugging
// Load environment variables
try {
  const { config } = await import('dotenv');
  config();
  console.log('✅ Environment variables loaded from .env');
} catch (error) {
  console.log('📝 dotenv not available, using system environment variables');
}

import mongoose from 'mongoose';

console.log('🔍 Health Check Script Starting...');
console.log('📊 Environment Variables:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
console.log('- FRONTEND_URL:', process.env.FRONTEND_URL);

// Test MongoDB connection
async function testMongoDB() {
  try {
    if (!process.env.MONGODB_URI) {
      console.log('❌ MONGODB_URI not set');
      return false;
    }
    
    console.log('🔗 Testing MongoDB connection...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✅ MongoDB connection successful');
    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.log('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

testMongoDB().then((success) => {
  console.log('🏁 Health check completed:', success ? 'PASSED' : 'FAILED');
  process.exit(success ? 0 : 1);
}); 