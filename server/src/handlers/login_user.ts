import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type LoginInput, type User } from '../schema';
import { createHash, randomBytes } from 'crypto';

// Simple password hashing using crypto (for demonstration - in production use bcrypt)
const hashPassword = (password: string, salt: string): string => {
  return createHash('sha256').update(password + salt).digest('hex');
};

// Simple JWT-like token generation (for demonstration - in production use proper JWT)
const generateToken = (payload: { userId: number; email: string; role: string }): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadStr = Buffer.from(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  })).toString('base64url');
  
  const secret = process.env['JWT_SECRET'] || 'default-secret-key';
  const signature = createHash('sha256')
    .update(`${header}.${payloadStr}.${secret}`)
    .digest('base64url');
  
  return `${header}.${payloadStr}.${signature}`;
};

export async function loginUser(input: LoginInput): Promise<{ user: User; token: string }> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // For this implementation, we'll assume password_hash contains both salt and hash separated by ':'
    // Format: salt:hash
    const [salt, expectedHash] = user.password_hash.split(':');
    if (!salt || !expectedHash) {
      throw new Error('Invalid password format in database');
    }

    // Verify password
    const inputHash = hashPassword(input.password, salt);
    if (inputHash !== expectedHash) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return {
      user,
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

// Helper function to create password hash (for testing purposes)
export const createPasswordHash = (password: string): string => {
  const salt = randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  return `${salt}:${hash}`;
};