import { db } from '../db';
import { applicationsTable, usersTable } from '../db/schema';
import { type CreateApplicationInput, type Application } from '../schema';
import { eq } from 'drizzle-orm';

export async function createApplication(input: CreateApplicationInput, userId: number): Promise<Application> {
  try {
    // Verify that the user exists and has the correct role
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (!user.length) {
      throw new Error('User not found');
    }

    if (user[0].role !== 'calon_pengangkut') {
      throw new Error('Only calon_pengangkut users can create applications');
    }

    if (!user[0].is_active) {
      throw new Error('User account is not active');
    }

    // Insert the application record
    const result = await db.insert(applicationsTable)
      .values({
        user_id: userId,
        status: 'draft',
        full_name: input.full_name,
        date_of_birth: input.date_of_birth,
        place_of_birth: input.place_of_birth,
        address: input.address,
        phone: input.phone,
        occupation: input.occupation,
        monthly_income: input.monthly_income.toString(), // Convert number to string for numeric column
        spouse_name: input.spouse_name || null,
        spouse_occupation: input.spouse_occupation || null,
        spouse_income: input.spouse_income ? input.spouse_income.toString() : null, // Convert number to string for numeric column
        number_of_children: input.number_of_children,
        reason_for_adoption: input.reason_for_adoption,
        preferred_child_age_min: input.preferred_child_age_min,
        preferred_child_age_max: input.preferred_child_age_max,
        preferred_child_gender: input.preferred_child_gender,
        admin_notes: null,
        reviewed_by: null,
        reviewed_at: null
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const application = result[0];
    return {
      ...application,
      monthly_income: parseFloat(application.monthly_income), // Convert string back to number
      spouse_income: application.spouse_income ? parseFloat(application.spouse_income) : null // Convert string back to number
    };
  } catch (error) {
    console.error('Application creation failed:', error);
    throw error;
  }
}