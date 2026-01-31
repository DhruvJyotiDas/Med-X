import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, Building2, Stethoscope, Pill, FileText, Download, Sparkles } from "lucide-react";
import { getVisitDetails } from "@/lib/api";
import { format } from "date-fns";
import jsPDF from "jspdf";

export default function VisitDetailPage() {
  const params = useParams();
  const visitId = params.visitId as string;

  const { data, isLoading } = useQuery({
    queryKey: ["visit", visitId],
    queryFn: () => getVisitDetails(visitId),
  });

  const visit = data?.visit;
  const prescriptions = data?.prescriptions || [];

  const handleDownloadOriginal = () => {
    if (!visit) return;
    // In a real implementation, this would download the original uploaded file
    alert("Original prescription download (would fetch from fileUrl in database)");
  };

  const handleDownloadAIFormatted = () => {
    if (!visit || !prescriptions) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = margin;

    doc.setFontSize(20);
    doc.text("Medical Prescription Report", margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${format(new Date(), "MMM d, yyyy 'at' h:mm a")}`, margin, y);
    y += 15;

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Visit Details", margin, y);
    y += 8;

    doc.setFontSize(11);
    doc.text(`Doctor: ${visit.doctorName}`, margin, y);
    y += 6;
    doc.text(`Hospital: ${visit.hospitalName}`, margin, y);
    y += 6;
    doc.text(`Date: ${format(new Date(visit.visitDate), "MMMM d, yyyy")}`, margin, y);
    y += 10;

    doc.setFontSize(14);
    doc.text("Diagnosis", margin, y);
    y += 8;
    doc.setFontSize(11);
    const diagnosisLines = doc.splitTextToSize(visit.diagnosis, pageWidth - 2 * margin);
    doc.text(diagnosisLines, margin, y);
    y += diagnosisLines.length * 6 + 10;

    if (prescriptions.length > 0) {
      doc.setFontSize(14);
      doc.text("Prescribed Medications", margin, y);
      y += 8;

      prescriptions.forEach((med, idx) => {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`${idx + 1}. ${med.medicationName}`, margin, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.text(`   Dosage: ${med.dosage}`, margin, y);
        y += 5;
        doc.text(`   Duration: ${med.duration}`, margin, y);
        y += 5;
        if (med.instructions) {
          const instructionLines = doc.splitTextToSize(`   Instructions: ${med.instructions}`, pageWidth - 2 * margin);
          doc.text(instructionLines, margin, y);
          y += instructionLines.length * 5;
        }
        y += 5;

        if (y > 270) {
          doc.addPage();
          y = margin;
        }
      });
    }

    if (visit.instructions) {
      y += 5;
      doc.setFontSize(14);
      doc.text("General Instructions", margin, y);
      y += 8;
      doc.setFontSize(11);
      const instructionLines = doc.splitTextToSize(visit.instructions, pageWidth - 2 * margin);
      doc.text(instructionLines, margin, y);
      y += instructionLines.length * 6 + 10;
    }

    if (visit.aiSummary) {
      y += 5;
      doc.setFontSize(14);
      doc.text("AI Summary", margin, y);
      y += 8;
      doc.setFontSize(11);
      const summaryLines = doc.splitTextToSize(visit.aiSummary, pageWidth - 2 * margin);
      doc.text(summaryLines, margin, y);
    }

    if (visit.revisitDate) {
      y += 10;
      doc.setFontSize(12);
      doc.setTextColor(200, 100, 0);
      doc.text(`Follow-up Date: ${format(new Date(visit.revisitDate), "MMMM d, yyyy")}`, margin, y);
    }

    doc.save(`prescription-${visit.doctorName.replace(/\s+/g, "-")}-${format(new Date(visit.visitDate), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="min-h-screen ms-grid-bg ms-noise relative">
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(210_72%_8%)] via-[hsl(190_100%_6%)] to-[hsl(200_82%_10%)] pointer-events-none opacity-80" />
      
      <div className="relative z-10 px-6 py-8 max-w-5xl mx-auto">
        <button 
          onClick={() => window.history.back()}
          className="mb-6 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 ms-glow transition-all flex items-center gap-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
            <p className="mt-4 text-white/60">Loading visit details...</p>
          </div>
        ) : visit ? (
          <div className="space-y-6">
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <h1 className="text-4xl font-bold mb-6" style={{ fontFamily: "Oxanium" }} data-testid="text-visit-title">
                Medical Visit Details
              </h1>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-400/30">
                    <Stethoscope className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white/60">Doctor</p>
                    <p className="text-lg font-semibold" data-testid="text-doctor-name">{visit.doctorName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-400/30">
                    <Building2 className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white/60">Hospital</p>
                    <p className="text-lg font-semibold" data-testid="text-hospital-name">{visit.hospitalName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-400/30">
                    <Calendar className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm text-white/60">Visit Date</p>
                    <p className="text-lg font-semibold">{format(new Date(visit.visitDate), "MMMM d, yyyy")}</p>
                  </div>
                </div>

                {visit.revisitDate && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-400/30">
                      <Calendar className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm text-white/60">Follow-up Date</p>
                      <p className="text-lg font-semibold text-amber-400">{format(new Date(visit.revisitDate), "MMMM d, yyyy")}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  Diagnosis
                </h3>
                <p className="text-white/80 leading-relaxed" data-testid="text-diagnosis">{visit.diagnosis}</p>
                {visit.symptoms && (
                  <div className="mt-3">
                    <p className="text-sm text-white/60">Symptoms:</p>
                    <p className="text-white/80">{visit.symptoms}</p>
                  </div>
                )}
              </div>

              {prescriptions.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Pill className="w-5 h-5 text-cyan-400" />
                    Prescribed Medications
                  </h3>
                  <div className="space-y-4">
                    {prescriptions.map((med, idx) => (
                      <div key={med.id} className="p-4 rounded-xl bg-white/5 border border-white/10" data-testid={`med-${idx}`}>
                        <h4 className="font-semibold text-lg mb-2">{idx + 1}. {med.medicationName}</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-white/60">Dosage:</span>
                            <span className="ml-2 text-white/90">{med.dosage}</span>
                          </div>
                          <div>
                            <span className="text-white/60">Duration:</span>
                            <span className="ml-2 text-white/90">{med.duration}</span>
                          </div>
                        </div>
                        {med.instructions && (
                          <p className="mt-2 text-sm text-white/70">
                            <span className="text-white/60">Instructions:</span> {med.instructions}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {visit.instructions && (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-3">General Instructions</h3>
                  <p className="text-white/80 leading-relaxed">{visit.instructions}</p>
                </div>
              )}

              {visit.aiSummary && (
                <div className="p-6 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-400/30">
                  <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    AI Summary
                  </h3>
                  <p className="text-white/80 leading-relaxed">{visit.aiSummary}</p>
                </div>
              )}
            </div>

            <div className="flex gap-4 flex-wrap">
              <button
                onClick={handleDownloadOriginal}
                className="px-6 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-2"
                data-testid="button-download-original"
              >
                <Download className="w-4 h-4" />
                Download Original Prescription
              </button>

              <button
                onClick={handleDownloadAIFormatted}
                className="px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-600 transition-all flex items-center gap-2"
                data-testid="button-download-ai"
              >
                <Download className="w-4 h-4" />
                Download AI-Formatted PDF
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 mx-auto mb-4 text-white/20" />
            <h3 className="text-xl font-semibold mb-2">Visit not found</h3>
            <Link href="/patient">
              <button className="mt-4 px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-600 transition-colors">
                Go to Dashboard
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
