import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import multer from "multer";
import { analyzeReportImage, generateAISummary, generatePrescriptionSummary, generateGeneticRiskPrediction } from "./gemini";
import { insertReportSchema, insertVisitSchema, insertPrescriptionSchema, insertFamilyHistorySchema, insertAccessPermissionSchema, type Visit, type User } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId: string;
    userRole: "patient" | "doctor";
  }
}

interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: "patient" | "doctor";
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and PDF are allowed."));
    }
  },
});

// Authentication middleware - verifies user is logged in
function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  req.userId = req.session.userId;
  req.userRole = req.session.userRole;
  next();
}

// Patient-only middleware
function requirePatient(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (req.session.userRole !== "patient") {
    return res.status(403).json({ error: "Patient access required" });
  }
  req.userId = req.session.userId;
  req.userRole = req.session.userRole;
  next();
}

// Doctor-only middleware  
function requireDoctor(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (req.session.userRole !== "doctor") {
    return res.status(403).json({ error: "Doctor access required" });
  }
  req.userId = req.session.userId;
  req.userRole = req.session.userRole;
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Set up session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || "medispace-dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  }));
  
  // =====================
  // AUTHENTICATION ROUTES
  // =====================
  
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, role, fullName } = req.body;
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const user = await storage.createUser({ username, password, role, fullName });
      res.json({ user: { id: user.id, username: user.username, role: user.role, fullName: user.fullName } });
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Set session
      req.session.userId = user.id;
      req.session.userRole = user.role as "patient" | "doctor";

      res.json({ user: { id: user.id, username: user.username, role: user.role, fullName: user.fullName } });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // Get current user
  app.get("/api/auth/me", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ user: { id: user.id, username: user.username, role: user.role, fullName: user.fullName } });
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Get all doctors (for patient to select) - AUTHENTICATED
  app.get("/api/users/doctors", requirePatient as any, async (req: AuthenticatedRequest, res) => {
    try {
      const doctors = await storage.getAllDoctors();
      res.json(doctors.map(d => ({ id: d.id, fullName: d.fullName, username: d.username })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch doctors" });
    }
  });

  // Get user by ID - AUTHENTICATED
  app.get("/api/users/:userId", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ id: user.id, fullName: user.fullName, role: user.role, username: user.username });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // =====================
  // PATIENT REPORT ROUTES
  // =====================

  app.post("/api/reports/upload", requirePatient as any, upload.single("file"), async (req: AuthenticatedRequest, res) => {
    try {
      const file = req.file;
      const { patientId } = req.body;

      // SECURITY: Verify patient is uploading to their own account
      if (req.userId !== patientId) {
        return res.status(403).json({ error: "You can only upload reports to your own account" });
      }

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const base64Data = file.buffer.toString("base64");
      const extractedData = await analyzeReportImage(base64Data, file.mimetype);

      const report = await storage.createReport({
        patientId,
        category: extractedData.category,
        fileName: file.originalname,
        fileUrl: `data:${file.mimetype};base64,${base64Data}`,
        ocrText: JSON.stringify(extractedData),
      });

      const visit = await storage.createVisit({
        reportId: report.id,
        patientId,
        category: extractedData.category,
        doctorName: extractedData.doctorName,
        hospitalName: extractedData.hospitalName,
        visitDate: new Date(extractedData.visitDate),
        diagnosis: extractedData.diagnosis,
        symptoms: extractedData.symptoms || null,
        instructions: extractedData.instructions || null,
        revisitDate: extractedData.revisitDate ? new Date(extractedData.revisitDate) : null,
        aiSummary: null,
      });

      const prescriptions = await Promise.all(
        extractedData.medications.map((med: any) =>
          storage.createPrescription({
            visitId: visit.id,
            medicationName: med.name,
            dosage: med.dosage,
            duration: med.duration,
            instructions: med.instructions || null,
          })
        )
      );

      const aiSummary = await generatePrescriptionSummary(
        extractedData.doctorName,
        extractedData.hospitalName,
        extractedData.visitDate,
        extractedData.diagnosis,
        extractedData.medications
      );

      await storage.updateVisitSummary(visit.id, aiSummary);

      res.json({
        report,
        visit: { ...visit, aiSummary },
        prescriptions,
        extractedData,
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message || "Failed to process report" });
    }
  });

  // Patient's own reports (AUTHENTICATED)
  app.get("/api/reports/patient/:patientId", requirePatient as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId } = req.params;
      
      // SECURITY: Verify patient is viewing their own reports
      if (req.userId !== patientId) {
        return res.status(403).json({ error: "You can only view your own reports" });
      }
      
      const reports = await storage.getReportsByPatient(patientId);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  app.get("/api/reports/patient/:patientId/category/:category", requirePatient as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId, category } = req.params;
      
      // SECURITY: Verify patient is viewing their own reports
      if (req.userId !== patientId) {
        return res.status(403).json({ error: "You can only view your own reports" });
      }
      
      const reports = await storage.getReportsByCategory(patientId, category);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  // =====================
  // PATIENT VISIT ROUTES (AUTHENTICATED)
  // =====================

  app.get("/api/visits/patient/:patientId", requirePatient as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId } = req.params;
      
      // SECURITY: Verify patient is viewing their own visits
      if (req.userId !== patientId) {
        return res.status(403).json({ error: "You can only view your own visits" });
      }
      
      const visits = await storage.getVisitsByPatient(patientId);
      res.json(visits);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch visits" });
    }
  });

  app.get("/api/visits/patient/:patientId/category/:category", requirePatient as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId, category } = req.params;
      
      // SECURITY: Verify patient is viewing their own visits
      if (req.userId !== patientId) {
        return res.status(403).json({ error: "You can only view your own visits" });
      }
      
      const visits = await storage.getVisitsByCategory(patientId, category);
      res.json(visits);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch visits" });
    }
  });

  app.get("/api/visits/:visitId", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { visitId } = req.params;
      const visit = await storage.getVisit(visitId);
      
      if (!visit) {
        return res.status(404).json({ error: "Visit not found" });
      }

      // SECURITY: Verify user has access to this visit
      if (req.userRole === "patient" && visit.patientId !== req.userId) {
        return res.status(403).json({ error: "You can only view your own visits" });
      }
      if (req.userRole === "doctor") {
        const permission = await storage.checkAccess(visit.patientId, req.userId!);
        if (!permission || !permission.reportsAccess) {
          return res.status(403).json({ error: "Patient has not granted you access" });
        }
      }

      const prescriptions = await storage.getPrescriptionsByVisit(visitId);
      res.json({ visit, prescriptions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch visit details" });
    }
  });

  // =====================
  // FAMILY HISTORY ROUTES (AUTHENTICATED)
  // =====================

  app.post("/api/family-history", requirePatient as any, async (req: AuthenticatedRequest, res) => {
    try {
      const data = insertFamilyHistorySchema.parse(req.body);
      
      // SECURITY: Verify patient is adding to their own family history
      if (req.userId !== data.patientId) {
        return res.status(403).json({ error: "You can only manage your own family history" });
      }
      
      const history = await storage.createFamilyHistory(data);
      res.json(history);
    } catch (error) {
      res.status(400).json({ error: "Invalid data" });
    }
  });

  app.get("/api/family-history/patient/:patientId", requirePatient as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId } = req.params;
      
      // SECURITY: Verify patient is viewing their own family history
      if (req.userId !== patientId) {
        return res.status(403).json({ error: "You can only view your own family history" });
      }
      
      const history = await storage.getFamilyHistoryByPatient(patientId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch family history" });
    }
  });

  app.patch("/api/family-history/:id", requirePatient as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      
      // SECURITY: Verify this family history entry belongs to the patient
      const history = await storage.getFamilyHistory(id);
      if (!history || history.patientId !== req.userId) {
        return res.status(403).json({ error: "You can only update your own family history" });
      }
      
      const updates = req.body;
      const updated = await storage.updateFamilyHistory(id, updates);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update family history" });
    }
  });

  app.delete("/api/family-history/:id", requirePatient as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      
      // SECURITY: Verify this family history entry belongs to the patient
      const history = await storage.getFamilyHistory(id);
      if (!history || history.patientId !== req.userId) {
        return res.status(403).json({ error: "You can only delete your own family history" });
      }
      
      await storage.deleteFamilyHistory(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete family history" });
    }
  });

  // =====================
  // ACCESS PERMISSION ROUTES (Patient-controlled)
  // =====================

  app.post("/api/access-permissions", requirePatient as any, async (req: AuthenticatedRequest, res) => {
    try {
      const data = insertAccessPermissionSchema.parse(req.body);
      
      // SECURITY: Verify the patient is modifying their own permissions
      if (req.userId !== data.patientId) {
        return res.status(403).json({ error: "You can only manage your own access permissions" });
      }
      
      // Check if permission already exists
      const existing = await storage.checkAccess(data.patientId, data.doctorId);
      if (existing) {
        // Update existing permission
        const updated = await storage.updateAccessPermission(data.patientId, data.doctorId, {
          reportsAccess: data.reportsAccess,
          familyHistoryAccess: data.familyHistoryAccess,
        });
        return res.json(updated);
      }
      
      const permission = await storage.createAccessPermission(data);
      res.json(permission);
    } catch (error) {
      res.status(400).json({ error: "Invalid data" });
    }
  });

  app.patch("/api/access-permissions/:patientId/:doctorId", requirePatient as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId, doctorId } = req.params;
      
      // SECURITY: Verify the patient is modifying their own permissions
      if (req.userId !== patientId) {
        return res.status(403).json({ error: "You can only manage your own access permissions" });
      }
      
      const updates = req.body;
      const permission = await storage.updateAccessPermission(patientId, doctorId, updates);
      if (!permission) {
        return res.status(404).json({ error: "Permission not found" });
      }
      res.json(permission);
    } catch (error) {
      res.status(500).json({ error: "Failed to update permissions" });
    }
  });

  app.delete("/api/access-permissions/:patientId/:doctorId", requirePatient as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId, doctorId } = req.params;
      
      // SECURITY: Verify the patient is modifying their own permissions
      if (req.userId !== patientId) {
        return res.status(403).json({ error: "You can only manage your own access permissions" });
      }
      
      await storage.deleteAccessPermission(patientId, doctorId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to revoke access" });
    }
  });

  app.get("/api/access-permissions/patient/:patientId", requirePatient as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId } = req.params;
      
      // SECURITY: Verify the patient is viewing their own permissions
      if (req.userId !== patientId) {
        return res.status(403).json({ error: "You can only view your own access permissions" });
      }
      
      const permissions = await storage.getAccessPermissions(patientId);
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  app.get("/api/access-permissions/doctor/:doctorId", requireDoctor as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { doctorId } = req.params;
      
      // SECURITY: Verify requesting doctor matches the doctorId param
      if (req.userId !== doctorId) {
        return res.status(403).json({ error: "You can only view your own patient list" });
      }
      
      const permissions = await storage.getDoctorPatients(doctorId);
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch doctor's patients" });
    }
  });

  app.get("/api/access-permissions/check/:patientId/:doctorId", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId, doctorId } = req.params;
      
      // SECURITY: Only the involved patient or doctor can check permissions
      if (req.userId !== patientId && req.userId !== doctorId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const permission = await storage.checkAccess(patientId, doctorId);
      res.json(permission || { reportsAccess: false, familyHistoryAccess: false });
    } catch (error) {
      res.status(500).json({ error: "Failed to check access" });
    }
  });

  // =====================
  // DOCTOR-SPECIFIC ROUTES (ACCESS CONTROLLED + AUTHENTICATED)
  // =====================

  // Get patients who granted access to this doctor
  app.get("/api/doctor/:doctorId/patients", requireDoctor as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { doctorId } = req.params;
      
      // SECURITY: Verify requesting doctor matches the doctorId param
      if (req.userId !== doctorId) {
        return res.status(403).json({ error: "You can only view your own authorized patients" });
      }
      
      // Get all permissions granted to this doctor
      const permissions = await storage.getDoctorPatients(doctorId);
      
      // Only include patients who granted reportsAccess
      const grantedPermissions = permissions.filter(p => p.reportsAccess);
      
      // Get patient details for granted permissions
      const patients = await Promise.all(
        grantedPermissions.map(async (p) => {
          const patient = await storage.getUser(p.patientId);
          return patient ? {
            id: patient.id,
            fullName: patient.fullName,
            reportsAccess: p.reportsAccess,
            familyHistoryAccess: p.familyHistoryAccess,
            grantedAt: p.grantedAt,
          } : null;
        })
      );
      
      res.json(patients.filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch authorized patients" });
    }
  });

  // Doctor views patient reports (ACCESS CONTROLLED + AUTHENTICATED)
  app.get("/api/doctor/:doctorId/patient/:patientId/reports", requireDoctor as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { doctorId, patientId } = req.params;
      
      // SECURITY: Verify requesting doctor matches the doctorId param
      if (req.userId !== doctorId) {
        return res.status(403).json({ error: "You can only access your own granted patients", authorized: false });
      }
      
      // CRITICAL: Check if doctor has access
      const permission = await storage.checkAccess(patientId, doctorId);
      if (!permission || !permission.reportsAccess) {
        return res.status(403).json({ 
          error: "Access denied. Patient has not granted you access to their reports.",
          authorized: false 
        });
      }
      
      const reports = await storage.getReportsByPatient(patientId);
      res.json({ authorized: true, reports });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch patient reports" });
    }
  });

  // Doctor views patient visits (ACCESS CONTROLLED + AUTHENTICATED)
  app.get("/api/doctor/:doctorId/patient/:patientId/visits", requireDoctor as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { doctorId, patientId } = req.params;
      
      // SECURITY: Verify requesting doctor matches the doctorId param
      if (req.userId !== doctorId) {
        return res.status(403).json({ error: "You can only access your own granted patients", authorized: false });
      }
      
      // CRITICAL: Check if doctor has access
      const permission = await storage.checkAccess(patientId, doctorId);
      if (!permission || !permission.reportsAccess) {
        return res.status(403).json({ 
          error: "Access denied. Patient has not granted you access.",
          authorized: false 
        });
      }
      
      const visits = await storage.getVisitsByPatient(patientId);
      res.json({ authorized: true, visits });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch patient visits" });
    }
  });

  // Doctor views patient family history (ACCESS CONTROLLED + AUTHENTICATED)
  app.get("/api/doctor/:doctorId/patient/:patientId/family-history", requireDoctor as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { doctorId, patientId } = req.params;
      
      // SECURITY: Verify requesting doctor matches the doctorId param
      if (req.userId !== doctorId) {
        return res.status(403).json({ error: "You can only access your own granted patients", authorized: false, familyHistoryAuthorized: false });
      }
      
      // CRITICAL: Check if doctor has family history access
      const permission = await storage.checkAccess(patientId, doctorId);
      if (!permission || !permission.reportsAccess) {
        return res.status(403).json({ 
          error: "Access denied. Patient has not granted you access.",
          authorized: false,
          familyHistoryAuthorized: false 
        });
      }
      
      if (!permission.familyHistoryAccess) {
        return res.status(403).json({ 
          error: "Patient has not granted access to family history.",
          authorized: true,
          familyHistoryAuthorized: false,
          familyHistory: [] 
        });
      }
      
      const familyHistory = await storage.getFamilyHistoryByPatient(patientId);
      res.json({ authorized: true, familyHistoryAuthorized: true, familyHistory });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch family history" });
    }
  });

  // =====================
  // AI SUMMARY (WITH SCOPING AND ROLE-BASED OUTPUT) - AUTHENTICATED
  // =====================

  app.post("/api/ai-summary", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId, scope, mode, category, reportIds, doctorId } = req.body;

      // SECURITY: Verify the user has access to this patient's data
      if (req.userRole === "patient") {
        // Patients can only view their own summaries
        if (req.userId !== patientId) {
          return res.status(403).json({ error: "You can only view your own AI summaries" });
        }
      } else if (req.userRole === "doctor") {
        // Doctors must have patient consent and match the doctorId
        if (req.userId !== doctorId) {
          return res.status(403).json({ error: "Doctor ID mismatch" });
        }
        const permission = await storage.checkAccess(patientId, doctorId);
        if (!permission || !permission.reportsAccess) {
          return res.status(403).json({ 
            error: "Access denied. Patient has not granted you access.",
            authorized: false 
          });
        }
        
        // Only include family history in clinical mode if doctor has family access
        if (mode === "clinical" && !permission.familyHistoryAccess) {
          // Proceed but without family history
        }
      }

      // Determine which visits to include based on scope
      let visits: Visit[] = [];
      
      if (scope === "all") {
        visits = await storage.getVisitsByPatient(patientId);
      } else if (scope === "category" && category) {
        visits = await storage.getVisitsByCategory(patientId, category);
      } else if (scope === "selected" && reportIds && Array.isArray(reportIds)) {
        // Get visits for selected report IDs
        const visitPromises = reportIds.map((id: string) => storage.getVisitsByReport(id));
        const visitArrays = await Promise.all(visitPromises);
        visits = visitArrays.flat();
      } else if (scope === "single" && reportIds) {
        const reportId = Array.isArray(reportIds) ? reportIds[0] : reportIds;
        visits = await storage.getVisitsByReport(reportId);
      }

      if (visits.length === 0) {
        return res.json({ 
          summary: "No medical reports found for the selected scope. Upload reports to generate an AI summary.",
          scope, 
          mode, 
          visitCount: 0 
        });
      }

      // Prepare report data for AI
      const reportsData = visits.map((v) => ({
        category: v.category,
        diagnosis: v.diagnosis,
        medications: v.instructions || "",
      }));

      // Include family history for clinical mode (if permitted)
      let familyHistory = undefined;
      if (mode === "clinical") {
        // Check family access if doctor
        if (doctorId) {
          const permission = await storage.checkAccess(patientId, doctorId);
          if (permission?.familyHistoryAccess) {
            familyHistory = (await storage.getFamilyHistoryByPatient(patientId)).map((h) => ({
              condition: h.condition,
              relation: h.relation,
              notes: h.notes || undefined,
            }));
          }
        } else {
          // Patient viewing their own data
          familyHistory = (await storage.getFamilyHistoryByPatient(patientId)).map((h) => ({
            condition: h.condition,
            relation: h.relation,
            notes: h.notes || undefined,
          }));
        }
      }

      const summary = await generateAISummary(reportsData, mode as "patient" | "clinical", familyHistory);

      res.json({ summary, scope, mode, visitCount: visits.length });
    } catch (error: any) {
      console.error("AI summary error:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI summary" });
    }
  });

  // =====================
  // DOCTOR AI SUMMARY (ACCESS CONTROLLED)
  // =====================

  app.post("/api/doctor/ai-summary", requireDoctor as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { doctorId, patientId, scope, mode, category, reportIds } = req.body;

      // SECURITY: Verify requesting doctor matches the doctorId param
      if (req.userId !== doctorId) {
        return res.status(403).json({ error: "You can only generate summaries for your own patients", authorized: false });
      }

      // CRITICAL: Verify doctor has access
      const permission = await storage.checkAccess(patientId, doctorId);
      if (!permission || !permission.reportsAccess) {
        return res.status(403).json({ 
          error: "Access denied. Patient has not granted you access to their reports.",
          authorized: false 
        });
      }

      // Determine which visits to include based on scope
      let visits: Visit[] = [];
      
      if (scope === "all") {
        visits = await storage.getVisitsByPatient(patientId);
      } else if (scope === "category" && category) {
        visits = await storage.getVisitsByCategory(patientId, category);
      } else if (scope === "selected" && reportIds && Array.isArray(reportIds)) {
        const visitPromises = reportIds.map((id: string) => storage.getVisitsByReport(id));
        const visitArrays = await Promise.all(visitPromises);
        visits = visitArrays.flat();
      }

      if (visits.length === 0) {
        return res.json({ 
          summary: "No medical reports found for the selected scope.",
          scope, 
          mode, 
          visitCount: 0,
          authorized: true
        });
      }

      const reportsData = visits.map((v) => ({
        category: v.category,
        diagnosis: v.diagnosis,
        medications: v.instructions || "",
      }));

      // Include family history for clinical mode ONLY if doctor has family access
      let familyHistory = undefined;
      if (mode === "clinical" && permission.familyHistoryAccess) {
        familyHistory = (await storage.getFamilyHistoryByPatient(patientId)).map((h) => ({
          condition: h.condition,
          relation: h.relation,
          notes: h.notes || undefined,
        }));
      }

      const summary = await generateAISummary(reportsData, mode as "patient" | "clinical", familyHistory);

      res.json({ 
        summary, 
        scope, 
        mode, 
        visitCount: visits.length,
        authorized: true,
        familyHistoryIncluded: !!familyHistory
      });
    } catch (error: any) {
      console.error("Doctor AI summary error:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI summary" });
    }
  });

  // =====================
  // GENETIC RISK PREDICTION - AUTHENTICATED
  // =====================

  app.post("/api/genetic-risk", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId, doctorId } = req.body;

      // SECURITY: Verify the user has access to this patient's data
      if (req.userRole === "patient") {
        // Patients can only view their own genetic risk
        if (req.userId !== patientId) {
          return res.status(403).json({ error: "You can only view your own genetic risk predictions" });
        }
      } else if (req.userRole === "doctor") {
        // Doctors must have patient consent with family history access
        if (req.userId !== doctorId) {
          return res.status(403).json({ error: "Doctor ID mismatch" });
        }
        const permission = await storage.checkAccess(patientId, doctorId);
        if (!permission || !permission.reportsAccess || !permission.familyHistoryAccess) {
          return res.status(403).json({ 
            error: "Access denied. Patient has not granted you access to family history.",
            authorized: false 
          });
        }
      }

      const familyHistory = await storage.getFamilyHistoryByPatient(patientId);
      
      if (familyHistory.length === 0) {
        return res.json({ predictions: [], message: "No family history found" });
      }

      const predictions = await generateGeneticRiskPrediction(
        familyHistory.map((h) => ({
          condition: h.condition,
          relation: h.relation,
          notes: h.notes || undefined,
        }))
      );

      res.json({ predictions });
    } catch (error: any) {
      console.error("Genetic risk error:", error);
      res.status(500).json({ error: error.message || "Failed to generate genetic risk prediction" });
    }
  });

  // =====================
  // SEED DATA ENDPOINT (for demo)
  // =====================

  app.post("/api/seed-demo-data", async (req, res) => {
    try {
      // Create demo patient
      let patient = await storage.getUserByUsername("patient1");
      if (!patient) {
        patient = await storage.createUser({
          username: "patient1",
          password: "password",
          role: "patient",
          fullName: "Arjun Sharma",
        });
      }

      // Create demo doctors
      let doctor1 = await storage.getUserByUsername("doctor1");
      if (!doctor1) {
        doctor1 = await storage.createUser({
          username: "doctor1",
          password: "password",
          role: "doctor",
          fullName: "Dr. Priya Mehta",
        });
      }

      let doctor2 = await storage.getUserByUsername("doctor2");
      if (!doctor2) {
        doctor2 = await storage.createUser({
          username: "doctor2",
          password: "password",
          role: "doctor",
          fullName: "Dr. Rajesh Kumar",
        });
      }

      let doctor3 = await storage.getUserByUsername("doctor3");
      if (!doctor3) {
        doctor3 = await storage.createUser({
          username: "doctor3",
          password: "password",
          role: "doctor",
          fullName: "Dr. Sunita Iyer",
        });
      }

      // Create sample family history
      const existingHistory = await storage.getFamilyHistoryByPatient(patient.id);
      if (existingHistory.length === 0) {
        await storage.createFamilyHistory({
          patientId: patient.id,
          condition: "Diabetes",
          relation: "Father",
          notes: "Type 2 diabetes, diagnosed at age 50",
        });
        await storage.createFamilyHistory({
          patientId: patient.id,
          condition: "Heart Disease",
          relation: "Grandfather (Paternal)",
          notes: "Had bypass surgery at 65",
        });
        await storage.createFamilyHistory({
          patientId: patient.id,
          condition: "Hypertension",
          relation: "Mother",
          notes: "On medication since age 45",
        });
      }

      // Grant access from patient to doctor1 (full access)
      const existingPerm1 = await storage.checkAccess(patient.id, doctor1.id);
      if (!existingPerm1) {
        await storage.createAccessPermission({
          patientId: patient.id,
          doctorId: doctor1.id,
          reportsAccess: true,
          familyHistoryAccess: true,
        });
      }

      // Grant access from patient to doctor2 (reports only, no family history)
      const existingPerm2 = await storage.checkAccess(patient.id, doctor2.id);
      if (!existingPerm2) {
        await storage.createAccessPermission({
          patientId: patient.id,
          doctorId: doctor2.id,
          reportsAccess: true,
          familyHistoryAccess: false,
        });
      }

      // Doctor3 has NO access (demonstrates permission denial)

      res.json({
        success: true,
        message: "Demo data seeded",
        credentials: {
          patient: { username: "patient1", password: "password" },
          doctorWithFullAccess: { username: "doctor1", password: "password" },
          doctorWithReportsOnly: { username: "doctor2", password: "password" },
          doctorWithNoAccess: { username: "doctor3", password: "password" },
        }
      });
    } catch (error: any) {
      console.error("Seed error:", error);
      res.status(500).json({ error: error.message || "Failed to seed demo data" });
    }
  });

  return httpServer;
}
