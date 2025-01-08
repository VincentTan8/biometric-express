#!/bin/bash

# Define variables
SERVICE_NAME="com.nodeapp.biometrics"
PLIST_PATH=~/Library/LaunchAgents/${SERVICE_NAME}.plist

# Unload the service
echo "Unloading the service..."
launchctl unload "$PLIST_PATH" 2>/dev/null

# Remove the .plist file
if [ -f "$PLIST_PATH" ]; then
    echo "Removing the plist file: $PLIST_PATH"
    rm "$PLIST_PATH"
else
    echo "Plist file not found at $PLIST_PATH."
fi

# Verify the service is removed
if launchctl list | grep -q "${SERVICE_NAME}"; then
    echo "Service '${SERVICE_NAME}' is still listed. Please check manually."
else
    echo "Service '${SERVICE_NAME}' uninstalled successfully."
fi
