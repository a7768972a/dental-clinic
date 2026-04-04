const { spawn } = require('child_process');
const path = require('path');

function startServer() {
  console.log('[' + new Date().toISOString() + '] Starting Next.js server...');
  
  const server = spawn('node', [
    path.join(__dirname, '../../node_modules/.bin/next'),
    'dev',
    '-p', '3000'
  ], {
    cwd: path.join(__dirname, '../..'),
    stdio: 'inherit',
    detached: false
  });

  server.on('exit', (code) => {
    console.log('[' + new Date().toISOString() + '] Server exited with code:', code);
    setTimeout(startServer, 1000);
  });

  server.on('error', (err) => {
    console.error('[' + new Date().toISOString() + '] Server error:', err);
    setTimeout(startServer, 1000);
  });
}

startServer();
