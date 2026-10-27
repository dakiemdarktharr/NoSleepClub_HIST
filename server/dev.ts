import { createServer } from 'node:http';
import rpc from './rpc.js';
import health from '../api/health.js';
createServer((req, res) => {
  // Vite's local proxy changes Host; allow only the two local development origins.
  // This adapter is never used by Vercel Functions, which keep strict same-origin checks.
  if (req.headers.origin === 'http://127.0.0.1:5173' || req.headers.origin === 'http://localhost:5173') req.headers.host = new URL(req.headers.origin).host;
  const path = req.url?.split('?')[0];
  if (path === '/api/rpc') void rpc(req, res);
  else if (path === '/api/health') void health(req, res);
  else { res.statusCode = 404; res.end(); }
}).listen(8787, '127.0.0.1', () => console.log('HIST API: http://127.0.0.1:8787'));
