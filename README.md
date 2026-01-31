# MediSpace 🏥  
### AI-Powered Medicare Digital Health Platform

MediSpace is a centralized digital healthcare platform designed to simplify medical data management and improve clinical decision-making. By leveraging **LLM-based AI summarization (Google Gemini)**, the platform transforms complex medical reports into concise, actionable insights for both patients and doctors.

---

## 🎥 Demo
📹 **Platform Walkthrough Video**  
<video src="https://drive.google.com/file/d/1UC7sSE6_9mfhOapV36bd5iYmFz-miqDU/view?usp=sharing" width="100%" controls title="MediSpace Demo"></video>

---

## 📌 Problem Statement

Medical data is often:
- Fragmented across multiple visits and departments
- Difficult for patients to understand
- Time-consuming for doctors to analyze

MediSpace addresses this by creating a **secure, AI-assisted Medicare ecosystem** that improves accessibility, comprehension, and efficiency while maintaining strict privacy controls.

---

## 🚀 Key Features

### 👤 Patient Portal
- **Specialty-Wise Report Organization**  
  Automatically categorizes medical records by departments such as Radiology, Cardiology, Neurology, Dermatology, etc.

- **Complete Medical History**  
  Track every appointment with:
  - Doctor details  
  - Visit date & time  
  - Diagnosis  
  - Prescribed medications  

- **AI Medical Summary (Gemini-Powered)**  
  - Select specific PDF reports  
  - Generate simplified summaries  
  - Highlight key metrics and potential health risks  
  - Supports multi-document aggregation  

- **Appointment Booking**  
  Real-time scheduling with doctors based on availability.

---

### 🩺 Doctor Portal
- **Clinical Dashboard**  
  View upcoming and active patient appointments in one place.

- **Authorized Medical Record Access**  
  Doctors can access patient reports and AI summaries **only after patient consent**.

---

## 🧠 AI Capabilities

- **Selective Document Aggregation**  
  Generate summaries from:
  - All reports  
  - Only user-selected documents  

- **Context-Aware Medical Summarization**  
  Converts technical clinical data into structured, readable insights.

---

## 🛡️ Security & Privacy

- **Role-Based Access Control (RBAC)**  
  Ensures only authorized users can access sensitive medical data.

- **Consent-Driven Data Sharing**  
  Patients maintain full control over who can view their records.

- **Audit Logging**  
  Every data access action is tracked for compliance and security.

---

## 🏗️ System Architecture

The platform follows a **layered architecture** for scalability and maintainability:

- Actors Layer (Patient / Doctor)
- Authentication & Authorization Layer
- Application Layer (Patient & Doctor Portals)
- AI & Analytics Layer
- Backend Services
- Data Layer (Medical Records & Appointments)

```mermaid
graph LR
    P[Patient] --> Auth[Secure Login]
    D[Doctor] --> Auth
    Auth --> RBAC
    RBAC --> PatientPortal
    RBAC --> DoctorPortal
    PatientPortal --> AI[AI Summarization Engine]
    AI --> Backend
    Backend --> DB[(Medical Databases)]
