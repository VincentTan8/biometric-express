@echo off
set NODE_DIR=%~dp0node-v22.11.0-win-x64\node.exe
:: start /min "Biometric" "%NODE_DIR%\node.exe" app.js
:: start http://localhost:3000

:: Register and run the service
%NODE_DIR% registerService.js

echo Installation completed!
pause