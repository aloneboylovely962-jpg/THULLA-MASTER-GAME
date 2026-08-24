export function writeHealth(res, { rooms, startedAt }) {
  const payload = {
    ok: true,
    service: 'thulla-multiplayer',
    rooms,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  };
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(payload));
}
