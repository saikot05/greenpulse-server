import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { SignJWT, jwtVerify } = require('jose-cjs');

/**
 * Signs a payload to generate a JWT token using jose CJS build.
 */
export async function signToken(payload: any, expirationTime = '2h'): Promise<string | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key-32-chars-long-at-least');
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expirationTime)
      .sign(secret);
    return token;
  } catch (error) {
    console.error('[JWT Token Sign Error]:', error);
    return null;
  }
}

/**
 * Verifies a JWT token using jose CJS build.
 */
export async function verifyToken(token: string): Promise<any | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key-32-chars-long-at-least');
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    console.error('[JWT Token Verify Error]:', error);
    return null;
  }
}
