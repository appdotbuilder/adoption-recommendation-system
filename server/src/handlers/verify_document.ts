import { type VerifyDocumentInput, type Document } from '../schema';

export async function verifyDocument(input: VerifyDocumentInput, adminId: number): Promise<Document> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is allowing admin to verify/reject documents
    // Should validate admin permissions (admin_dinas_sosial role)
    // Should update document verification status, verified_by, and verified_at
    return Promise.resolve({
        id: input.id,
        application_id: 1, // Will be fetched from database
        document_type: 'ktp',
        file_name: 'ktp_example.pdf',
        file_path: '/uploads/documents/ktp_example.pdf',
        file_size: 1024000,
        mime_type: 'application/pdf',
        is_verified: input.is_verified,
        verified_by: input.is_verified ? adminId : null,
        verified_at: input.is_verified ? new Date() : null,
        uploaded_at: new Date()
    } as Document);
}