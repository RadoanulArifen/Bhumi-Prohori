#!/usr/bin/env bash
# Local development uses the Vite proxy to the local FastAPI server.
cd "$(dirname "$0")/frontend" && VITE_API_BASE='' npm run dev
