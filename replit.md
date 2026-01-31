# MediSpace - Futuristic Healthcare Web Application

## Overview

MediSpace is a patient-centric healthcare web application with a futuristic sci-fi medical theme. The platform enables patients to own and control their medical data while allowing selective access to authorized doctors. Key features include medical report management with AI-powered OCR analysis, family medical history tracking, genetic risk predictions, and AI health summaries powered by Google's Gemini API.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS v4 with custom CSS variables for theming
- **UI Components**: shadcn/ui component library (New York style) with Radix UI primitives
- **Animations**: Framer Motion for smooth transitions and effects
- **Build Tool**: Vite with custom plugins for Replit integration

The frontend follows a page-based structure with dedicated pages for authentication, patient dashboard, doctor dashboard, AI summary, category reports, and visit details. Components use glassmorphism design with dark sci-fi medical aesthetics.

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful endpoints under `/api` prefix
- **File Uploads**: Multer middleware for handling prescription/report uploads (10MB limit, JPEG/PNG/PDF only)
- **Build Process**: esbuild for server bundling, Vite for client

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Validation**: Zod schemas generated from Drizzle schemas via drizzle-zod
- **Database**: PostgreSQL (configured via DATABASE_URL environment variable)

### Core Data Models
- **Users**: Patients and doctors with role-based access
- **Reports**: Uploaded medical documents with OCR text extraction
- **Visits**: Structured doctor visit records extracted from reports
- **Prescriptions**: Medications linked to visits
- **FamilyHistory**: Patient-owned family medical conditions
- **AccessPermissions**: Patient-controlled doctor access grants

### AI Integration
- **Provider**: Google Generative AI (Gemini 2.5 Flash)
- **Features**:
  - Medical report OCR and structured data extraction
  - AI health summaries (layman and clinical views)
  - Prescription analysis
  - Genetic risk predictions based on family history
- **Configuration**: GEMINI_API_KEY environment variable

### Authentication Model
- Simple username/password authentication via backend API
- Role-based access control (patient vs doctor)
- Patients explicitly grant/revoke access to specific doctors
- Doctors can only view data from patients who authorized them

## External Dependencies

### APIs and Services
- **Google Generative AI**: Gemini API for medical document analysis and AI summaries (requires GEMINI_API_KEY)
- **PostgreSQL Database**: Primary data store (requires DATABASE_URL connection string)

### Key NPM Packages
- `@google/generative-ai`: Gemini API client
- `drizzle-orm` + `drizzle-kit`: Database ORM and migrations
- `express`: HTTP server framework
- `multer`: File upload handling
- `jspdf`: PDF generation for downloadable reports
- `@tanstack/react-query`: Data fetching and caching
- `framer-motion`: UI animations
- Full shadcn/ui component suite via Radix UI primitives

### Development Tools
- Vite plugins for Replit integration (cartographer, dev-banner, runtime-error-modal)
- Custom meta-images plugin for OpenGraph tags
- TypeScript with strict mode enabled