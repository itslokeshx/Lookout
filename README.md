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

## 📖 The Story Behind LookOut

> **"LookOut started because I was tired of being the human bridge between my database, an LLM, and my email provider. Today, that bridge is a single prompt."**

LookOut wasn't born because I wanted to build an AI agent. It was born because I got tired of doing the same manual workflow over and over again.

While working on **SoulSync**, I decided I wanted to thank and reward my most engaged listeners. It sounded like a simple task, but the actual process quickly became frustrating:

1. **Export:** Exported all of my users from MongoDB.
2. **Analyze:** Uploaded the exported data to Claude and asked it to identify the top listeners based on their listening time.
3. **Draft:** Asked Claude to generate a personalized email for each user.
4. **Copy-Paste:** Manually copied every generated email, opened my email service, pasted the content, selected the correct recipient, and sent the emails one-by-one.

The campaign was successful; the workflow was not.

I wasn't making decisions anymore. I was simply acting as the bridge between my database, the LLM, and my email provider. The database already had the users, the LLM knew how to write the emails, and the email service knew how to deliver them. The only thing connecting those three systems was... **me**.

That was the moment the idea for LookOut clicked:

> **Why not let an AI agent orchestrate the entire workflow?**

The agent could discover the right users, generate personalized email drafts with clear reasoning, present everything for human approval, and then dispatch the approved emails automatically.

What used to take multiple tools, repeated prompts, and a lot of manual copy-pasting is now a single natural language prompt. That's how LookOut was born — not from the desire to build another AI project, but from solving a real-world, repetitive problem.

---

## 🚀 Overview

**LookOut** is an autonomous AI agent system designed to interactively explore, query, and campaign over multi-collection databases. Built for founders, developers, and product teams, it allows you to connect *any* MongoDB database (currently, LookOut only supports MongoDB), specify relationships between collections, query records in plain English, and autonomously dispatch targeted HTML email campaigns.

Instead of writing SQL queries, building custom MongoDB aggregation pipelines, or designing HTML emails, you describe your target audience and intent directly in natural language:

> *"Count the total number of users who signed up last week."*  
> *"List the messages sent by users who are using Gmail."*  
> *"Mail the top 5 users by listenedTime to announce our new feature."*

LookOut operates in two distinct modes:
- **💬 Chat Mode (Database Analytics):** Ask natural-language questions about your users, collection metrics, or joined tables. LookOut automatically queries your database and displays summary counts, averages, and formatted records.
- **✉️ Mail Mode (Campaign Orchestration):** Describe your target audience in plain English, dynamically generate personalized email templates, preview the dynamic HTML rendered versions, and securely dispatch transactional email campaigns.

---

## ✨ Features

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

## 📖 Detailed Codebase Reference

### 🧠 The Core Agent Layer (`agent/`)

*   #### `agent/core.py`
    Builds and initializes the campaign orchestration agent. It configures the system prompt with target database attributes and establishes a LangChain React agent using Groq. This agent exposes the `find_users` tool, which queries matched users, serializes MongoDB records safely, and stores them in a memory cache.
*   #### `agent/chat_agent.py`
    Defines the conversational AI data analyst. It configures the Groq model with specialized read-only query tools. The prompt features **Strict Scope Guardrails** that enforce database-centric replies and divert trivia, general knowledge, or math questions with a polite redirection.
*   #### `agent/chat_tools.py`
    Houses the database tools for conversational analytics:
    *   `chat_find_users`: Performs user lookup with dynamic MongoDB `$lookup` sub-pipeline join mapping.
    *   `count_users`: Aggregates the user count using matching search filters.
    *   `aggregate_stat`: Calculates metric-specific math calculations (e.g. `sum`, `avg`, `min`, `max`) over selected database columns.
    *   `find_secondary_documents` & `count_secondary_documents`: Directly inspects records in the joined enrichment collection (e.g., messages, orders, logs).
*   #### `agent/tools.py`
    Provides low-level implementation logic for:
    *   `find_users`: Core MongoDB aggregation pipeline builder that executes structured search conditions.
    *   `sendMail`: SMTP transactional mail dispatcher integrated with Brevo.
    *   `query_cache`: Cache instance caching matched user records across campaign wizard steps.
*   #### `agent/config_store.py`
    Implements a **hybrid persistence system** for configurations:
    *   Saves parameters locally into `settings.json` for instant developer access.
    *   Synchronizes configurations to the active MongoDB cluster under the `_lookout_config` collection.
    *   Loads settings dynamically on startup by checking both local files and cloud databases.
    *   Implements connection testing, relationship lookups, and auto-suggest field mapping rules.
*   #### `agent/campaign/drafting.py`
    Wraps campaigns inside a premium responsive HTML email wrapper and implements `SafeDict` template formatting to prevent rendering errors caused by missing user attributes.
*   #### `agent/campaign/models.py`
    Enforces strict Pydantic v2 schemas validating configuration models (`EmailTemplate`, `EmailDraft`, and `DispatchedResult`).
*   #### `agent/db/client.py`
    Initializes MongoClient connections lazily and provides helper functions to resolve primary and secondary collection handlers.

### 🔌 The API Wrapper Layer (`backend/`)

*   #### `backend/server.py`
    The FastAPI application serving as the integration bridge between the React frontend and the Python agent. It exposes endpoints for:
    *   `/api/settings`: Saving and fetching setup configurations.
    *   `/api/databases` & `/api/collections/{db}`: Discovering databases and collections.
    *   `/api/check-join`: Validating primary/secondary key relations.
    *   `/api/suggest-mapping`: Guessing field mappings using heuristic key match scoring.
    *   `/api/chat`: Sending messages to the conversational agent.
    *   `/api/campaign/target`: Invoking the campaign targeting step.
    *   `/api/campaign/draft`: Invoking the email drafting step.
    *   `/api/campaign/dispatch`: Dispatching emails and tracking real-time status.

### 💻 The Frontend Dashboard (`frontend/`)

*   #### `frontend/src/App.jsx`
    The top-level state manager. It handles view switching (Setup wizard vs. main workspace), mode switching (Chat vs. Mail vs. Settings), and registers the light/dark theme preference inside `localStorage`.
*   #### `frontend/src/components/SetupView.jsx`
    A stepped onboarding form that walks users through connecting database, mapping fields with Auto-Suggest, testing joins, and configuring SMTP. Features a live schema preview panel reflecting mapped keys in real-time.
*   #### `frontend/src/components/ChatView.jsx`
    The conversational interface for database queries. Renders markdown responses, lists, and tables with interactive states.
*   #### `frontend/src/components/MailView.jsx`
    A stepped campaign orchestrator that shows targeting results, lets users edit templates, shows rendered HTML previews, and runs dispatch actions.
*   #### `frontend/src/components/TopBar.jsx`
    Renders status indicators, switcher tabs, theme toggling, and settings navigation.
*   #### `frontend/src/index.css`
    Declares custom Tailwind v4 theme configurations, custom fonts (Inter), and sets up the pitch-black and clean white color themes.

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

> [!TIP]
> **LLM Model Recommendations (Free Tier):**
> * **`openai/gpt-oss-120b`** — Default production model
> * **`llama-3.3-70b-versatile`** — Quality + lower cost option

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

## 🛠️ Step-by-Step Dashboard Onboarding & Collection Mapping

When you open `http://localhost:5173` for the first time, you will be guided through a 3-step setup wizard to configure the agent's target database context:

### 1️⃣ Step 1: Database & Collection Join Configuration
Configure where the agent retrieves data and how collections relate:
* **Number of Collections:** Choose between **1 Collection** (if user details and activities are in a single place) or **2 Collections (Join / Enrichment)** (if you want the agent to enrich user records with dynamic metrics like messages, orders, or logs from a separate collection).
* **Database:** Select from the dropdown of auto-discovered databases found on your active MongoDB cluster.
* **Primary Collection (Users):** Select the collection that holds the core user records (typically containing `username`, `email`, etc.).
* **Secondary Collection (Enrichment):** *(Visible only if 2 Collections is selected)* Select the collection holding relational details to join.
* **Join Configuration (Key Mapping):**
  - **Local Key (primary):** The identifier field in your primary collection (usually `_id` or `username`).
  - **Foreign Key (secondary):** The key in the secondary collection that maps back to the primary collection's local key (e.g. `userId` or `username`).
* **Check Relationship Validation:** Click this button to test the join keys instantly. The system queries a sample record and attempts to resolve a matching document. It reports exactly how many matches were found for the test value (e.g. `one-to-one (1 matches for sample value)` or warnings if 0 matches exist), ensuring your mapping is correct.
* **Product Name:** Define your product's name (e.g., `Chatty` or `SoulSync`). This aligns the AI's agentic context and sets email template signatures.

### 2️⃣ Step 2: Intelligent Field Mapping
Configure which attributes represent identities, metrics, and additional context:
* **Email Field & Name Field:** Select the properties that represent the user's email address and display name. If you are unsure, click **Auto-suggest** to run a heuristic matching algorithm over your collection schema.
* **Join Date & Last Active Field:** (Optional) Map timestamps indicating when users joined and their last session activity.
* **Numeric Metrics:** Project numeric stats that the agent can aggregate (e.g. field `totalListeningTime`, Custom Label `Listened Time`, unit `sec`). The agent uses these mappings to dynamically compute `avg`, `sum`, `min`, or `max`.
* **Custom Extra Fields:** Input any additional schema fields you want the agent to query and view (e.g. `authProvider`, `role`, `status`, or attributes from your joined secondary collection like `text` or `count`).
* **Live Schema Preview:** As you define mappings, the side-panel displays the exact JSON structure that the LookOut agent queries, letting you verify configurations in real-time.

### 3️⃣ Step 3: Sender Configuration
Configure the SMTP sending identity used when dispatching campaigns:
* **Sender Name & Sender Email:** Define the default name and email address that recipients will see in campaign dispatches.
* **Save / Complete Setup:** Compiles the configuration, writes it to `settings.json`, syncs it to MongoDB Atlas under `_lookout_config` for cloud redundancy, and unlocks the Chat & Mail dashboards.

---

## 🎮 Dashboard Interface Modes

LookOut's dashboard features a dual-mode workflow switcher designed for both interactive exploration and structured workflow orchestration:

### 💬 Chat Mode: The Conversational Database Analyst
Chat Mode is a read-only playground designed for dynamic data exploration:
* **Interactive Tooling:** The underlying agent is equipped with five query tools (`chat_find_users`, `count_users`, `aggregate_stat`, `count_secondary_documents`, `find_secondary_documents`) to pull counts, run statistics, filter, and inspect collection schemas.
* **Scope Guardrails:** Safe prompt filters prevent off-topic trivia abuse (e.g. queries about cricket players, celebrities, or unrelated math). If a general-knowledge prompt is detected, the agent replies with a brief statement and pivots the conversation back to your user database.
* **Smart UI Rendering:** Displays database records, totals, average metrics, and join relationship tables formatted cleanly.

### ✉️ Mail Mode: The Campaign Orchestration Pipeline
Mail Mode guides you through a strict four-stage wizard to discover users, draft personalized emails, and send SMTP dispatches:
1. **Targeting:** Describe your target audience in plain English (e.g., *"users who joined in the last 30 days and have 0 messages"*). The agent dynamically builds filters and returns the matching user count and details.
2. **Template Generation:** The agent automatically drafts a personalized email campaign (Subject & Body copy) tailored to the audience context.
3. **Review & Preview:** Browse through individual preview cards of your matching users. LookOut dynamically renders the exact HTML output showing how dynamic placeholder values (such as `{username}` or custom metrics) are safely injected for each recipient.
4. **SMTP Dispatch:** Runs transactional email delivery using the configured Brevo SMTP details. You can monitor progress with a live status bar showing successful/failed dispatches, with results saved to your local **Dispatch History**.

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

## 📊 Testing & Benchmarks

LookOut has been validated against a real production workload using the **SoulSync** streaming platform. The objective was to measure reliability, personalization quality, and end-to-end campaign execution under realistic conditions.

### Mass Announcement Campaign Benchmark
*   **Campaign Prompt:** *"Mail every Gmail user informing them that SoulSync Wrapper is now available."*
*   **Users Matched:** 101 users
*   **Total Dispatch Time:** 94.75 seconds (~0.93s average per email)
*   **Failed Requests / Delivery Success:** 0 failures (100% SMTP API acceptance)

### Functional Validation & Reliability
*   **ReadOnly Protection:** Zero database write operations were performed during discovery; user targeting remains strictly read-only.
*   **Safety Check:** Every campaign requires explicit human review and approval before any dispatch actions are taken.
*   **Feature Verification:** Dynamic MongoDB query retrieval (✅), custom key joins (✅), personalized draft generation (✅), and Brevo SMTP dispatch (✅) all validated successfully.

### System Configuration
*   **Tested Dataset:** 101 users
*   **Database:** MongoDB Atlas
*   **LLM Provider:** GPT-OSS-120B (Cerebras)
*   **Email Provider:** Brevo Transactional Email API

---

## 🤝 Contributing & Open Source

LookOut is fully open-source and we welcome contributors of all skill levels! Whether you want to fix a bug, optimize the agent's prompts, add support for more database types, or build integrations for other email providers, your help is highly appreciated.

### How to Contribute:
1. **Fork the Repository:** Create a copy of this project on your GitHub account.
2. **Create a Feature Branch:** `git checkout -b feature/amazing-feature`
3. **Commit Your Changes:** `git commit -m 'Add some amazing feature'`
4. **Push to Branch:** `git push origin feature/amazing-feature`
5. **Open a Pull Request:** Submit your changes for review!

Feel free to open an issue if you encounter bugs or want to suggest new features. Let's make database analytics and campaigns entirely autonomous together!

---

## 📄 License

LookOut is open-source software licensed under the [MIT License](LICENSE).
