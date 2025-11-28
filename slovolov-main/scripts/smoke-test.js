#!/usr/bin/env node

// Simple smoke test for local endpoints with Basic Auth
// Usage: node scripts/smoke-test.js

const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
const username = process.env.ADMIN_USERNAME || 'admin';
const password = process.env.ADMIN_PASSWORD || 'vstravel995';

function b64(s) {
  return Buffer.from(s, 'ascii').toString('base64');
}

async function call(path, options = {}) {
  const headers = Object.assign(
    {
      'Content-Type': 'application/json',
    },
    options.headers || {}
  );

  // Add Basic Auth for protected endpoints (everything except /api/health and /api/ai-availability)
  if (!['/api/health', '/api/ai-availability'].includes(path)) {
    headers['Authorization'] = `Basic ${b64(`${username}:${password}`)}`;
  }

  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    // ignore
  }

  return { status: res.status, json, ok: res.ok, url };
}

(async () => {
  const results = [];

  // Health
  results.push({ name: 'health', ...(await call('/api/health')) });

  // AI availability (no auth)
  results.push({ name: 'ai-availability', ...(await call('/api/ai-availability')) });

  // Regions tree (expect 401 without token)
  results.push({
    name: 'regions-tree',
    ...(await call('/api/yandex-wordstat/regions-tree', { method: 'POST', body: {} })),
  });

  // Dynamics monthly with mid-month fromDate (expect 401 without token, but route should not 500)
  results.push({
    name: 'dynamics-monthly',
    ...(await call('/api/yandex-wordstat/dynamics', {
      method: 'POST',
      body: { phrase: 'тест', period: 'monthly', fromDate: '2024-03-15', toDate: '2024-05-20' },
    })),
  });

  // Print summary
  for (const r of results) {
    console.log(`\n=== ${r.name} [${r.status}] ${r.ok ? 'OK' : 'ERR'} => ${r.url}`);
    if (r.json) {
      const preview = JSON.stringify(r.json).slice(0, 300);
      console.log(preview + (preview.length === 300 ? '…' : ''));
    } else {
      console.log('(no JSON)');
    }
  }

  // Exit code: 0 if health=200 and ai-availability=200 and others not 500
  const healthOk = results.find(r => r.name === 'health')?.status === 200;
  const aiAvailOk = results.find(r => r.name === 'ai-availability')?.status === 200;
  const noServerErrors = results.every(r => r.status !== 500);
  if (healthOk && aiAvailOk && noServerErrors) {
    process.exit(0);
  } else {
    process.exit(1);
  }
})();
