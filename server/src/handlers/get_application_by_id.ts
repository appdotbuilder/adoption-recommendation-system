import { db } from '../db';
import { applicationsTable } from '../db/schema';
import { type Application } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getApplicationById(id: number, userRole: string, userId?: number): Promise<Application | null> {
  try {
    // Apply access control based on role
    if (userRole === 'calon_pengangkut') {
      // Calon pengangkut can only access their own applications
      if (!userId) {
        throw new Error('User ID is required for calon_pengangkut role');
      }
      
      const results = await db.select()
        .from(applicationsTable)
        .where(and(
          eq(applicationsTable.id, id),
          eq(applicationsTable.user_id, userId)
        ))
        .execute();

      if (results.length === 0) {
        return null;
      }

      const application = results[0];
      
      // Convert numeric fields back to numbers
      return {
        ...application,
        monthly_income: parseFloat(application.monthly_income),
        spouse_income: application.spouse_income ? parseFloat(application.spouse_income) : null
      };
    } else if (userRole === 'admin_dinas_sosial') {
      // Admin can access any application
      const results = await db.select()
        .from(applicationsTable)
        .where(eq(applicationsTable.id, id))
        .execute();

      if (results.length === 0) {
        return null;
      }

      const application = results[0];
      
      // Convert numeric fields back to numbers
      return {
        ...application,
        monthly_income: parseFloat(application.monthly_income),
        spouse_income: application.spouse_income ? parseFloat(application.spouse_income) : null
      };
    } else {
      throw new Error('Invalid user role');
    }

  } catch (error) {
    console.error('Get application by ID failed:', error);
    throw error;
  }
}