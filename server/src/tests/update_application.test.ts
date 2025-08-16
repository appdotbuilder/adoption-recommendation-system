import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, applicationsTable } from '../db/schema';
import { type UpdateApplicationInput } from '../schema';
import { updateApplication } from '../handlers/update_application';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  full_name: 'Test User',
  phone: '08123456789',
  role: 'calon_pengangkut' as const,
  is_active: true
};

const testApplication = {
  user_id: 1,
  status: 'draft' as const,
  full_name: 'Original Name',
  date_of_birth: new Date('1990-01-01'),
  place_of_birth: 'Original City',
  address: 'Original Address',
  phone: '08111111111',
  occupation: 'Original Job',
  monthly_income: '5000000',
  spouse_name: 'Original Spouse',
  spouse_occupation: 'Original Spouse Job',
  spouse_income: '3000000',
  number_of_children: 0,
  reason_for_adoption: 'Original reason for wanting to adopt a child to complete our family',
  preferred_child_age_min: 0,
  preferred_child_age_max: 5,
  preferred_child_gender: 'no_preference' as const,
  admin_notes: null,
  reviewed_by: null,
  reviewed_at: null
};

const updateInput: UpdateApplicationInput = {
  id: 1,
  full_name: 'Updated Name',
  place_of_birth: 'Updated City',
  monthly_income: 7000000,
  spouse_income: 4000000,
  preferred_child_age_max: 7
};

describe('updateApplication', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update application with provided fields only', async () => {
    // Create test user
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    // Create test application
    const appResult = await db.insert(applicationsTable).values({
      ...testApplication,
      user_id: userId
    }).returning().execute();
    const applicationId = appResult[0].id;

    const result = await updateApplication({
      ...updateInput,
      id: applicationId
    }, userId);

    // Check updated fields
    expect(result.full_name).toEqual('Updated Name');
    expect(result.place_of_birth).toEqual('Updated City');
    expect(result.monthly_income).toEqual(7000000);
    expect(result.spouse_income).toEqual(4000000);
    expect(result.preferred_child_age_max).toEqual(7);

    // Check unchanged fields
    expect(result.address).toEqual('Original Address');
    expect(result.phone).toEqual('08111111111');
    expect(result.occupation).toEqual('Original Job');
    expect(result.spouse_name).toEqual('Original Spouse');
    expect(result.preferred_child_age_min).toEqual(0);

    // Check metadata
    expect(result.id).toEqual(applicationId);
    expect(result.user_id).toEqual(userId);
    expect(result.status).toEqual('draft');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updates to database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    // Create test application
    const appResult = await db.insert(applicationsTable).values({
      ...testApplication,
      user_id: userId
    }).returning().execute();
    const applicationId = appResult[0].id;

    await updateApplication({
      ...updateInput,
      id: applicationId
    }, userId);

    // Verify database update
    const applications = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, applicationId))
      .execute();

    expect(applications).toHaveLength(1);
    const savedApplication = applications[0];
    
    expect(savedApplication.full_name).toEqual('Updated Name');
    expect(savedApplication.place_of_birth).toEqual('Updated City');
    expect(parseFloat(savedApplication.monthly_income)).toEqual(7000000);
    expect(parseFloat(savedApplication.spouse_income!)).toEqual(4000000);
    expect(savedApplication.preferred_child_age_max).toEqual(7);

    // Unchanged fields should remain
    expect(savedApplication.address).toEqual('Original Address');
    expect(savedApplication.occupation).toEqual('Original Job');
  });

  it('should handle partial updates', async () => {
    // Create test user
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    // Create test application
    const appResult = await db.insert(applicationsTable).values({
      ...testApplication,
      user_id: userId
    }).returning().execute();
    const applicationId = appResult[0].id;

    const partialUpdate: UpdateApplicationInput = {
      id: applicationId,
      address: 'New Address Only'
    };

    const result = await updateApplication(partialUpdate, userId);

    // Only address should be updated
    expect(result.address).toEqual('New Address Only');
    expect(result.full_name).toEqual('Original Name');
    expect(result.monthly_income).toEqual(5000000);
    expect(result.spouse_income).toEqual(3000000);
  });

  it('should handle nullable field updates', async () => {
    // Create test user
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    // Create test application
    const appResult = await db.insert(applicationsTable).values({
      ...testApplication,
      user_id: userId
    }).returning().execute();
    const applicationId = appResult[0].id;

    const nullableUpdate: UpdateApplicationInput = {
      id: applicationId,
      spouse_name: null,
      spouse_occupation: null,
      spouse_income: null
    };

    const result = await updateApplication(nullableUpdate, userId);

    expect(result.spouse_name).toBeNull();
    expect(result.spouse_occupation).toBeNull();
    expect(result.spouse_income).toBeNull();
    
    // Other fields should remain unchanged
    expect(result.full_name).toEqual('Original Name');
    expect(result.monthly_income).toEqual(5000000);
  });

  it('should reject update for non-existent application', async () => {
    // Create test user
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    const nonExistentUpdate: UpdateApplicationInput = {
      id: 999,
      full_name: 'Should Not Work'
    };

    expect(updateApplication(nonExistentUpdate, userId)).rejects.toThrow(/application not found or access denied/i);
  });

  it('should reject update for application belonging to different user', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable).values(testUser).returning().execute();
    const user2Result = await db.insert(usersTable).values({
      ...testUser,
      email: 'other@example.com',
      full_name: 'Other User'
    }).returning().execute();

    // Create test application for user 1
    const appResult = await db.insert(applicationsTable).values({
      ...testApplication,
      user_id: user1Result[0].id
    }).returning().execute();
    const applicationId = appResult[0].id;

    // Try to update as user 2
    expect(updateApplication({
      ...updateInput,
      id: applicationId
    }, user2Result[0].id)).rejects.toThrow(/application not found or access denied/i);
  });

  it('should reject update for non-editable application status', async () => {
    // Create test user
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    // Create approved application (non-editable)
    const appResult = await db.insert(applicationsTable).values({
      ...testApplication,
      user_id: userId,
      status: 'approved'
    }).returning().execute();
    const applicationId = appResult[0].id;

    expect(updateApplication({
      ...updateInput,
      id: applicationId
    }, userId)).rejects.toThrow(/application cannot be modified/i);
  });

  it('should allow update for submitted application', async () => {
    // Create test user
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    // Create submitted application (should still be editable)
    const appResult = await db.insert(applicationsTable).values({
      ...testApplication,
      user_id: userId,
      status: 'submitted'
    }).returning().execute();
    const applicationId = appResult[0].id;

    const result = await updateApplication({
      ...updateInput,
      id: applicationId
    }, userId);

    expect(result.full_name).toEqual('Updated Name');
    expect(result.status).toEqual('submitted');
  });

  it('should convert numeric types correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    // Create test application
    const appResult = await db.insert(applicationsTable).values({
      ...testApplication,
      user_id: userId
    }).returning().execute();
    const applicationId = appResult[0].id;

    const result = await updateApplication({
      ...updateInput,
      id: applicationId
    }, userId);

    // Verify numeric conversion
    expect(typeof result.monthly_income).toBe('number');
    expect(typeof result.spouse_income).toBe('number');
    expect(result.monthly_income).toEqual(7000000);
    expect(result.spouse_income).toEqual(4000000);
  });
});