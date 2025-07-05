# Vercel Deployment Guide

This guide explains how to deploy your Para Sports backend to Vercel.

## Prerequisites

1. Install Vercel CLI: `npm i -g vercel`
2. Create a Vercel account at https://vercel.com

## Environment Variables

Before deploying, set up these environment variables in your Vercel project:

1. **MONGODB_URI**: Your MongoDB connection string
2. **JWT_SECRET**: Your JWT secret key
3. **FRONTEND_URL**: Your frontend URL (for CORS)

### Adding Environment Variables

You can add them via:
- Vercel CLI: `vercel env add`
- Vercel Dashboard: Project Settings → Environment Variables

## Deployment Steps

1. **Login to Vercel**:
   ```bash
   vercel login
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

3. **Set Environment Variables** (if not done already):
   ```bash
   vercel env add MONGODB_URI
   vercel env add JWT_SECRET
   vercel env add FRONTEND_URL
   ```

## Important Notes

- The backend will be deployed as a serverless function
- File uploads will be stored in Vercel's temporary storage (consider using external storage like AWS S3 for production)
- Database connections are handled efficiently for serverless environments
- The API will be available at `https://your-project-name.vercel.app/api/`

## Testing Deployment

After deployment, test these endpoints:
- `GET /api/health` - Health check
- `GET /api/test` - Test endpoint
- `GET /` - Root endpoint

## Troubleshooting

- If you get build errors, check the function logs in Vercel Dashboard
- Ensure all environment variables are properly set
- For file upload issues, consider implementing external storage
