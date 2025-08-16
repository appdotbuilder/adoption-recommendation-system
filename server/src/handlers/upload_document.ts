import { db } from '../db';
import { applicationsTable, documentsTable } from '../db/schema';
import { type UploadDocumentInput, type Document } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function uploadDocument(input: UploadDocumentInput, userId: number): Promise<Document> {
  try {
    // First, verify that the application exists and belongs to the user
    const applications = await db.select()
      .from(applicationsTable)
      .where(
        and(
          eq(applicationsTable.id, input.application_id),
          eq(applicationsTable.user_id, userId)
        )
      )
      .execute();

    if (applications.length === 0) {
      throw new Error('Application not found or access denied');
    }

    const application = applications[0];

    // Ensure application is still editable (draft or submitted status)
    if (!['draft', 'submitted'].includes(application.status)) {
      throw new Error('Documents cannot be uploaded for applications in current status');
    }

    // Validate file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (input.file_size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds maximum limit of 10MB');
    }

    // Validate mime type (only allow common document formats)
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedMimeTypes.includes(input.mime_type)) {
      throw new Error('File type not allowed. Please upload PDF, JPG, PNG, or DOC files');
    }

    // Insert document record
    const result = await db.insert(documentsTable)
      .values({
        application_id: input.application_id,
        document_type: input.document_type,
        file_name: input.file_name,
        file_path: input.file_path,
        file_size: input.file_size,
        mime_type: input.mime_type,
        is_verified: false, // New documents start as unverified
        verified_by: null,
        verified_at: null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Document upload failed:', error);
    throw error;
  }
}