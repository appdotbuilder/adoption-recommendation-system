import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schema types
import {
  registerUserInputSchema,
  loginInputSchema,
  createApplicationInputSchema,
  updateApplicationInputSchema,
  reviewApplicationInputSchema,
  uploadDocumentInputSchema,
  verifyDocumentInputSchema,
  getApplicationsQuerySchema
} from './schema';

// Import handlers
import { registerUser } from './handlers/register_user';
import { loginUser } from './handlers/login_user';
import { getCurrentUser } from './handlers/get_current_user';
import { createApplication } from './handlers/create_application';
import { getApplications } from './handlers/get_applications';
import { getApplicationById } from './handlers/get_application_by_id';
import { updateApplication } from './handlers/update_application';
import { submitApplication } from './handlers/submit_application';
import { reviewApplication } from './handlers/review_application';
import { uploadDocument } from './handlers/upload_document';
import { getDocuments } from './handlers/get_documents';
import { verifyDocument } from './handlers/verify_document';
import { deleteDocument } from './handlers/delete_document';
import { getApplicationStatusHistory } from './handlers/get_application_status_history';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication endpoints
  registerUser: publicProcedure
    .input(registerUserInputSchema)
    .mutation(({ input }) => registerUser(input)),
  
  loginUser: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),
  
  getCurrentUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getCurrentUser(input.userId)),

  // Application management endpoints
  createApplication: publicProcedure
    .input(createApplicationInputSchema.extend({ userId: z.number() }))
    .mutation(({ input }) => {
      const { userId, ...applicationData } = input;
      return createApplication(applicationData, userId);
    }),

  getApplications: publicProcedure
    .input(getApplicationsQuerySchema.extend({ 
      userRole: z.string(),
      userId: z.number().optional() 
    }))
    .query(({ input }) => {
      const { userRole, userId, ...query } = input;
      return getApplications(query, userRole, userId);
    }),

  getApplicationById: publicProcedure
    .input(z.object({
      id: z.number(),
      userRole: z.string(),
      userId: z.number().optional()
    }))
    .query(({ input }) => getApplicationById(input.id, input.userRole, input.userId)),

  updateApplication: publicProcedure
    .input(updateApplicationInputSchema.extend({ userId: z.number() }))
    .mutation(({ input }) => {
      const { userId, ...updateData } = input;
      return updateApplication(updateData, userId);
    }),

  submitApplication: publicProcedure
    .input(z.object({
      applicationId: z.number(),
      userId: z.number()
    }))
    .mutation(({ input }) => submitApplication(input.applicationId, input.userId)),

  reviewApplication: publicProcedure
    .input(reviewApplicationInputSchema.extend({ adminId: z.number() }))
    .mutation(({ input }) => {
      const { adminId, ...reviewData } = input;
      return reviewApplication(reviewData, adminId);
    }),

  // Document management endpoints
  uploadDocument: publicProcedure
    .input(uploadDocumentInputSchema.extend({ userId: z.number() }))
    .mutation(({ input }) => {
      const { userId, ...documentData } = input;
      return uploadDocument(documentData, userId);
    }),

  getDocuments: publicProcedure
    .input(z.object({
      applicationId: z.number(),
      userRole: z.string(),
      userId: z.number().optional()
    }))
    .query(({ input }) => getDocuments(input.applicationId, input.userRole, input.userId)),

  verifyDocument: publicProcedure
    .input(verifyDocumentInputSchema.extend({ adminId: z.number() }))
    .mutation(({ input }) => {
      const { adminId, ...verificationData } = input;
      return verifyDocument(verificationData, adminId);
    }),

  deleteDocument: publicProcedure
    .input(z.object({
      documentId: z.number(),
      userId: z.number()
    }))
    .mutation(({ input }) => deleteDocument(input.documentId, input.userId)),

  // Status tracking endpoints
  getApplicationStatusHistory: publicProcedure
    .input(z.object({
      applicationId: z.number(),
      userRole: z.string(),
      userId: z.number().optional()
    }))
    .query(({ input }) => getApplicationStatusHistory(input.applicationId, input.userRole, input.userId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();