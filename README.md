# MediSpace 🏥  
### AI-Powered Medicare Digital Health Platform

MediSpace is a centralized digital healthcare platform designed to simplify medical data management and improve clinical decision-making. By leveraging **LLM-based AI summarization (Google Gemini)**, the platform transforms complex medical reports into concise, actionable insights for both patients and doctors.

# 🚀 Project Novelty & Key Contributions

- **UTILIZES A HIGHLY NOVEL GOOGLE TRANSFORMER — MEDGEMMA — FINE-TUNED ON CUSTOM MEDICAL DATA**  
  This project goes beyond API-based LLM usage by fine-tuning **MedGemma** on domain-specific medical data, enabling the model to learn contextual and semantic patterns directly from real-world datasets.

- **ENCODER-ONLY TRANSFORMER ARCHITECTURE FOR DEEP DATA UNDERSTANDING**  
  The system is intentionally designed as an **encoder-only transformer**, focusing on representation learning rather than text generation, which allows deeper insight extraction and stronger semantic embeddings from medical reports.

- **INSIGHT-DRIVEN MODEL DESIGN INSTEAD OF PURE GENERATION**  
  By prioritizing an encoder-centric approach, the model emphasizes understanding latent structures, correlations, and trends within the dataset, making it suitable for analytical and summarization tasks.

- **PRODUCTION-GRADE DEPLOYMENT USING NGINX ON HTTPS PORT 443**  
  The fine-tuned model is hosted behind an **NGINX web server** exposed via standard **HTTPS (port 443)**, reflecting real-world, secure, and firewall-friendly deployment practices.

- **PUBLIC HTTPS ENDPOINT FOR MACHINE LEARNING INFERENCE**  
  The same public port is used to serve ML inference requests, demonstrating a seamless integration between secure web infrastructure and model-serving pipelines.

- **END-TO-END ML AND SYSTEMS INTEGRATION**  
  The project delivers a complete pipeline combining transformer fine-tuning, encoder-only insight extraction, and secure production-style deployment, aligning academic research with industry-ready systems.

---
## 🚀 Demo Link
📹 **Hosted Website Link**  - https://future-health-net.replit.app


## 🎥 Demo
📹 **Platform Walkthrough Video**  
[![MediSpace Demo](https://img.shields.io/badge/▶️%20Watch%20Demo-Click%20Here-blue?style=for-the-badge)](https://drive.google.com/file/d/1UC7sSE6_9mfhOapV36bd5iYmFz-miqDU/view)


---

## 📸 Screenshots

Below are selected interface screenshots showcasing the core workflows and user experience of the MediSpace platform.

### Patient & Doctor Portal Interfaces

<p align="center">
  <img src="https://github.com/user-attachments/assets/75e7efae-41bd-4ed3-9716-e31412d84b82" width="45%" />
  <img src="https://github.com/user-attachments/assets/a932c708-02e7-48f2-82b4-0f12daa641af" width="45%" />
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/b87827f8-6bca-4f48-82fd-00fe63d3c488" width="45%" />
  <img src="https://github.com/user-attachments/assets/b7ffc22d-86f6-409b-bf32-6d90baa585ee" width="45%" />
</p>

### Interface Highlights
- Centralized patient dashboard with specialty-wise medical reports  
- AI-powered medical report summarization and insights  
- Appointment booking and schedule management  
- Secure role-based views for patients and doctors  

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
