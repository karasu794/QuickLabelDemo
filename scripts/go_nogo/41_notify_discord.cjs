import https from 'https';
const url = process.env.DISCORD_WEBHOOK_URL;
const content = process.argv[2] || 'Go/No-Go status';
if (!url) { console.log('[WARN] DISCORD_WEBHOOK_URL not set, skipping'); process.exit(0); }
const payload = JSON.stringify({ content });
const u = new URL(url);
const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } }, (res) => { console.log('[Discord] status', res.statusCode); });
req.on('error', e => console.error(e));
req.write(payload); req.end();
