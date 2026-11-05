import crypto from 'crypto';

export function hmac(algo: string, secret: string, payload: string) {
  return crypto.createHmac(algo, secret).update(payload).digest('hex');
}
