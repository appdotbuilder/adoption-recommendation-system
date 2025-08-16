import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, applicationsTable } from '../db/schema';
import { getApplicationById } from '../handlers/get_application_by_id';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  full_name: 'Test User',
  phone: '08123456789',
  role: 'calon_pengangkut' as const,
  is_active: true
};

const testAdmin = {
  email: 'admin@example.com',
  password_hash: 'hashed_password',
  full_name: 'Test Admin',
  phone: '08123456790',
  role: 'admin_dinas_sosial' as const,
  is_active: true
};

const testApplication = {
  full_name: 'John Doe',
  date_of_birth: new Date('1990-01-01'),
  place_of_birth: 'Jakarta',
  address: 'Jalan Test No 123, Jakarta',
  phone: '08123456789',
  occupation: 'Engineer',
  monthly_income: '7500000.00',
  spouse_name: 'Jane Doe',
  spouse_occupation: 'Teacher',
  spouse_income: '5000000.50',
  number_of_children: 0,
  reason_for_adoption: 'We would love to provide a loving home for a child who needs it',
  preferred_child_age_min: 0,
  preferred_child_age_max: 5,
  preferred_child_gender: 'no_preference' as const,
  status: 'submitted' as const
};

describe('getApplicationById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return application for admin user', async () => {
    // Create test user and admin
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [admin] = await db.insert(usersTable).values(testAdmin).returning().execute();

    // Create test application
    const [application] = await db.insert(applicationsTable)
      .values({
        ...testApplication,
        user_id: user.id
      })
      .returning()
      .execute();

    // Admin should be able to access any application
    const result = await getApplicationById(application.id, 'admin_dinas_sosial', admin.id);

    expect(result).toBeTruthy();
    expect(result?.id).toEqual(application.id);
    expect(result?.user_id).toEqual(user.id);
    expect(result?.full_name).toEqual('John Doe');
    expect(result?.monthly_income).toEqual(7500000);
    expect(result?.spouse_income).toEqual(5000000.5);
    expect(typeof result?.monthly_income).toEqual('number');
    expect(typeof result?.spouse_income).toEqual('number');
  });

  it('should return application for owner (calon_pengangkut)', async () => {
    // Create test user
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();

    // Create test application
    const [application] = await db.insert(applicationsTable)
      .values({
        ...testApplication,
        user_id: user.id
      })
      .returning()
      .execute();

    // User should be able to access their own application
    const result = await getApplicationById(application.id, 'calon_pengangkut', user.id);

    expect(result).toBeTruthy();
    expect(result?.id).toEqual(application.id);
    expect(result?.user_id).toEqual(user.id);
    expect(result?.full_name).toEqual('John Doe');
    expect(result?.occupation).toEqual('Engineer');
    expect(result?.monthly_income).toEqual(7500000);
    expect(typeof result?.monthly_income).toEqual('number');
  });

  it('should return null for non-existent application', async () => {
    // Create test admin
    const [admin] = await db.insert(usersTable).values(testAdmin).returning().execute();

    // Try to get non-existent application
    const result = await getApplicationById(999, 'admin_dinas_sosial', admin.id);

    expect(result).toBeNull();
  });

  it('should return null when calon_pengangkut tries to access another user application', async () => {
    // Create two test users
    const [user1] = await db.insert(usersTable).values({
      ...testUser,
      email: 'user1@example.com'
    }).returning().execute();
    
    const [user2] = await db.insert(usersTable).values({
      ...testUser,
      email: 'user2@example.com'
    }).returning().execute();

    // Create application for user1
    const [application] = await db.insert(applicationsTable)
      .values({
        ...testApplication,
        user_id: user1.id
      })
      .returning()
      .execute();

    // User2 should not be able to access user1's application
    const result = await getApplicationById(application.id, 'calon_pengangkut', user2.id);

    expect(result).toBeNull();
  });

  it('should throw error when userId is not provided for calon_pengangkut', async () => {
    // Create test user and application
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [application] = await db.insert(applicationsTable)
      .values({
        ...testApplication,
        user_id: user.id
      })
      .returning()
      .execute();

    // Should throw error when userId is not provided for calon_pengangkut
    await expect(getApplicationById(application.id, 'calon_pengangkut')).rejects.toThrow(/User ID is required/i);
  });

  it('should throw error for invalid user role', async () => {
    // Create test user and application
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    const [application] = await db.insert(applicationsTable)
      .values({
        ...testApplication,
        user_id: user.id
      })
      .returning()
      .execute();

    // Should throw error for invalid role
    await expect(getApplicationById(application.id, 'invalid_role', user.id)).rejects.toThrow(/Invalid user role/i);
  });

  it('should handle applications with null spouse data correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();

    // Create application without spouse data
    const [application] = await db.insert(applicationsTable)
      .values({
        ...testApplication,
        user_id: user.id,
        spouse_name: null,
        spouse_occupation: null,
        spouse_income: null
      })
      .returning()
      .execute();

    const result = await getApplicationById(application.id, 'calon_pengangkut', user.id);

    expect(result).toBeTruthy();
    expect(result?.spouse_name).toBeNull();
    expect(result?.spouse_occupation).toBeNull();
    expect(result?.spouse_income).toBeNull();
    expect(result?.monthly_income).toEqual(7500000);
    expect(typeof result?.monthly_income).toEqual('number');
  });

  it('should return complete application data with all fields', async () => {
    // Create test user
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();

    // Create test application
    const [application] = await db.insert(applicationsTable)
      .values({
        ...testApplication,
        user_id: user.id
      })
      .returning()
      .execute();

    const result = await getApplicationById(application.id, 'calon_pengangkut', user.id);

    // Verify all fields are present and correct
    expect(result?.id).toBeDefined();
    expect(result?.user_id).toEqual(user.id);
    expect(result?.status).toEqual('submitted');
    expect(result?.full_name).toEqual('John Doe');
    expect(result?.date_of_birth).toBeInstanceOf(Date);
    expect(result?.place_of_birth).toEqual('Jakarta');
    expect(result?.address).toEqual('Jalan Test No 123, Jakarta');
    expect(result?.phone).toEqual('08123456789');
    expect(result?.occupation).toEqual('Engineer');
    expect(result?.monthly_income).toEqual(7500000);
    expect(result?.spouse_name).toEqual('Jane Doe');
    expect(result?.spouse_occupation).toEqual('Teacher');
    expect(result?.spouse_income).toEqual(5000000.5);
    expect(result?.number_of_children).toEqual(0);
    expect(result?.reason_for_adoption).toEqual('We would love to provide a loving home for a child who needs it');
    expect(result?.preferred_child_age_min).toEqual(0);
    expect(result?.preferred_child_age_max).toEqual(5);
    expect(result?.preferred_child_gender).toEqual('no_preference');
    expect(result?.admin_notes).toBeNull();
    expect(result?.reviewed_by).toBeNull();
    expect(result?.reviewed_at).toBeNull();
    expect(result?.created_at).toBeInstanceOf(Date);
    expect(result?.updated_at).toBeInstanceOf(Date);
  });
});