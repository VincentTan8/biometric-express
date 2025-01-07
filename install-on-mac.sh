#!/bin/bash

# Define variables
SERVICE_NAME="com.nodeapp.biometrics"
PLIST_PATH=~/Library/LaunchAgents/${SERVICE_NAME}.plist
NODE_PATH=$(pwd)/node-v22.12.0-darwin-x64/bin/node #path to the Node.js binary for mac
APP_PATH=$(pwd)/app.js  # Path to your app.js (modify as needed)
CWD_PATH=$(pwd)/    # current working directory

# Create the .plist file
echo "Creating .plist file for service: $SERVICE_NAME..."
cat <<EOL > "$PLIST_PATH"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${SERVICE_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${NODE_PATH}</string>
        <string>${APP_PATH}</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${CWD_PATH}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/${SERVICE_NAME}.out.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/${SERVICE_NAME}.err.log</string>
</dict>
</plist>
EOL

echo "Plist created at $PLIST_PATH."

# Load the service
echo "Loading the service with launchctl..."
launchctl unload "$PLIST_PATH" 2>/dev/null # Unload if already loaded
launchctl load "$PLIST_PATH"

# Verify service status
echo "Service loaded. Checking status..."
launchctl list | grep "${SERVICE_NAME}"

# Completion message
echo "Setup complete. The service '${SERVICE_NAME}' is now configured."
