import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, applicationsTable, documentsTable } from '../db/schema';
import { type UploadDocumentInput } from '../schema';
import { uploadDocument } from '../handlers/upload_document';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'testuser@example.com',
  password_hash: 'hashedpassword123',
  full_name: 'Test User',
  phone: '1234567890',
  role: 'calon_pengangkut' as const,
  is_active: true
};

// Test application data
const testApplication = {
  full_name: 'Test Applicant',
  date_of_birth: new Date('1990-01-01'),
  place_of_birth: 'Test City',
  address: 'Test Address 123',
  phone: '1234567890',
  occupation: 'Engineer',
  monthly_income: '5000000.00', // Using string for numeric column
  spouse_name: null,
  spouse_occupation: null,
  spouse_income: null,
  number_of_children: 0,
  reason_for_adoption: 'We want to provide a loving home for a child who needs one. We have been married for 5 years and are financially stable.',
  preferred_child_age_min: 0,
  preferred_child_age_max: 5,
  preferred_child_gender: 'no_preference' as const,
  status: 'draft' as const
};

// Valid test input
const testInput: UploadDocumentInput = {
  application_id: 1, // Will be set dynamically in tests
  document_type: 'ktp',
  file_name: 'ktp_scan.pdf',
  file_path: '/uploads/documents/ktp_scan.pdf',
  file_size: 1024000, // 1MB
  mime_type: 'application/pdf'
};

describe('uploadDocument', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should upload document successfully', async () => {
    // Create user and application first
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    const applicationResult = await db.insert(applicationsTable)
      .values({ ...testApplication, user_id: userId })
      .returning()
      .execute();
    const applicationId = applicationResult[0].id;

    // Upload document
    const documentInput = { ...testInput, application_id: applicationId };
    const result = await uploadDocument(documentInput, userId);

    // Verify document properties
    expect(result.id).toBeDefined();
    expect(result.application_id).toEqual(applicationId);
    expect(result.document_type).toEqual('ktp');
    expect(result.file_name).toEqual('ktp_scan.pdf');
    expect(result.file_path).toEqual('/uploads/documents/ktp_scan.pdf');
    expect(result.file_size).toEqual(1024000);
    expect(result.mime_type).toEqual('application/pdf');
    expect(result.is_verified).toEqual(false);
    expect(result.verified_by).toBeNull();
    expect(result.verified_at).toBeNull();
    expect(result.uploaded_at).toBeInstanceOf(Date);
  });

  it('should save document to database', async () => {
    // Create user and application first
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    const applicationResult = await db.insert(applicationsTable)
      .values({ ...testApplication, user_id: userId })
      .returning()
      .execute();
    const applicationId = applicationResult[0].id;

    // Upload document
    const documentInput = { ...testInput, application_id: applicationId };
    const result = await uploadDocument(documentInput, userId);

    // Verify document exists in database
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, result.id))
      .execute();

    expect(documents).toHaveLength(1);
    expect(documents[0].application_id).toEqual(applicationId);
    expect(documents[0].document_type).toEqual('ktp');
    expect(documents[0].file_name).toEqual('ktp_scan.pdf');
    expect(documents[0].is_verified).toEqual(false);
    expect(documents[0].uploaded_at).toBeInstanceOf(Date);
  });

  it('should reject document upload for non-existent application', async () => {
    // Create user but no application
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    const documentInput = { ...testInput, application_id: 999 }; // Non-existent application
    
    await expect(uploadDocument(documentInput, userId)).rejects.toThrow(/application not found or access denied/i);
  });

  it('should reject document upload for application belonging to different user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable).values(testUser).returning().execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable).values({
      ...testUser,
      email: 'user2@example.com'
    }).returning().execute();
    const user2Id = user2Result[0].id;

    // Create application for user1
    const applicationResult = await db.insert(applicationsTable)
      .values({ ...testApplication, user_id: user1Id })
      .returning()
      .execute();
    const applicationId = applicationResult[0].id;

    // Try to upload document as user2
    const documentInput = { ...testInput, application_id: applicationId };
    
    await expect(uploadDocument(documentInput, user2Id)).rejects.toThrow(/application not found or access denied/i);
  });

  it('should reject document upload for application in non-editable status', async () => {
    // Create user and application with approved status
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    const applicationResult = await db.insert(applicationsTable)
      .values({ 
        ...testApplication, 
        user_id: userId,
        status: 'approved' // Non-editable status
      })
      .returning()
      .execute();
    const applicationId = applicationResult[0].id;

    const documentInput = { ...testInput, application_id: applicationId };
    
    await expect(uploadDocument(documentInput, userId)).rejects.toThrow(/documents cannot be uploaded for applications in current status/i);
  });

  it('should reject file that exceeds size limit', async () => {
    // Create user and application
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    const applicationResult = await db.insert(applicationsTable)
      .values({ ...testApplication, user_id: userId })
      .returning()
      .execute();
    const applicationId = applicationResult[0].id;

    // Try to upload oversized file (11MB)
    const documentInput = {
      ...testInput,
      application_id: applicationId,
      file_size: 11 * 1024 * 1024 // 11MB
    };
    
    await expect(uploadDocument(documentInput, userId)).rejects.toThrow(/file size exceeds maximum limit/i);
  });

  it('should reject invalid mime types', async () => {
    // Create user and application
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    const applicationResult = await db.insert(applicationsTable)
      .values({ ...testApplication, user_id: userId })
      .returning()
      .execute();
    const applicationId = applicationResult[0].id;

    // Try to upload file with invalid mime type
    const documentInput = {
      ...testInput,
      application_id: applicationId,
      mime_type: 'text/plain' // Invalid mime type
    };
    
    await expect(uploadDocument(documentInput, userId)).rejects.toThrow(/file type not allowed/i);
  });

  it('should accept all valid mime types', async () => {
    // Create user and application
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    const applicationResult = await db.insert(applicationsTable)
      .values({ ...testApplication, user_id: userId })
      .returning()
      .execute();
    const applicationId = applicationResult[0].id;

    const validMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    // Test each valid mime type
    for (const mimeType of validMimeTypes) {
      const documentInput = {
        ...testInput,
        application_id: applicationId,
        mime_type: mimeType,
        file_name: `test_${mimeType.replace('/', '_')}.ext`,
        document_type: 'kk' as const // Use different document type to avoid conflicts
      };

      const result = await uploadDocument(documentInput, userId);
      expect(result.mime_type).toEqual(mimeType);
    }
  });

  it('should allow document upload for submitted application', async () => {
    // Create user and application with submitted status
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    const applicationResult = await db.insert(applicationsTable)
      .values({ 
        ...testApplication, 
        user_id: userId,
        status: 'submitted' // Still editable status
      })
      .returning()
      .execute();
    const applicationId = applicationResult[0].id;

    const documentInput = { ...testInput, application_id: applicationId };
    const result = await uploadDocument(documentInput, userId);

    expect(result.application_id).toEqual(applicationId);
    expect(result.document_type).toEqual('ktp');
  });

  it('should upload multiple document types for same application', async () => {
    // Create user and application
    const userResult = await db.insert(usersTable).values(testUser).returning().execute();
    const userId = userResult[0].id;

    const applicationResult = await db.insert(applicationsTable)
      .values({ ...testApplication, user_id: userId })
      .returning()
      .execute();
    const applicationId = applicationResult[0].id;

    // Upload different document types
    const documentTypes = ['ktp', 'kk', 'surat_nikah'] as const;
    
    for (const docType of documentTypes) {
      const documentInput = {
        ...testInput,
        application_id: applicationId,
        document_type: docType,
        file_name: `${docType}_scan.pdf`
      };

      const result = await uploadDocument(documentInput, userId);
      expect(result.document_type).toEqual(docType);
      expect(result.file_name).toEqual(`${docType}_scan.pdf`);
    }

    // Verify all documents exist
    const allDocuments = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.application_id, applicationId))
      .execute();

    expect(allDocuments).toHaveLength(3);
    expect(allDocuments.map(doc => doc.document_type).sort()).toEqual(['kk', 'ktp', 'surat_nikah']);
  });
});