import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, applicationsTable, documentsTable, applicationStatusHistoryTable } from '../db/schema';
import { submitApplication } from '../handlers/submit_application';
import { eq } from 'drizzle-orm';

describe('submitApplication', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testApplicationId: number;

  beforeEach(async () => {
    // Create a test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Test User',
        phone: '08123456789',
        role: 'calon_pengangkut',
        is_active: true
      })
      .returning()
      .execute();

    testUserId = users[0].id;

    // Create a test application in draft status
    const applications = await db.insert(applicationsTable)
      .values({
        user_id: testUserId,
        status: 'draft',
        full_name: 'John Doe',
        date_of_birth: new Date('1990-01-01'),
        place_of_birth: 'Jakarta',
        address: 'Jl. Test No. 123, Jakarta',
        phone: '08123456789',
        occupation: 'Software Engineer',
        monthly_income: '5000000.00',
        spouse_name: null,
        spouse_occupation: null,
        spouse_income: null,
        number_of_children: 0,
        reason_for_adoption: 'We want to provide a loving home for a child in need and have the financial stability to support them.',
        preferred_child_age_min: 0,
        preferred_child_age_max: 5,
        preferred_child_gender: 'no_preference'
      })
      .returning()
      .execute();

    testApplicationId = applications[0].id;

    // Upload all required documents
    const requiredDocuments = ['ktp', 'kk', 'surat_keterangan_sehat', 'surat_keterangan_berkelakuan_baik'];
    
    for (const docType of requiredDocuments) {
      await db.insert(documentsTable)
        .values({
          application_id: testApplicationId,
          document_type: docType as any,
          file_name: `${docType}.pdf`,
          file_path: `/uploads/${docType}.pdf`,
          file_size: 1024,
          mime_type: 'application/pdf'
        })
        .execute();
    }
  });

  it('should successfully submit a draft application', async () => {
    const result = await submitApplication(testApplicationId, testUserId);

    // Verify the returned application has correct status and data
    expect(result.id).toEqual(testApplicationId);
    expect(result.user_id).toEqual(testUserId);
    expect(result.status).toEqual('submitted');
    expect(result.full_name).toEqual('John Doe');
    expect(typeof result.monthly_income).toBe('number');
    expect(result.monthly_income).toEqual(5000000);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update application status in database', async () => {
    await submitApplication(testApplicationId, testUserId);

    // Verify database was updated
    const applications = await db.select()
      .from(applicationsTable)
      .where(eq(applicationsTable.id, testApplicationId))
      .execute();

    expect(applications).toHaveLength(1);
    expect(applications[0].status).toEqual('submitted');
    expect(applications[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create status history entry', async () => {
    await submitApplication(testApplicationId, testUserId);

    // Verify status history was created
    const statusHistory = await db.select()
      .from(applicationStatusHistoryTable)
      .where(eq(applicationStatusHistoryTable.application_id, testApplicationId))
      .execute();

    expect(statusHistory).toHaveLength(1);
    expect(statusHistory[0].old_status).toEqual('draft');
    expect(statusHistory[0].new_status).toEqual('submitted');
    expect(statusHistory[0].changed_by).toEqual(testUserId);
    expect(statusHistory[0].notes).toEqual('Application submitted for review');
    expect(statusHistory[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error if application not found', async () => {
    const nonExistentId = 99999;

    await expect(submitApplication(nonExistentId, testUserId))
      .rejects.toThrow(/application not found/i);
  });

  it('should throw error if user does not own the application', async () => {
    // Create another user
    const otherUsers = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashedpassword',
        full_name: 'Other User',
        role: 'calon_pengangkut'
      })
      .returning()
      .execute();

    const otherUserId = otherUsers[0].id;

    await expect(submitApplication(testApplicationId, otherUserId))
      .rejects.toThrow(/application not found or you do not have permission/i);
  });

  it('should throw error if application is not in draft status', async () => {
    // Update application to submitted status first
    await db.update(applicationsTable)
      .set({ status: 'submitted' })
      .where(eq(applicationsTable.id, testApplicationId))
      .execute();

    await expect(submitApplication(testApplicationId, testUserId))
      .rejects.toThrow(/application can only be submitted from draft status/i);
  });

  it('should throw error if required documents are missing', async () => {
    // Delete one required document
    await db.delete(documentsTable)
      .where(eq(documentsTable.document_type, 'ktp'))
      .execute();

    await expect(submitApplication(testApplicationId, testUserId))
      .rejects.toThrow(/missing required documents.*ktp/i);
  });

  it('should throw error if multiple required documents are missing', async () => {
    // Delete all documents
    await db.delete(documentsTable)
      .where(eq(documentsTable.application_id, testApplicationId))
      .execute();

    await expect(submitApplication(testApplicationId, testUserId))
      .rejects.toThrow(/missing required documents.*ktp.*kk.*surat_keterangan_sehat.*surat_keterangan_berkelakuan_baik/i);
  });

  it('should handle applications with spouse income correctly', async () => {
    // Create application with spouse data
    const applicationsWithSpouse = await db.insert(applicationsTable)
      .values({
        user_id: testUserId,
        status: 'draft',
        full_name: 'Jane Doe',
        date_of_birth: new Date('1992-05-15'),
        place_of_birth: 'Surabaya',
        address: 'Jl. Spouse Test No. 456, Surabaya',
        phone: '08987654321',
        occupation: 'Teacher',
        monthly_income: '4000000.50',
        spouse_name: 'John Doe',
        spouse_occupation: 'Engineer',
        spouse_income: '6000000.75',
        number_of_children: 1,
        reason_for_adoption: 'We want to expand our family and provide love and care for another child.',
        preferred_child_age_min: 2,
        preferred_child_age_max: 8,
        preferred_child_gender: 'female'
      })
      .returning()
      .execute();

    const spouseApplicationId = applicationsWithSpouse[0].id;

    // Upload required documents for spouse application
    const requiredDocuments = ['ktp', 'kk', 'surat_keterangan_sehat', 'surat_keterangan_berkelakuan_baik'];
    
    for (const docType of requiredDocuments) {
      await db.insert(documentsTable)
        .values({
          application_id: spouseApplicationId,
          document_type: docType as any,
          file_name: `spouse_${docType}.pdf`,
          file_path: `/uploads/spouse_${docType}.pdf`,
          file_size: 2048,
          mime_type: 'application/pdf'
        })
        .execute();
    }

    const result = await submitApplication(spouseApplicationId, testUserId);

    expect(result.spouse_name).toEqual('John Doe');
    expect(typeof result.monthly_income).toBe('number');
    expect(result.monthly_income).toEqual(4000000.5);
    expect(typeof result.spouse_income).toBe('number');
    expect(result.spouse_income).toEqual(6000000.75);
    expect(result.status).toEqual('submitted');
  });
});