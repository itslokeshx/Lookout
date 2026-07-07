<div align="center">

# 🔭 LOOKOUT

### AI-Agentic Email Campaign Dispatch Engine

*State your campaign goals in plain English. Let the discovery and drafting agents do the work.*

> **📢 Notice: This is Lookout v1.** This version was built as a tailored orchestrator for a specific platform (SoulSync). We are actively designing **Lookout v2**, which will be a fully customizable, general-purpose SaaS product where *anyone* can plug in their own database and API keys! See the [Roadmap](#️-roadmap-v1-vs-v2) below.

![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Tailwind](https://img.shields.io/badge/Tailwind_v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat-square&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.12-blue?style=flat-square&logo=python&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-Agent-green?style=flat-square)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Brevo](https://img.shields.io/badge/Brevo-Email-0092FF?style=flat-square)

</div>

---

## 🚀 Overview

**Lookout** is a conversational email dispatch orchestrator built for the **SoulSync** streaming platform. Using conversational inputs, it automates the entire marketing lifecycle: user targeting, content personalization, review previews, and SMTP delivery.

Instead of writing SQL queries, building custom MongoDB aggregation pipelines, or designing HTML emails, you describe your target audience and intent directly in natural language:

> *"mail to the users 3 their names is alice,bob,charlie as welcome to soulsync"*

The new **Lookout Dashboard** provides a beautiful, dark-themed React UI to manage this process visually, while maintaining the powerful, lightning-fast Python CLI for terminal power users.

---

## 🗺️ Roadmap: v1 vs v2

**Lookout v1 (Current State)**
- Built and tailored for a specific platform's schema (SoulSync).
- Pre-configured for specific database structures and fields (like `totalListeningTime`, `authProvider`).
- Serves as a specialized internal tool/proof-of-concept.

**Lookout v2 (Upcoming - The Product Version)**
- **Bring Your Own Database (BYODB):** Seamlessly connect *any* MongoDB database (and eventually Postgres/MySQL). This will be achieved using specialized database agent toolkits (e.g., LangChain's MongoDB toolkit and SQL toolkit) to allow for easy, secure, and plug-and-play implementation out of the box.
- **Dynamic Schema Intelligence:** The AI will automatically map and understand your unique database schema—no hardcoding required.
- **Plug-and-Play API Keys:** A smooth onboarding UI for users to supply their own LLM keys (Groq/OpenAI) and Email Provider keys (Brevo/SendGrid).
- **Universal Availability:** Transformed into a real, generalized product designed for *any* founder, creator, or developer to run autonomous campaigns on their own user data.

---

## 🛠️ Architecture

Lookout is built with a highly decoupled structure, cleanly separating the user interface, API endpoints, AI intelligence, and external integrations.

### System Architecture

```mermaid
graph TD
    subgraph Client Layer
        UI[React Dashboard<br>Vite + Tailwind v4]
        CLI[Terminal UI<br>agent/cli.py]
    end
    
    subgraph API Layer
        FastAPI[FastAPI Server<br>backend/server.py]
    end

    subgraph Agent Core
        Agent[LangChain Agent<br>agent/core.py]
        Campaign[Drafting Engine<br>agent/campaign/]
    end

    subgraph External Integrations
        MongoDB[(MongoDB Atlas<br>SoulSync Users)]
        Brevo[Brevo API<br>SMTP Email Dispatch]
        Groq[Groq API<br>LLM Reasoning]
    end

    UI <-->|REST / JSON| FastAPI
    CLI <--> Agent
    FastAPI <--> Agent
    
    Agent <--> Groq
    Agent <--> MongoDB
    Campaign <--> Groq
    Agent -->|Dispatch| Brevo
```

### Execution Flow

The core lifecycle from a natural language prompt to dispatched emails:

```mermaid
sequenceDiagram
    actor User
    participant App as Dashboard / CLI
    participant Agent as LangChain Agent
    participant DB as MongoDB
    participant LLM as Groq LLM
    participant Brevo as Brevo API

    User->>App: "mail active users to welcome them"
    App->>Agent: Submit Prompt
    
    rect rgb(30, 30, 30)
        Note right of Agent: Phase 1: Discovery
        Agent->>LLM: Parse intent (filters, sort, limit)
        LLM-->>Agent: Structured Search Parameters
        Agent->>DB: Execute Query (find_users tool)
        DB-->>Agent: Matched Users JSON
    end
    
    rect rgb(30, 30, 30)
        Note right of Agent: Phase 2: Drafting
        Agent->>LLM: Request EmailTemplate (Subject, Body)
        LLM-->>Agent: Pydantic Schema + Reasoning
        Agent-->>App: Return Markdown Preview & User List
    end
    
    User->>App: Approves Dispatch
    App->>Agent: Confirm Send
    
    rect rgb(30, 30, 30)
        Note right of Agent: Phase 3: Dispatch
        loop For Each User
            Agent->>Agent: Render dynamic {placeholders}
            Agent->>Brevo: Send Transactional Email
            Brevo-->>Agent: Message ID / Error
            Agent-->>App: Stream Send Status
        end
    end
    
    App-->>User: Display Summary (Sent, Failed, Time)
```

---

## 📂 Project Structure

```text
Lookout/
├── agent/                    # 🧠 CORE AI ENGINE (Primary Logic)
│   ├── core.py               # ➔ LangChain Groq agent & natural language discovery directives
│   ├── tools.py              # ➔ Agent Tools: MongoDB dynamic querying & Brevo SMTP integration
│   ├── cli.py                # ➔ Powerful standalone terminal application & orchestrator
│   ├── config.py             # ➔ Environment variable loader
│   ├── campaign/             
│   │   ├── drafting.py       # ➔ LLM email generation, safe placeholder injection, HTML wrapper
│   │   └── models.py         # ➔ Strict Pydantic schemas (EmailTemplate, EmailDraft, DispatchedResult)
│   ├── db/                   
│   │   └── client.py         # ➔ PyMongo connection to Atlas
│   └── ui/                   
│       └── cli.py            # ➔ Advanced terminal aesthetics (spinners, layouts, formatting)
│
├── frontend/                 # React UI Dashboard (Vite + Tailwind v4)
├── backend/                  # FastAPI Server (Thin HTTP wrapper connecting UI to the Agent)
├── pyproject.toml            # Python dependencies (managed via uv)
└── .env                      # API keys and secrets
```

---

## 💻 Tech Stack

**Frontend:**
- React (Vite)
- Tailwind CSS v4
- Lucide Icons

**Backend & AI Core:**
- FastAPI (REST API)
- LangChain (Agent Orchestration)
- Groq (`openai/gpt-oss-120b`)
- Pydantic v2 (Data Validation)
- MongoDB Atlas (via PyMongo)
- Brevo API (Transactional Delivery)

---

## ⚙️ Setup and Installation

### 1. Clone the repository
```bash
git clone https://github.com/itslokeshx/Lookout.git
cd Lookout
```

### 2. Configure Python & API Keys
```bash
# Install dependencies
uv sync
source .venv/bin/activate

# Setup environment variables
cp .env.example .env
```
Populate `.env` with your active API keys:
```env
GROQ_API_KEY=gsk_your_groq_key
BREVO_API_KEY=xkeysib-your_brevo_key
MONGODB_URI=mongodb+srv://your_connection_string
```

### 3. Setup Frontend
```bash
cd frontend
npm install
cd ..
```

---

## 🏃 Running Lookout

Lookout can be run using the beautiful Web Dashboard or the lightning-fast CLI.

### Option A: The Web Dashboard (Recommended)

You need to run both the API and the Frontend. Open two terminal tabs:

**Terminal 1 (Backend API):**
```bash
# From the project root
.venv/bin/uvicorn backend.server:app --reload --port 8000
```

**Terminal 2 (React Frontend):**
```bash
# From the frontend directory
cd frontend
npm run dev
```
Then visit `http://localhost:5173` in your browser.

### Option B: The Terminal CLI

If you prefer to work entirely in the terminal:
```bash
# From the project root
.venv/bin/python -m agent.cli
```

---

## 📊 Database Schema Fields

The agent is trained to filter, rank, and query users dynamically utilizing these document schema fields:

| Field | Type | Description |
|---|---|---|
| `name` | String | User's full display name |
| `email` | String | User's email address |
| `totalListeningTime` | Number (seconds) | Total streaming duration |
| `createdAt` | ISO DateTime | Account creation timestamp |
| `updatedAt` | ISO DateTime | Last active session timestamp |
| `authProvider` | String | Sign-in method (e.g., "google") |

---

## 📈 Production Benchmarks

Lookout has been successfully tested in live production environments, scaling effortlessly from precise, single-user tests to mass-market dispatches.

**Mass Dispatch Milestone:**
- **Natural Language Prompt:** *"mail to all users those are using gmail the mail is about informing as the wrapper feature is added..."*
- **Targeting Accuracy:** 101 users dynamically matched via AI `authProvider` query execution without overflowing LLM context limits.
- **Rendering & Dispatch Speed:** 101 uniquely personalized, HTML-rendered emails successfully delivered via the Brevo SMTP API in **94.75 seconds** (~0.93 seconds per email).
- **Error Rate:** 0% failure rate during mass rendering and API handoff.

---

## 📄 License

Lookout is open-source software licensed under the [MIT License](LICENSE).
