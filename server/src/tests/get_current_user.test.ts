import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getCurrentUser } from '../handlers/get_current_user';

describe('getCurrentUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when user exists and is active', async () => {
    // Create a test user
    const passwordHash = 'hashed_test_password_123';
    const insertResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: passwordHash,
        full_name: 'Test User',
        phone: '081234567890',
        role: 'calon_pengangkut',
        is_active: true
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Get the current user
    const result = await getCurrentUser(createdUser.id);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.email).toEqual('test@example.com');
    expect(result!.password_hash).toEqual(passwordHash);
    expect(result!.full_name).toEqual('Test User');
    expect(result!.phone).toEqual('081234567890');
    expect(result!.role).toEqual('calon_pengangkut');
    expect(result!.is_active).toBe(true);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return user with admin role', async () => {
    // Create an admin user
    const passwordHash = 'hashed_admin_password_123';
    const insertResult = await db.insert(usersTable)
      .values({
        email: 'admin@example.com',
        password_hash: passwordHash,
        full_name: 'Admin User',
        phone: null, // Test nullable phone
        role: 'admin_dinas_sosial',
        is_active: true
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Get the current user
    const result = await getCurrentUser(createdUser.id);

    // Verify the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.email).toEqual('admin@example.com');
    expect(result!.full_name).toEqual('Admin User');
    expect(result!.phone).toBeNull();
    expect(result!.role).toEqual('admin_dinas_sosial');
    expect(result!.is_active).toBe(true);
  });

  it('should return null when user does not exist', async () => {
    // Try to get a non-existent user
    const result = await getCurrentUser(999);

    expect(result).toBeNull();
  });

  it('should return null when user exists but is inactive', async () => {
    // Create an inactive user
    const passwordHash = 'hashed_inactive_password_123';
    const insertResult = await db.insert(usersTable)
      .values({
        email: 'inactive@example.com',
        password_hash: passwordHash,
        full_name: 'Inactive User',
        phone: '081234567890',
        role: 'calon_pengangkut',
        is_active: false // User is inactive
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Try to get the inactive user
    const result = await getCurrentUser(createdUser.id);

    expect(result).toBeNull();
  });

  it('should verify user data is correctly retrieved from database', async () => {
    // Create multiple users to ensure we get the right one
    const passwordHash1 = 'hashed_password_user_1';
    const passwordHash2 = 'hashed_password_user_2';
    
    const user1 = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: passwordHash1,
        full_name: 'User One',
        phone: '081111111111',
        role: 'calon_pengangkut',
        is_active: true
      })
      .returning()
      .execute();

    const user2 = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: passwordHash2,
        full_name: 'User Two',
        phone: '082222222222',
        role: 'admin_dinas_sosial',
        is_active: true
      })
      .returning()
      .execute();

    // Get user2 specifically
    const result = await getCurrentUser(user2[0].id);

    // Verify we get the correct user (user2, not user1)
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(user2[0].id);
    expect(result!.email).toEqual('user2@example.com');
    expect(result!.full_name).toEqual('User Two');
    expect(result!.phone).toEqual('082222222222');
    expect(result!.role).toEqual('admin_dinas_sosial');
    expect(result!.password_hash).toEqual(passwordHash2);
  });

  it('should handle user with minimal required fields', async () => {
    // Create user with only required fields
    const passwordHash = 'hashed_minimal_password';
    const insertResult = await db.insert(usersTable)
      .values({
        email: 'minimal@example.com',
        password_hash: passwordHash,
        full_name: 'M',  // Minimal name
        phone: null,     // Optional field
        role: 'calon_pengangkut'
        // is_active defaults to true
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Get the user
    const result = await getCurrentUser(createdUser.id);

    expect(result).not.toBeNull();
    expect(result!.email).toEqual('minimal@example.com');
    expect(result!.full_name).toEqual('M');
    expect(result!.phone).toBeNull();
    expect(result!.is_active).toBe(true); // Should default to true
  });
});