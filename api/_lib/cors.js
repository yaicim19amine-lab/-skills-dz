export function setCorsHeaders(res, origin) {
  const allowedOrigins = [
    'https://skills-dz.vercel.app',
    'http://localhost:3000',
    'http://localhost:8080',
  ];
  const reqOrigin = origin || '*';
  const allowed = allowedOrigins.includes(reqOrigin) ? reqOrigin : allowedOrigins[0];

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
}

export function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res, req.headers.origin);
    res.status(200).end();
    return true;
  }
  return false;
}

export function jsonError(res, status, message) {
  setCorsHeaders(res);
  res.status(status).json({ error: message });
}

export function jsonResponse(res, status, data) {
  setCorsHeaders(res);
  res.status(status).json(data);
}
