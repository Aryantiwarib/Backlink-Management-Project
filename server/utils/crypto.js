import crypto from 'crypto';

// Use ENCRYPTION_KEY if set, otherwise derive key from SESSION_SECRET or fallback
const RAW_KEY = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET || 'linkora-encryption-secret-key-32chars!';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// Ensure 32-byte key using SHA-256
const KEY = crypto.createHash('sha256').update(String(RAW_KEY)).digest();

/**
 * Encrypt a plaintext string token at rest using AES-256-GCM.
 * Format: iv:authTag:encryptedHex
 */
export function encryptToken(text) {
  if (!text || typeof text !== 'string') return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted token.
 */
export function decryptToken(encryptedData) {
  if (!encryptedData || typeof encryptedData !== 'string') return null;
  
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    // If not encrypted in standard format, return as-is for backward safety
    return encryptedData;
  }
  
  const [ivHex, tagHex, encryptedHex] = parts;
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[Crypto] Failed to decrypt token:', err.message);
    return null;
  }
}
