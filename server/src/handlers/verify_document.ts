import { db } from '../db';
import { documentsTable, usersTable } from '../db/schema';
import { type VerifyDocumentInput, type Document } from '../schema';
import { eq } from 'drizzle-orm';

export async function verifyDocument(input: VerifyDocumentInput, adminId: number): Promise<Document> {
  try {
    // First, verify that the admin has the correct role
    const adminUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, adminId))
      .execute();

    if (adminUser.length === 0) {
      throw new Error('Admin user not found');
    }

    if (adminUser[0].role !== 'admin_dinas_sosial') {
      throw new Error('Insufficient permissions: Only admin_dinas_sosial can verify documents');
    }

    // Check if document exists
    const existingDocument = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, input.id))
      .execute();

    if (existingDocument.length === 0) {
      throw new Error('Document not found');
    }

    // Update document verification status
    const updateData = {
      is_verified: input.is_verified,
      verified_by: input.is_verified ? adminId : null,
      verified_at: input.is_verified ? new Date() : null
    };

    const result = await db.update(documentsTable)
      .set(updateData)
      .where(eq(documentsTable.id, input.id))
      .returning()
      .execute();

    const updatedDocument = result[0];
    
    // Convert numeric fields back to numbers before returning
    return {
      ...updatedDocument,
      file_size: updatedDocument.file_size // file_size is integer, no conversion needed
    };
  } catch (error) {
    console.error('Document verification failed:', error);
    throw error;
  }
}