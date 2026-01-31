import { useMemo, useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Activity,
  BadgeCheck,
  Brain,
  Calendar,
  ChevronRight,
  FileText,
  Folder,
  HeartPulse,
  Hospital,
  Loader2,
  LogOut,
  Microscope,
  Pencil,
  Pill,
  Plus,
  ShieldCheck,
  Stethoscope,
  Syringe,
  Thermometer,
  Trash2,
  Upload,
  Waves,
  Zap,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { uploadReport, getAllDoctors, getAccessPermissions, createAccessPermission, updateAccessPermission, revokeAccessPermission, seedDemoData, getReportsByPatient, getVisitsByPatient } from "@/lib/api";
import { ChevronDown } from "lucide-react";
import FamilyTree from "@/components/family-tree";

type ReportCategory = {
  key:
    | "dental"
    | "diabetes"
    | "dermatology"
    | "radiology"
    | "cardiology"
    | "neurology"
    | "orthopedics"
    | "pathology"
    | "pediatrics"
    | "general";
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: "cyan" | "violet" | "green" | "amber";
};

type ReportItem = {
  id: string;
  category: ReportCategory["key"];
  title: string;
  date: string;
  source: string;
  status: "processed" | "pending";
};

type Doctor = {
  id: string;
  name: string;
  specialty: string;
  location: string;
  granted: boolean;
  canSeeFamily: boolean;
};

type FamilyEntry = {
  id: string;
  condition: string;
  relation: string;
  notes?: string;
};

const categories: ReportCategory[] = [
  {
    key: "dental",
    title: "Dental",
    subtitle: "Oral scans & consult notes",
    icon: <Pill className="size-5" strokeWidth={2.2} />,
    accent: "cyan",
  },
  {
    key: "diabetes",
    title: "Diabetes / Sugar",
    subtitle: "Glucose, HbA1c & trends",
    icon: <Waves className="size-5" strokeWidth={2.2} />,
    accent: "violet",
  },
  {
    key: "dermatology",
    title: "Dermatology",
    subtitle: "Skin panels & imaging",
    icon: <Zap className="size-5" strokeWidth={2.2} />,
    accent: "amber",
  },
  {
    key: "radiology",
    title: "Radiology",
    subtitle: "X-ray, MRI, CT results",
    icon: <Microscope className="size-5" strokeWidth={2.2} />,
    accent: "cyan",
  },
  {
    key: "cardiology",
    title: "Cardiology",
    subtitle: "Heart health & risk",
    icon: <HeartPulse className="size-5" strokeWidth={2.2} />,
    accent: "green",
  },
  {
    key: "neurology",
    title: "Neurology",
    subtitle: "Cognition & nerve tests",
    icon: <Activity className="size-5" strokeWidth={2.2} />,
    accent: "violet",
  },
  {
    key: "orthopedics",
    title: "Orthopedics",
    subtitle: "Joints, bones & mobility",
    icon: <Syringe className="size-5" strokeWidth={2.2} />,
    accent: "amber",
  },
  {
    key: "pathology",
    title: "Pathology / Lab",
    subtitle: "Bloodwork & panels",
    icon: <Hospital className="size-5" strokeWidth={2.2} />,
    accent: "green",
  },
  {
    key: "pediatrics",
    title: "Pediatrics",
    subtitle: "Growth & immunizations",
    icon: <Stethoscope className="size-5" strokeWidth={2.2} />,
    accent: "cyan",
  },
  {
    key: "general",
    title: "General Medicine",
    subtitle: "Visits & notes",
    icon: <FileText className="size-5" strokeWidth={2.2} />,
    accent: "violet",
  },
];

const mockReports: ReportItem[] = [
  {
    id: "RPT-1042",
    category: "radiology",
    title: "Chest CT · Radiology",
    date: "2026-01-12",
    source: "Meridian Imaging",
    status: "processed",
  },
  {
    id: "RPT-1027",
    category: "diabetes",
    title: "HbA1c Panel",
    date: "2026-01-08",
    source: "Lab Nova",
    status: "processed",
  },
  {
    id: "RPT-1009",
    category: "cardiology",
    title: "ECG + Consultation Notes",
    date: "2025-12-22",
    source: "Pulse Clinic",
    status: "processed",
  },
  {
    id: "RPT-0994",
    category: "dermatology",
    title: "Dermatoscopy Imaging",
    date: "2025-12-03",
    source: "DermalWorks",
    status: "pending",
  },
];

const mockDoctors: Doctor[] = [
  {
    id: "DOC-201",
    name: "Dr. A. Patel",
    specialty: "Cardiology",
    location: "Pulse Clinic",
    granted: true,
    canSeeFamily: true,
  },
  {
    id: "DOC-114",
    name: "Dr. S. Nguyen",
    specialty: "Radiology",
    location: "Meridian Imaging",
    granted: false,
    canSeeFamily: false,
  },
  {
    id: "DOC-098",
    name: "Dr. M. Khan",
    specialty: "Endocrinology",
    location: "Nova Health",
    granted: true,
    canSeeFamily: false,
  },
];

const initialFamily: FamilyEntry[] = [
  { id: "FH-1", condition: "Diabetes", relation: "Father", notes: "Type 2, onset ~50" },
  { id: "FH-2", condition: "Cardiac disease", relation: "Grandparent", notes: "Bypass surgery" },
  { id: "FH-3", condition: "Genetic", relation: "Sibling", notes: "Thalassemia trait" },
];

const conditionOptions = [
  "Diabetes",
  "Cardiac disease",
  "Cancer",
  "Genetic disorders",
  "Neurological",
  "Respiratory",
  "Autoimmune",
  "Hypertension",
  "Kidney disease",
] as const;

const relationOptions = ["Father", "Mother", "Sibling", "Grandparent", "Other"] as const;

function Chip({
  label,
  accent,
  icon,
  testId,
}: {
  label: string;
  accent: "cyan" | "violet" | "green" | "amber";
  icon: React.ReactNode;
  testId: string;
}) {
  const styles =
    accent === "cyan"
      ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
      : accent === "violet"
        ? "border-violet-300/25 bg-violet-300/10 text-violet-100"
        : accent === "green"
          ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
          : "border-amber-300/25 bg-amber-300/10 text-amber-100";

  return (
    <div
      className={["inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", styles].join(" ")}
      data-testid={testId}
    >
      <span className="opacity-90">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}

function SectionTitle({ title, subtitle, testId }: { title: string; subtitle: string; testId: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <div className="font-serif text-sm tracking-[0.14em] text-white/70" data-testid={`${testId}-kicker`}>
          {title.toUpperCase()}
        </div>
        <div className="mt-2 text-2xl font-semibold text-white" data-testid={`${testId}-title`}>
          {title}
        </div>
        <div className="mt-1 text-sm text-white/60" data-testid={`${testId}-subtitle`}>
          {subtitle}
        </div>
      </div>
    </div>
  );
}

function relationTone(rel: string) {
  const r = rel.toLowerCase();
  if (r.includes("father") || r.includes("mother") || r.includes("sibling")) return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";
  if (r.includes("grand")) return "border-violet-300/25 bg-violet-300/10 text-violet-100";
  return "border-white/10 bg-white/5 text-white/70";
}

function conditionTone(cond: string) {
  const c = cond.toLowerCase();
  if (c.includes("card") || c.includes("heart")) return "border-violet-300/25 bg-violet-300/10 text-violet-100";
  if (c.includes("diab") || c.includes("glucose") || c.includes("metab")) return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  if (c.includes("gen")) return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";
  if (c.includes("resp") || c.includes("neuro")) return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  return "border-white/10 bg-white/5 text-white/70";
}

export default function PatientDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedCategory, setExpandedCategory] = useState<ReportCategory["key"] | "all" | null>(null);
  const [search, setSearch] = useState("");

  const [family, setFamily] = useState<FamilyEntry[]>(initialFamily);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCondition, setFormCondition] = useState<string>("Diabetes");
  const [formRelation, setFormRelation] = useState<string>("Father");
  const [formNotes, setFormNotes] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get current user from session
  const [currentUser, setCurrentUser] = useState<{ id: string; fullName: string; role: string } | null>(null);
  
  useEffect(() => {
    const stored = localStorage.getItem("medispace_user");
    if (stored) {
      const user = JSON.parse(stored);
      if (user.role === "patient") {
        setCurrentUser(user);
      } else {
        window.location.href = "/doctor";
      }
    } else {
      window.location.href = "/auth";
    }
  }, []);

  const patientId = currentUser?.id || "";

  // Fetch all doctors
  const { data: allDoctors = [] } = useQuery({
    queryKey: ["all-doctors"],
    queryFn: getAllDoctors,
    enabled: !!patientId,
  });

  // Fetch current permissions
  const { data: permissions = [] } = useQuery({
    queryKey: ["patient-permissions", patientId],
    queryFn: () => getAccessPermissions(patientId),
    enabled: !!patientId,
  });

  // Fetch real reports from API
  const { data: realReports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["patient-reports", patientId],
    queryFn: () => getReportsByPatient(patientId),
    enabled: !!patientId,
  });

  // Fetch real visits from API
  const { data: realVisits = [], isLoading: visitsLoading } = useQuery({
    queryKey: ["patient-visits", patientId],
    queryFn: () => getVisitsByPatient(patientId),
    enabled: !!patientId,
  });

  // Build doctors list with permission status
  const doctors = useMemo(() => {
    return allDoctors.map((d) => {
      const perm = permissions.find((p) => p.doctorId === d.id);
      return {
        id: d.id,
        name: d.fullName,
        specialty: "Healthcare Provider",
        location: "MediSpace",
        granted: perm?.reportsAccess || false,
        canSeeFamily: perm?.familyHistoryAccess || false,
      };
    });
  }, [allDoctors, permissions]);

  const grantedCount = useMemo(() => doctors.filter((d) => d.granted).length, [doctors]);

  // Handle granting/revoking access
  const handleToggleAccess = async (doctorId: string, currentlyGranted: boolean) => {
    try {
      if (currentlyGranted) {
        // Revoke access
        await revokeAccessPermission(patientId, doctorId);
        toast({
          title: "Access Revoked",
          description: "Doctor can no longer view your records.",
        });
      } else {
        // Grant access
        await createAccessPermission({
          patientId,
          doctorId,
          reportsAccess: true,
          familyHistoryAccess: false,
        });
        toast({
          title: "Access Granted",
          description: "Doctor can now view your medical reports.",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["patient-permissions", patientId] });
    } catch (error: any) {
      toast({
        title: "Failed to update access",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handle toggling family history access
  const handleToggleFamilyAccess = async (doctorId: string, currentValue: boolean) => {
    try {
      await updateAccessPermission(patientId, doctorId, {
        familyHistoryAccess: !currentValue,
      });
      toast({
        title: currentValue ? "Family History Hidden" : "Family History Shared",
        description: currentValue 
          ? "Doctor can no longer view your family history."
          : "Doctor can now view your family medical history.",
      });
      queryClient.invalidateQueries({ queryKey: ["patient-permissions", patientId] });
    } catch (error: any) {
      toast({
        title: "Failed to update permissions",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("medispace_user");
    window.location.href = "/auth";
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadReport(file, patientId),
    onSuccess: (data) => {
      toast({
        title: "Report Uploaded Successfully!",
        description: `Your ${data.extractedData.category} report has been processed and classified.`,
      });
      // Refresh the reports and visits lists
      queryClient.invalidateQueries({ queryKey: ["patient-reports", patientId] });
      queryClient.invalidateQueries({ queryKey: ["patient-visits", patientId] });
      // Expand the category to show the new report
      setExpandedCategory(data.extractedData.category as ReportCategory["key"]);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to process the report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Build visits list from real API data
  const allVisits = useMemo(() => {
    return realVisits.map((v) => ({
      id: v.id,
      category: v.category as ReportCategory["key"],
      title: `${v.diagnosis} - ${v.category}`,
      date: new Date(v.visitDate).toLocaleDateString(),
      source: v.hospitalName || "Unknown",
      doctorName: v.doctorName || "Unknown",
      status: "processed" as const,
    }));
  }, [realVisits]);

  // Filter visits by search
  const filteredVisits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allVisits.filter((v) => {
      if (!q) return true;
      return v.title.toLowerCase().includes(q) || v.source.toLowerCase().includes(q) || v.doctorName.toLowerCase().includes(q);
    });
  }, [allVisits, search]);

  // Get visits for a specific category
  const getVisitsByCategory = (category: ReportCategory["key"]) => {
    return filteredVisits.filter((v) => v.category === category);
  };

  // Count reports per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of allVisits) {
      counts[v.category] = (counts[v.category] || 0) + 1;
    }
    return counts;
  }, [allVisits]);

  const groupedFamily = useMemo(() => {
    const map = new Map<string, FamilyEntry[]>();
    for (const e of family) {
      const key = e.condition;
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return Array.from(map.entries()).map(([condition, items]) => ({ condition, items }));
  }, [family]);

  const grantedFamilyCount = doctors.filter((d) => d.granted && d.canSeeFamily).length;

  const resetForm = () => {
    setEditingId(null);
    setFormCondition("Diabetes");
    setFormRelation("Father");
    setFormNotes("");
  };

  const startEdit = (e: FamilyEntry) => {
    setEditingId(e.id);
    setFormCondition(e.condition);
    setFormRelation(e.relation);
    setFormNotes(e.notes ?? "");
  };

  const submitFamily = () => {
    const cond = formCondition.trim();
    const rel = formRelation.trim();
    const notes = formNotes.trim();
    if (!cond || !rel) {
      toast({ title: "Missing details", description: "Condition and relation are required.", variant: "destructive" });
      return;
    }

    if (editingId) {
      setFamily((prev) => prev.map((x) => (x.id === editingId ? { ...x, condition: cond, relation: rel, notes } : x)));
      toast({ title: "Updated", description: "Family history entry updated." });
      resetForm();
      return;
    }

    const id = `FH-${Math.floor(1000 + Math.random() * 9000)}`;
    setFamily((prev) => [{ id, condition: cond, relation: rel, notes }, ...prev]);
    toast({ title: "Added", description: "Family history entry added." });
    resetForm();
  };

  const removeFamily = (id: string) => {
    setFamily((prev) => prev.filter((x) => x.id !== id));
    if (editingId === id) resetForm();
    toast({ title: "Removed", description: "Family history entry removed." });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10 ms-grid-bg" />
      <div className="absolute inset-0 -z-10 ms-noise" aria-hidden="true" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-8">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
            <Folder className="size-5 text-cyan-200" strokeWidth={2.2} />
          </div>
          <div>
            <div className="font-serif text-sm tracking-[0.18em] text-white/90" data-testid="text-patient-brand">
              MEDISPACE
            </div>
            <div className="mt-0.5 text-xs text-white/55" data-testid="text-patient-subbrand">
              Patient Dashboard · Data ownership view
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            data-testid="button-patient-ai"
            className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
            onClick={() => (window.location.href = "/ai")}
          >
            <Brain className="size-4" />
            AI Summary
          </Button>
          <Badge data-testid="badge-role-patient" className="border-white/10 bg-white/5 text-white/80">
            Patient
          </Badge>
          <Button
            variant="secondary"
            data-testid="button-patient-signout"
            className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
            onClick={() => (window.location.href = "/auth")}
          >
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]"
        >
          <section>
            <SectionTitle
              title="Reports"
              subtitle="Click on a category to view reports or use All Reports to see everything."
              testId="section-reports"
            />

            {/* Top action buttons */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file-upload"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                data-testid="button-upload-report"
                className="bg-cyan-500 text-white hover:bg-cyan-600 flex items-center gap-2"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Report
                  </>
                )}
              </Button>
              <Button
                onClick={() => setExpandedCategory(expandedCategory === "all" ? null : "all")}
                data-testid="button-all-reports"
                variant={expandedCategory === "all" ? "default" : "secondary"}
                className={expandedCategory === "all" 
                  ? "bg-violet-500 text-white hover:bg-violet-600" 
                  : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"}
              >
                <FileText className="w-4 h-4 mr-2" />
                All Reports ({allVisits.length})
              </Button>
              <Button
                onClick={() => (window.location.href = "/ai")}
                data-testid="button-ai-summary-main"
                variant="secondary"
                className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
              >
                <Brain className="w-4 h-4 mr-2" />
                AI Summary
              </Button>
              <div className="ml-auto w-[200px]">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search reports..."
                  data-testid="input-report-search"
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                />
              </div>
            </div>

            {/* All Reports Section (when expanded) */}
            {expandedCategory === "all" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <Card className="border-cyan-300/20 bg-white/5 p-5 backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <div className="text-sm font-medium text-white">All Reports</div>
                      <div className="mt-1 text-xs text-white/55">
                        Showing {filteredVisits.length} total reports
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {visitsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                      </div>
                    ) : filteredVisits.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-white/65 text-center">
                        No reports yet. Upload your first medical document to get started.
                      </div>
                    ) : (
                      filteredVisits.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                          data-testid={`row-report-${v.id}`}
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-white/90">{v.title}</div>
                            <div className="mt-1 text-xs text-white/55">
                              {v.source} - Dr. {v.doctorName} - {v.date}
                            </div>
                          </div>
                          <Badge className="border-emerald-300/20 bg-emerald-300/10 text-emerald-100 shrink-0">
                            {v.category}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Category Grid */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {categories.map((c) => {
                const isExpanded = expandedCategory === c.key;
                const categoryVisits = getVisitsByCategory(c.key);
                const count = categoryCounts[c.key] || 0;
                
                return (
                  <div key={c.key} className="space-y-2">
                    <div
                      onClick={() => setExpandedCategory(isExpanded ? null : c.key)}
                      data-testid={`button-folder-${c.key}`}
                      className={[
                        "group relative overflow-hidden rounded-2xl border p-4 text-left transition cursor-pointer",
                        "bg-white/5 backdrop-blur-xl",
                        isExpanded ? "border-cyan-300/40 bg-white/8" : "border-white/10 hover:bg-white/7 hover:border-cyan-300/25",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={[
                            "grid size-11 place-items-center rounded-xl border bg-white/6",
                            isExpanded ? "border-cyan-300/40 text-cyan-200" : "border-white/10 text-white/70 group-hover:border-cyan-300/25 group-hover:text-cyan-200",
                          ].join(" ")}
                        >
                          {c.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-white/90" data-testid={`text-folder-title-${c.key}`}>
                              {c.title}
                            </div>
                            {count > 0 && (
                              <Badge className="border-cyan-300/20 bg-cyan-300/10 text-cyan-100 text-xs">
                                {count}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-white/55" data-testid={`text-folder-subtitle-${c.key}`}>
                            {c.subtitle}
                          </div>
                        </div>
                        <ChevronDown 
                          className={[
                            "ml-auto size-4 text-white/35 transition-transform",
                            isExpanded ? "rotate-180 text-cyan-400" : "group-hover:text-cyan-400"
                          ].join(" ")} 
                        />
                      </div>

                      <div
                        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                        style={{
                          background:
                            "radial-gradient(900px 240px at 20% 0%, rgba(0,230,255,.10), rgba(140,80,255,.06), rgba(0,0,0,0))",
                        }}
                        aria-hidden="true"
                      />
                    </div>

                    {/* Expanded Reports List */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="rounded-2xl border border-cyan-300/20 bg-black/30 p-4"
                      >
                        {categoryVisits.length === 0 ? (
                          <div className="text-sm text-white/55 text-center py-4">
                            No reports in this category yet.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {categoryVisits.map((v) => (
                              <div
                                key={v.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                                data-testid={`row-category-report-${v.id}`}
                              >
                                <div className="min-w-0">
                                  <div className="truncate text-sm text-white/90">{v.title}</div>
                                  <div className="text-xs text-white/50">
                                    {v.source} - {v.date}
                                  </div>
                                </div>
                                <Badge className="border-emerald-300/20 bg-emerald-300/10 text-emerald-100 text-xs shrink-0">
                                  {v.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Chip
                label="Consent-controlled"
                accent="cyan"
                icon={<ShieldCheck className="size-4" strokeWidth={2.1} />}
                testId="chip-consent"
              />
              <Chip
                label="AI dual summaries"
                accent="violet"
                icon={<BadgeCheck className="size-4" strokeWidth={2.1} />}
                testId="chip-ai"
              />
            </div>

            <div className="mt-10">
              <Card className="border-white/10 bg-white/5 p-6 backdrop-blur-xl" data-testid="card-family-tree">
                <FamilyTree patientId={patientId} />
              </Card>
            </div>
          </section>

          <aside className="space-y-6">
            <Card className="border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white" data-testid="text-access-title">
                    Doctor access
                  </div>
                  <div className="mt-1 text-xs text-white/55" data-testid="text-access-subtitle">
                    Granted to {grantedCount} of {doctors.length}
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                  <ShieldCheck className="size-4 text-cyan-200" strokeWidth={2.2} />
                  Consent
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {doctors.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center text-sm text-white/60">
                    No doctors registered yet. Create demo data to see doctors.
                  </div>
                ) : (
                  doctors.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-2xl border border-white/10 bg-black/20 p-4"
                      data-testid={`card-doctor-${d.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white/90" data-testid={`text-doctor-name-${d.id}`}>
                            {d.name}
                          </div>
                          <div className="mt-1 text-xs text-white/55" data-testid={`text-doctor-meta-${d.id}`}>
                            {d.specialty}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={d.granted}
                            onCheckedChange={() => handleToggleAccess(d.id, d.granted)}
                            data-testid={`switch-access-${d.id}`}
                          />
                        </div>
                      </div>
                      
                      {d.granted && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-white/55">Share family history</div>
                            <Switch
                              checked={d.canSeeFamily}
                              onCheckedChange={() => handleToggleFamilyAccess(d.id, d.canSeeFamily)}
                              data-testid={`switch-family-${d.id}`}
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs text-white/55" data-testid={`text-doctor-access-${d.id}`}>
                          {d.granted ? (d.canSeeFamily ? "Full access" : "Reports only") : "No access"}
                        </div>
                        <Badge
                          data-testid={`badge-doctor-access-${d.id}`}
                          className={
                            d.granted
                              ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                              : "border-white/10 bg-white/5 text-white/60"
                          }
                        >
                          {d.granted ? "Granted" : "Revoked"}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white" data-testid="text-metrics-title">
                    Health metrics
                  </div>
                  <div className="mt-1 text-xs text-white/55" data-testid="text-metrics-subtitle">
                    Today’s snapshot (mock)
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                  <HeartPulse className="size-4 text-emerald-200" strokeWidth={2.2} />
                  Stable
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div data-testid="metric-heart-rate">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <div className="inline-flex items-center gap-2">
                      <HeartPulse className="size-4 text-cyan-200" strokeWidth={2.2} />
                      Heart rate
                    </div>
                    <div className="text-white/80" data-testid="text-heart-rate-value">
                      72 bpm
                    </div>
                  </div>
                  <Progress value={72} className="mt-2 h-2 bg-white/5" />
                </div>

                <div data-testid="metric-blood-pressure">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <div className="inline-flex items-center gap-2">
                      <Waves className="size-4 text-violet-200" strokeWidth={2.2} />
                      Blood pressure
                    </div>
                    <div className="text-white/80" data-testid="text-blood-pressure-value">
                      118 / 76
                    </div>
                  </div>
                  <Progress value={68} className="mt-2 h-2 bg-white/5" />
                </div>

                <div data-testid="metric-spo2">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <div className="inline-flex items-center gap-2">
                      <Waves className="size-4 text-emerald-200" strokeWidth={2.2} />
                      SpO₂
                    </div>
                    <div className="text-white/80" data-testid="text-spo2-value">
                      98%
                    </div>
                  </div>
                  <Progress value={98} className="mt-2 h-2 bg-white/5" />
                </div>

                <div data-testid="metric-temperature">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <div className="inline-flex items-center gap-2">
                      <Thermometer className="size-4 text-amber-200" strokeWidth={2.2} />
                      Temperature
                    </div>
                    <div className="text-white/80" data-testid="text-temperature-value">
                      36.8°C
                    </div>
                  </div>
                  <Progress value={74} className="mt-2 h-2 bg-white/5" />
                </div>
              </div>

              <Separator className="my-5 bg-white/10" />

              <div className="grid grid-cols-2 gap-3">
                <Button
                  data-testid="button-view-family-history"
                  variant="secondary"
                  className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                >
                  Family history
                </Button>
                <Button data-testid="button-book-appointment" className="bg-white/10 text-white hover:bg-white/15">
                  Book visit (mock)
                </Button>
              </div>
            </Card>

            <Card className="border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white" data-testid="text-appointments-title">
                    Appointments
                  </div>
                  <div className="mt-1 text-xs text-white/55" data-testid="text-appointments-subtitle">
                    Upcoming (mock)
                  </div>
                </div>
                <Calendar className="size-4 text-white/60" />
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4" data-testid="card-appointment-0">
                  <div className="text-sm font-medium text-white/90" data-testid="text-appointment-title-0">
                    Follow-up · Cardiology
                  </div>
                  <div className="mt-1 text-xs text-white/55" data-testid="text-appointment-meta-0">
                    2026-02-03 · 10:30 · with Dr. A. Patel
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge
                      className="border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                      data-testid="badge-appointment-status-0"
                    >
                      Reminder on
                    </Badge>
                    <Button
                      variant="secondary"
                      className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                      data-testid="button-manage-appointment-0"
                    >
                      Manage
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </aside>
        </motion.div>
      </main>
    </div>
  );
}
