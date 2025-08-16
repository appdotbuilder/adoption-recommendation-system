import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser, createPasswordHash } from '../handlers/login_user';

// Test data
const testUserData = {
  email: 'test@example.com',
  password: 'testpassword123',
  full_name: 'Test User',
  phone: '081234567890',
  role: 'calon_pengangkut' as const,
  is_active: true
};

const loginInput: LoginInput = {
  email: testUserData.email,
  password: testUserData.password
};

// Helper function to decode our simple JWT-like token
const decodeToken = (token: string) => {
  const [header, payload, signature] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString());
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login user with valid credentials', async () => {
    // Create test user with proper password hash
    const passwordHash = createPasswordHash(testUserData.password);
    await db.insert(usersTable)
      .values({
        ...testUserData,
        password_hash: passwordHash
      })
      .execute();

    const result = await loginUser(loginInput);

    // Verify user data
    expect(result.user.email).toBe(testUserData.email);
    expect(result.user.full_name).toBe(testUserData.full_name);
    expect(result.user.phone).toBe(testUserData.phone);
    expect(result.user.role).toBe(testUserData.role);
    expect(result.user.is_active).toBe(true);
    expect(result.user.id).toBeDefined();

    // Verify token is generated
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token.split('.').length).toBe(3); // Should have 3 parts like JWT

    // Verify token contents
    const decoded = decodeToken(result.token);
    expect(decoded.userId).toBe(result.user.id);
    expect(decoded.email).toBe(testUserData.email);
    expect(decoded.role).toBe(testUserData.role);
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000)); // Should expire in future
  });

  it('should throw error for non-existent user', async () => {
    const invalidInput = {
      email: 'nonexistent@example.com',
      password: 'password123'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for wrong password', async () => {
    // Create test user
    const passwordHash = createPasswordHash(testUserData.password);
    await db.insert(usersTable)
      .values({
        ...testUserData,
        password_hash: passwordHash
      })
      .execute();

    const invalidInput = {
      email: testUserData.email,
      password: 'wrongpassword'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for inactive user', async () => {
    // Create inactive test user
    const passwordHash = createPasswordHash(testUserData.password);
    await db.insert(usersTable)
      .values({
        ...testUserData,
        password_hash: passwordHash,
        is_active: false
      })
      .execute();

    await expect(loginUser(loginInput)).rejects.toThrow(/account is deactivated/i);
  });

  it('should login admin user correctly', async () => {
    // Create admin user
    const adminData = {
      ...testUserData,
      email: 'admin@example.com',
      role: 'admin_dinas_sosial' as const,
      full_name: 'Admin User'
    };
    const passwordHash = createPasswordHash(testUserData.password);
    await db.insert(usersTable)
      .values({
        ...adminData,
        password_hash: passwordHash
      })
      .execute();

    const adminLoginInput = {
      email: adminData.email,
      password: testUserData.password
    };

    const result = await loginUser(adminLoginInput);

    expect(result.user.email).toBe(adminData.email);
    expect(result.user.role).toBe('admin_dinas_sosial');
    expect(result.user.full_name).toBe(adminData.full_name);

    // Verify token has correct role
    const decoded = decodeToken(result.token);
    expect(decoded.role).toBe('admin_dinas_sosial');
  });

  it('should handle user with null phone number', async () => {
    // Create user with null phone
    const userDataWithNullPhone = {
      ...testUserData,
      phone: null,
      email: 'nullphone@example.com'
    };
    const passwordHash = createPasswordHash(testUserData.password);
    await db.insert(usersTable)
      .values({
        ...userDataWithNullPhone,
        password_hash: passwordHash
      })
      .execute();

    const nullPhoneInput = {
      email: userDataWithNullPhone.email,
      password: testUserData.password
    };

    const result = await loginUser(nullPhoneInput);

    expect(result.user.phone).toBeNull();
    expect(result.user.email).toBe(userDataWithNullPhone.email);
    expect(result.token).toBeDefined();
  });

  it('should handle case-sensitive email correctly', async () => {
    // Create test user with lowercase email
    const passwordHash = createPasswordHash(testUserData.password);
    await db.insert(usersTable)
      .values({
        ...testUserData,
        email: 'test@example.com', // lowercase
        password_hash: passwordHash
      })
      .execute();

    // Try to login with uppercase email
    const uppercaseEmailInput = {
      email: 'TEST@EXAMPLE.COM',
      password: testUserData.password
    };

    // Should fail because email is case-sensitive in database
    await expect(loginUser(uppercaseEmailInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for invalid password hash format', async () => {
    // Create user with malformed password hash
    await db.insert(usersTable)
      .values({
        ...testUserData,
        password_hash: 'invalid_hash_format' // Missing salt separator
      })
      .execute();

    await expect(loginUser(loginInput)).rejects.toThrow(/invalid password format in database/i);
  });

  it('should generate different tokens for different users', async () => {
    // Create two users
    const user1Hash = createPasswordHash(testUserData.password);
    const user2Hash = createPasswordHash(testUserData.password);
    
    await db.insert(usersTable)
      .values([
        {
          ...testUserData,
          email: 'user1@example.com',
          password_hash: user1Hash
        },
        {
          ...testUserData,
          email: 'user2@example.com',
          password_hash: user2Hash,
          full_name: 'User Two'
        }
      ])
      .execute();

    // Login both users
    const result1 = await loginUser({ email: 'user1@example.com', password: testUserData.password });
    const result2 = await loginUser({ email: 'user2@example.com', password: testUserData.password });

    // Tokens should be different
    expect(result1.token).not.toBe(result2.token);

    // But both should be valid JWT-like tokens
    expect(result1.token.split('.').length).toBe(3);
    expect(result2.token.split('.').length).toBe(3);

    // Token payloads should contain correct user information
    const decoded1 = decodeToken(result1.token);
    const decoded2 = decodeToken(result2.token);

    expect(decoded1.email).toBe('user1@example.com');
    expect(decoded2.email).toBe('user2@example.com');
    expect(decoded1.userId).not.toBe(decoded2.userId);
  });
});