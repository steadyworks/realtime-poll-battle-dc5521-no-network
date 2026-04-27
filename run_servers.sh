#!/bin/bash
set -e

# Install and start the Flask backend
cd /app/backend
pip install -r requirements.txt
python app.py &

# Install and start the Vite frontend
cd /app/frontend
npm install
npm run build && npx vite preview --port 3000 --host 0.0.0.0 --strictPort &
