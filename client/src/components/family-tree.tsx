import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Pencil, X, Check, AlertTriangle, TrendingUp, Sparkles, User, Users } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createFamilyHistory, updateFamilyHistory, deleteFamilyHistory, getFamilyHistory, getGeneticRiskPrediction, type GeneticRiskPrediction } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface FamilyMember {
  id: string;
  condition: string;
  relation: string;
  notes?: string | null;
}

const RELATIONS = [
  { value: "father", label: "Father", generation: 1, position: "left" },
  { value: "mother", label: "Mother", generation: 1, position: "right" },
  { value: "grandfather_paternal", label: "Grandfather (Paternal)", generation: 2, position: "far-left" },
  { value: "grandmother_paternal", label: "Grandmother (Paternal)", generation: 2, position: "left" },
  { value: "grandfather_maternal", label: "Grandfather (Maternal)", generation: 2, position: "right" },
  { value: "grandmother_maternal", label: "Grandmother (Maternal)", generation: 2, position: "far-right" },
  { value: "sibling", label: "Sibling", generation: 0, position: "center-left" },
  { value: "child", label: "Child", generation: -1, position: "center" },
  { value: "uncle", label: "Uncle", generation: 1, position: "outer-left" },
  { value: "aunt", label: "Aunt", generation: 1, position: "outer-right" },
];

const CONDITIONS = [
  "Diabetes Type 2",
  "Diabetes Type 1",
  "Heart Disease",
  "Hypertension",
  "Stroke",
  "Cancer (Breast)",
  "Cancer (Colon)",
  "Cancer (Lung)",
  "Cancer (Prostate)",
  "Alzheimer's Disease",
  "Parkinson's Disease",
  "Asthma",
  "Arthritis",
  "Obesity",
  "Mental Health Disorders",
  "Thyroid Disorders",
  "Kidney Disease",
  "Other",
];

const getRelationColor = (relation: string) => {
  if (relation.includes("father") || relation.includes("grandfather_paternal") || relation.includes("grandmother_paternal"))
    return "from-blue-500/20 to-blue-600/10 border-blue-400/30";
  if (relation.includes("mother") || relation.includes("grandfather_maternal") || relation.includes("grandmother_maternal"))
    return "from-pink-500/20 to-pink-600/10 border-pink-400/30";
  if (relation.includes("sibling")) return "from-purple-500/20 to-purple-600/10 border-purple-400/30";
  if (relation.includes("child")) return "from-green-500/20 to-green-600/10 border-green-400/30";
  return "from-cyan-500/20 to-cyan-600/10 border-cyan-400/30";
};

const getRiskColor = (level: string) => {
  if (level === "high") return "text-red-400 bg-red-500/10 border-red-400/30";
  if (level === "moderate") return "text-amber-400 bg-amber-500/10 border-amber-400/30";
  return "text-green-400 bg-green-500/10 border-green-400/30";
};

interface FamilyTreeProps {
  patientId: string;
}

export default function FamilyTree({ patientId }: FamilyTreeProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ condition: "", relation: "", notes: "" });
  const [showRiskAnalysis, setShowRiskAnalysis] = useState(false);

  const { data: familyHistory = [], isLoading } = useQuery({
    queryKey: ["familyHistory", patientId],
    queryFn: () => getFamilyHistory(patientId),
  });

  const { data: riskData, isLoading: riskLoading, refetch: refetchRisk } = useQuery({
    queryKey: ["geneticRisk", patientId],
    queryFn: () => getGeneticRiskPrediction(patientId),
    enabled: showRiskAnalysis && familyHistory.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: (data: { condition: string; relation: string; notes?: string }) =>
      createFamilyHistory({ patientId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyHistory", patientId] });
      toast({ title: "Family member added" });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FamilyMember> }) =>
      updateFamilyHistory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyHistory", patientId] });
      toast({ title: "Family member updated" });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFamilyHistory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyHistory", patientId] });
      toast({ title: "Family member removed" });
    },
  });

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ condition: "", relation: "", notes: "" });
  };

  const handleSubmit = () => {
    if (!formData.condition || !formData.relation) return;
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const startEdit = (member: FamilyMember) => {
    setEditingId(member.id);
    setFormData({
      condition: member.condition,
      relation: member.relation,
      notes: member.notes || "",
    });
    setIsAdding(true);
  };

  const groupedByGeneration = useMemo(() => {
    const groups: Record<number, FamilyMember[]> = { 2: [], 1: [], 0: [], [-1]: [] };
    
    familyHistory.forEach((member: FamilyMember) => {
      const relationConfig = RELATIONS.find(r => r.value === member.relation);
      const gen = relationConfig?.generation ?? 1;
      if (!groups[gen]) groups[gen] = [];
      groups[gen].push(member);
    });
    
    return groups;
  }, [familyHistory]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2" style={{ fontFamily: "Oxanium" }}>
            <Users className="w-5 h-5 text-cyan-400" />
            Family Medical History Tree
          </h3>
          <p className="text-sm text-white/60 mt-1">Interactive tree showing inherited health conditions</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => { setShowRiskAnalysis(!showRiskAnalysis); if (!showRiskAnalysis) refetchRisk(); }}
            variant="outline"
            className="bg-violet-500/10 border-violet-400/30 hover:bg-violet-500/20"
            data-testid="button-risk-analysis"
          >
            <Sparkles className="w-4 h-4 mr-2 text-violet-400" />
            {showRiskAnalysis ? "Hide" : "Show"} AI Risk Analysis
          </Button>
          <Button
            onClick={() => setIsAdding(true)}
            className="bg-cyan-500 hover:bg-cyan-600"
            data-testid="button-add-member"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Family Member
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showRiskAnalysis && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 rounded-2xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-violet-400/30">
              <h4 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-violet-400" />
                Genetic Risk Predictions
              </h4>
              
              {riskLoading ? (
                <div className="flex items-center gap-3 py-4">
                  <div className="w-5 h-5 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                  <span className="text-white/60">Analyzing family history with Gemini AI...</span>
                </div>
              ) : riskData?.predictions && riskData.predictions.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {riskData.predictions.map((prediction: GeneticRiskPrediction, idx: number) => (
                    <motion.div
                      key={prediction.condition}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`p-4 rounded-xl border ${getRiskColor(prediction.riskLevel)}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h5 className="font-semibold">{prediction.condition}</h5>
                          <div className="flex items-center gap-2 mt-1">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-2xl font-bold">{prediction.riskPercentage}%</span>
                            <span className="text-sm opacity-70 capitalize">{prediction.riskLevel} risk</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-xs text-white/50 mb-1">Contributing Factors:</p>
                        <ul className="text-sm space-y-1">
                          {prediction.factors.slice(0, 3).map((factor, i) => (
                            <li key={i} className="text-white/70">• {factor}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <p className="text-xs text-white/50 mb-1">Recommendations:</p>
                        <ul className="text-sm space-y-1">
                          {prediction.recommendations.slice(0, 2).map((rec, i) => (
                            <li key={i} className="text-white/70">• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-white/60 py-4">
                  {familyHistory.length === 0 
                    ? "Add family members to see genetic risk predictions."
                    : "No significant genetic risks detected based on current family history."}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-6 rounded-2xl bg-white/5 border border-white/10"
          >
            <h4 className="text-lg font-semibold mb-4">
              {editingId ? "Edit Family Member" : "Add Family Member"}
            </h4>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm text-white/60 mb-2 block">Relation</label>
                <Select value={formData.relation} onValueChange={(v) => setFormData({ ...formData, relation: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Select relation" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-2 block">Health Condition</label>
                <Select value={formData.condition} onValueChange={(v) => setFormData({ ...formData, condition: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-2 block">Notes (optional)</label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional details..."
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={resetForm} className="hover:bg-white/5">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!formData.condition || !formData.relation || createMutation.isPending || updateMutation.isPending}
                className="bg-cyan-500 hover:bg-cyan-600"
              >
                <Check className="w-4 h-4 mr-2" />
                {editingId ? "Update" : "Add"} Member
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      ) : familyHistory.length === 0 ? (
        <div className="text-center py-12 px-6 rounded-2xl bg-white/5 border border-white/10">
          <Users className="w-12 h-12 mx-auto mb-3 text-white/20" />
          <p className="text-white/60">No family medical history added yet.</p>
          <p className="text-sm text-white/40 mt-1">Add family members to track hereditary conditions.</p>
        </div>
      ) : (
        <div className="relative py-8 min-h-[400px]">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(0,230,255,0.3)" />
                <stop offset="100%" stopColor="rgba(0,230,255,0.1)" />
              </linearGradient>
            </defs>
          </svg>

          <div className="relative z-10 space-y-8">
            {[2, 1, 0, -1].map((gen) => {
              const members = groupedByGeneration[gen] || [];
              if (members.length === 0) return null;
              
              const genLabel = gen === 2 ? "Grandparents" : gen === 1 ? "Parents" : gen === 0 ? "Siblings" : "Children";
              
              return (
                <motion.div
                  key={gen}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (2 - gen) * 0.1 }}
                >
                  <div className="text-xs text-white/40 uppercase tracking-widest mb-3 text-center">{genLabel}</div>
                  <div className="flex flex-wrap justify-center gap-4">
                    {members.map((member: FamilyMember, idx: number) => (
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ scale: 1.05, y: -5 }}
                        className={`relative p-4 rounded-2xl bg-gradient-to-br ${getRelationColor(member.relation)} border backdrop-blur-sm min-w-[180px]`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-white/10">
                            <User className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium capitalize">{member.relation.replace(/_/g, " ")}</p>
                            <p className="text-sm text-white/70 truncate">{member.condition}</p>
                            {member.notes && (
                              <p className="text-xs text-white/50 mt-1 truncate">{member.notes}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(member)}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
                            data-testid={`button-edit-${member.id}`}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(member.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                            data-testid={`button-delete-${member.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        <motion.div
                          className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-gradient-to-b from-current to-transparent opacity-30"
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ delay: 0.3 }}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              );
            })}

            <div className="flex justify-center pt-4">
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="p-4 rounded-full bg-gradient-to-br from-cyan-500/30 to-violet-500/30 border-2 border-cyan-400/50"
              >
                <User className="w-8 h-8 text-cyan-300" />
              </motion.div>
            </div>
            <p className="text-center text-xs text-white/40 uppercase tracking-widest">You</p>
          </div>
        </div>
      )}
    </div>
  );
}
