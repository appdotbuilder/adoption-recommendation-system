import { db } from '../db';
import { applicationsTable, documentsTable, applicationStatusHistoryTable } from '../db/schema';
import { type Application } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function submitApplication(applicationId: number, userId: number): Promise<Application> {
  try {
    // First, verify the application exists and belongs to the user
    const applications = await db.select()
      .from(applicationsTable)
      .where(
        and(
          eq(applicationsTable.id, applicationId),
          eq(applicationsTable.user_id, userId)
        )
      )
      .execute();

    if (applications.length === 0) {
      throw new Error('Application not found or you do not have permission to access it');
    }

    const application = applications[0];

    // Check if application is in draft status
    if (application.status !== 'draft') {
      throw new Error('Application can only be submitted from draft status');
    }

    // Validate that all required documents are uploaded
    const requiredDocuments = ['ktp', 'kk', 'surat_keterangan_sehat', 'surat_keterangan_berkelakuan_baik'];
    
    const uploadedDocuments = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.application_id, applicationId))
      .execute();

    const uploadedTypes = uploadedDocuments.map(doc => doc.document_type);
    const missingDocuments = requiredDocuments.filter(type => !uploadedTypes.includes(type as any));

    if (missingDocuments.length > 0) {
      throw new Error(`Missing required documents: ${missingDocuments.join(', ')}`);
    }

    // Update application status to 'submitted'
    const updatedApplications = await db.update(applicationsTable)
      .set({ 
        status: 'submitted',
        updated_at: new Date()
      })
      .where(eq(applicationsTable.id, applicationId))
      .returning()
      .execute();

    // Create status history entry
    await db.insert(applicationStatusHistoryTable)
      .values({
        application_id: applicationId,
        old_status: 'draft',
        new_status: 'submitted',
        changed_by: userId,
        notes: 'Application submitted for review',
        created_at: new Date()
      })
      .execute();

    const updatedApplication = updatedApplications[0];

    // Convert numeric fields back to numbers before returning
    return {
      ...updatedApplication,
      monthly_income: parseFloat(updatedApplication.monthly_income),
      spouse_income: updatedApplication.spouse_income ? parseFloat(updatedApplication.spouse_income) : null
    };

  } catch (error) {
    console.error('Application submission failed:', error);
    throw error;
  }
}