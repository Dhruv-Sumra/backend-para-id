import app from '../server.js';

// For Vercel serverless functions, we need to handle the connection differently
// Export a handler that ensures connection before processing requests
export default app;
