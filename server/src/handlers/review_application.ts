import { db } from '../db';
import { applicationsTable, usersTable, applicationStatusHistoryTable } from '../db/schema';
import { type ReviewApplicationInput, type Application } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function reviewApplication(input: ReviewApplicationInput, adminId: number): Promise<Application> {
  try {
    // Validate that the admin exists and has the correct role
    const admin = await db.select()
      .from(usersTable)
      .where(and(
        eq(usersTable.id, adminId),
        eq(usersTable.role, 'admin_dinas_sosial'),
        eq(usersTable.is_active, true)
      ))
      .execute();

    if (admin.length === 0) {
      throw new Error('Admin not found or not authorized to review applications');
    }

    // Fetch the current application to get its current status
    const currentApplication = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, input.id))
      .execute();

    if (currentApplication.length === 0) {
      throw new Error('Application not found');
    }

    const oldStatus = currentApplication[0].status;

    // Update the application
    const updatedApplication = await db.update(applicationsTable)
      .set({
        status: input.status,
        admin_notes: input.admin_notes || null,
        reviewed_by: adminId,
        reviewed_at: new Date(),
        updated_at: new Date()
      })
      .where(eq(applicationsTable.id, input.id))
      .returning()
      .execute();

    if (updatedApplication.length === 0) {
      throw new Error('Failed to update application');
    }

    // Create status history entry
    await db.insert(applicationStatusHistoryTable)
      .values({
        application_id: input.id,
        old_status: oldStatus,
        new_status: input.status,
        changed_by: adminId,
        notes: input.admin_notes || null
      })
      .execute();

    // Convert numeric fields back to numbers before returning
    const result = updatedApplication[0];
    return {
      ...result,
      monthly_income: parseFloat(result.monthly_income),
      spouse_income: result.spouse_income ? parseFloat(result.spouse_income) : null
    };
  } catch (error) {
    console.error('Application review failed:', error);
    throw error;
  }
}