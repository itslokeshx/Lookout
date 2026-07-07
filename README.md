<div align="center">

# 🔭 LookOut

### The Autonomous AI Agent for Multi-Collection Database Analytics & Campaigns

*An intelligent, multi-collection database agent that answers analytical queries and autonomously orchestrates dynamic marketing campaigns.*

[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org)
[![LangChain](https://img.shields.io/badge/LangChain-Orchestration-1C3C3A?style=flat-square)](https://langchain.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![Brevo](https://img.shields.io/badge/Brevo-Email-0092FF?style=flat-square)](https://www.brevo.com)

</div>

---

## 🚀 Overview

**LookOut** is an autonomous AI agent system designed to interactively explore, query, and campaign over multi-collection databases. Built for founders, developers, and product teams, it allows you to connect *any* MongoDB database (currently, LookOut only supports MongoDB), specify relationships between collections, query records in plain English, and autonomously dispatch targeted HTML email campaigns.

Instead of writing SQL queries, building custom MongoDB aggregation pipelines, or designing HTML emails, you describe your target audience and intent directly in natural language:

> *"Count the total number of users who signed up last week."*  
> *"List the messages sent by users who are using Gmail."*  
> *"Mail the top 5 users by listenedTime to announce our new feature."*

---

## ✨ Features (v2 Completed)

- **Bring Your Own Database (BYODB):** Connect any MongoDB cluster and choose collections dynamically (currently, LookOut exclusively supports MongoDB).
- **Dynamic Multi-Collection Joins:** 
  - Supports **one-to-one** and **one-to-many** relationships.
  - Employs a robust sub-pipeline `$lookup` (with sorting and `$limit: 1`) to eliminate row duplication issues while retaining enriched records.
- **Dual-Collection Agent Querying:** 
  - Dedicated tools allow the agent to query the primary collection (`userdetails`) and the secondary collection (`messages`) independently or joined.
- **Interactive Setup Wizard:** 
  - **Live Schema Preview:** Side-by-side JSON block updating dynamically as you map attributes.
  - **Auto-Suggest Mapping:** Automated heuristic mapping to configure key fields.
  - **Join Validation:** Instantly tests relationships and returns sample query results.
- **Robust Local & Cloud Sync:** 
  - Settings are preserved inside the workspace (`settings.json`) and synchronized to MongoDB (`_lookout_config`).
- **Premium Monochrome Interface:** 
  - Stunning pitch-black primary dark theme (`#000000`) with high-contrast text and interactive light mode toggle.
- **Scope & Abuse Control:** 
  - Prompt guardrails ensure the agent pivots trivia or general knowledge questions back to LookOut's analytical capabilities.

---

## 📐 System Design & Architecture

### System Topology

```mermaid
graph TD
    subgraph Client Layer [Client Layer]
        UI[React Dashboard<br>Vite + Tailwind v4]
        CLI[Terminal UI<br>agent/cli.py]
    end
    
    subgraph API Layer [API Layer]
        FastAPI[FastAPI Server<br>backend/server.py]
    end

    subgraph Agent Core [Agent Core]
        Agent[LangChain Agent<br>agent/chat_agent.py]
        Campaign[Drafting Engine<br>agent/campaign/]
    end

    subgraph External & Database Integrations [External & Database Integrations]
        MongoDB[(MongoDB Atlas<br>User Database)]
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

### Execution Pipeline

```mermaid
sequenceDiagram
    actor User
    participant App as Dashboard / CLI
    participant Agent as LangChain Agent
    participant DB as MongoDB
    participant LLM as Groq LLM
    participant Brevo as Brevo API

    User->>App: "List messages sent by active users"
    App->>Agent: Submit Prompt
    
    rect rgb(18, 18, 18)
        Note right of Agent: Phase 1: Database Query & Join
        Agent->>LLM: Parse intent and construct filters
        LLM-->>Agent: Query filters & join keys
        Agent->>DB: Execute Aggregation Lookup (sub-pipeline with limit 1)
        DB-->>Agent: De-duplicated & enriched documents
    end
    
    rect rgb(18, 18, 18)
        Note right of Agent: Phase 2: Response Composition
        Agent->>LLM: Synthesize raw data into readable markdown
        LLM-->>Agent: Structured analytical markdown response
        Agent-->>App: Display chat response & table preview
    end
```

---

## 📂 Project Structure

```text
Lookout/
├── agent/                    # 🧠 CORE AI ENGINE (Primary Logic)
│   ├── core.py               # ➔ LangChain core logic for campaign discovery
│   ├── chat_agent.py         # ➔ LangChain conversational analyst with prompt guardrails
│   ├── chat_tools.py         # ➔ Specialized query tools (user queries, secondary/enrichment collection access)
│   ├── tools.py              # ➔ Aggregation pipeline finders & Brevo SMTP integration
│   ├── cli.py                # ➔ Standalone terminal CLI orchestrator
│   ├── config.py             # ➔ Environment variables loader
│   ├── config_store.py       # ➔ Hybrid file-system and MongoDB persistence managers
│   ├── campaign/             
│   │   ├── drafting.py       # ➔ Campaign template generation & dynamic placeholder injection
│   │   └── models.py         # ➔ Strict Pydantic models (EmailTemplate, EmailDraft)
│   ├── db/                   
│   │   └── client.py         # ➔ PyMongo database clients
│   └── ui/                   
│       └── cli.py            # ➔ Terminal styling & spinner modules
│
├── frontend/                 # 💻 REACT DASHBOARD (Vite + Tailwind v4 + Light Mode)
├── backend/                  # 🔌 FASTAPI SERVER (Rest API Router)
├── settings.json             # 💾 Local settings backup store (Auto-created)
├── pyproject.toml            # 📦 Python project dependencies
└── .env                      # 🔑 API credentials and secrets
```

---

## ⚙️ Setup and Installation

Follow these steps to configure your environment and launch LookOut v2.

### Prerequisites
- Python 3.12+
- Node.js 18+
- [uv](https://github.com/astral-sh/uv) (Python dependency manager)

---

### Step 1: Clone and Initialize
```bash
git clone https://github.com/itslokeshx/Lookout.git
cd Lookout
```

### Step 2: Set Up Python Virtual Environment
Use `uv` to create a virtual environment and synchronize dependencies:
```bash
# Install virtual environment and dependencies
uv sync
source .venv/bin/activate
```

### Step 3: Configure Environment Variables
Create a `.env` file at the root of the project:
```bash
cp .env.example .env
```
Populate the variables:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
BREVO_API_KEY=xkeysib-your_brevo_key_here
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/
```

### Step 4: Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

---

## 🏃 Running LookOut

Open two terminals or background tabs to run the services concurrently:

### Terminal 1: Backend FastAPI Server
```bash
# Ensure you are at the project root and virtualenv is active
.venv/bin/uvicorn backend.server:app --reload --port 8000
```

### Terminal 2: React Vite Dashboard
```bash
cd frontend
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 📊 Database Join Strategy

To support multi-collection joins without document duplication, LookOut v2 uses a specialized `$lookup` sub-pipeline rather than simple localField/foreignField matching:

```python
lookup_pipeline = [
    {"$match": {"$expr": {"$eq": [f"${foreign_key}", "$$local_val"]}}}
]
if sort_field:
    sort_dir = -1 if not sort_ascending else 1
    lookup_pipeline.append({"$sort": {sort_field: sort_dir}})
lookup_pipeline.append({"$limit": 1}) # Resolves one-to-many into exactly one record

pipeline.append({
    "$lookup": {
        "from": secondary_collection,
        "let": {"local_val": f"${local_key}"},
        "pipeline": lookup_pipeline,
        "as": "_enrichment_docs"
    }
})
```

---

## 📄 License

LookOut is open-source software licensed under the [MIT License](LICENSE).
