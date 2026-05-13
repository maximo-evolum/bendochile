import { spawn } from 'child_process';

const run = (command, args, name) => {
  const child = spawn(command, args, { stdio: 'inherit', shell: true });
  child.on('exit', (code) => {
    if (code !== 0) console.log(`${name} terminó con código ${code}`);
  });
  return child;
};

const api = run('node', ['server.js'], 'API');
const web = run('npx', ['vite', '--host', '0.0.0.0', '--port', '3000'], 'Frontend');

process.on('SIGINT', () => {
  api.kill();
  web.kill();
  process.exit();
});
