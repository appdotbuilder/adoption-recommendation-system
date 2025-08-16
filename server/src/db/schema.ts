import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum definitions
export const userRoleEnum = pgEnum('user_role', ['calon_pengangkut', 'admin_dinas_sosial']);
export const applicationStatusEnum = pgEnum('application_status', ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'completed']);
export const documentTypeEnum = pgEnum('document_type', ['ktp', 'kk', 'surat_nikah', 'slip_gaji', 'surat_keterangan_sehat', 'surat_keterangan_berkelakuan_baik', 'surat_rekomendasi']);
export const childGenderPreferenceEnum = pgEnum('child_gender_preference', ['male', 'female', 'no_preference']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  phone: text('phone'), // Nullable by default
  role: userRoleEnum('role').notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Applications table
export const applicationsTable = pgTable('applications', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  status: applicationStatusEnum('status').default('draft').notNull(),
  full_name: text('full_name').notNull(),
  date_of_birth: timestamp('date_of_birth').notNull(),
  place_of_birth: text('place_of_birth').notNull(),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  occupation: text('occupation').notNull(),
  monthly_income: numeric('monthly_income', { precision: 12, scale: 2 }).notNull(),
  spouse_name: text('spouse_name'), // Nullable by default
  spouse_occupation: text('spouse_occupation'), // Nullable by default
  spouse_income: numeric('spouse_income', { precision: 12, scale: 2 }), // Nullable by default
  number_of_children: integer('number_of_children').notNull(),
  reason_for_adoption: text('reason_for_adoption').notNull(),
  preferred_child_age_min: integer('preferred_child_age_min').notNull(),
  preferred_child_age_max: integer('preferred_child_age_max').notNull(),
  preferred_child_gender: childGenderPreferenceEnum('preferred_child_gender').notNull(),
  admin_notes: text('admin_notes'), // Nullable by default
  reviewed_by: integer('reviewed_by').references(() => usersTable.id), // Nullable by default
  reviewed_at: timestamp('reviewed_at'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Documents table
export const documentsTable = pgTable('documents', {
  id: serial('id').primaryKey(),
  application_id: integer('application_id').references(() => applicationsTable.id).notNull(),
  document_type: documentTypeEnum('document_type').notNull(),
  file_name: text('file_name').notNull(),
  file_path: text('file_path').notNull(),
  file_size: integer('file_size').notNull(),
  mime_type: text('mime_type').notNull(),
  is_verified: boolean('is_verified').default(false).notNull(),
  verified_by: integer('verified_by').references(() => usersTable.id), // Nullable by default
  verified_at: timestamp('verified_at'), // Nullable by default
  uploaded_at: timestamp('uploaded_at').defaultNow().notNull()
});

// Application status history table
export const applicationStatusHistoryTable = pgTable('application_status_history', {
  id: serial('id').primaryKey(),
  application_id: integer('application_id').references(() => applicationsTable.id).notNull(),
  old_status: applicationStatusEnum('old_status'), // Nullable by default
  new_status: applicationStatusEnum('new_status').notNull(),
  changed_by: integer('changed_by').references(() => usersTable.id).notNull(),
  notes: text('notes'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  applications: many(applicationsTable),
  reviewedApplications: many(applicationsTable, { relationName: 'reviewer' }),
  verifiedDocuments: many(documentsTable),
  statusHistoryEntries: many(applicationStatusHistoryTable)
}));

export const applicationsRelations = relations(applicationsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [applicationsTable.user_id],
    references: [usersTable.id]
  }),
  reviewer: one(usersTable, {
    fields: [applicationsTable.reviewed_by],
    references: [usersTable.id],
    relationName: 'reviewer'
  }),
  documents: many(documentsTable),
  statusHistory: many(applicationStatusHistoryTable)
}));

export const documentsRelations = relations(documentsTable, ({ one }) => ({
  application: one(applicationsTable, {
    fields: [documentsTable.application_id],
    references: [applicationsTable.id]
  }),
  verifier: one(usersTable, {
    fields: [documentsTable.verified_by],
    references: [usersTable.id]
  })
}));

export const applicationStatusHistoryRelations = relations(applicationStatusHistoryTable, ({ one }) => ({
  application: one(applicationsTable, {
    fields: [applicationStatusHistoryTable.application_id],
    references: [applicationsTable.id]
  }),
  changedBy: one(usersTable, {
    fields: [applicationStatusHistoryTable.changed_by],
    references: [usersTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Application = typeof applicationsTable.$inferSelect;
export type NewApplication = typeof applicationsTable.$inferInsert;
export type Document = typeof documentsTable.$inferSelect;
export type NewDocument = typeof documentsTable.$inferInsert;
export type ApplicationStatusHistory = typeof applicationStatusHistoryTable.$inferSelect;
export type NewApplicationStatusHistory = typeof applicationStatusHistoryTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  applications: applicationsTable,
  documents: documentsTable,
  applicationStatusHistory: applicationStatusHistoryTable
};