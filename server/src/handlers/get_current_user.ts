import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';
import { eq, and } from 'drizzle-orm';

export const getCurrentUser = async (userId: number): Promise<User | null> => {
  try {
    // Query user by ID and ensure they are active
    const results = await db.select()
      .from(usersTable)
      .where(and(
        eq(usersTable.id, userId),
        eq(usersTable.is_active, true)
      ))
      .execute();

    if (results.length === 0) {
      return null;
    }

    return results[0];
  } catch (error) {
    console.error('Failed to get current user:', error);
    throw error;
  }
};