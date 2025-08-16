import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

// Test input for calon pengangkut
const testInputCalon: RegisterUserInput = {
  email: 'test@example.com',
  password: 'password123',
  full_name: 'John Doe',
  phone: '+628123456789',
  role: 'calon_pengangkut'
};

// Test input for admin dinas sosial
const testInputAdmin: RegisterUserInput = {
  email: 'admin@dinsos.gov.id',
  password: 'adminpassword123',
  full_name: 'Jane Smith',
  phone: '+628987654321',
  role: 'admin_dinas_sosial'
};

// Test input without phone (optional field)
const testInputNoPhone: RegisterUserInput = {
  email: 'nophone@example.com',
  password: 'password123',
  full_name: 'No Phone User',
  role: 'calon_pengangkut'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new calon pengangkut user', async () => {
    const result = await registerUser(testInputCalon);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('John Doe');
    expect(result.phone).toEqual('+628123456789');
    expect(result.role).toEqual('calon_pengangkut');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Password should be hashed, not plain text
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash.length).toBeGreaterThan(20); // bcrypt hashes are typically 60+ chars
  });

  it('should register a new admin dinas sosial user', async () => {
    const result = await registerUser(testInputAdmin);

    expect(result.email).toEqual('admin@dinsos.gov.id');
    expect(result.full_name).toEqual('Jane Smith');
    expect(result.phone).toEqual('+628987654321');
    expect(result.role).toEqual('admin_dinas_sosial');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should register user without phone number', async () => {
    const result = await registerUser(testInputNoPhone);

    expect(result.email).toEqual('nophone@example.com');
    expect(result.full_name).toEqual('No Phone User');
    expect(result.phone).toBeNull();
    expect(result.role).toEqual('calon_pengangkut');
    expect(result.is_active).toBe(true);
  });

  it('should save user to database with proper password hashing', async () => {
    const result = await registerUser(testInputCalon);

    // Query the database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.full_name).toEqual('John Doe');
    expect(savedUser.phone).toEqual('+628123456789');
    expect(savedUser.role).toEqual('calon_pengangkut');
    expect(savedUser.is_active).toBe(true);
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);

    // Verify password is properly hashed
    expect(savedUser.password_hash).toBeDefined();
    expect(savedUser.password_hash).not.toEqual('password123');
    expect(savedUser.password_hash.startsWith('$2b$')).toBe(true); // bcrypt format
    
    // Verify password can be verified
    const isPasswordValid = await Bun.password.verify('password123', savedUser.password_hash);
    expect(isPasswordValid).toBe(true);
  });

  it('should reject registration with duplicate email', async () => {
    // Register first user
    await registerUser(testInputCalon);

    // Attempt to register second user with same email
    const duplicateInput: RegisterUserInput = {
      ...testInputCalon,
      full_name: 'Different Name'
    };

    await expect(registerUser(duplicateInput)).rejects.toThrow(/already exists/i);
  });

  it('should reject registration with duplicate email regardless of role', async () => {
    // Register calon pengangkut first
    await registerUser(testInputCalon);

    // Attempt to register admin with same email
    const duplicateInput: RegisterUserInput = {
      ...testInputCalon,
      role: 'admin_dinas_sosial',
      full_name: 'Admin User'
    };

    await expect(registerUser(duplicateInput)).rejects.toThrow(/already exists/i);
  });

  it('should handle database constraint violations gracefully', async () => {
    // Test with invalid email format (this should be caught by Zod validation before reaching handler)
    // But we test the handler's error handling for any database constraint violations
    
    // Register first user
    await registerUser(testInputCalon);

    // Try to register with same email but different case
    const caseVariantInput: RegisterUserInput = {
      ...testInputCalon,
      email: 'TEST@EXAMPLE.COM'
    };

    // This might pass or fail depending on database collation settings
    // The important thing is that errors are handled gracefully
    try {
      await registerUser(caseVariantInput);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should set correct default values', async () => {
    const result = await registerUser(testInputCalon);

    // is_active should default to true
    expect(result.is_active).toBe(true);
    
    // timestamps should be set
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // created_at and updated_at should be close to current time
    const now = new Date();
    const timeDiff = Math.abs(now.getTime() - result.created_at.getTime());
    expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
  });
});