export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export function addSecurityHeaders(headers: Headers): void {
  for (const [key, value] of Object.entries(securityHeaders)) {
    headers.set(key, value);
  }
}

export function isValidOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  const allowedOrigins = [
    'https://fit.stevenduong.com',
    'https://staging.fit.stevenduong.com',
    'http://localhost:8787',
  ];
  return allowedOrigins.includes(origin);
}
