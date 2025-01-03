@echo off
set NODE_DIR=%~dp0node-v22.11.0-win-x64
set APP_DIR=%APPDATA%
:: start /min "Biometric" "%NODE_DIR%\node.exe" app.js
:: start http://localhost:3000

:: Create the application directory
IF NOT EXIST "%APP_DIR%" (
    mkdir "%APP_DIR%"
)

:: Extract application files
powershell -Command "Expand-Archive -Path biometric-express-main.zip -DestinationPath %APP_DIR% -Force"

:: Register and run the service
%NODE_PATH% registerService.js

echo Installation completed!
pause