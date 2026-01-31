import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users (patients and doctors)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // "patient" or "doctor"
  fullName: text("full_name").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Medical Reports (uploaded files + OCR data)
export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => users.id),
  category: text("category").notNull(), // "radiology", "skin", "diabetes", etc.
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  ocrText: text("ocr_text"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const insertReportSchema = createInsertSchema(reports).omit({ id: true, uploadedAt: true });
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

// Doctor Visits (structured from OCR analysis)
export const visits = pgTable("visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").notNull().references(() => reports.id),
  patientId: varchar("patient_id").notNull().references(() => users.id),
  category: text("category").notNull(),
  doctorName: text("doctor_name").notNull(),
  hospitalName: text("hospital_name").notNull(),
  visitDate: timestamp("visit_date").notNull(),
  diagnosis: text("diagnosis").notNull(),
  symptoms: text("symptoms"),
  instructions: text("instructions"),
  revisitDate: timestamp("revisit_date"),
  aiSummary: text("ai_summary"),
});

export const insertVisitSchema = createInsertSchema(visits).omit({ id: true });
export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visits.$inferSelect;

// Prescriptions (medications from visits)
export const prescriptions = pgTable("prescriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitId: varchar("visit_id").notNull().references(() => visits.id),
  medicationName: text("medication_name").notNull(),
  dosage: text("dosage").notNull(),
  duration: text("duration").notNull(),
  instructions: text("instructions"),
});

export const insertPrescriptionSchema = createInsertSchema(prescriptions).omit({ id: true });
export type InsertPrescription = z.infer<typeof insertPrescriptionSchema>;
export type Prescription = typeof prescriptions.$inferSelect;

// Family Medical History
export const familyHistory = pgTable("family_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => users.id),
  condition: text("condition").notNull(),
  relation: text("relation").notNull(), // "father", "mother", "sibling", etc.
  notes: text("notes"),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const insertFamilyHistorySchema = createInsertSchema(familyHistory).omit({ id: true, addedAt: true });
export type InsertFamilyHistory = z.infer<typeof insertFamilyHistorySchema>;
export type FamilyHistory = typeof familyHistory.$inferSelect;

// Access Permissions (patient-to-doctor consent)
export const accessPermissions = pgTable("access_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => users.id),
  doctorId: varchar("doctor_id").notNull().references(() => users.id),
  reportsAccess: boolean("reports_access").notNull().default(false),
  familyHistoryAccess: boolean("family_history_access").notNull().default(false),
  grantedAt: timestamp("granted_at").notNull().defaultNow(),
});

export const insertAccessPermissionSchema = createInsertSchema(accessPermissions).omit({ id: true, grantedAt: true });
export type InsertAccessPermission = z.infer<typeof insertAccessPermissionSchema>;
export type AccessPermission = typeof accessPermissions.$inferSelect;
