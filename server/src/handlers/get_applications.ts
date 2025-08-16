import { db } from '../db';
import { applicationsTable } from '../db/schema';
import { type Application, type GetApplicationsQuery } from '../schema';
import { eq, and, count, desc, SQL } from 'drizzle-orm';

export async function getApplications(query: GetApplicationsQuery, userRole: string, userId?: number): Promise<{ applications: Application[]; total: number }> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Role-based filtering
    if (userRole === 'calon_pengangkut') {
      if (!userId) {
        throw new Error('User ID is required for calon_pengangkut role');
      }
      conditions.push(eq(applicationsTable.user_id, userId));
    }

    // Status filtering (available for both roles, but typically used by admin)
    if (query.status) {
      conditions.push(eq(applicationsTable.status, query.status));
    }

    // Additional user_id filtering (typically for admin to view specific user's applications)
    if (query.user_id && userRole === 'admin_dinas_sosial') {
      conditions.push(eq(applicationsTable.user_id, query.user_id));
    }

    // Build the final where condition
    const whereCondition = conditions.length === 0 
      ? undefined 
      : conditions.length === 1 
        ? conditions[0] 
        : and(...conditions);

    // Build applications query
    const applicationsQuery = db.select()
      .from(applicationsTable)
      .$dynamic();
    
    // Build count query  
    const countQuery = db.select({ count: count() })
      .from(applicationsTable)
      .$dynamic();

    // Apply where condition if it exists
    const finalApplicationsQuery = whereCondition 
      ? applicationsQuery.where(whereCondition)
      : applicationsQuery;
      
    const finalCountQuery = whereCondition
      ? countQuery.where(whereCondition)
      : countQuery;

    // Execute both queries
    const [applicationsResult, countResult] = await Promise.all([
      finalApplicationsQuery
        .orderBy(desc(applicationsTable.created_at))
        .limit(query.limit)
        .offset(query.offset)
        .execute(),
      finalCountQuery.execute()
    ]);

    // Convert numeric fields to numbers
    const applications: Application[] = applicationsResult.map(app => ({
      ...app,
      monthly_income: parseFloat(app.monthly_income),
      spouse_income: app.spouse_income ? parseFloat(app.spouse_income) : null
    }));

    const total = countResult[0].count;

    return {
      applications,
      total
    };
  } catch (error) {
    console.error('Failed to get applications:', error);
    throw error;
  }
}