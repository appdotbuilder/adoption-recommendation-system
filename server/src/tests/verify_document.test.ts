import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, applicationsTable, documentsTable } from '../db/schema';
import { type VerifyDocumentInput } from '../schema';
import { verifyDocument } from '../handlers/verify_document';
import { eq } from 'drizzle-orm';

// Test data setup
const adminUser = {
  email: 'admin@example.com',
  password_hash: 'hashed_password',
  full_name: 'Admin User',
  phone: '+1234567890',
  role: 'admin_dinas_sosial' as const,
  is_active: true
};

const regularUser = {
  email: 'user@example.com',
  password_hash: 'hashed_password',
  full_name: 'Regular User',
  phone: '+1234567891',
  role: 'calon_pengangkut' as const,
  is_active: true
};

const testApplication = {
  user_id: 0, // Will be set after creating user
  status: 'submitted' as const,
  full_name: 'Test Applicant',
  date_of_birth: new Date('1990-01-01'),
  place_of_birth: 'Test City',
  address: '123 Test Street, Test City',
  phone: '+1234567892',
  occupation: 'Engineer',
  monthly_income: '5000.00',
  spouse_name: 'Test Spouse',
  spouse_occupation: 'Teacher',
  spouse_income: '4000.00',
  number_of_children: 0,
  reason_for_adoption: 'We want to provide a loving home for a child in need and have been preparing for this opportunity for years.',
  preferred_child_age_min: 2,
  preferred_child_age_max: 5,
  preferred_child_gender: 'no_preference' as const
};

const testDocument = {
  application_id: 0, // Will be set after creating application
  document_type: 'ktp' as const,
  file_name: 'test_ktp.pdf',
  file_path: '/uploads/documents/test_ktp.pdf',
  file_size: 1024000,
  mime_type: 'application/pdf',
  is_verified: false
};

describe('verifyDocument', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should verify a document successfully by admin', async () => {
    // Create admin user
    const [admin] = await db.insert(usersTable)
      .values(adminUser)
      .returning()
      .execute();

    // Create regular user
    const [user] = await db.insert(usersTable)
      .values(regularUser)
      .returning()
      .execute();

    // Create application
    const [application] = await db.insert(applicationsTable)
      .values({ ...testApplication, user_id: user.id })
      .returning()
      .execute();

    // Create document
    const [document] = await db.insert(documentsTable)
      .values({ ...testDocument, application_id: application.id })
      .returning()
      .execute();

    const input: VerifyDocumentInput = {
      id: document.id,
      is_verified: true
    };

    const result = await verifyDocument(input, admin.id);

    // Verify response
    expect(result.id).toEqual(document.id);
    expect(result.is_verified).toBe(true);
    expect(result.verified_by).toEqual(admin.id);
    expect(result.verified_at).toBeInstanceOf(Date);
    expect(result.document_type).toEqual('ktp');
    expect(result.file_name).toEqual('test_ktp.pdf');
    expect(result.file_size).toEqual(1024000);
  });

  it('should reject document verification by admin', async () => {
    // Create admin user
    const [admin] = await db.insert(usersTable)
      .values(adminUser)
      .returning()
      .execute();

    // Create regular user
    const [user] = await db.insert(usersTable)
      .values(regularUser)
      .returning()
      .execute();

    // Create application
    const [application] = await db.insert(applicationsTable)
      .values({ ...testApplication, user_id: user.id })
      .returning()
      .execute();

    // Create document that was previously verified
    const [document] = await db.insert(documentsTable)
      .values({
        ...testDocument,
        application_id: application.id,
        is_verified: true,
        verified_by: admin.id,
        verified_at: new Date()
      })
      .returning()
      .execute();

    const input: VerifyDocumentInput = {
      id: document.id,
      is_verified: false
    };

    const result = await verifyDocument(input, admin.id);

    // Verify response - document should be unverified
    expect(result.id).toEqual(document.id);
    expect(result.is_verified).toBe(false);
    expect(result.verified_by).toBeNull();
    expect(result.verified_at).toBeNull();
  });

  it('should save verification status to database', async () => {
    // Create admin user
    const [admin] = await db.insert(usersTable)
      .values(adminUser)
      .returning()
      .execute();

    // Create regular user
    const [user] = await db.insert(usersTable)
      .values(regularUser)
      .returning()
      .execute();

    // Create application
    const [application] = await db.insert(applicationsTable)
      .values({ ...testApplication, user_id: user.id })
      .returning()
      .execute();

    // Create document
    const [document] = await db.insert(documentsTable)
      .values({ ...testDocument, application_id: application.id })
      .returning()
      .execute();

    const input: VerifyDocumentInput = {
      id: document.id,
      is_verified: true
    };

    await verifyDocument(input, admin.id);

    // Query database to verify changes were saved
    const updatedDocuments = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, document.id))
      .execute();

    expect(updatedDocuments).toHaveLength(1);
    const updatedDocument = updatedDocuments[0];
    expect(updatedDocument.is_verified).toBe(true);
    expect(updatedDocument.verified_by).toEqual(admin.id);
    expect(updatedDocument.verified_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent admin', async () => {
    const input: VerifyDocumentInput = {
      id: 999,
      is_verified: true
    };

    await expect(verifyDocument(input, 999)).rejects.toThrow(/admin user not found/i);
  });

  it('should throw error for non-admin user', async () => {
    // Create regular user (not admin)
    const [user] = await db.insert(usersTable)
      .values(regularUser)
      .returning()
      .execute();

    const input: VerifyDocumentInput = {
      id: 1,
      is_verified: true
    };

    await expect(verifyDocument(input, user.id)).rejects.toThrow(/insufficient permissions/i);
  });

  it('should throw error for non-existent document', async () => {
    // Create admin user
    const [admin] = await db.insert(usersTable)
      .values(adminUser)
      .returning()
      .execute();

    const input: VerifyDocumentInput = {
      id: 999,
      is_verified: true
    };

    await expect(verifyDocument(input, admin.id)).rejects.toThrow(/document not found/i);
  });

  it('should handle verification of already verified document', async () => {
    // Create admin user
    const [admin] = await db.insert(usersTable)
      .values(adminUser)
      .returning()
      .execute();

    // Create regular user
    const [user] = await db.insert(usersTable)
      .values(regularUser)
      .returning()
      .execute();

    // Create application
    const [application] = await db.insert(applicationsTable)
      .values({ ...testApplication, user_id: user.id })
      .returning()
      .execute();

    // Create already verified document
    const [document] = await db.insert(documentsTable)
      .values({
        ...testDocument,
        application_id: application.id,
        is_verified: true,
        verified_by: admin.id,
        verified_at: new Date()
      })
      .returning()
      .execute();

    const input: VerifyDocumentInput = {
      id: document.id,
      is_verified: true
    };

    const result = await verifyDocument(input, admin.id);

    // Should still work and update verified_by to current admin
    expect(result.is_verified).toBe(true);
    expect(result.verified_by).toEqual(admin.id);
    expect(result.verified_at).toBeInstanceOf(Date);
  });

  it('should handle different document types', async () => {
    // Create admin user
    const [admin] = await db.insert(usersTable)
      .values(adminUser)
      .returning()
      .execute();

    // Create regular user
    const [user] = await db.insert(usersTable)
      .values(regularUser)
      .returning()
      .execute();

    // Create application
    const [application] = await db.insert(applicationsTable)
      .values({ ...testApplication, user_id: user.id })
      .returning()
      .execute();

    // Create document with different type
    const [document] = await db.insert(documentsTable)
      .values({
        ...testDocument,
        application_id: application.id,
        document_type: 'surat_keterangan_sehat'
      })
      .returning()
      .execute();

    const input: VerifyDocumentInput = {
      id: document.id,
      is_verified: true
    };

    const result = await verifyDocument(input, admin.id);

    expect(result.document_type).toEqual('surat_keterangan_sehat');
    expect(result.is_verified).toBe(true);
  });
});