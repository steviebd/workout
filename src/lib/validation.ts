export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isStrongPassword(password: string): boolean {
  return password.length >= 8;
}

export function trimObject<T extends Record<string, unknown>>(obj: T): T {
  const trimmed: Record<string, unknown> = {};
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      trimmed[key] = (obj[key] as string).trim();
    } else {
      trimmed[key] = obj[key];
    }
  }
  return trimmed as T;
}
