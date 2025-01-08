const path = require('path')
const Service = require('node-windows').Service;

const appPath = path.join(process.cwd(), 'app.js')

const svc = new Service({
  name: 'Biometrics',
  script: appPath,
});

svc.on('uninstall', () => {
  console.log('Service uninstalled successfully');
});

svc.uninstall();
