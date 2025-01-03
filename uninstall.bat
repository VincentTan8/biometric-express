@echo off
set NODE_DIR=%~dp0node-v22.11.0-win-x64

:: Uninstall the service
%NODE_PATH% uninstallService.js

echo Uninstall finished!
pause