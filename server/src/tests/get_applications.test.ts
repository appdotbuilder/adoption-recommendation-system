import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, applicationsTable } from '../db/schema';
import { type GetApplicationsQuery } from '../schema';
import { getApplications } from '../handlers/get_applications';

// Test data
const testUser = {
  email: 'user1@example.com',
  password_hash: 'hashedpassword123',
  full_name: 'John Doe',
  phone: '1234567890',
  role: 'calon_pengangkut' as const,
  is_active: true
};

const testAdmin = {
  email: 'admin@example.com',
  password_hash: 'hashedpassword456',
  full_name: 'Admin User',
  phone: '9876543210',
  role: 'admin_dinas_sosial' as const,
  is_active: true
};

const testUser2 = {
  email: 'user2@example.com',
  password_hash: 'hashedpassword789',
  full_name: 'Jane Smith',
  phone: '5555555555',
  role: 'calon_pengangkut' as const,
  is_active: true
};

const baseApplicationData = {
  full_name: 'John Doe',
  date_of_birth: new Date('1990-01-01'),
  place_of_birth: 'Jakarta',
  address: '123 Main Street, Jakarta',
  phone: '1234567890',
  occupation: 'Software Engineer',
  monthly_income: '15000000.00',
  spouse_name: 'Jane Doe',
  spouse_occupation: 'Teacher',
  spouse_income: '8000000.00',
  number_of_children: 0,
  reason_for_adoption: 'We want to provide a loving home for a child in need and have been trying to have children for many years without success.',
  preferred_child_age_min: 0,
  preferred_child_age_max: 5,
  preferred_child_gender: 'no_preference' as const
};

describe('getApplications', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return applications for calon_pengangkut user (own applications only)', async () => {
    // Create users
    const [user, user2] = await db.insert(usersTable)
      .values([testUser, testUser2])
      .returning()
      .execute();

    // Create applications for both users
    await db.insert(applicationsTable)
      .values([
        { ...baseApplicationData, user_id: user.id, status: 'draft' },
        { ...baseApplicationData, user_id: user.id, status: 'submitted' },
        { ...baseApplicationData, user_id: user2.id, status: 'approved' } // Different user
      ])
      .execute();

    const query: GetApplicationsQuery = {
      limit: 10,
      offset: 0
    };

    const result = await getApplications(query, 'calon_pengangkut', user.id);

    expect(result.applications).toHaveLength(2);
    expect(result.total).toBe(2);
    
    // Should only return applications for the specified user
    result.applications.forEach(app => {
      expect(app.user_id).toBe(user.id);
    });

    // Check numeric conversions
    expect(typeof result.applications[0].monthly_income).toBe('number');
    expect(typeof result.applications[0].spouse_income).toBe('number');
    expect(result.applications[0].monthly_income).toBe(15000000);
    expect(result.applications[0].spouse_income).toBe(8000000);
  });

  it('should return all applications for admin_dinas_sosial user', async () => {
    // Create users and admin
    const [user1, user2, admin] = await db.insert(usersTable)
      .values([testUser, testUser2, testAdmin])
      .returning()
      .execute();

    // Create applications for different users
    await db.insert(applicationsTable)
      .values([
        { ...baseApplicationData, user_id: user1.id, status: 'draft' },
        { ...baseApplicationData, user_id: user1.id, status: 'submitted' },
        { ...baseApplicationData, user_id: user2.id, status: 'approved' },
        { ...baseApplicationData, user_id: user2.id, status: 'rejected' }
      ])
      .execute();

    const query: GetApplicationsQuery = {
      limit: 10,
      offset: 0
    };

    const result = await getApplications(query, 'admin_dinas_sosial', admin.id);

    expect(result.applications).toHaveLength(4);
    expect(result.total).toBe(4);

    // Admin should see all applications
    const userIds = result.applications.map(app => app.user_id);
    expect(userIds).toContain(user1.id);
    expect(userIds).toContain(user2.id);
  });

  it('should filter applications by status', async () => {
    // Create user
    const [user] = await db.insert(usersTable)
      .values([testUser])
      .returning()
      .execute();

    // Create applications with different statuses
    await db.insert(applicationsTable)
      .values([
        { ...baseApplicationData, user_id: user.id, status: 'draft' },
        { ...baseApplicationData, user_id: user.id, status: 'submitted' },
        { ...baseApplicationData, user_id: user.id, status: 'submitted' },
        { ...baseApplicationData, user_id: user.id, status: 'approved' }
      ])
      .execute();

    const query: GetApplicationsQuery = {
      status: 'submitted',
      limit: 10,
      offset: 0
    };

    const result = await getApplications(query, 'calon_pengangkut', user.id);

    expect(result.applications).toHaveLength(2);
    expect(result.total).toBe(2);
    
    result.applications.forEach(app => {
      expect(app.status).toBe('submitted');
    });
  });

  it('should filter applications by user_id for admin', async () => {
    // Create users and admin
    const [user1, user2, admin] = await db.insert(usersTable)
      .values([testUser, testUser2, testAdmin])
      .returning()
      .execute();

    // Create applications for different users
    await db.insert(applicationsTable)
      .values([
        { ...baseApplicationData, user_id: user1.id, status: 'draft' },
        { ...baseApplicationData, user_id: user1.id, status: 'submitted' },
        { ...baseApplicationData, user_id: user2.id, status: 'approved' }
      ])
      .execute();

    const query: GetApplicationsQuery = {
      user_id: user1.id,
      limit: 10,
      offset: 0
    };

    const result = await getApplications(query, 'admin_dinas_sosial', admin.id);

    expect(result.applications).toHaveLength(2);
    expect(result.total).toBe(2);
    
    result.applications.forEach(app => {
      expect(app.user_id).toBe(user1.id);
    });
  });

  it('should support pagination', async () => {
    // Create user
    const [user] = await db.insert(usersTable)
      .values([testUser])
      .returning()
      .execute();

    // Create 5 applications
    const applications = Array.from({ length: 5 }, (_, i) => ({
      ...baseApplicationData,
      user_id: user.id,
      full_name: `Application ${i + 1}`,
      status: 'draft' as const
    }));

    await db.insert(applicationsTable)
      .values(applications)
      .execute();

    // Test first page
    const page1Query: GetApplicationsQuery = {
      limit: 2,
      offset: 0
    };

    const page1Result = await getApplications(page1Query, 'calon_pengangkut', user.id);
    expect(page1Result.applications).toHaveLength(2);
    expect(page1Result.total).toBe(5);

    // Test second page
    const page2Query: GetApplicationsQuery = {
      limit: 2,
      offset: 2
    };

    const page2Result = await getApplications(page2Query, 'calon_pengangkut', user.id);
    expect(page2Result.applications).toHaveLength(2);
    expect(page2Result.total).toBe(5);

    // Test third page
    const page3Query: GetApplicationsQuery = {
      limit: 2,
      offset: 4
    };

    const page3Result = await getApplications(page3Query, 'calon_pengangkut', user.id);
    expect(page3Result.applications).toHaveLength(1);
    expect(page3Result.total).toBe(5);
  });

  it('should handle applications with null spouse data correctly', async () => {
    // Create user
    const [user] = await db.insert(usersTable)
      .values([testUser])
      .returning()
      .execute();

    // Create application without spouse data
    await db.insert(applicationsTable)
      .values([{
        ...baseApplicationData,
        user_id: user.id,
        spouse_name: null,
        spouse_occupation: null,
        spouse_income: null
      }])
      .execute();

    const query: GetApplicationsQuery = {
      limit: 10,
      offset: 0
    };

    const result = await getApplications(query, 'calon_pengangkut', user.id);

    expect(result.applications).toHaveLength(1);
    expect(result.applications[0].spouse_name).toBeNull();
    expect(result.applications[0].spouse_occupation).toBeNull();
    expect(result.applications[0].spouse_income).toBeNull();
  });

  it('should return applications ordered by created_at descending', async () => {
    // Create user
    const [user] = await db.insert(usersTable)
      .values([testUser])
      .returning()
      .execute();

    // Create applications with different names to identify them
    await db.insert(applicationsTable)
      .values([
        { ...baseApplicationData, user_id: user.id, full_name: 'First Application' },
        { ...baseApplicationData, user_id: user.id, full_name: 'Second Application' },
        { ...baseApplicationData, user_id: user.id, full_name: 'Third Application' }
      ])
      .execute();

    const query: GetApplicationsQuery = {
      limit: 10,
      offset: 0
    };

    const result = await getApplications(query, 'calon_pengangkut', user.id);

    expect(result.applications).toHaveLength(3);
    
    // Should be ordered by created_at descending (most recent first)
    for (let i = 0; i < result.applications.length - 1; i++) {
      expect(result.applications[i].created_at >= result.applications[i + 1].created_at).toBe(true);
    }
  });

  it('should throw error when userId is not provided for calon_pengangkut', async () => {
    const query: GetApplicationsQuery = {
      limit: 10,
      offset: 0
    };

    await expect(getApplications(query, 'calon_pengangkut')).rejects.toThrow(/User ID is required/i);
  });

  it('should ignore user_id filter for calon_pengangkut role', async () => {
    // Create users
    const [user1, user2] = await db.insert(usersTable)
      .values([testUser, testUser2])
      .returning()
      .execute();

    // Create applications for both users
    await db.insert(applicationsTable)
      .values([
        { ...baseApplicationData, user_id: user1.id, status: 'draft' },
        { ...baseApplicationData, user_id: user2.id, status: 'submitted' }
      ])
      .execute();

    const query: GetApplicationsQuery = {
      user_id: user2.id, // This should be ignored for calon_pengangkut
      limit: 10,
      offset: 0
    };

    const result = await getApplications(query, 'calon_pengangkut', user1.id);

    // Should only return user1's applications, ignoring the user_id filter
    expect(result.applications).toHaveLength(1);
    expect(result.applications[0].user_id).toBe(user1.id);
  });
});