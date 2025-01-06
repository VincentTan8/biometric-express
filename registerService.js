const path = require('path')
const Service = require('node-windows').Service

const appPath = path.join(process.cwd(), 'app.js')

const svc = new Service({
  name: 'Biometrics', 
  description: 'Node app running to maintain connection to biometric device', 
  script: appPath, 
  env: [{
    name: 'NODE_ENV',
    value: 'production' 
  }]
})

// Listen for the "install" event, which indicates the service was successfully installed
svc.on('install', () => {
  console.log('Service installed successfully')
  svc.start()
})

if(svc.exists) {
  console.log('Service is already installed');
  svc.start(); // Start the service if already installed
}

// Install the service
svc.install()
