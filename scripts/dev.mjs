import { spawn } from 'node:child_process';
import './assets.mjs';
const children = [
  spawn(process.execPath, ['--import', 'tsx', 'server/dev.ts'], { stdio: 'inherit', env: process.env }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], { stdio: 'inherit', env: process.env }),
];
const stop = () => { for (const child of children) child.kill(); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const child of children) child.on('exit', code => { if (code) { stop(); process.exitCode = code; } });
