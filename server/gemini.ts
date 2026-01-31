import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface ExtractedReportData {
  category: string;
  doctorName: string;
  hospitalName: string;
  visitDate: string;
  diagnosis: string;
  symptoms?: string;
  medications: Array<{
    name: string;
    dosage: string;
    duration: string;
    instructions?: string;
  }>;
  instructions?: string;
  revisitDate?: string;
}

export async function analyzeReportImage(
  imageBase64: string,
  mimeType: string,
): Promise<ExtractedReportData> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are a medical report analyzer. Extract structured information from this medical prescription/report image.

Identify and extract:
1. Report category (one of: radiology, skin, diabetes, dental, cardiology, neurology, pediatric, ophthalmology, orthopedic, gastro)
2. Doctor name
3. Hospital/Clinic name
4. Date of visit (format: YYYY-MM-DD)
5. Diagnosis/condition
6. Symptoms (if mentioned)
7. Medications prescribed with dosage and duration
8. General instructions
9. Revisit/follow-up date (if mentioned, format: YYYY-MM-DD)

Return the data as valid JSON with this exact structure:
{
  "category": "category name",
  "doctorName": "Dr. Name",
  "hospitalName": "Hospital Name",
  "visitDate": "YYYY-MM-DD",
  "diagnosis": "diagnosis text",
  "symptoms": "symptoms if any",
  "medications": [
    {
      "name": "medication name",
      "dosage": "dosage info",
      "duration": "duration",
      "instructions": "specific instructions if any"
    }
  ],
  "instructions": "general instructions",
  "revisitDate": "YYYY-MM-DD or null"
}

If any field is not found, use empty string or null. Be accurate and extract exact information from the image.`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    },
  ]);

  const response = result.response.text();

  // Extract JSON from response (Gemini sometimes wraps it in markdown)
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to extract JSON from Gemini response");
  }

  const extractedData: ExtractedReportData = JSON.parse(jsonMatch[0]);
  return extractedData;
}

export async function generateAISummary(
  reports: Array<{ category: string; diagnosis: string; medications: string }>,
  mode: "patient" | "clinical",
  familyHistory?: Array<{ condition: string; relation: string }>,
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const familyHistoryText =
    familyHistory && familyHistory.length > 0
      ? `\n\nFamily Medical History:\n${familyHistory.map((h) => `- ${h.condition} (${h.relation})`).join("\n")}`
      : "";

  const reportsText = reports
    .map(
      (r, i) =>
        `Report ${i + 1} (${r.category}):\n- Diagnosis: ${r.diagnosis}\n- Medications: ${r.medications}`,
    )
    .join("\n\n");

  let prompt = "";

  if (mode === "patient") {
    prompt = `You are a medical AI assistant. Create a patient-friendly health summary from these medical reports.

${reportsText}${familyHistoryText}

Provide a clear, easy-to-understand summary in bullet points:
- What conditions were diagnosed
- What the treatments are for
- Important things to remember
- Any lifestyle recommendations

Use simple language that a non-medical person can understand. Be reassuring but accurate.`;
  } else {
    prompt = `You are a clinical AI assistant. Create a professional clinical summary from these medical reports.

${reportsText}${familyHistoryText}

Provide a comprehensive clinical summary including:
- Diagnoses and ICD-10 codes if applicable
- Treatment protocols
- Medication interactions or concerns
- Risk factors based on medical and family history
- Recommended follow-up care

Use medical terminology and clinical precision.`;
  }

  const result = await model.generateContent(prompt);
  return result.response.text();
}

export interface GeneticRiskPrediction {
  condition: string;
  riskPercentage: number;
  riskLevel: "low" | "moderate" | "high";
  factors: string[];
  recommendations: string[];
}

export async function generateGeneticRiskPrediction(
  familyHistory: Array<{ condition: string; relation: string; notes?: string }>,
): Promise<GeneticRiskPrediction[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const familyHistoryText = familyHistory
    .map((h) => `- ${h.condition} (${h.relation})${h.notes ? `: ${h.notes}` : ""}`)
    .join("\n");

  const prompt = `You are a genetic risk assessment AI. Based on the following family medical history, calculate approximate genetic risk percentages for common hereditary conditions.

Family Medical History:
${familyHistoryText}

For each condition found in family history, provide:
1. The condition name
2. Estimated risk percentage (based on genetic studies)
3. Risk level (low: <20%, moderate: 20-50%, high: >50%)
4. Contributing factors from family history
5. Preventive recommendations

Return as valid JSON array:
[
  {
    "condition": "condition name",
    "riskPercentage": 30,
    "riskLevel": "moderate",
    "factors": ["Father has condition", "Grandfather had condition"],
    "recommendations": ["Regular screening", "Lifestyle changes"]
  }
]

Be scientifically accurate based on known hereditary patterns. If no family history is provided, return an empty array.`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    return [];
  }

  return JSON.parse(jsonMatch[0]);
}

export async function generatePrescriptionSummary(
  doctorName: string,
  hospitalName: string,
  visitDate: string,
  diagnosis: string,
  medications: Array<{ name: string; dosage: string; duration: string }>,
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `Create a brief, patient-friendly summary of this medical visit:

Doctor: ${doctorName}
Hospital: ${hospitalName}
Visit Date: ${visitDate}
Diagnosis: ${diagnosis}
Medications: ${medications.map((m) => `${m.name} (${m.dosage} for ${m.duration})`).join(", ")}

Provide a 2-3 sentence summary explaining:
1. What the issue was
2. What the medicines are for
3. Why it's important to follow the treatment

Use simple, reassuring language.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
