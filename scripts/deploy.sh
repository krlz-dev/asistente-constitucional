#!/bin/bash

# Deploy script for Vercel
# Run this to deploy the app with serverless backend

set -e

echo "=== Deploying to Vercel ==="

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy
echo ""
echo "Deploying to Vercel..."
echo "Note: You'll need to set GROQ_API_KEY as an environment variable in Vercel"
echo ""

vercel --prod

echo ""
echo "=== Deployment complete! ==="
echo ""
echo "IMPORTANT: Set your Groq API key in Vercel:"
echo "1. Go to your Vercel project settings"
echo "2. Navigate to Environment Variables"
echo "3. Add: GROQ_API_KEY = your_groq_key"
echo ""
