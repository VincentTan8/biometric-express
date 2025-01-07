Node binaries and node_modules have been included, to run just execute
* install-on-windows.bat
or
* install-on-mac.sh

To uninstall the service, just execute
* uninstall-on-windows.bat
or
* uninstall-on-mac.sh

Make sure that the biometric device and the machine running the program are connected to the same network. Connection will fail if they are not connected to the same network.

Note: 
* main.js is what index.html uses but is NOT the js file to run
* bio.js is a class used to communicated with the node-zklib library
* app.js is the main file needed to run the project
* node-zklib has been edited for the project's needs, part of it's commit history is somewhere else
* index.html will look for update.json immediately, press cancel afterwards to enter update file manually

If you are not depending on the included node binaries and node_modules then:

- Install Node.js

Navigate to the project directory then run: 
* npm install
* node app.js

Then open localhost:3000 on your preferred browser