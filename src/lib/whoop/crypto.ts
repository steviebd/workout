const ENCRYPTION_KEY_BASE64 = typeof process !== 'undefined' ? process.env.WHOOP_TOKEN_ENCRYPTION_KEY : undefined;

export function getEncryptionKey(): Uint8Array {
  if (!ENCRYPTION_KEY_BASE64) {
    throw new Error('WHOOP_TOKEN_ENCRYPTION_KEY environment variable not set');
  }
  const isHex = /^[0-9a-fA-F]+$/.test(ENCRYPTION_KEY_BASE64);
  const key = Buffer.from(ENCRYPTION_KEY_BASE64, isHex ? 'hex' : 'base64');
  if (key.length !== 32) {
    throw new Error('WHOOP_TOKEN_ENCRYPTION_KEY must be 32 bytes (256 bits)');
  }
  return key;
}

export async function encryptToken(plaintext: string): Promise<string> {
  const key = getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return Buffer.from(combined).toString('base64');
}

export async function decryptToken(blob: string): Promise<string> {
  const key = getEncryptionKey();
  const combined = new Uint8Array(Buffer.from(blob, 'base64'));
  const iv = combined.subarray(0, 12);
  const encrypted = combined.subarray(12);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
