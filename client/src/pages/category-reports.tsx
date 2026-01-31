import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, FileText, Pill, ChevronRight, Upload, Sparkles } from "lucide-react";
import { getVisitsByCategory } from "@/lib/api";
import { format } from "date-fns";

const CATEGORY_TITLES: Record<string, string> = {
  radiology: "Radiology Reports",
  skin: "Skin / Dermatology Reports",
  dermatology: "Skin / Dermatology Reports",
  diabetes: "Diabetes Reports",
  dental: "Dental Reports",
  cardiology: "Cardiology Reports",
  neurology: "Neurology Reports",
  pediatric: "Pediatric Reports",
  pediatrics: "Pediatric Reports",
  ophthalmology: "Ophthalmology Reports",
  orthopedic: "Orthopedic Reports",
  orthopedics: "Orthopedic Reports",
  gastro: "Gastro Reports",
  pathology: "Pathology / Lab Reports",
  general: "General Medicine Reports",
};

const SAMPLE_VISITS: Record<string, Array<{
  id: string;
  doctorName: string;
  hospitalName: string;
  visitDate: string;
  diagnosis: string;
  revisitDate?: string;
}>> = {
  radiology: [
    { id: "rad-1", doctorName: "Dr. Priya Sharma", hospitalName: "Apollo Imaging Center", visitDate: "2026-01-15", diagnosis: "Chest X-Ray - Normal findings" },
    { id: "rad-2", doctorName: "Dr. Rajesh Kumar", hospitalName: "Max Radiology", visitDate: "2025-12-20", diagnosis: "MRI Lumbar Spine - L4-L5 disc bulge", revisitDate: "2026-02-20" },
    { id: "rad-3", doctorName: "Dr. Meena Patel", hospitalName: "Fortis Diagnostics", visitDate: "2025-11-10", diagnosis: "CT Abdomen - No abnormalities detected" },
    { id: "rad-4", doctorName: "Dr. Arun Verma", hospitalName: "AIIMS Imaging", visitDate: "2025-10-05", diagnosis: "Ultrasound Abdomen - Fatty liver grade 1" },
  ],
  skin: [
    { id: "skin-1", doctorName: "Dr. Ram Kumar", hospitalName: "Apollo Dermatology", visitDate: "2026-01-05", diagnosis: "Seborrheic dermatitis - mild" },
    { id: "skin-2", doctorName: "Dr. Neha Singh", hospitalName: "Fortis Skin Center", visitDate: "2025-12-12", diagnosis: "Acne vulgaris - grade 2", revisitDate: "2026-01-12" },
    { id: "skin-3", doctorName: "Dr. Kavita Reddy", hospitalName: "Max Derma Clinic", visitDate: "2025-11-25", diagnosis: "Contact dermatitis - allergic" },
    { id: "skin-4", doctorName: "Dr. Suresh Gupta", hospitalName: "Skin & Hair Clinic", visitDate: "2025-10-18", diagnosis: "Eczema - mild flare" },
  ],
  dermatology: [
    { id: "skin-1", doctorName: "Dr. Ram Kumar", hospitalName: "Apollo Dermatology", visitDate: "2026-01-05", diagnosis: "Seborrheic dermatitis - mild" },
    { id: "skin-2", doctorName: "Dr. Neha Singh", hospitalName: "Fortis Skin Center", visitDate: "2025-12-12", diagnosis: "Acne vulgaris - grade 2", revisitDate: "2026-01-12" },
  ],
  diabetes: [
    { id: "dia-1", doctorName: "Dr. Anand Shah", hospitalName: "Diabetes Care Center", visitDate: "2026-01-20", diagnosis: "Type 2 Diabetes - HbA1c 7.2%", revisitDate: "2026-04-20" },
    { id: "dia-2", doctorName: "Dr. Sunita Joshi", hospitalName: "Apollo Endocrinology", visitDate: "2025-11-15", diagnosis: "Glucose tolerance test - Pre-diabetic" },
    { id: "dia-3", doctorName: "Dr. Vinod Mehta", hospitalName: "Max Diabetes Clinic", visitDate: "2025-09-10", diagnosis: "Annual diabetes review - Well controlled" },
  ],
  cardiology: [
    { id: "card-1", doctorName: "Dr. Vikram Patel", hospitalName: "Pulse Heart Institute", visitDate: "2026-01-10", diagnosis: "ECG - Normal sinus rhythm" },
    { id: "card-2", doctorName: "Dr. Rekha Menon", hospitalName: "Apollo Cardiology", visitDate: "2025-12-01", diagnosis: "Echocardiogram - Normal LV function", revisitDate: "2026-06-01" },
    { id: "card-3", doctorName: "Dr. Sanjay Kapoor", hospitalName: "Fortis Heart Center", visitDate: "2025-10-20", diagnosis: "Stress test - No ischemic changes" },
  ],
  dental: [
    { id: "dent-1", doctorName: "Dr. Anil Sharma", hospitalName: "SmileCare Dental", visitDate: "2026-01-08", diagnosis: "Dental checkup - Cavity filling done" },
    { id: "dent-2", doctorName: "Dr. Priya Malhotra", hospitalName: "Apollo Dental", visitDate: "2025-11-20", diagnosis: "Teeth scaling and polishing", revisitDate: "2026-05-20" },
    { id: "dent-3", doctorName: "Dr. Ravi Kumar", hospitalName: "MaxCare Dental", visitDate: "2025-09-15", diagnosis: "Root canal treatment - molar" },
  ],
  neurology: [
    { id: "neuro-1", doctorName: "Dr. Ashok Nair", hospitalName: "NeuroLife Center", visitDate: "2026-01-12", diagnosis: "Migraine - chronic episodic" },
    { id: "neuro-2", doctorName: "Dr. Madhuri Rao", hospitalName: "Apollo Neurology", visitDate: "2025-12-05", diagnosis: "EEG - Normal findings", revisitDate: "2026-03-05" },
  ],
  orthopedic: [
    { id: "ortho-1", doctorName: "Dr. Sunil Kapoor", hospitalName: "BoneHealth Clinic", visitDate: "2026-01-18", diagnosis: "Lower back pain - lumbar strain" },
    { id: "ortho-2", doctorName: "Dr. Geeta Sharma", hospitalName: "Apollo Orthopedics", visitDate: "2025-11-28", diagnosis: "Knee pain - early osteoarthritis", revisitDate: "2026-02-28" },
  ],
  orthopedics: [
    { id: "ortho-1", doctorName: "Dr. Sunil Kapoor", hospitalName: "BoneHealth Clinic", visitDate: "2026-01-18", diagnosis: "Lower back pain - lumbar strain" },
  ],
  pediatric: [
    { id: "ped-1", doctorName: "Dr. Lakshmi Iyer", hospitalName: "Rainbow Children's", visitDate: "2026-01-22", diagnosis: "Routine vaccination - 12 months" },
    { id: "ped-2", doctorName: "Dr. Rohit Saxena", hospitalName: "Apollo Pediatrics", visitDate: "2025-12-10", diagnosis: "Upper respiratory infection - viral" },
  ],
  pediatrics: [
    { id: "ped-1", doctorName: "Dr. Lakshmi Iyer", hospitalName: "Rainbow Children's", visitDate: "2026-01-22", diagnosis: "Routine vaccination - 12 months" },
  ],
  ophthalmology: [
    { id: "eye-1", doctorName: "Dr. Anjali Bose", hospitalName: "Eye Care Center", visitDate: "2026-01-14", diagnosis: "Myopia - Updated prescription" },
    { id: "eye-2", doctorName: "Dr. Ramesh Gupta", hospitalName: "Apollo Eye Hospital", visitDate: "2025-10-25", diagnosis: "Dry eyes - Mild" },
  ],
  gastro: [
    { id: "gastro-1", doctorName: "Dr. Vijay Kumar", hospitalName: "GastroHealth Clinic", visitDate: "2026-01-16", diagnosis: "GERD - Mild reflux disease" },
    { id: "gastro-2", doctorName: "Dr. Sheela Nair", hospitalName: "Apollo Gastro", visitDate: "2025-11-30", diagnosis: "Endoscopy - Normal findings" },
  ],
  pathology: [
    { id: "path-1", doctorName: "Dr. Kiran Patel", hospitalName: "LabCare Diagnostics", visitDate: "2026-01-25", diagnosis: "Complete blood count - Normal" },
    { id: "path-2", doctorName: "Dr. Suresh Menon", hospitalName: "Apollo Labs", visitDate: "2025-12-15", diagnosis: "Lipid profile - Borderline high LDL" },
  ],
  general: [
    { id: "gen-1", doctorName: "Dr. Amit Verma", hospitalName: "Family Health Clinic", visitDate: "2026-01-28", diagnosis: "Annual health checkup - All normal" },
    { id: "gen-2", doctorName: "Dr. Pooja Sharma", hospitalName: "Apollo General", visitDate: "2025-11-20", diagnosis: "Seasonal flu - Viral fever" },
  ],
};

export default function CategoryReportsPage() {
  const params = useParams();
  const category = params.category as string;
  
  const patientId = "patient-1";

  const { data: visits, isLoading } = useQuery({
    queryKey: ["visits", "category", patientId, category],
    queryFn: () => getVisitsByCategory(patientId, category),
  });

  const categoryTitle = CATEGORY_TITLES[category] || `${category} Reports`;
  
  const sampleVisits = SAMPLE_VISITS[category] || [];
  const displayVisits = visits && visits.length > 0 ? visits : sampleVisits;
  const isUsingSampleData = !visits || visits.length === 0;

  return (
    <div className="min-h-screen ms-grid-bg ms-noise relative">
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(210_72%_8%)] via-[hsl(190_100%_6%)] to-[hsl(200_82%_10%)] pointer-events-none opacity-80" />
      
      <div className="relative z-10 px-6 py-8 max-w-7xl mx-auto">
        <Link href="/patient" data-testid="link-back-dashboard">
          <button className="mb-6 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 ms-glow transition-all flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </Link>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-5xl font-bold mb-2" style={{ fontFamily: "Oxanium" }}>
              {categoryTitle}
            </h1>
            <p className="text-white/60">Your medical visit history for {category}</p>
            {isUsingSampleData && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-400/20">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-amber-300">Showing sample data - Upload reports to see your real visits</span>
              </div>
            )}
          </div>
          <Link href="/patient">
            <button className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 transition-colors flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload Report
            </button>
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
            <p className="mt-4 text-white/60">Loading visits...</p>
          </div>
        ) : displayVisits.length > 0 ? (
          <div className="grid gap-4">
            {displayVisits.map((visit: any) => (
              <Link key={visit.id} href={isUsingSampleData ? "#" : `/visit/${visit.id}`} data-testid={`link-visit-${visit.id}`}>
                <div className={`p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-400/30 transition-all cursor-pointer group ${isUsingSampleData ? "opacity-80" : ""}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-400/30">
                          <FileText className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold" data-testid={`text-doctor-${visit.id}`}>{visit.doctorName}</h3>
                          <p className="text-sm text-white/60">{visit.hospitalName}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-white/40" />
                          <span>{format(new Date(visit.visitDate), "MMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Pill className="w-4 h-4 text-white/40" />
                          <span className="text-white/80">{visit.diagnosis}</span>
                        </div>
                      </div>

                      {visit.revisitDate && (
                        <div className="mt-3 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-400/20 inline-block">
                          <span className="text-sm text-amber-400">Follow-up: {format(new Date(visit.revisitDate), "MMM d, yyyy")}</span>
                        </div>
                      )}
                    </div>

                    {!isUsingSampleData && (
                      <ChevronRight className="w-6 h-6 text-white/40 group-hover:text-cyan-400 transition-colors" />
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-6 rounded-2xl bg-white/5 border border-white/10">
            <FileText className="w-16 h-16 mx-auto mb-4 text-white/20" />
            <h3 className="text-xl font-semibold mb-2">No visits found</h3>
            <p className="text-white/60 max-w-md mx-auto">
              You haven't uploaded any {category} reports yet. Upload a prescription or report to get started.
            </p>
            <Link href="/patient">
              <button className="mt-6 px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-600 transition-colors">
                Go to Dashboard
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
