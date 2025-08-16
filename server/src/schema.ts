import { z } from 'zod';

// User role enum schema
export const userRoleSchema = z.enum(['calon_pengangkut', 'admin_dinas_sosial']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Application status enum schema
export const applicationStatusSchema = z.enum(['draft', 'submitted', 'under_review', 'approved', 'rejected', 'completed']);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

// Document type enum schema
export const documentTypeSchema = z.enum(['ktp', 'kk', 'surat_nikah', 'slip_gaji', 'surat_keterangan_sehat', 'surat_keterangan_berkelakuan_baik', 'surat_rekomendasi']);
export type DocumentType = z.infer<typeof documentTypeSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  phone: z.string().nullable(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// User registration input schema
export const registerUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(2),
  phone: z.string().nullable().optional(),
  role: userRoleSchema
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

// User login input schema
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Application schema
export const applicationSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  status: applicationStatusSchema,
  full_name: z.string(),
  date_of_birth: z.coerce.date(),
  place_of_birth: z.string(),
  address: z.string(),
  phone: z.string(),
  occupation: z.string(),
  monthly_income: z.number(),
  spouse_name: z.string().nullable(),
  spouse_occupation: z.string().nullable(),
  spouse_income: z.number().nullable(),
  number_of_children: z.number().int().nonnegative(),
  reason_for_adoption: z.string(),
  preferred_child_age_min: z.number().int().nonnegative(),
  preferred_child_age_max: z.number().int().nonnegative(),
  preferred_child_gender: z.enum(['male', 'female', 'no_preference']),
  admin_notes: z.string().nullable(),
  reviewed_by: z.number().nullable(),
  reviewed_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Application = z.infer<typeof applicationSchema>;

// Create application input schema
export const createApplicationInputSchema = z.object({
  full_name: z.string().min(2),
  date_of_birth: z.coerce.date(),
  place_of_birth: z.string().min(2),
  address: z.string().min(10),
  phone: z.string(),
  occupation: z.string().min(2),
  monthly_income: z.number().positive(),
  spouse_name: z.string().nullable().optional(),
  spouse_occupation: z.string().nullable().optional(),
  spouse_income: z.number().positive().nullable().optional(),
  number_of_children: z.number().int().nonnegative(),
  reason_for_adoption: z.string().min(50),
  preferred_child_age_min: z.number().int().nonnegative(),
  preferred_child_age_max: z.number().int().nonnegative(),
  preferred_child_gender: z.enum(['male', 'female', 'no_preference'])
});

export type CreateApplicationInput = z.infer<typeof createApplicationInputSchema>;

// Update application input schema
export const updateApplicationInputSchema = z.object({
  id: z.number(),
  full_name: z.string().min(2).optional(),
  date_of_birth: z.coerce.date().optional(),
  place_of_birth: z.string().min(2).optional(),
  address: z.string().min(10).optional(),
  phone: z.string().optional(),
  occupation: z.string().min(2).optional(),
  monthly_income: z.number().positive().optional(),
  spouse_name: z.string().nullable().optional(),
  spouse_occupation: z.string().nullable().optional(),
  spouse_income: z.number().positive().nullable().optional(),
  number_of_children: z.number().int().nonnegative().optional(),
  reason_for_adoption: z.string().min(50).optional(),
  preferred_child_age_min: z.number().int().nonnegative().optional(),
  preferred_child_age_max: z.number().int().nonnegative().optional(),
  preferred_child_gender: z.enum(['male', 'female', 'no_preference']).optional()
});

export type UpdateApplicationInput = z.infer<typeof updateApplicationInputSchema>;

// Admin review application input schema
export const reviewApplicationInputSchema = z.object({
  id: z.number(),
  status: z.enum(['approved', 'rejected', 'under_review']),
  admin_notes: z.string().optional()
});

export type ReviewApplicationInput = z.infer<typeof reviewApplicationInputSchema>;

// Document schema
export const documentSchema = z.object({
  id: z.number(),
  application_id: z.number(),
  document_type: documentTypeSchema,
  file_name: z.string(),
  file_path: z.string(),
  file_size: z.number(),
  mime_type: z.string(),
  is_verified: z.boolean(),
  verified_by: z.number().nullable(),
  verified_at: z.coerce.date().nullable(),
  uploaded_at: z.coerce.date()
});

export type Document = z.infer<typeof documentSchema>;

// Upload document input schema
export const uploadDocumentInputSchema = z.object({
  application_id: z.number(),
  document_type: documentTypeSchema,
  file_name: z.string(),
  file_path: z.string(),
  file_size: z.number(),
  mime_type: z.string()
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentInputSchema>;

// Verify document input schema
export const verifyDocumentInputSchema = z.object({
  id: z.number(),
  is_verified: z.boolean()
});

export type VerifyDocumentInput = z.infer<typeof verifyDocumentInputSchema>;

// Application status history schema
export const applicationStatusHistorySchema = z.object({
  id: z.number(),
  application_id: z.number(),
  old_status: applicationStatusSchema.nullable(),
  new_status: applicationStatusSchema,
  changed_by: z.number(),
  notes: z.string().nullable(),
  created_at: z.coerce.date()
});

export type ApplicationStatusHistory = z.infer<typeof applicationStatusHistorySchema>;

// Get applications query schema
export const getApplicationsQuerySchema = z.object({
  status: applicationStatusSchema.optional(),
  user_id: z.number().optional(),
  limit: z.number().int().positive().max(100).default(10),
  offset: z.number().int().nonnegative().default(0)
});

export type GetApplicationsQuery = z.infer<typeof getApplicationsQuerySchema>;