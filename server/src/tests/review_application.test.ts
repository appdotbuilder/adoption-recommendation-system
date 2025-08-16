import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, applicationsTable, applicationStatusHistoryTable } from '../db/schema';
import { type ReviewApplicationInput } from '../schema';
import { reviewApplication } from '../handlers/review_application';
import { eq } from 'drizzle-orm';

// Test data
const testAdmin = {
  email: 'admin@test.com',
  password_hash: 'hashed_password',
  full_name: 'Test Admin',
  phone: '08123456789',
  role: 'admin_dinas_sosial' as const,
  is_active: true
};

const testUser = {
  email: 'user@test.com',
  password_hash: 'hashed_password',
  full_name: 'Test User',
  phone: '08123456780',
  role: 'calon_pengangkut' as const,
  is_active: true
};

const testApplication = {
  user_id: 0, // Will be set after user creation
  status: 'submitted' as const,
  full_name: 'Test Applicant',
  date_of_birth: new Date('1990-01-01'),
  place_of_birth: 'Jakarta',
  address: 'Jl. Test No. 123, Jakarta',
  phone: '08123456781',
  occupation: 'Software Engineer',
  monthly_income: '5000000.00',
  spouse_name: 'Test Spouse',
  spouse_occupation: 'Teacher',
  spouse_income: '3000000.00',
  number_of_children: 0,
  reason_for_adoption: 'We want to provide a loving home for a child in need and have been trying to conceive for several years without success',
  preferred_child_age_min: 0,
  preferred_child_age_max: 5,
  preferred_child_gender: 'no_preference' as const,
  admin_notes: null,
  reviewed_by: null,
  reviewed_at: null
};

describe('reviewApplication', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should review and update application successfully', async () => {
    // Create test users and application
    const [admin] = await db.insert(usersTable).values(testAdmin).returning().execute();
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    
    const [application] = await db.insert(applicationsTable)
      .values({
        ...testApplication,
        user_id: user.id
      })
      .returning()
      .execute();

    const reviewInput: ReviewApplicationInput = {
      id: application.id,
      status: 'approved',
      admin_notes: 'Application meets all requirements'
    };

    const result = await reviewApplication(reviewInput, admin.id);

    // Verify the application was updated
    expect(result.id).toEqual(application.id);
    expect(result.status).toEqual('approved');
    expect(result.admin_notes).toEqual('Application meets all requirements');
    expect(result.reviewed_by).toEqual(admin.id);
    expect(result.reviewed_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify numeric fields are properly converted
    expect(typeof result.monthly_income).toBe('number');
    expect(result.monthly_income).toEqual(5000000);
    expect(typeof result.spouse_income).toBe('number');
    expect(result.spouse_income).toEqual(3000000);
  });

  it('should save application changes to database', async () => {
    // Create test users and application
    const [admin] = await db.insert(usersTable).values(testAdmin).returning().execute();
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    
    const [application] = await db.insert(applicationsTable)
      .values({
        ...testApplication,
        user_id: user.id
      })
      .returning()
      .execute();

    const reviewInput: ReviewApplicationInput = {
      id: application.id,
      status: 'rejected',
      admin_notes: 'Insufficient documentation'
    };

    await reviewApplication(reviewInput, admin.id);

    // Verify changes in database
    const updatedApplication = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, application.id))
      .execute();

    expect(updatedApplication).toHaveLength(1);
    expect(updatedApplication[0].status).toEqual('rejected');
    expect(updatedApplication[0].admin_notes).toEqual('Insufficient documentation');
    expect(updatedApplication[0].reviewed_by).toEqual(admin.id);
    expect(updatedApplication[0].reviewed_at).toBeInstanceOf(Date);
  });

  it('should create status history entry', async () => {
    // Create test users and application
    const [admin] = await db.insert(usersTable).values(testAdmin).returning().execute();
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    
    const [application] = await db.insert(applicationsTable)
      .values({
        ...testApplication,
        user_id: user.id
      })
      .returning()
      .execute();

    const reviewInput: ReviewApplicationInput = {
      id: application.id,
      status: 'under_review',
      admin_notes: 'Reviewing documentation'
    };

    await reviewApplication(reviewInput, admin.id);

    // Verify status history was created
    const statusHistory = await db.select()
      .from(applicationStatusHistoryTable)
      .where(eq(applicationStatusHistoryTable.application_id, application.id))
      .execute();

    expect(statusHistory).toHaveLength(1);
    expect(statusHistory[0].application_id).toEqual(application.id);
    expect(statusHistory[0].old_status).toEqual('submitted');
    expect(statusHistory[0].new_status).toEqual('under_review');
    expect(statusHistory[0].changed_by).toEqual(admin.id);
    expect(statusHistory[0].notes).toEqual('Reviewing documentation');
    expect(statusHistory[0].created_at).toBeInstanceOf(Date);
  });

  it('should work without admin notes', async () => {
    // Create test users and application
    const [admin] = await db.insert(usersTable).values(testAdmin).returning().execute();
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    
    const [application] = await db.insert(applicationsTable)
      .values({
        ...testApplication,
        user_id: user.id
      })
      .returning()
      .execute();

    const reviewInput: ReviewApplicationInput = {
      id: application.id,
      status: 'approved'
    };

    const result = await reviewApplication(reviewInput, admin.id);

    expect(result.status).toEqual('approved');
    expect(result.admin_notes).toBeNull();
  });

  it('should throw error when admin not found', async () => {
    // Create test user and application
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    
    const [application] = await db.insert(applicationsTable)
      .values({
        ...testApplication,
        user_id: user.id
      })
      .returning()
      .execute();

    const reviewInput: ReviewApplicationInput = {
      id: application.id,
      status: 'approved',
      admin_notes: 'Should not work'
    };

    await expect(reviewApplication(reviewInput, 999)).rejects.toThrow(/Admin not found or not authorized/i);
  });

  it('should throw error when admin has wrong role', async () => {
    // Create regular user (not admin) and application
    const [regularUser] = await db.insert(usersTable).values(testUser).returning().execute();
    
    const [application] = await db.insert(applicationsTable)
      .values({
        ...testApplication,
        user_id: regularUser.id
      })
      .returning()
      .execute();

    const reviewInput: ReviewApplicationInput = {
      id: application.id,
      status: 'approved',
      admin_notes: 'Should not work'
    };

    await expect(reviewApplication(reviewInput, regularUser.id)).rejects.toThrow(/Admin not found or not authorized/i);
  });

  it('should throw error when admin is inactive', async () => {
    // Create inactive admin
    const inactiveAdmin = { ...testAdmin, is_active: false };
    const [admin] = await db.insert(usersTable).values(inactiveAdmin).returning().execute();
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    
    const [application] = await db.insert(applicationsTable)
      .values({
        ...testApplication,
        user_id: user.id
      })
      .returning()
      .execute();

    const reviewInput: ReviewApplicationInput = {
      id: application.id,
      status: 'approved',
      admin_notes: 'Should not work'
    };

    await expect(reviewApplication(reviewInput, admin.id)).rejects.toThrow(/Admin not found or not authorized/i);
  });

  it('should throw error when application not found', async () => {
    // Create admin only
    const [admin] = await db.insert(usersTable).values(testAdmin).returning().execute();

    const reviewInput: ReviewApplicationInput = {
      id: 999,
      status: 'approved',
      admin_notes: 'Should not work'
    };

    await expect(reviewApplication(reviewInput, admin.id)).rejects.toThrow(/Application not found/i);
  });

  it('should handle applications without spouse information', async () => {
    // Create test users and application without spouse
    const [admin] = await db.insert(usersTable).values(testAdmin).returning().execute();
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();
    
    const singleApplication = {
      ...testApplication,
      user_id: user.id,
      spouse_name: null,
      spouse_occupation: null,
      spouse_income: null
    };
    
    const [application] = await db.insert(applicationsTable)
      .values(singleApplication)
      .returning()
      .execute();

    const reviewInput: ReviewApplicationInput = {
      id: application.id,
      status: 'approved',
      admin_notes: 'Single applicant approved'
    };

    const result = await reviewApplication(reviewInput, admin.id);

    expect(result.status).toEqual('approved');
    expect(result.spouse_name).toBeNull();
    expect(result.spouse_occupation).toBeNull();
    expect(result.spouse_income).toBeNull();
    expect(typeof result.monthly_income).toBe('number');
  });
});