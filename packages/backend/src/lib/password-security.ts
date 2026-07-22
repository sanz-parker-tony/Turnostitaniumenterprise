import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
const KEY_LENGTH = 64;
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;

function derivePasswordKey(password: string, salt: Buffer, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      keyLength,
      { N: COST, r: BLOCK_SIZE, p: PARALLELIZATION },
      (error, derivedKey) => error ? reject(error) : resolve(derivedKey)
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(32);
  const derived = await derivePasswordKey(password, salt, KEY_LENGTH);
  return [
    'scrypt',
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const stored = String(encodedHash || '').trim();
  if (stored.startsWith('scrypt$')) {
    const [, costRaw, blockSizeRaw, parallelRaw, saltRaw, hashRaw] = stored.split('$');
    const cost = Number(costRaw);
    const blockSize = Number(blockSizeRaw);
    const parallelization = Number(parallelRaw);
    if (!saltRaw || !hashRaw || cost !== COST || blockSize !== BLOCK_SIZE || parallelization !== PARALLELIZATION) {
      return false;
    }
    const expected = Buffer.from(hashRaw, 'base64url');
    if (expected.length !== KEY_LENGTH) return false;
    const actual = await derivePasswordKey(password, Buffer.from(saltRaw, 'base64url'), expected.length);
    return timingSafeEqual(actual, expected);
  }

  // Compatibilidad transitoria: al autenticar correctamente un hash SHA-256
  // histórico, el flujo de login lo reemplaza inmediatamente por scrypt.
  if (/^[a-f0-9]{64}$/i.test(stored)) {
    const actual = Buffer.from(createHash('sha256').update(password, 'utf8').digest('hex'), 'hex');
    const expected = Buffer.from(stored, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
  return false;
}

export function passwordHashNeedsUpgrade(encodedHash: string): boolean {
  return !String(encodedHash || '').startsWith(`scrypt$${COST}$${BLOCK_SIZE}$${PARALLELIZATION}$`);
}
