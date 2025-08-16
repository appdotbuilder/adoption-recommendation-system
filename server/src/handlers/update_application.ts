import { db } from '../db';
import { applicationsTable } from '../db/schema';
import { type UpdateApplicationInput, type Application } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function updateApplication(input: UpdateApplicationInput, userId: number): Promise<Application> {
  try {
    // First, verify the application exists and belongs to the user
    const existingApplication = await db.select()
      .from(applicationsTable)
      .where(
        and(
          eq(applicationsTable.id, input.id),
          eq(applicationsTable.user_id, userId)
        )
      )
      .execute();

    if (existingApplication.length === 0) {
      throw new Error('Application not found or access denied');
    }

    const currentApplication = existingApplication[0];

    // Check if application is still editable (only draft and submitted can be edited)
    if (!['draft', 'submitted'].includes(currentApplication.status)) {
      throw new Error('Application cannot be modified in its current status');
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    // Add only the fields that are provided in the input
    if (input.full_name !== undefined) updateData.full_name = input.full_name;
    if (input.date_of_birth !== undefined) updateData.date_of_birth = input.date_of_birth;
    if (input.place_of_birth !== undefined) updateData.place_of_birth = input.place_of_birth;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.occupation !== undefined) updateData.occupation = input.occupation;
    if (input.monthly_income !== undefined) updateData.monthly_income = input.monthly_income.toString();
    if (input.spouse_name !== undefined) updateData.spouse_name = input.spouse_name;
    if (input.spouse_occupation !== undefined) updateData.spouse_occupation = input.spouse_occupation;
    if (input.spouse_income !== undefined) updateData.spouse_income = input.spouse_income ? input.spouse_income.toString() : null;
    if (input.number_of_children !== undefined) updateData.number_of_children = input.number_of_children;
    if (input.reason_for_adoption !== undefined) updateData.reason_for_adoption = input.reason_for_adoption;
    if (input.preferred_child_age_min !== undefined) updateData.preferred_child_age_min = input.preferred_child_age_min;
    if (input.preferred_child_age_max !== undefined) updateData.preferred_child_age_max = input.preferred_child_age_max;
    if (input.preferred_child_gender !== undefined) updateData.preferred_child_gender = input.preferred_child_gender;

    // Update the application
    const result = await db.update(applicationsTable)
      .set(updateData)
      .where(eq(applicationsTable.id, input.id))
      .returning()
      .execute();

    const updatedApplication = result[0];

    // Convert numeric fields back to numbers before returning
    return {
      ...updatedApplication,
      monthly_income: parseFloat(updatedApplication.monthly_income),
      spouse_income: updatedApplication.spouse_income ? parseFloat(updatedApplication.spouse_income) : null
    };
  } catch (error) {
    console.error('Application update failed:', error);
    throw error;
  }
}