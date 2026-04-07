# ExpenseAuditor — AI-Powered Expense Claim Auditing System

## The Problem

Organizations process hundreds of employee expense claims manually, making it time-consuming, error-prone, and inconsistent. Auditors struggle to verify receipts against company policies, detect fraudulent or non-compliant claims, and maintain a standardized approval workflow — leading to financial leakage and compliance gaps.

## The Solution

**ExpenseAuditor** automates the entire expense auditing pipeline using AI. Employees upload receipt images, and the system uses **Gemini AI** for OCR extraction and intelligent policy-based auditing. It automatically extracts receipt data (vendor, items, totals, dates), compares it against configurable company policies, performs contextual fraud detection (e.g., flagging "team dinner" claims with a single-item receipt), and delivers instant approve/flag/reject decisions — all without manual intervention.

### Key Features

- **AI-Powered Receipt OCR** — Upload a receipt image or PDF; Gemini extracts vendor name, line items, totals, currency, and date automatically.
- **Automated Policy Auditing** — Claims are checked against company expense policies with currency-aware limit enforcement, prohibited item detection, and allowed-day validation.
- **Contextual Fraud Detection** — Analyzes the employee's stated business purpose against the receipt data to catch inconsistencies (e.g., group event claims with individual receipts, personal expense indicators, category mismatches).
- **AI Policy Document Extraction** — Auditors can upload policy documents (PDF/images) and have Gemini extract structured policy rules automatically, replacing manual data entry.
- **Role-Based Access Control** — Separate workflows for employees (submit & track claims) and auditors (review, override, manage policies).
- **Auditor Override** — Auditors can manually override AI decisions with comments, providing human-in-the-loop control.
- **Real-Time Notifications** — Employees receive instant notifications when their claims are approved, flagged, rejected, or overridden.
- **Multi-Currency Support** — Handles expenses in GBP, USD, EUR, INR, and more with automatic conversion for policy comparison.
- **Region-Specific Policies** — Supports different expense limits and rules per region/country.

## Tech Stack

### Programming Languages
- **Python** — Backend logic, AI integration, and data processing.
- **JavaScript (JSX)** — Frontend UI and client-side logic.

### Frameworks
- **FastAPI** — High-performance async Python backend with automatic API documentation.
- **React 19** — Modern frontend library for building the interactive UI.
- **Vite** — Next-generation frontend build tool for fast development.

### Database
- **MongoDB Atlas** — Cloud-hosted NoSQL database for storing users, claims, policies, and notifications.
- **Motor** — Async MongoDB driver for Python, enabling non-blocking database operations.

### AI & APIs
- **Google Gemini AI** (`gemini-2.5-flash-lite`) — Powers receipt OCR extraction, and policy document analysis.
- **PyMuPDF (fitz)** — PDF-to-image conversion for processing PDF receipts.

### Authentication & Security
- **JWT (PyJWT)** — Stateless token-based authentication.
- **bcrypt** — Secure password hashing.
- **OAuth2** — Password-based login flow via FastAPI's security utilities.

### Frontend Libraries
- **Tailwind CSS v4** — Utility-first CSS framework for styling.
- **React Router v7** — Client-side routing with role-based navigation guards.
- **Axios** — HTTP client for API communication.
- **Lucide React** — Icon library for the UI.
- **React Dropzone** — Drag-and-drop file upload component.

### Other Tools
- **Pydantic** — Data validation and serialization for request/response models.
- **Resend** — Email notification service.
- **Uvicorn** — ASGI server for running the FastAPI application.

## Setup Instructions

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and **npm**
- **MongoDB Atlas** account (or a local MongoDB instance)
- **Google Gemini API Key** — obtain from [Google AI Studio](https://aistudio.google.com/apikey)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/ExpenseAuditor.git
cd ExpenseAuditor
```

### 2. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv myenv

# On Windows:
myenv\Scripts\activate

# On macOS/Linux:
source myenv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Configure Environment Variables

Create a `.env` file inside the `backend/` directory with the following:

```env
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_jwt_secret_here
MONGODB_URI=your_mongodb_connection_string_here
JWT_ALGORITHM=HS256
```

#### Run the Backend Server

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`. API docs are auto-generated at `http://localhost:8000/docs`.

### 3. Frontend Setup

```bash
# Open a new terminal and navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### 4. Seed Initial Policies (Optional)

To populate the database with sample expense policies:

```bash
cd backend
python seed_policies.py
```

## Project Structure



