import { db } from '../db';
import { applicationStatusHistoryTable, applicationsTable } from '../db/schema';
import { type ApplicationStatusHistory } from '../schema';
import { eq, and, desc } from 'drizzle-orm';

export const getApplicationStatusHistory = async (
  applicationId: number, 
  userRole: string, 
  userId?: number
): Promise<ApplicationStatusHistory[]> => {
  try {
    // First, verify the application exists and check access permissions
    const application = await db
      .select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, applicationId))
      .execute();

    if (application.length === 0) {
      throw new Error('Application not found');
    }

    // Check access permissions
    const applicationData = application[0];
    
    // Only the application owner or admin can view status history
    if (userRole === 'calon_pengangkut') {
      if (!userId || applicationData.user_id !== userId) {
        throw new Error('Access denied: You can only view your own application history');
      }
    } else if (userRole !== 'admin_dinas_sosial') {
      throw new Error('Access denied: Invalid user role');
    }

    // Fetch status history ordered by creation date (chronological order - most recent first)
    const historyResults = await db
      .select()
      .from(applicationStatusHistoryTable)
      .where(eq(applicationStatusHistoryTable.application_id, applicationId))
      .orderBy(desc(applicationStatusHistoryTable.created_at))
      .execute();

    // Convert the results to match schema type
    return historyResults.map(history => ({
      id: history.id,
      application_id: history.application_id,
      old_status: history.old_status,
      new_status: history.new_status,
      changed_by: history.changed_by,
      notes: history.notes,
      created_at: history.created_at
    }));

  } catch (error) {
    console.error('Failed to fetch application status history:', error);
    throw error;
  }
};