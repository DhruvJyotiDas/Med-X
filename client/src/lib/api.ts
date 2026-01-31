import type { User, Report, Visit, Prescription, FamilyHistory, AccessPermission } from "@shared/schema";

const API_BASE = "/api";

// Auth API
export async function register(username: string, password: string, role: string, fullName: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, role, fullName }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.user;
}

export async function login(username: string, password: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.user;
}

// Get all doctors for patient to select
export async function getAllDoctors(): Promise<Array<{ id: string; fullName: string; username: string }>> {
  const res = await fetch(`${API_BASE}/users/doctors`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Get user by ID
export async function getUser(userId: string): Promise<{ id: string; fullName: string; role: string; username: string }> {
  const res = await fetch(`${API_BASE}/users/${userId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Reports API
export async function uploadReport(file: File, patientId: string): Promise<{
  report: Report;
  visit: Visit;
  prescriptions: Prescription[];
  extractedData: any;
}> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("patientId", patientId);

  const res = await fetch(`${API_BASE}/reports/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getReportsByPatient(patientId: string): Promise<Report[]> {
  const res = await fetch(`${API_BASE}/reports/patient/${patientId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getReportsByCategory(patientId: string, category: string): Promise<Report[]> {
  const res = await fetch(`${API_BASE}/reports/patient/${patientId}/category/${category}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Visits API
export async function getVisitsByPatient(patientId: string): Promise<Visit[]> {
  const res = await fetch(`${API_BASE}/visits/patient/${patientId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getVisitsByCategory(patientId: string, category: string): Promise<Visit[]> {
  const res = await fetch(`${API_BASE}/visits/patient/${patientId}/category/${category}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getVisitDetails(visitId: string): Promise<{ visit: Visit; prescriptions: Prescription[] }> {
  const res = await fetch(`${API_BASE}/visits/${visitId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Family History API
export async function getFamilyHistory(patientId: string): Promise<FamilyHistory[]> {
  const res = await fetch(`${API_BASE}/family-history/patient/${patientId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createFamilyHistory(data: { patientId: string; condition: string; relation: string; notes?: string }): Promise<FamilyHistory> {
  const res = await fetch(`${API_BASE}/family-history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateFamilyHistory(id: string, updates: Partial<FamilyHistory>): Promise<FamilyHistory> {
  const res = await fetch(`${API_BASE}/family-history/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteFamilyHistory(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/family-history/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text());
}

// Access Permissions API (Patient-controlled)
export async function getAccessPermissions(patientId: string): Promise<AccessPermission[]> {
  const res = await fetch(`${API_BASE}/access-permissions/patient/${patientId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createAccessPermission(data: { patientId: string; doctorId: string; reportsAccess: boolean; familyHistoryAccess: boolean }): Promise<AccessPermission> {
  const res = await fetch(`${API_BASE}/access-permissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateAccessPermission(patientId: string, doctorId: string, updates: { reportsAccess?: boolean; familyHistoryAccess?: boolean }): Promise<AccessPermission> {
  const res = await fetch(`${API_BASE}/access-permissions/${patientId}/${doctorId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function revokeAccessPermission(patientId: string, doctorId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/access-permissions/${patientId}/${doctorId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function checkAccess(patientId: string, doctorId: string): Promise<AccessPermission> {
  const res = await fetch(`${API_BASE}/access-permissions/check/${patientId}/${doctorId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getDoctorPatients(doctorId: string): Promise<AccessPermission[]> {
  const res = await fetch(`${API_BASE}/access-permissions/doctor/${doctorId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Doctor-specific API (Access Controlled)
export interface AuthorizedPatient {
  id: string;
  fullName: string;
  reportsAccess: boolean;
  familyHistoryAccess: boolean;
  grantedAt: string;
}

export async function getDoctorAuthorizedPatients(doctorId: string): Promise<AuthorizedPatient[]> {
  const res = await fetch(`${API_BASE}/doctor/${doctorId}/patients`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getDoctorPatientReports(doctorId: string, patientId: string): Promise<{ authorized: boolean; reports: Report[] }> {
  const res = await fetch(`${API_BASE}/doctor/${doctorId}/patient/${patientId}/reports`);
  if (!res.ok) {
    const data = await res.json();
    return { authorized: false, reports: [] };
  }
  return res.json();
}

export async function getDoctorPatientVisits(doctorId: string, patientId: string): Promise<{ authorized: boolean; visits: Visit[] }> {
  const res = await fetch(`${API_BASE}/doctor/${doctorId}/patient/${patientId}/visits`);
  if (!res.ok) {
    return { authorized: false, visits: [] };
  }
  return res.json();
}

export async function getDoctorPatientFamilyHistory(doctorId: string, patientId: string): Promise<{ 
  authorized: boolean; 
  familyHistoryAuthorized: boolean; 
  familyHistory: FamilyHistory[] 
}> {
  const res = await fetch(`${API_BASE}/doctor/${doctorId}/patient/${patientId}/family-history`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { 
      authorized: data.authorized ?? false, 
      familyHistoryAuthorized: false, 
      familyHistory: [] 
    };
  }
  return res.json();
}

// AI Summary API
export async function generateAISummary(data: {
  patientId: string;
  scope: "all" | "category" | "single" | "selected";
  mode: "patient" | "clinical";
  category?: string;
  reportIds?: string[];
  doctorId?: string;
}): Promise<{ summary: string; scope: string; mode: string; visitCount: number }> {
  const res = await fetch(`${API_BASE}/ai-summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Doctor AI Summary (Access Controlled)
export async function generateDoctorAISummary(data: {
  doctorId: string;
  patientId: string;
  scope: "all" | "category" | "selected";
  mode: "patient" | "clinical";
  category?: string;
  reportIds?: string[];
}): Promise<{ 
  summary: string; 
  scope: string; 
  mode: string; 
  visitCount: number;
  authorized: boolean;
  familyHistoryIncluded?: boolean;
}> {
  const res = await fetch(`${API_BASE}/doctor/ai-summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Access denied" }));
    throw new Error(data.error || "Failed to generate AI summary");
  }
  return res.json();
}

// Genetic Risk Prediction API
export interface GeneticRiskPrediction {
  condition: string;
  riskPercentage: number;
  riskLevel: "low" | "moderate" | "high";
  factors: string[];
  recommendations: string[];
}

export async function getGeneticRiskPrediction(patientId: string, doctorId?: string): Promise<{ predictions: GeneticRiskPrediction[]; message?: string }> {
  const res = await fetch(`${API_BASE}/genetic-risk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patientId, doctorId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Seed demo data
export async function seedDemoData(): Promise<{
  success: boolean;
  message: string;
  credentials: {
    patient: { username: string; password: string };
    doctorWithFullAccess: { username: string; password: string };
    doctorWithReportsOnly: { username: string; password: string };
    doctorWithNoAccess: { username: string; password: string };
  };
}> {
  const res = await fetch(`${API_BASE}/seed-demo-data`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
