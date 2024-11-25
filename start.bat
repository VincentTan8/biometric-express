@echo off
set NODE_DIR=%~dp0node-v22.11.0-win-x64
start /min "Biometric" "%NODE_DIR%\node.exe" app.js
start http://localhost:3000