@echo off
echo Starting the Backend Server on Port 5000...
start cmd /k "cd server && npm run dev"

echo Starting the Frontend Client on Port 3000...
start cmd /k "cd client && npm run dev"

echo Both Client and Server are starting in separate windows!
