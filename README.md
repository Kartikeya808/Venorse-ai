# Venorse — AI Financial Intelligence Workspace

A full-stack AI-powered financial research platform that lets you upload, analyze, and compare financial documents using intelligent AI agents.

**Live Demo:** [venorse-ai.vercel.app](https://venorse-ai.vercel.app)
---
## Tech Stack

### Frontend — `frontend/`
- **Next.js 16** (React 19, TypeScript, Tailwind CSS v4)
- **Radix UI** primitives + shadcn/ui components
- **Recharts** for interactive financial charts
- Dark/Light theme with "AlphaDesk" financial aesthetic

### Backend — `backend/`
- **Express 5** (Node.js, MongoDB + Mongoose ODM)
- **JWT** authentication with bcryptjs
- **Multer** file uploads (PDF/TXT, 50MB limit)
- Webhook integration with AI agent service

### AI Agent — `langgraph/`
- **LangGraph** (Python) for orchestrated agent pipelines
- **Chromadb** for vector storage with cosine similarity search
- **Jina Embeddings API** (`jina-embeddings-v3`, 1024-dim)
- **OpenRouter** LLM API (configurable model)
- **PyMuPDF** for PDF text extraction
- Custom paragraph-aware chunker (1500 char chunks, 200 char overlap)

## Features

- **Document Processing** — Upload PDF/TXT financial documents; automatic text extraction, chunking, embedding, and AI summarization
- **Financial Metrics Extraction** — Extract structured metrics (revenue, margins, ratios) with AI explainability
- **Research Memo Generation** — Generate professional equity research memos with executive summary, financial health, risk factors, and valuation
- **Company Comparison** — Side-by-side multi-company comparison across key financial dimensions
- **AI Research Chat** — Conversational Q&A with RAG-augmented responses from your document library
- **Company Watchlist** — Track and monitor companies of interest
- **Agent Activity Monitoring** — Real-time workflow progress with step-by-step status indicators
- **Export** — Download research memos as PDF, Markdown, or JSON

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- MongoDB instance
- OpenRouter API key
- Jina Embeddings API key

### 1. Clone & Install

```bash
git clone https://github.com/Kartikeya808/Venorse-ai.git
cd Venorse-ai
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env    # Configure MongoDB URI, JWT secret, agent URL
npm run dev             # Starts on localhost:3000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local  # Configure NEXT_PUBLIC_API_URL
npm run dev                 # Starts on localhost:3001
```

### 4. AI Agent Setup

```bash
cd langgraph
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # Configure OpenRouter key, Jina key, ChromaDB path
uvicorn app.main:app --reload --port 8000
```

## Project Structure

```
├── backend/              # Express API server
│   └── src/
│       ├── controllers/  # Route handlers
│       ├── middleware/   # Auth & error middleware
│       ├── models/       # Mongoose schemas
│       ├── routes/       # API route definitions
│       ├── services/     # Business logic
│       └── uploads/      # File storage
├── frontend/             # Next.js application
│   └── src/
│       ├── app/          # Pages & layouts
│       ├── components/   # UI components
│       ├── context/      # Auth & theme contexts
│       ├── lib/          # API client & utilities
│       └── styles/       # CSS & theme definitions
├── langgraph/            # Python AI agent service
│   └── app/
│       ├── agents/       # LangGraph agent definitions
│       ├── routers/      # FastAPI route handlers
│       ├── rag/          # Vector store & retrieval
│       └── utils/        # LLM client & PDF extraction
├── vercel.json           # Vercel deployment config
└── .env.example
```

## API Overview

### Backend (`/api/*`)
| Endpoint Group | Description |
|---|---|
| `/api/auth/*` | Signup, signin, profile management |
| `/api/companies/*` | Company CRUD & search |
| `/api/documents/*` | Document upload & management |
| `/api/jobs/*` | Research job tracking & status |
| `/api/memos/*` | Research memo CRUD & publishing |
| `/api/watchlist/*` | Watchlist management |
| `/api/agent/*` | AI analysis, metrics, comparison, chat |
| `/api/webhooks/*` | Agent job completion webhook |

### LangGraph Agent (`/api/*`)
| Endpoint | Purpose |
|---|---|
| `/api/process-document` | Extract, chunk, embed, summarize |
| `/api/financial-analysis` | Natural language financial analysis |
| `/api/financial-metrics` | Structured metric extraction |
| `/api/compare` | Multi-company comparison |
| `/api/generate-memo` | Research memo generation |
| `/api/chat` | Conversational RAG Q&A |

## Deployment

The frontend is configured for **Vercel** deployment (see `vercel.json`). The backend and agent service can be deployed to any Node.js/Python hosting platform. Ensure environment variables are configured for production.
