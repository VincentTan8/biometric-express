const Service = require('node-windows').Service;

const svc = new Service({
  name: 'Biometrics'
});

svc.on('uninstall', () => {
  console.log('Service uninstalled successfully');
});

svc.uninstall();
