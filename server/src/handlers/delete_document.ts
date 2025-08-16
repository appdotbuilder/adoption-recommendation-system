import { db } from '../db';
import { documentsTable, applicationsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import * as fs from 'fs/promises';

export async function deleteDocument(documentId: number, userId: number): Promise<void> {
  try {
    // First, get the document with its associated application to validate ownership and status
    const documentWithApplication = await db.select({
      document: {
        id: documentsTable.id,
        file_path: documentsTable.file_path,
        application_id: documentsTable.application_id
      },
      application: {
        user_id: applicationsTable.user_id,
        status: applicationsTable.status
      }
    })
    .from(documentsTable)
    .innerJoin(applicationsTable, eq(documentsTable.application_id, applicationsTable.id))
    .where(eq(documentsTable.id, documentId))
    .execute();

    if (documentWithApplication.length === 0) {
      throw new Error('Document not found');
    }

    const { document, application } = documentWithApplication[0];

    // Validate user owns the application
    if (application.user_id !== userId) {
      throw new Error('Access denied: User does not own this application');
    }

    // Validate application is still editable (draft status)
    if (application.status !== 'draft') {
      throw new Error('Cannot delete document: Application is no longer in draft status');
    }

    // Delete the database record
    await db.delete(documentsTable)
      .where(eq(documentsTable.id, documentId))
      .execute();

    // Attempt to delete the physical file
    try {
      await fs.unlink(document.file_path);
    } catch (fileError) {
      // Log file deletion error but don't fail the operation
      // The database record has already been deleted
      console.warn(`Failed to delete physical file at ${document.file_path}:`, fileError);
    }

  } catch (error) {
    console.error('Document deletion failed:', error);
    throw error;
  }
}