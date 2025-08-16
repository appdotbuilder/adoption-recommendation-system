import { type Application } from '../schema';

export async function getApplicationById(id: number, userRole: string, userId?: number): Promise<Application | null> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching a specific application by ID with access control
    // For calon_pengangkut: only their own application
    // For admin_dinas_sosial: any application
    // Should include related documents and status history
    return Promise.resolve({
        id: id,
        user_id: userId || 1,
        status: 'submitted',
        full_name: 'Placeholder Name',
        date_of_birth: new Date(),
        place_of_birth: 'Placeholder City',
        address: 'Placeholder Address',
        phone: '08123456789',
        occupation: 'Placeholder Job',
        monthly_income: 5000000,
        spouse_name: null,
        spouse_occupation: null,
        spouse_income: null,
        number_of_children: 0,
        reason_for_adoption: 'Placeholder reason for adoption',
        preferred_child_age_min: 0,
        preferred_child_age_max: 5,
        preferred_child_gender: 'no_preference',
        admin_notes: null,
        reviewed_by: null,
        reviewed_at: null,
        created_at: new Date(),
        updated_at: new Date()
    } as Application);
}