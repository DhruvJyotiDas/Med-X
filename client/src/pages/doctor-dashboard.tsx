import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Brain,
  ChevronRight,
  FileText,
  Folder,
  HeartPulse,
  Loader2,
  LogOut,
  ShieldCheck,
  ShieldX,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  getDoctorAuthorizedPatients,
  getDoctorPatientVisits,
  getDoctorPatientFamilyHistory,
  generateDoctorAISummary,
  type AuthorizedPatient,
} from "@/lib/api";
import type { Visit, FamilyHistory } from "@shared/schema";
import { format } from "date-fns";

function RiskBadge({ level, testId }: { level: "low" | "moderate" | "high"; testId: string }) {
  const cls =
    level === "low"
      ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
      : level === "moderate"
        ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
        : "border-rose-300/25 bg-rose-300/10 text-rose-100";
  const label = level === "low" ? "Low risk" : level === "moderate" ? "Moderate" : "High risk";
  return (
    <Badge className={cls} data-testid={testId}>
      {label}
    </Badge>
  );
}

export default function DoctorDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current doctor from session
  const [currentUser, setCurrentUser] = useState<{ id: string; fullName: string; role: string } | null>(null);
  
  useEffect(() => {
    const stored = localStorage.getItem("medispace_user");
    if (stored) {
      const user = JSON.parse(stored);
      if (user.role === "doctor") {
        setCurrentUser(user);
      } else {
        window.location.href = "/patient";
      }
    } else {
      window.location.href = "/auth";
    }
  }, []);

  const doctorId = currentUser?.id || "";

  // Fetch authorized patients
  const { data: patients = [], isLoading: loadingPatients } = useQuery({
    queryKey: ["doctor-patients", doctorId],
    queryFn: () => getDoctorAuthorizedPatients(doctorId),
    enabled: !!doctorId,
  });

  const [activePatientId, setActivePatientId] = useState<string>("");
  const [clinicalMode, setClinicalMode] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>("");

  // Set first patient as active when loaded
  useEffect(() => {
    if (patients.length > 0 && !activePatientId) {
      setActivePatientId(patients[0].id);
    }
  }, [patients, activePatientId]);

  const activePatient = useMemo(
    () => patients.find((p) => p.id === activePatientId),
    [patients, activePatientId]
  );

  // Fetch patient visits (ACCESS CONTROLLED)
  const { data: visitsData, isLoading: loadingVisits } = useQuery({
    queryKey: ["doctor-patient-visits", doctorId, activePatientId],
    queryFn: () => getDoctorPatientVisits(doctorId, activePatientId),
    enabled: !!doctorId && !!activePatientId,
  });

  // Fetch patient family history (ACCESS CONTROLLED)
  const { data: familyData, isLoading: loadingFamily } = useQuery({
    queryKey: ["doctor-patient-family", doctorId, activePatientId],
    queryFn: () => getDoctorPatientFamilyHistory(doctorId, activePatientId),
    enabled: !!doctorId && !!activePatientId,
  });

  const visits = visitsData?.visits || [];
  const familyHistory = familyData?.familyHistory || [];
  const canSeeFamilyHistory = familyData?.familyHistoryAuthorized || false;

  // Generate AI summary
  const handleGenerateSummary = async () => {
    if (!activePatientId || !doctorId) return;
    
    setGeneratingSummary(true);
    try {
      const result = await generateDoctorAISummary({
        doctorId,
        patientId: activePatientId,
        scope: "all",
        mode: clinicalMode ? "clinical" : "patient",
      });
      setAiSummary(result.summary);
      toast({
        title: "AI Summary Generated",
        description: `Analyzed ${result.visitCount} reports. ${result.familyHistoryIncluded ? "Family history included." : ""}`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to generate summary",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("medispace_user");
    window.location.href = "/auth";
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center ms-grid-bg ms-noise">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10 ms-grid-bg" />
      <div className="absolute inset-0 -z-10 ms-noise" aria-hidden="true" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-8">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
            <Stethoscope className="size-5 text-cyan-200" strokeWidth={2.2} />
          </div>
          <div>
            <div className="font-serif text-sm tracking-[0.18em] text-white/90" data-testid="text-doctor-brand">
              MEDISPACE
            </div>
            <div className="mt-0.5 text-xs text-white/55" data-testid="text-doctor-subbrand">
              Doctor Dashboard · {currentUser.fullName}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            data-testid="button-doctor-ai"
            className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
            onClick={() => (window.location.href = "/ai")}
          >
            <Brain className="size-4" />
            AI Summary
          </Button>
          <Badge data-testid="badge-role-doctor" className="border-white/10 bg-white/5 text-white/80">
            Doctor
          </Badge>
          <Button
            variant="secondary"
            data-testid="button-doctor-signout"
            className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
            onClick={handleSignOut}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          className="grid grid-cols-1 gap-8 lg:grid-cols-[360px_1fr]"
        >
          <aside>
            <Card className="border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white" data-testid="text-patient-list-title">
                    Authorized Patients
                  </div>
                  <div className="mt-1 text-xs text-white/55" data-testid="text-patient-list-subtitle">
                    Only patients who granted you access appear here.
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                  <ShieldCheck className="size-4 text-cyan-200" strokeWidth={2.2} />
                  Consent-based
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {loadingPatients ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  </div>
                ) : patients.length === 0 ? (
                  <div
                    className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center"
                    data-testid="empty-patients"
                  >
                    <ShieldX className="w-10 h-10 mx-auto mb-3 text-white/30" />
                    <div className="text-sm text-white/65">
                      No patients have granted you access yet.
                    </div>
                    <div className="mt-2 text-xs text-white/45">
                      Patients must explicitly authorize you from their dashboard.
                    </div>
                  </div>
                ) : (
                  patients.map((p) => {
                    const active = p.id === activePatientId;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setActivePatientId(p.id);
                          setAiSummary("");
                        }}
                        data-testid={`button-patient-${p.id}`}
                        className={[
                          "group w-full rounded-2xl border p-4 text-left transition",
                          "bg-black/20",
                          active
                            ? "border-cyan-300/25 shadow-[0_0_0_1px_rgba(0,230,255,.20),0_24px_120px_-84px_rgba(0,230,255,.55)]"
                            : "border-white/10 hover:bg-white/5",
                        ].join(" ")}
                      >
                        <div className="flex items-start gap-3">
                          <div className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/75">
                            <UserRound className="size-5" strokeWidth={2.2} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="truncate text-sm font-medium text-white/90" data-testid={`text-patient-name-${p.id}`}>
                                {p.fullName}
                              </div>
                              <ChevronRight className="size-4 text-white/35 transition group-hover:translate-x-0.5" />
                            </div>
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                              <Badge
                                className="border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                                data-testid={`badge-reports-access-${p.id}`}
                              >
                                Reports: Granted
                              </Badge>
                              <Badge
                                data-testid={`badge-family-access-${p.id}`}
                                className={
                                  p.familyHistoryAccess
                                    ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                                    : "border-white/10 bg-white/5 text-white/60"
                                }
                              >
                                Family: {p.familyHistoryAccess ? "Granted" : "Denied"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <Separator className="my-5 bg-white/10" />

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-white/60" data-testid="text-clinical-mode-label">
                    Clinical Summary Mode
                  </div>
                  <div className="mt-1 text-xs text-white/45" data-testid="text-clinical-mode-sub">
                    Shows detailed medical terminology and correlations.
                  </div>
                </div>
                <Switch
                  checked={clinicalMode}
                  onCheckedChange={(v) => setClinicalMode(!!v)}
                  data-testid="switch-clinical-mode"
                />
              </div>
            </Card>
          </aside>

          <section className="space-y-6">
            <Card className="border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-serif text-sm tracking-[0.14em] text-white/70" data-testid="text-active-patient-kicker">
                    ACTIVE PATIENT
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white" data-testid="text-active-patient-name">
                    {activePatient ? activePatient.fullName : "No patient selected"}
                  </div>
                  <div className="mt-1 text-sm text-white/60" data-testid="text-active-patient-access">
                    {activePatient
                      ? `Reports: Granted · Family History: ${activePatient.familyHistoryAccess ? "Granted" : "Denied"}`
                      : "Select a patient from the list"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleGenerateSummary}
                    disabled={!activePatient || generatingSummary}
                    data-testid="button-generate-ai"
                    className="bg-gradient-to-b from-cyan-300/90 to-cyan-500/80 text-black hover:from-cyan-200/90 hover:to-cyan-400/90"
                  >
                    {generatingSummary ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Brain className="size-4" />
                        Generate AI Summary
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Separator className="my-6 bg-white/10" />

              {activePatient ? (
                <Tabs defaultValue="summary" data-testid="tabs-doctor">
                  <TabsList className="bg-white/5">
                    <TabsTrigger value="summary" data-testid="tab-doctor-summary">
                      AI Summary
                    </TabsTrigger>
                    <TabsTrigger value="reports" data-testid="tab-doctor-reports">
                      Reports ({visits.length})
                    </TabsTrigger>
                    <TabsTrigger value="family" data-testid="tab-doctor-family">
                      Family History
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="summary" className="mt-5">
                    {aiSummary ? (
                      <Card className="border-white/10 bg-black/20 p-5" data-testid="card-ai-summary">
                        <div className="flex items-center gap-2 mb-4 text-xs text-white/60">
                          <Brain className="size-4 text-cyan-200" />
                          AI Health Summary ({clinicalMode ? "Clinical" : "Patient-friendly"})
                        </div>
                        <div className="prose prose-invert prose-sm max-w-none text-white/85 whitespace-pre-wrap" data-testid="text-ai-summary">
                          {aiSummary}
                        </div>
                      </Card>
                    ) : (
                      <div className="rounded-3xl border border-white/10 bg-black/20 p-6 text-center" data-testid="panel-no-summary">
                        <Brain className="w-12 h-12 mx-auto mb-4 text-white/20" />
                        <div className="text-sm text-white/65">
                          Click "Generate AI Summary" to analyze this patient's medical records.
                        </div>
                        <div className="mt-2 text-xs text-white/45">
                          The AI will synthesize all available reports {canSeeFamilyHistory ? "and family history" : "(family history not available)"}.
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="reports" className="mt-5">
                    {loadingVisits ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                      </div>
                    ) : visits.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center">
                        <FileText className="w-10 h-10 mx-auto mb-3 text-white/20" />
                        <div className="text-sm text-white/65">No reports uploaded yet.</div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {visits.map((v: Visit, idx: number) => (
                          <div
                            key={v.id}
                            className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-4"
                            data-testid={`row-doctor-report-${idx}`}
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-white/90" data-testid={`text-doctor-report-title-${idx}`}>
                                {v.diagnosis}
                              </div>
                              <div className="mt-1 text-xs text-white/55" data-testid={`text-doctor-report-meta-${idx}`}>
                                {v.category} · {v.doctorName} · {format(new Date(v.visitDate), "MMM d, yyyy")}
                              </div>
                            </div>
                            <Badge className="border-white/10 bg-white/5 text-white/70">
                              {v.hospitalName}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="family" className="mt-5">
                    {loadingFamily ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                      </div>
                    ) : !canSeeFamilyHistory ? (
                      <Card className="border-white/10 bg-black/20 p-6 text-center" data-testid="card-family-denied">
                        <ShieldX className="w-12 h-12 mx-auto mb-4 text-rose-400/50" />
                        <div className="text-sm text-white/70">
                          Access to family history has been denied.
                        </div>
                        <div className="mt-2 text-xs text-white/45">
                          The patient has not granted you permission to view their family medical history.
                          This is controlled by the patient and can be changed from their dashboard.
                        </div>
                      </Card>
                    ) : familyHistory.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center">
                        <div className="text-sm text-white/65">No family history recorded.</div>
                      </div>
                    ) : (
                      <Card className="border-white/10 bg-black/20 p-5" data-testid="card-family">
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-sm font-medium text-white">Family Medical History</div>
                          <Badge className="border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
                            <ShieldCheck className="size-3 mr-1" />
                            Authorized
                          </Badge>
                        </div>
                        <div className="space-y-3">
                          {familyHistory.map((h: FamilyHistory) => (
                            <div
                              key={h.id}
                              className="rounded-xl border border-white/10 bg-white/5 p-3"
                              data-testid={`row-family-${h.id}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium text-white/90">{h.condition}</div>
                                <Badge className="border-white/10 bg-white/5 text-white/70">
                                  {h.relation}
                                </Badge>
                              </div>
                              {h.notes && (
                                <div className="mt-2 text-xs text-white/55">{h.notes}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="rounded-3xl border border-white/10 bg-black/20 p-8 text-center">
                  <UserRound className="w-12 h-12 mx-auto mb-4 text-white/20" />
                  <div className="text-white/65">Select a patient to view their records.</div>
                </div>
              )}
            </Card>
          </section>
        </motion.div>
      </main>
    </div>
  );
}
