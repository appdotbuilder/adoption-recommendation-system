import { db } from '../db';
import { documentsTable, applicationsTable } from '../db/schema';
import { type Document } from '../schema';
import { eq } from 'drizzle-orm';

export async function getDocuments(applicationId: number, userRole: string, userId?: number): Promise<Document[]> {
  try {
    // For calon_pengangkut role, we need to verify they own the application
    if (userRole === 'calon_pengangkut') {
      if (!userId) {
        throw new Error('User ID is required for calon_pengangkut role');
      }

      // Check if the application belongs to the user
      const application = await db.select()
        .from(applicationsTable)
        .where(eq(applicationsTable.id, applicationId))
        .execute();

      if (application.length === 0) {
        throw new Error('Application not found');
      }

      if (application[0].user_id !== userId) {
        throw new Error('Access denied: You can only view documents for your own applications');
      }
    }

    // Fetch documents for the application
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.application_id, applicationId))
      .execute();

    // Convert numeric fields and ensure proper types
    return documents.map(doc => ({
      ...doc,
      // No numeric fields to convert in documents table
      uploaded_at: doc.uploaded_at,
      verified_at: doc.verified_at
    }));

  } catch (error) {
    console.error('Get documents failed:', error);
    throw error;
  }
}