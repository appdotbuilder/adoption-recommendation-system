import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, applicationsTable, applicationStatusHistoryTable } from '../db/schema';
import { getApplicationStatusHistory } from '../handlers/get_application_status_history';
import type { ApplicationStatus } from '../schema';

describe('getApplicationStatusHistory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let testAdmin: any;
  let testApplication: any;

  // Helper function to create test data
  const createTestData = async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        phone: '1234567890',
        role: 'calon_pengangkut',
        is_active: true
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create test admin
    const adminResult = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        password_hash: 'hashed_password',
        full_name: 'Test Admin',
        phone: '0987654321',
        role: 'admin_dinas_sosial',
        is_active: true
      })
      .returning()
      .execute();
    testAdmin = adminResult[0];

    // Create test application
    const applicationResult = await db.insert(applicationsTable)
      .values({
        user_id: testUser.id,
        status: 'submitted',
        full_name: 'Test User',
        date_of_birth: new Date('1990-01-01'),
        place_of_birth: 'Test City',
        address: 'Test Address 123',
        phone: '1234567890',
        occupation: 'Test Job',
        monthly_income: '5000000.00',
        spouse_name: 'Test Spouse',
        spouse_occupation: 'Test Spouse Job',
        spouse_income: '3000000.00',
        number_of_children: 0,
        reason_for_adoption: 'We want to provide love and care to a child who needs it. This is our heartfelt desire to expand our family.',
        preferred_child_age_min: 0,
        preferred_child_age_max: 5,
        preferred_child_gender: 'no_preference'
      })
      .returning()
      .execute();
    testApplication = applicationResult[0];
  };

  it('should fetch application status history successfully', async () => {
    await createTestData();

    // Create status history entries with proper timing
    const statusEntries = [
      {
        application_id: testApplication.id,
        old_status: null as ApplicationStatus | null,
        new_status: 'draft' as ApplicationStatus,
        changed_by: testUser.id,
        notes: 'Application created'
      },
      {
        application_id: testApplication.id,
        old_status: 'draft' as ApplicationStatus,
        new_status: 'submitted' as ApplicationStatus,
        changed_by: testUser.id,
        notes: 'Application submitted for review'
      },
      {
        application_id: testApplication.id,
        old_status: 'submitted' as ApplicationStatus,
        new_status: 'under_review' as ApplicationStatus,
        changed_by: testAdmin.id,
        notes: 'Admin started reviewing the application'
      }
    ];

    // Insert one by one with small delays to ensure proper ordering
    for (const entry of statusEntries) {
      await db.insert(applicationStatusHistoryTable)
        .values(entry)
        .execute();
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 2));
    }

    const result = await getApplicationStatusHistory(
      testApplication.id,
      'admin_dinas_sosial',
      testAdmin.id
    );

    // Verify results
    expect(result).toHaveLength(3);
    expect(result[0].application_id).toEqual(testApplication.id);
    expect(result[0].new_status).toEqual('under_review');
    expect(result[0].old_status).toEqual('submitted');
    expect(result[0].changed_by).toEqual(testAdmin.id);
    expect(result[0].notes).toEqual('Admin started reviewing the application');
    expect(result[0].created_at).toBeInstanceOf(Date);

    // Verify chronological order (most recent first)
    expect(result[0].new_status).toEqual('under_review');
    expect(result[1].new_status).toEqual('submitted');
    expect(result[2].new_status).toEqual('draft');
    expect(result[2].old_status).toBeNull();
  });

  it('should allow application owner to view their own history', async () => {
    await createTestData();

    // Create status history entry
    await db.insert(applicationStatusHistoryTable)
      .values({
        application_id: testApplication.id,
        old_status: null as ApplicationStatus | null,
        new_status: 'draft' as ApplicationStatus,
        changed_by: testUser.id,
        notes: 'Application created'
      })
      .execute();

    const result = await getApplicationStatusHistory(
      testApplication.id,
      'calon_pengangkut',
      testUser.id
    );

    expect(result).toHaveLength(1);
    expect(result[0].application_id).toEqual(testApplication.id);
    expect(result[0].new_status).toEqual('draft');
  });

  it('should allow admin to view any application history', async () => {
    await createTestData();

    // Create status history entry
    await db.insert(applicationStatusHistoryTable)
      .values({
        application_id: testApplication.id,
        old_status: null as ApplicationStatus | null,
        new_status: 'draft' as ApplicationStatus,
        changed_by: testUser.id,
        notes: 'Application created'
      })
      .execute();

    const result = await getApplicationStatusHistory(
      testApplication.id,
      'admin_dinas_sosial',
      testAdmin.id
    );

    expect(result).toHaveLength(1);
    expect(result[0].application_id).toEqual(testApplication.id);
    expect(result[0].new_status).toEqual('draft');
  });

  it('should return empty array when no history exists', async () => {
    await createTestData();

    const result = await getApplicationStatusHistory(
      testApplication.id,
      'admin_dinas_sosial',
      testAdmin.id
    );

    expect(result).toHaveLength(0);
  });

  it('should throw error when application does not exist', async () => {
    await createTestData();

    await expect(
      getApplicationStatusHistory(99999, 'admin_dinas_sosial', testAdmin.id)
    ).rejects.toThrow(/application not found/i);
  });

  it('should deny access when calon_pengangkut tries to view others application', async () => {
    await createTestData();

    // Create another user
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@test.com',
        password_hash: 'hashed_password',
        full_name: 'Other User',
        phone: '5555555555',
        role: 'calon_pengangkut',
        is_active: true
      })
      .returning()
      .execute();

    await expect(
      getApplicationStatusHistory(
        testApplication.id,
        'calon_pengangkut',
        otherUserResult[0].id
      )
    ).rejects.toThrow(/access denied.*own application/i);
  });

  it('should deny access when calon_pengangkut has no userId provided', async () => {
    await createTestData();

    await expect(
      getApplicationStatusHistory(
        testApplication.id,
        'calon_pengangkut'
      )
    ).rejects.toThrow(/access denied.*own application/i);
  });

  it('should deny access for invalid user role', async () => {
    await createTestData();

    await expect(
      getApplicationStatusHistory(
        testApplication.id,
        'invalid_role',
        testUser.id
      )
    ).rejects.toThrow(/access denied.*invalid user role/i);
  });

  it('should handle multiple status changes correctly', async () => {
    await createTestData();

    // Create comprehensive status history
    const statusChanges = [
      {
        application_id: testApplication.id,
        old_status: null as ApplicationStatus | null,
        new_status: 'draft' as ApplicationStatus,
        changed_by: testUser.id,
        notes: 'Application created'
      },
      {
        application_id: testApplication.id,
        old_status: 'draft' as ApplicationStatus,
        new_status: 'submitted' as ApplicationStatus,
        changed_by: testUser.id,
        notes: 'Application submitted'
      },
      {
        application_id: testApplication.id,
        old_status: 'submitted' as ApplicationStatus,
        new_status: 'under_review' as ApplicationStatus,
        changed_by: testAdmin.id,
        notes: 'Started review process'
      },
      {
        application_id: testApplication.id,
        old_status: 'under_review' as ApplicationStatus,
        new_status: 'approved' as ApplicationStatus,
        changed_by: testAdmin.id,
        notes: 'Application approved after thorough review'
      }
    ];

    // Insert with slight delay to ensure different timestamps
    for (const change of statusChanges) {
      await db.insert(applicationStatusHistoryTable)
        .values(change)
        .execute();
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 2));
    }

    const result = await getApplicationStatusHistory(
      testApplication.id,
      'admin_dinas_sosial',
      testAdmin.id
    );

    expect(result).toHaveLength(4);
    
    // Verify correct order (most recent first)
    expect(result[0].new_status).toEqual('approved');
    expect(result[1].new_status).toEqual('under_review');
    expect(result[2].new_status).toEqual('submitted');
    expect(result[3].new_status).toEqual('draft');
    
    // Verify first entry has no old_status
    expect(result[3].old_status).toBeNull();
    
    // Verify all entries have required fields
    result.forEach(entry => {
      expect(entry.id).toBeDefined();
      expect(entry.application_id).toEqual(testApplication.id);
      expect(entry.new_status).toBeDefined();
      expect(entry.changed_by).toBeDefined();
      expect(entry.created_at).toBeInstanceOf(Date);
    });
  });
});