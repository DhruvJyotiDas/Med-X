import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, desc } from "drizzle-orm";
import pg from "pg";
import {
  users,
  reports,
  visits,
  prescriptions,
  familyHistory,
  accessPermissions,
  type User,
  type InsertUser,
  type Report,
  type InsertReport,
  type Visit,
  type InsertVisit,
  type Prescription,
  type InsertPrescription,
  type FamilyHistory,
  type InsertFamilyHistory,
  type AccessPermission,
  type InsertAccessPermission,
} from "@shared/schema";

const { Pool } = pg;

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllDoctors(): Promise<User[]>;

  // Report operations
  createReport(report: InsertReport): Promise<Report>;
  getReportsByPatient(patientId: string): Promise<Report[]>;
  getReportsByCategory(patientId: string, category: string): Promise<Report[]>;
  getReport(id: string): Promise<Report | undefined>;

  // Visit operations
  createVisit(visit: InsertVisit): Promise<Visit>;
  getVisitsByPatient(patientId: string): Promise<Visit[]>;
  getVisitsByCategory(patientId: string, category: string): Promise<Visit[]>;
  getVisit(id: string): Promise<Visit | undefined>;
  getVisitsByReport(reportId: string): Promise<Visit[]>;
  updateVisitSummary(id: string, aiSummary: string): Promise<void>;

  // Prescription operations
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  getPrescriptionsByVisit(visitId: string): Promise<Prescription[]>;

  // Family history operations
  createFamilyHistory(history: InsertFamilyHistory): Promise<FamilyHistory>;
  getFamilyHistoryByPatient(patientId: string): Promise<FamilyHistory[]>;
  updateFamilyHistory(id: string, updates: Partial<InsertFamilyHistory>): Promise<FamilyHistory | undefined>;
  deleteFamilyHistory(id: string): Promise<void>;

  // Access permission operations
  createAccessPermission(permission: InsertAccessPermission): Promise<AccessPermission>;
  updateAccessPermission(patientId: string, doctorId: string, updates: Partial<InsertAccessPermission>): Promise<AccessPermission | undefined>;
  deleteAccessPermission(patientId: string, doctorId: string): Promise<void>;
  getAccessPermissions(patientId: string): Promise<AccessPermission[]>;
  checkAccess(patientId: string, doctorId: string): Promise<AccessPermission | undefined>;
  getDoctorPatients(doctorId: string): Promise<AccessPermission[]>;
}

export class DatabaseStorage implements IStorage {
  private db;

  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    this.db = drizzle(pool);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getAllDoctors(): Promise<User[]> {
    return await this.db.select().from(users).where(eq(users.role, "doctor"));
  }

  // Report operations
  async createReport(report: InsertReport): Promise<Report> {
    const result = await this.db.insert(reports).values(report).returning();
    return result[0];
  }

  async getReportsByPatient(patientId: string): Promise<Report[]> {
    return await this.db.select().from(reports).where(eq(reports.patientId, patientId)).orderBy(desc(reports.uploadedAt));
  }

  async getReportsByCategory(patientId: string, category: string): Promise<Report[]> {
    return await this.db.select().from(reports).where(and(eq(reports.patientId, patientId), eq(reports.category, category))).orderBy(desc(reports.uploadedAt));
  }

  async getReport(id: string): Promise<Report | undefined> {
    const result = await this.db.select().from(reports).where(eq(reports.id, id));
    return result[0];
  }

  // Visit operations
  async createVisit(visit: InsertVisit): Promise<Visit> {
    const result = await this.db.insert(visits).values(visit).returning();
    return result[0];
  }

  async getVisitsByPatient(patientId: string): Promise<Visit[]> {
    return await this.db.select().from(visits).where(eq(visits.patientId, patientId)).orderBy(desc(visits.visitDate));
  }

  async getVisitsByCategory(patientId: string, category: string): Promise<Visit[]> {
    return await this.db.select().from(visits).where(and(eq(visits.patientId, patientId), eq(visits.category, category))).orderBy(desc(visits.visitDate));
  }

  async getVisit(id: string): Promise<Visit | undefined> {
    const result = await this.db.select().from(visits).where(eq(visits.id, id));
    return result[0];
  }

  async getVisitsByReport(reportId: string): Promise<Visit[]> {
    return await this.db.select().from(visits).where(eq(visits.reportId, reportId)).orderBy(desc(visits.visitDate));
  }

  async updateVisitSummary(id: string, aiSummary: string): Promise<void> {
    await this.db.update(visits).set({ aiSummary }).where(eq(visits.id, id));
  }

  // Prescription operations
  async createPrescription(prescription: InsertPrescription): Promise<Prescription> {
    const result = await this.db.insert(prescriptions).values(prescription).returning();
    return result[0];
  }

  async getPrescriptionsByVisit(visitId: string): Promise<Prescription[]> {
    return await this.db.select().from(prescriptions).where(eq(prescriptions.visitId, visitId));
  }

  // Family history operations
  async createFamilyHistory(history: InsertFamilyHistory): Promise<FamilyHistory> {
    const result = await this.db.insert(familyHistory).values(history).returning();
    return result[0];
  }

  async getFamilyHistoryByPatient(patientId: string): Promise<FamilyHistory[]> {
    return await this.db.select().from(familyHistory).where(eq(familyHistory.patientId, patientId)).orderBy(desc(familyHistory.addedAt));
  }

  async updateFamilyHistory(id: string, updates: Partial<InsertFamilyHistory>): Promise<FamilyHistory | undefined> {
    const result = await this.db.update(familyHistory).set(updates).where(eq(familyHistory.id, id)).returning();
    return result[0];
  }

  async deleteFamilyHistory(id: string): Promise<void> {
    await this.db.delete(familyHistory).where(eq(familyHistory.id, id));
  }

  // Access permission operations
  async createAccessPermission(permission: InsertAccessPermission): Promise<AccessPermission> {
    const result = await this.db.insert(accessPermissions).values(permission).returning();
    return result[0];
  }

  async updateAccessPermission(patientId: string, doctorId: string, updates: Partial<InsertAccessPermission>): Promise<AccessPermission | undefined> {
    const result = await this.db.update(accessPermissions).set(updates).where(and(eq(accessPermissions.patientId, patientId), eq(accessPermissions.doctorId, doctorId))).returning();
    return result[0];
  }

  async deleteAccessPermission(patientId: string, doctorId: string): Promise<void> {
    await this.db.delete(accessPermissions).where(and(eq(accessPermissions.patientId, patientId), eq(accessPermissions.doctorId, doctorId)));
  }

  async getAccessPermissions(patientId: string): Promise<AccessPermission[]> {
    return await this.db.select().from(accessPermissions).where(eq(accessPermissions.patientId, patientId));
  }

  async checkAccess(patientId: string, doctorId: string): Promise<AccessPermission | undefined> {
    const result = await this.db.select().from(accessPermissions).where(and(eq(accessPermissions.patientId, patientId), eq(accessPermissions.doctorId, doctorId)));
    return result[0];
  }

  async getDoctorPatients(doctorId: string): Promise<AccessPermission[]> {
    return await this.db.select().from(accessPermissions).where(eq(accessPermissions.doctorId, doctorId));
  }
}

export const storage = new DatabaseStorage();
