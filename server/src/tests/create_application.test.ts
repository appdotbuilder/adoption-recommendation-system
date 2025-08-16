import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { applicationsTable, usersTable } from '../db/schema';
import { type CreateApplicationInput } from '../schema';
import { createApplication } from '../handlers/create_application';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  full_name: 'Test User',
  phone: '08123456789',
  role: 'calon_pengangkut' as const,
  is_active: true
};

const adminUser = {
  email: 'admin@example.com',
  password_hash: 'hashed_password',
  full_name: 'Admin User',
  phone: '08123456788',
  role: 'admin_dinas_sosial' as const,
  is_active: true
};

const inactiveUser = {
  email: 'inactive@example.com',
  password_hash: 'hashed_password',
  full_name: 'Inactive User',
  phone: '08123456787',
  role: 'calon_pengangkut' as const,
  is_active: false
};

// Complete test input with all required fields
const testInput: CreateApplicationInput = {
  full_name: 'John Doe',
  date_of_birth: new Date('1990-01-01'),
  place_of_birth: 'Jakarta',
  address: '123 Main Street, Jakarta, Indonesia, 12345',
  phone: '08123456789',
  occupation: 'Software Engineer',
  monthly_income: 15000000,
  spouse_name: 'Jane Doe',
  spouse_occupation: 'Teacher',
  spouse_income: 8000000,
  number_of_children: 0,
  reason_for_adoption: 'We have been trying to have children for several years without success and believe we can provide a loving home for a child who needs one. We are both financially stable and emotionally ready.',
  preferred_child_age_min: 1,
  preferred_child_age_max: 5,
  preferred_child_gender: 'no_preference'
};

describe('createApplication', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an application successfully', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const result = await createApplication(testInput, userId);

    // Verify all fields are correctly set
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(userId);
    expect(result.status).toEqual('draft');
    expect(result.full_name).toEqual('John Doe');
    expect(result.date_of_birth).toEqual(testInput.date_of_birth);
    expect(result.place_of_birth).toEqual('Jakarta');
    expect(result.address).toEqual(testInput.address);
    expect(result.phone).toEqual('08123456789');
    expect(result.occupation).toEqual('Software Engineer');
    expect(result.monthly_income).toEqual(15000000);
    expect(typeof result.monthly_income).toEqual('number');
    expect(result.spouse_name).toEqual('Jane Doe');
    expect(result.spouse_occupation).toEqual('Teacher');
    expect(result.spouse_income).toEqual(8000000);
    expect(typeof result.spouse_income).toEqual('number');
    expect(result.number_of_children).toEqual(0);
    expect(result.reason_for_adoption).toEqual(testInput.reason_for_adoption);
    expect(result.preferred_child_age_min).toEqual(1);
    expect(result.preferred_child_age_max).toEqual(5);
    expect(result.preferred_child_gender).toEqual('no_preference');
    expect(result.admin_notes).toBeNull();
    expect(result.reviewed_by).toBeNull();
    expect(result.reviewed_at).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save application to database', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const result = await createApplication(testInput, userId);

    // Query database to verify the application was saved
    const applications = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, result.id))
      .execute();

    expect(applications).toHaveLength(1);
    const savedApplication = applications[0];
    expect(savedApplication.user_id).toEqual(userId);
    expect(savedApplication.status).toEqual('draft');
    expect(savedApplication.full_name).toEqual('John Doe');
    expect(parseFloat(savedApplication.monthly_income)).toEqual(15000000);
    expect(parseFloat(savedApplication.spouse_income!)).toEqual(8000000);
    expect(savedApplication.created_at).toBeInstanceOf(Date);
  });

  it('should handle application with null spouse fields', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const inputWithoutSpouse: CreateApplicationInput = {
      ...testInput,
      spouse_name: null,
      spouse_occupation: null,
      spouse_income: null
    };

    const result = await createApplication(inputWithoutSpouse, userId);

    expect(result.spouse_name).toBeNull();
    expect(result.spouse_occupation).toBeNull();
    expect(result.spouse_income).toBeNull();

    // Verify in database
    const applications = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, result.id))
      .execute();

    expect(applications[0].spouse_name).toBeNull();
    expect(applications[0].spouse_occupation).toBeNull();
    expect(applications[0].spouse_income).toBeNull();
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserId = 999;

    await expect(createApplication(testInput, nonExistentUserId))
      .rejects.toThrow(/user not found/i);
  });

  it('should throw error for admin user role', async () => {
    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values(adminUser)
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    await expect(createApplication(testInput, adminId))
      .rejects.toThrow(/only calon_pengangkut users can create applications/i);
  });

  it('should throw error for inactive user', async () => {
    // Create inactive user
    const inactiveResult = await db.insert(usersTable)
      .values(inactiveUser)
      .returning()
      .execute();
    const inactiveId = inactiveResult[0].id;

    await expect(createApplication(testInput, inactiveId))
      .rejects.toThrow(/user account is not active/i);
  });

  it('should handle large income values correctly', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const inputWithLargeIncome: CreateApplicationInput = {
      ...testInput,
      monthly_income: 99999999.99,
      spouse_income: 88888888.88
    };

    const result = await createApplication(inputWithLargeIncome, userId);

    expect(result.monthly_income).toEqual(99999999.99);
    expect(result.spouse_income).toEqual(88888888.88);
    expect(typeof result.monthly_income).toEqual('number');
    expect(typeof result.spouse_income).toEqual('number');
  });

  it('should set default status as draft', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const result = await createApplication(testInput, userId);

    expect(result.status).toEqual('draft');
  });

  it('should handle undefined optional fields correctly', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Input without optional spouse fields (undefined instead of null)
    const inputWithUndefinedFields: CreateApplicationInput = {
      full_name: 'Single Person',
      date_of_birth: new Date('1985-05-15'),
      place_of_birth: 'Bandung',
      address: '456 Another Street, Bandung, Indonesia, 54321',
      phone: '08987654321',
      occupation: 'Doctor',
      monthly_income: 25000000,
      // spouse fields are undefined (not included)
      number_of_children: 0,
      reason_for_adoption: 'I am single and ready to provide a loving home for a child. I have a stable career and have always wanted to be a parent.',
      preferred_child_age_min: 2,
      preferred_child_age_max: 8,
      preferred_child_gender: 'female'
    };

    const result = await createApplication(inputWithUndefinedFields, userId);

    expect(result.spouse_name).toBeNull();
    expect(result.spouse_occupation).toBeNull();
    expect(result.spouse_income).toBeNull();
    expect(result.full_name).toEqual('Single Person');
    expect(result.preferred_child_gender).toEqual('female');
  });
});