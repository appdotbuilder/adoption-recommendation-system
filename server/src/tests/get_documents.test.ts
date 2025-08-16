import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, applicationsTable, documentsTable } from '../db/schema';
import { getDocuments } from '../handlers/get_documents';
import { type RegisterUserInput, type CreateApplicationInput, type UploadDocumentInput } from '../schema';

describe('getDocuments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data
  const testUser: RegisterUserInput = {
    email: 'user@test.com',
    password: 'password123',
    full_name: 'Test User',
    phone: '1234567890',
    role: 'calon_pengangkut'
  };

  const testAdmin: RegisterUserInput = {
    email: 'admin@test.com',
    password: 'password123',
    full_name: 'Admin User',
    phone: '0987654321',
    role: 'admin_dinas_sosial'
  };

  const testApplication: CreateApplicationInput = {
    full_name: 'John Doe',
    date_of_birth: new Date('1990-01-01'),
    place_of_birth: 'Jakarta',
    address: '123 Main Street, Jakarta',
    phone: '1234567890',
    occupation: 'Engineer',
    monthly_income: 10000000,
    spouse_name: 'Jane Doe',
    spouse_occupation: 'Teacher',
    spouse_income: 8000000,
    number_of_children: 0,
    reason_for_adoption: 'We want to provide a loving home for a child in need and have been trying to conceive for years without success.',
    preferred_child_age_min: 1,
    preferred_child_age_max: 5,
    preferred_child_gender: 'no_preference'
  };

  it('should return documents for application owner', async () => {
    // Create user
    const [user] = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        full_name: testUser.full_name,
        phone: testUser.phone,
        role: testUser.role
      })
      .returning()
      .execute();

    // Create application
    const [application] = await db.insert(applicationsTable)
      .values({
        user_id: user.id,
        full_name: testApplication.full_name,
        date_of_birth: testApplication.date_of_birth,
        place_of_birth: testApplication.place_of_birth,
        address: testApplication.address,
        phone: testApplication.phone,
        occupation: testApplication.occupation,
        monthly_income: testApplication.monthly_income.toString(),
        spouse_name: testApplication.spouse_name,
        spouse_occupation: testApplication.spouse_occupation,
        spouse_income: testApplication.spouse_income!.toString(),
        number_of_children: testApplication.number_of_children,
        reason_for_adoption: testApplication.reason_for_adoption,
        preferred_child_age_min: testApplication.preferred_child_age_min,
        preferred_child_age_max: testApplication.preferred_child_age_max,
        preferred_child_gender: testApplication.preferred_child_gender
      })
      .returning()
      .execute();

    // Create documents
    const testDocuments = [
      {
        application_id: application.id,
        document_type: 'ktp' as const,
        file_name: 'ktp.pdf',
        file_path: '/uploads/ktp.pdf',
        file_size: 1024000,
        mime_type: 'application/pdf'
      },
      {
        application_id: application.id,
        document_type: 'kk' as const,
        file_name: 'kk.pdf',
        file_path: '/uploads/kk.pdf',
        file_size: 512000,
        mime_type: 'application/pdf'
      }
    ];

    await db.insert(documentsTable)
      .values(testDocuments)
      .execute();

    // Test getting documents as application owner
    const result = await getDocuments(application.id, 'calon_pengangkut', user.id);

    expect(result).toHaveLength(2);
    expect(result[0].document_type).toEqual('ktp');
    expect(result[0].file_name).toEqual('ktp.pdf');
    expect(result[0].file_size).toEqual(1024000);
    expect(result[0].application_id).toEqual(application.id);
    expect(result[0].uploaded_at).toBeInstanceOf(Date);
    
    expect(result[1].document_type).toEqual('kk');
    expect(result[1].file_name).toEqual('kk.pdf');
    expect(result[1].file_size).toEqual(512000);
  });

  it('should allow admin to view any application documents', async () => {
    // Create user (application owner)
    const [user] = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        full_name: testUser.full_name,
        phone: testUser.phone,
        role: testUser.role
      })
      .returning()
      .execute();

    // Create admin
    const [admin] = await db.insert(usersTable)
      .values({
        email: testAdmin.email,
        password_hash: 'hashed_password',
        full_name: testAdmin.full_name,
        phone: testAdmin.phone,
        role: testAdmin.role
      })
      .returning()
      .execute();

    // Create application
    const [application] = await db.insert(applicationsTable)
      .values({
        user_id: user.id,
        full_name: testApplication.full_name,
        date_of_birth: testApplication.date_of_birth,
        place_of_birth: testApplication.place_of_birth,
        address: testApplication.address,
        phone: testApplication.phone,
        occupation: testApplication.occupation,
        monthly_income: testApplication.monthly_income.toString(),
        spouse_name: testApplication.spouse_name,
        spouse_occupation: testApplication.spouse_occupation,
        spouse_income: testApplication.spouse_income!.toString(),
        number_of_children: testApplication.number_of_children,
        reason_for_adoption: testApplication.reason_for_adoption,
        preferred_child_age_min: testApplication.preferred_child_age_min,
        preferred_child_age_max: testApplication.preferred_child_age_max,
        preferred_child_gender: testApplication.preferred_child_gender
      })
      .returning()
      .execute();

    // Create document
    await db.insert(documentsTable)
      .values({
        application_id: application.id,
        document_type: 'ktp',
        file_name: 'ktp.pdf',
        file_path: '/uploads/ktp.pdf',
        file_size: 1024000,
        mime_type: 'application/pdf'
      })
      .execute();

    // Test admin accessing any application's documents
    const result = await getDocuments(application.id, 'admin_dinas_sosial', admin.id);

    expect(result).toHaveLength(1);
    expect(result[0].document_type).toEqual('ktp');
    expect(result[0].application_id).toEqual(application.id);
  });

  it('should return empty array when no documents exist', async () => {
    // Create user
    const [user] = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        full_name: testUser.full_name,
        phone: testUser.phone,
        role: testUser.role
      })
      .returning()
      .execute();

    // Create application without documents
    const [application] = await db.insert(applicationsTable)
      .values({
        user_id: user.id,
        full_name: testApplication.full_name,
        date_of_birth: testApplication.date_of_birth,
        place_of_birth: testApplication.place_of_birth,
        address: testApplication.address,
        phone: testApplication.phone,
        occupation: testApplication.occupation,
        monthly_income: testApplication.monthly_income.toString(),
        spouse_name: testApplication.spouse_name,
        spouse_occupation: testApplication.spouse_occupation,
        spouse_income: testApplication.spouse_income!.toString(),
        number_of_children: testApplication.number_of_children,
        reason_for_adoption: testApplication.reason_for_adoption,
        preferred_child_age_min: testApplication.preferred_child_age_min,
        preferred_child_age_max: testApplication.preferred_child_age_max,
        preferred_child_gender: testApplication.preferred_child_gender
      })
      .returning()
      .execute();

    const result = await getDocuments(application.id, 'calon_pengangkut', user.id);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should throw error when user tries to access other user documents', async () => {
    // Create first user (application owner)
    const [user1] = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        full_name: testUser.full_name,
        phone: testUser.phone,
        role: testUser.role
      })
      .returning()
      .execute();

    // Create second user (not the owner)
    const [user2] = await db.insert(usersTable)
      .values({
        email: 'user2@test.com',
        password_hash: 'hashed_password',
        full_name: 'User Two',
        phone: '5555555555',
        role: 'calon_pengangkut'
      })
      .returning()
      .execute();

    // Create application owned by user1
    const [application] = await db.insert(applicationsTable)
      .values({
        user_id: user1.id,
        full_name: testApplication.full_name,
        date_of_birth: testApplication.date_of_birth,
        place_of_birth: testApplication.place_of_birth,
        address: testApplication.address,
        phone: testApplication.phone,
        occupation: testApplication.occupation,
        monthly_income: testApplication.monthly_income.toString(),
        spouse_name: testApplication.spouse_name,
        spouse_occupation: testApplication.spouse_occupation,
        spouse_income: testApplication.spouse_income!.toString(),
        number_of_children: testApplication.number_of_children,
        reason_for_adoption: testApplication.reason_for_adoption,
        preferred_child_age_min: testApplication.preferred_child_age_min,
        preferred_child_age_max: testApplication.preferred_child_age_max,
        preferred_child_gender: testApplication.preferred_child_gender
      })
      .returning()
      .execute();

    // User2 tries to access user1's application documents
    await expect(
      getDocuments(application.id, 'calon_pengangkut', user2.id)
    ).rejects.toThrow(/access denied/i);
  });

  it('should throw error when application does not exist', async () => {
    // Create user
    const [user] = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        full_name: testUser.full_name,
        phone: testUser.phone,
        role: testUser.role
      })
      .returning()
      .execute();

    // Try to get documents for non-existent application
    await expect(
      getDocuments(999, 'calon_pengangkut', user.id)
    ).rejects.toThrow(/application not found/i);
  });

  it('should throw error when userId is missing for calon_pengangkut role', async () => {
    await expect(
      getDocuments(1, 'calon_pengangkut')
    ).rejects.toThrow(/user id is required/i);
  });

  it('should handle documents with verified status correctly', async () => {
    // Create user
    const [user] = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        full_name: testUser.full_name,
        phone: testUser.phone,
        role: testUser.role
      })
      .returning()
      .execute();

    // Create admin for verification
    const [admin] = await db.insert(usersTable)
      .values({
        email: testAdmin.email,
        password_hash: 'hashed_password',
        full_name: testAdmin.full_name,
        phone: testAdmin.phone,
        role: testAdmin.role
      })
      .returning()
      .execute();

    // Create application
    const [application] = await db.insert(applicationsTable)
      .values({
        user_id: user.id,
        full_name: testApplication.full_name,
        date_of_birth: testApplication.date_of_birth,
        place_of_birth: testApplication.place_of_birth,
        address: testApplication.address,
        phone: testApplication.phone,
        occupation: testApplication.occupation,
        monthly_income: testApplication.monthly_income.toString(),
        spouse_name: testApplication.spouse_name,
        spouse_occupation: testApplication.spouse_occupation,
        spouse_income: testApplication.spouse_income!.toString(),
        number_of_children: testApplication.number_of_children,
        reason_for_adoption: testApplication.reason_for_adoption,
        preferred_child_age_min: testApplication.preferred_child_age_min,
        preferred_child_age_max: testApplication.preferred_child_age_max,
        preferred_child_gender: testApplication.preferred_child_gender
      })
      .returning()
      .execute();

    // Create document with verification
    const verifiedAt = new Date();
    await db.insert(documentsTable)
      .values({
        application_id: application.id,
        document_type: 'ktp',
        file_name: 'ktp.pdf',
        file_path: '/uploads/ktp.pdf',
        file_size: 1024000,
        mime_type: 'application/pdf',
        is_verified: true,
        verified_by: admin.id,
        verified_at: verifiedAt
      })
      .execute();

    const result = await getDocuments(application.id, 'calon_pengangkut', user.id);

    expect(result).toHaveLength(1);
    expect(result[0].is_verified).toBe(true);
    expect(result[0].verified_by).toEqual(admin.id);
    expect(result[0].verified_at).toBeInstanceOf(Date);
  });
});