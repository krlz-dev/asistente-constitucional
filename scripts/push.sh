#!/bin/bash

# Push script for abogado-constitucional
# Run this script to commit and push changes to GitHub

set -e

echo "=== Adding changes ==="
git add -A

echo ""
echo "=== Committing ==="
git commit -m "Update: Add Groq API integration with Vercel serverless

- Add serverless API endpoint for Groq
- Update frontend to use new API
- Remove client-side API key requirement
- Add Vercel configuration
- Update README with deployment instructions

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>" || echo "No changes to commit"

echo ""
echo "=== Pushing to GitHub ==="
git push -u origin master

echo ""
echo "=== Done! ==="
echo ""
echo "To deploy to Vercel, run: ./scripts/deploy.sh"
