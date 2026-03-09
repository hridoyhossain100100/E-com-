@echo off
echo ============================================
echo   ShopVibe E-Commerce - Starting...
echo ============================================
echo.
echo Starting Next.js (Frontend + API) on Port 3000...
start cmd /k "cd client && npm run dev"
echo.
echo Next.js is starting! Open http://localhost:3000
echo.
echo NOTE: The Express backend server is no longer needed.
echo       All API routes are handled by Next.js API routes.
echo ============================================
