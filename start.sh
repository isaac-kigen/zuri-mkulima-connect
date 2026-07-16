#!/bin/bash
set -e
PROJECT_DIR="/home/ubuntu/projects/deepseek_agent/work/mkulima_connect"
cd "$PROJECT_DIR"
echo "Starting Next.js server on port 3000..."
node node_modules/next/dist/bin/next start -p 3000
