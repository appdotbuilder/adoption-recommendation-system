import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, applicationsTable, documentsTable } from '../db/schema';
import { deleteDocument } from '../handlers/delete_document';
import { eq } from 'drizzle-orm';
import * as fs from 'fs/promises';
import * as path from 'path';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  full_name: 'Test User',
  role: 'calon_pengangkut' as const
};

const anotherUser = {
  email: 'another@example.com',
  password_hash: 'hashed_password',
  full_name: 'Another User',
  role: 'calon_pengangkut' as const
};

// Test application data
const testApplication = {
  full_name: 'Test Applicant',
  date_of_birth: new Date('1990-01-01'),
  place_of_birth: 'Jakarta',
  address: '123 Test Street, Jakarta',
  phone: '081234567890',
  occupation: 'Software Engineer',
  monthly_income: '15000000.00',
  number_of_children: 0,
  reason_for_adoption: 'We want to provide a loving home for a child who needs one and expand our family with love and care.',
  preferred_child_age_min: 2,
  preferred_child_age_max: 8,
  preferred_child_gender: 'no_preference' as const,
  status: 'draft' as const
};

// Test document data
const testDocument = {
  document_type: 'ktp' as const,
  file_name: 'test_ktp.pdf',
  file_path: '/tmp/test_ktp.pdf',
  file_size: 1024,
  mime_type: 'application/pdf'
};

describe('deleteDocument', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a document successfully', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create test application
    const [application] = await db.insert(applicationsTable)
      .values({
        ...testApplication,
        user_id: user.id
      })
      .returning()
      .execute();

    // Create test document
    const [document] = await db.insert(documentsTable)
      .values({
        ...testDocument,
        application_id: application.id
      })
      .returning()
      .execute();

    // Create a dummy file for testing
    await fs.writeFile(testDocument.file_path, 'test content');

    // Delete the document
    await deleteDocument(document.id, user.id);

    // Verify document is deleted from database
    const deletedDocuments = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, document.id))
      .execute();

    expect(deletedDocuments).toHaveLength(0);

    // Verify physical file is deleted
    try {
      await fs.access(testDocument.file_path);
      throw new Error('File should have been deleted');
    } catch (error: any) {
      expect(error.code).toEqual('ENOENT');
    }
  });

  it('should throw error when document does not exist', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Try to delete non-existent document
    await expect(deleteDocument(999, user.id)).rejects.toThrow(/document not found/i);
  });

  it('should throw error when user does not own the application', async () => {
    // Create test users
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [anotherUserRecord] = await db.insert(usersTable)
      .values(anotherUser)
      .returning()
      .execute();

    // Create application owned by first user
    const [application] = await db.insert(applicationsTable)
      .values({
        ...testApplication,
        user_id: user.id
      })
      .returning()
      .execute();

    // Create document for the application
    const [document] = await db.insert(documentsTable)
      .values({
        ...testDocument,
        application_id: application.id
      })
      .returning()
      .execute();

    // Try to delete document as another user
    await expect(deleteDocument(document.id, anotherUserRecord.id))
      .rejects.toThrow(/access denied.*user does not own this application/i);

    // Verify document still exists
    const existingDocuments = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, document.id))
      .execute();

    expect(existingDocuments).toHaveLength(1);
  });

  it('should throw error when application is not in draft status', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create application with submitted status
    const [application] = await db.insert(applicationsTable)
      .values({
        ...testApplication,
        user_id: user.id,
        status: 'submitted'
      })
      .returning()
      .execute();

    // Create document
    const [document] = await db.insert(documentsTable)
      .values({
        ...testDocument,
        application_id: application.id
      })
      .returning()
      .execute();

    // Try to delete document
    await expect(deleteDocument(document.id, user.id))
      .rejects.toThrow(/cannot delete document.*application is no longer in draft status/i);

    // Verify document still exists
    const existingDocuments = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, document.id))
      .execute();

    expect(existingDocuments).toHaveLength(1);
  });

  it('should delete database record even if physical file deletion fails', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create test application
    const [application] = await db.insert(applicationsTable)
      .values({
        ...testApplication,
        user_id: user.id
      })
      .returning()
      .execute();

    // Create document with non-existent file path
    const nonExistentFilePath = '/tmp/non_existent_file.pdf';
    const [document] = await db.insert(documentsTable)
      .values({
        ...testDocument,
        application_id: application.id,
        file_path: nonExistentFilePath
      })
      .returning()
      .execute();

    // Delete the document (should succeed despite file not existing)
    await deleteDocument(document.id, user.id);

    // Verify document is deleted from database
    const deletedDocuments = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, document.id))
      .execute();

    expect(deletedDocuments).toHaveLength(0);
  });

  it('should handle different application statuses correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const nonDraftStatuses = ['submitted', 'under_review', 'approved', 'rejected', 'completed'] as const;

    for (const status of nonDraftStatuses) {
      // Create application with non-draft status
      const [application] = await db.insert(applicationsTable)
        .values({
          ...testApplication,
          user_id: user.id,
          status: status
        })
        .returning()
        .execute();

      // Create document
      const [document] = await db.insert(documentsTable)
        .values({
          ...testDocument,
          application_id: application.id
        })
        .returning()
        .execute();

      // Try to delete document
      await expect(deleteDocument(document.id, user.id))
        .rejects.toThrow(/cannot delete document.*application is no longer in draft status/i);

      // Verify document still exists
      const existingDocuments = await db.select()
        .from(documentsTable)
        .where(eq(documentsTable.id, document.id))
        .execute();

      expect(existingDocuments).toHaveLength(1);
    }
  });

  it('should validate document ownership through application relationship', async () => {
    // Create two users
    const [user1] = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values(anotherUser)
      .returning()
      .execute();

    // Create applications for both users
    const [app1] = await db.insert(applicationsTable)
      .values({
        ...testApplication,
        user_id: user1.id
      })
      .returning()
      .execute();

    const [app2] = await db.insert(applicationsTable)
      .values({
        ...testApplication,
        user_id: user2.id
      })
      .returning()
      .execute();

    // Create documents for both applications
    const [doc1] = await db.insert(documentsTable)
      .values({
        ...testDocument,
        application_id: app1.id
      })
      .returning()
      .execute();

    const [doc2] = await db.insert(documentsTable)
      .values({
        ...testDocument,
        application_id: app2.id,
        file_path: '/tmp/test_ktp2.pdf'
      })
      .returning()
      .execute();

    // User1 should be able to delete their document
    await deleteDocument(doc1.id, user1.id);

    // User1 should NOT be able to delete user2's document
    await expect(deleteDocument(doc2.id, user1.id))
      .rejects.toThrow(/access denied.*user does not own this application/i);

    // Verify only doc1 was deleted
    const remainingDocs = await db.select()
      .from(documentsTable)
      .execute();

    expect(remainingDocs).toHaveLength(1);
    expect(remainingDocs[0].id).toEqual(doc2.id);
  });
});