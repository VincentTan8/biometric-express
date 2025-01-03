const path = require('path')
const Service = require('node-windows').Service

const appDataPath = path.join(process.env.APPDATA, 'biometric-express-main', 'app.js')

const svc = new Service({
  name: 'Biometrics', 
  description: 'Node app running to maintain connection to biometric device', 
  script: appDataPath, 
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

// Install the service
svc.install()
