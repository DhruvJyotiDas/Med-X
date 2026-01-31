import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Brain,
  Clipboard,
  FileText,
  Folder,
  Loader2,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { generateAISummary, generateDoctorAISummary, getVisitsByPatient, getReportsByPatient } from "@/lib/api";
import type { Visit, Report } from "@shared/schema";
import { format } from "date-fns";
import jsPDF from "jspdf";

type ScopeMode = "all" | "category" | "selected";

const categories = [
  { key: "dental", label: "Dental" },
  { key: "diabetes", label: "Diabetes / Sugar" },
  { key: "dermatology", label: "Dermatology" },
  { key: "skin", label: "Skin" },
  { key: "radiology", label: "Radiology" },
  { key: "cardiology", label: "Cardiology" },
  { key: "neurology", label: "Neurology" },
  { key: "orthopedics", label: "Orthopedics" },
  { key: "orthopedic", label: "Orthopedic" },
  { key: "pathology", label: "Pathology / Lab" },
  { key: "pediatrics", label: "Pediatrics" },
  { key: "pediatric", label: "Pediatric" },
  { key: "ophthalmology", label: "Ophthalmology" },
  { key: "gastro", label: "Gastroenterology" },
  { key: "general", label: "General Medicine" },
] as const;

function formatDateISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function downloadPdf(opts: {
  patientName: string;
  patientId: string;
  scopeLabel: string;
  generatedAt: string;
  lines: string[];
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 52;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const drawHeader = () => {
    doc.setFillColor(10, 12, 20);
    doc.rect(0, 0, pageW, 82, "F");
    doc.setTextColor(225, 245, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("MEDISPACE · AI HEALTH SUMMARY", margin, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(170, 195, 210);
    doc.text("Powered by Gemini AI", margin, 62);
    doc.setDrawColor(40, 70, 80);
    doc.setLineWidth(1);
    doc.line(margin, 92, pageW - margin, 92);
  };

  const drawFooter = (pageNum: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(140, 160, 175);
    doc.text(`Generated: ${opts.generatedAt}`, margin, pageH - 28);
    doc.text(`Page ${pageNum}`, pageW - margin, pageH - 28, { align: "right" });
  };

  drawHeader();
  let y = 118;
  const lineH = 14;

  const sectionTitle = (t: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(210, 235, 245);
    doc.text(t.toUpperCase(), margin, y);
    y += 12;
    doc.setDrawColor(40, 70, 80);
    doc.setLineWidth(1);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(190, 210, 225);
  };

  const addKeyValue = (k: string, v: string) => {
    const kW = 130;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(190, 210, 225);
    doc.text(k, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(215, 235, 245);
    const wrapped = doc.splitTextToSize(v, pageW - margin * 2 - kW);
    doc.text(wrapped, margin + kW, y);
    y += wrapped.length * lineH;
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 54) {
      const pageNum = doc.getNumberOfPages();
      drawFooter(pageNum);
      doc.addPage();
      drawHeader();
      y = 118;
    }
  };

  sectionTitle("Patient details");
  ensureSpace(60);
  addKeyValue("Patient", opts.patientName);
  addKeyValue("Patient ID", opts.patientId);
  addKeyValue("Scope", opts.scopeLabel);

  y += 6;
  ensureSpace(50);

  sectionTitle("AI summary");
  ensureSpace(40);

  doc.setTextColor(215, 235, 245);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  for (const line of opts.lines) {
    const wrapped = doc.splitTextToSize(line, pageW - margin * 2);
    ensureSpace(wrapped.length * lineH + 12);
    doc.text(wrapped, margin, y);
    y += wrapped.length * lineH;
    y += 6;
  }

  drawFooter(doc.getNumberOfPages());
  doc.save(`MediSpace_AI_Summary_${opts.patientId}_${opts.generatedAt}.pdf`);
}

export default function AiSummaryPage() {
  const { toast } = useToast();

  // Get current user from session
  const [currentUser, setCurrentUser] = useState<{ id: string; fullName: string; role: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("medispace_user");
    if (stored) {
      setCurrentUser(JSON.parse(stored));
    } else {
      window.location.href = "/auth";
    }
  }, []);

  const isDoctor = currentUser?.role === "doctor";
  const patientId = isDoctor ? "" : (currentUser?.id || "");

  const [scopeMode, setScopeMode] = useState<ScopeMode>("all");
  const [category, setCategory] = useState<string>("radiology");
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [clinicalMode, setClinicalMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>("");

  // Fetch patient's reports
  const { data: reports = [] } = useQuery({
    queryKey: ["patient-reports", patientId],
    queryFn: () => getReportsByPatient(patientId),
    enabled: !!patientId && !isDoctor,
  });

  // Fetch patient's visits
  const { data: visits = [] } = useQuery({
    queryKey: ["patient-visits", patientId],
    queryFn: () => getVisitsByPatient(patientId),
    enabled: !!patientId && !isDoctor,
  });

  const scopeLabel = useMemo(() => {
    if (scopeMode === "all") return "All reports";
    if (scopeMode === "category") {
      const found = categories.find((c) => c.key === category)?.label ?? "Category";
      return `Category: ${found}`;
    }
    return `${selectedReportIds.length} selected report(s)`;
  }, [scopeMode, category, selectedReportIds]);

  const runAnalysis = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    setSummary("");
    setGeneratedAt(null);

    try {
      let result;
      
      if (isDoctor) {
        // Doctors shouldn't use this page directly - redirect to doctor dashboard
        toast({
          title: "Use Doctor Dashboard",
          description: "Please select a patient from your dashboard to generate summaries.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      result = await generateAISummary({
        patientId: currentUser.id,
        scope: scopeMode === "selected" ? "selected" : scopeMode,
        mode: clinicalMode ? "clinical" : "patient",
        category: scopeMode === "category" ? category : undefined,
        reportIds: scopeMode === "selected" ? selectedReportIds : undefined,
      });

      setSummary(result.summary);
      setGeneratedAt(formatDateISO(new Date()));

      toast({
        title: "AI Summary Generated",
        description: `Analyzed ${result.visitCount} medical records using Gemini AI.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to generate summary",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportPdf = () => {
    if (!generatedAt || !currentUser) return;
    downloadPdf({
      patientName: currentUser.fullName,
      patientId: currentUser.id,
      scopeLabel,
      generatedAt,
      lines: summary.split("\n").filter(l => l.trim()),
    });
  };

  const toggleReportSelection = (reportId: string) => {
    setSelectedReportIds((prev) =>
      prev.includes(reportId)
        ? prev.filter((id) => id !== reportId)
        : [...prev, reportId]
    );
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
            <Brain className="size-5 text-cyan-200" strokeWidth={2.2} />
          </div>
          <div>
            <div className="font-serif text-sm tracking-[0.18em] text-white/90" data-testid="text-ai-brand">
              MEDISPACE
            </div>
            <div className="mt-0.5 text-xs text-white/55" data-testid="text-ai-subbrand">
              AI Health Summary · Powered by Gemini
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="border-white/10 bg-white/5 text-white/70">
            {currentUser.fullName}
          </Badge>
          <Button
            variant="secondary"
            data-testid="button-ai-back"
            className="border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
            onClick={() => (window.location.href = isDoctor ? "/doctor" : "/patient")}
          >
            Back
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          className="grid grid-cols-1 gap-8 lg:grid-cols-[420px_1fr]"
        >
          <aside className="space-y-6">
            <Card className="border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white" data-testid="text-scope-title">
                    Analysis Scope
                  </div>
                  <div className="mt-1 text-xs text-white/55" data-testid="text-scope-subtitle">
                    Choose which reports the AI should analyze.
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                  <Sparkles className="size-4 text-cyan-200" strokeWidth={2.2} />
                  Gemini AI
                </div>
              </div>

              <div className="mt-4">
                <Tabs value={scopeMode} onValueChange={(v) => setScopeMode(v as ScopeMode)} data-testid="tabs-scope">
                  <TabsList className="grid w-full grid-cols-3 bg-white/5">
                    <TabsTrigger value="all" data-testid="tab-scope-all">
                      All
                    </TabsTrigger>
                    <TabsTrigger value="category" data-testid="tab-scope-category">
                      Category
                    </TabsTrigger>
                    <TabsTrigger value="selected" data-testid="tab-scope-selected">
                      Selected
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="mt-4">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4" data-testid="panel-scope-all">
                      <div className="flex items-center gap-2 text-xs text-white/60">
                        <Folder className="size-4 text-white/60" strokeWidth={2.2} />
                        Analyze all {visits.length} reports in your record.
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="category" className="mt-4">
                    <div className="space-y-3" data-testid="panel-scope-category">
                      <div className="text-xs text-white/60">Select category</div>
                      <Select value={category} onValueChange={(v) => setCategory(v)}>
                        <SelectTrigger className="border-white/10 bg-white/5 text-white" data-testid="select-category">
                          <SelectValue placeholder="Choose category" />
                        </SelectTrigger>
                        <SelectContent className="border-white/10 bg-[hsl(var(--card))]">
                          {categories.map((c) => (
                            <SelectItem key={c.key} value={c.key} data-testid={`option-category-${c.key}`}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/60">
                        AI will generate a focused summary for {categories.find(c => c.key === category)?.label || category} reports only.
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="selected" className="mt-4">
                    <div className="space-y-3" data-testid="panel-scope-selected">
                      <div className="text-xs text-white/60">Select specific reports ({selectedReportIds.length} selected)</div>
                      <div className="max-h-60 overflow-y-auto space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                        {reports.length === 0 ? (
                          <div className="text-xs text-white/50 text-center py-4">
                            No reports uploaded yet.
                          </div>
                        ) : (
                          reports.map((r: Report) => (
                            <label
                              key={r.id}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                            >
                              <Checkbox
                                checked={selectedReportIds.includes(r.id)}
                                onCheckedChange={() => toggleReportSelection(r.id)}
                                data-testid={`checkbox-report-${r.id}`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-white/80 truncate">{r.fileName}</div>
                                <div className="text-xs text-white/50">{r.category}</div>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/60">
                        AI will only analyze the selected documents.
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <Separator className="my-5 bg-white/10" />

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={runAnalysis}
                  disabled={loading || (scopeMode === "selected" && selectedReportIds.length === 0)}
                  data-testid="button-generate-summary"
                  className="bg-gradient-to-b from-cyan-300/90 to-cyan-500/80 text-black hover:from-cyan-200/90 hover:to-cyan-400/90"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Generate
                    </>
                  )}
                </Button>
                <Button
                  onClick={exportPdf}
                  disabled={!generatedAt}
                  data-testid="button-download-pdf"
                  className="bg-white/10 text-white hover:bg-white/15"
                >
                  <Clipboard className="size-4" />
                  Download PDF
                </Button>
              </div>
            </Card>

            {/* Role-based output controls - Clinical toggle only for context */}
            <Card className="border-white/10 bg-white/5 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white" data-testid="text-output-title">
                    Summary Style
                  </div>
                  <div className="mt-1 text-xs text-white/55" data-testid="text-output-subtitle">
                    Choose the output format.
                  </div>
                </div>
                <ShieldCheck className="size-4 text-white/60" />
              </div>

              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-white/60" data-testid="text-style-label">
                        {isDoctor ? "Clinical Summary" : "Detailed Summary"}
                      </div>
                      <div className="mt-1 text-xs text-white/45">
                        {isDoctor 
                          ? "Use medical terminology and clinical correlations."
                          : "Include more detailed health information."
                        }
                      </div>
                    </div>
                    <Switch
                      checked={clinicalMode}
                      onCheckedChange={(v) => setClinicalMode(!!v)}
                      data-testid="switch-clinical"
                    />
                  </div>
                </div>

                <div className="text-xs text-white/45 px-2">
                  {clinicalMode 
                    ? "Output will include medical terminology, risk factors, and clinical recommendations."
                    : "Output will be in simple, easy-to-understand language."
                  }
                </div>
              </div>
            </Card>
          </aside>

          <section className="space-y-6">
            <Card className="border-white/10 bg-white/5 p-6 backdrop-blur-xl min-h-[400px]">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-cyan-200">
                    <Brain className="size-5" strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white" data-testid="text-result-title">
                      AI Health Summary
                    </div>
                    <div className="text-xs text-white/55">
                      {generatedAt ? `Generated: ${generatedAt}` : "Click Generate to analyze your records"}
                    </div>
                  </div>
                </div>
                {generatedAt && (
                  <Badge className="border-emerald-300/25 bg-emerald-300/10 text-emerald-100">
                    <BadgeCheck className="size-3 mr-1" />
                    Complete
                  </Badge>
                )}
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-white/10 rounded-full" />
                    <div className="absolute inset-0 w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <div className="mt-6 text-sm text-white/70">Analyzing your medical records...</div>
                  <div className="mt-2 text-xs text-white/45">This may take a moment</div>
                </div>
              ) : summary ? (
                <div className="prose prose-invert prose-sm max-w-none" data-testid="text-ai-output">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <div className="whitespace-pre-wrap text-white/85 leading-relaxed">
                      {summary}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="w-16 h-16 text-white/15 mb-4" />
                  <div className="text-white/60">No summary generated yet</div>
                  <div className="mt-2 text-xs text-white/40 max-w-sm">
                    Select your analysis scope and click "Generate" to create an AI-powered health summary from your medical records.
                  </div>
                </div>
              )}
            </Card>
          </section>
        </motion.div>
      </main>
    </div>
  );
}
