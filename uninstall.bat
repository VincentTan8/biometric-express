@echo off
set NODE_DIR=%~dp0node-v22.11.0-win-x64\node.exe

:: Uninstall the service
%NODE_DIR% uninstallService.js

echo Uninstall finished!
pause