<div align="center">

# 🔭 LOOKOUT

### AI-Agentic Email Campaign Dispatch Engine

*State your campaign goals in plain English. Let the discovery and drafting agents do the work.*

![Python](https://img.shields.io/badge/Python-3.12-blue?style=flat-square&logo=python&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-Agent-green?style=flat-square)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Brevo](https://img.shields.io/badge/Brevo-Email-0092FF?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

</div>

---

## 🚀 Overview

**Lookout** is a conversational email dispatch orchestrator built for the **SoulSync** streaming platform. Using conversational inputs, it automates the entire marketing lifecycle: user targeting, content personalization, review previews, and SMTP delivery.

Instead of writing SQL queries, building custom MongoDB aggregation pipelines, or designing HTML emails, you describe your target audience and intent directly in natural language:

```text
▸ enter the target users: mail to the users 3 their names is alice,bob,charlie as welcome to soulsync
```

---

## 🛠️ Architecture

Lookout is built with a highly modular architecture that keeps agent brains, campaign drafting, database drivers, and UI interactions separate:

```
┌─────────────────────────────────────────────────────┐
│                      app.py                         │
│                  (Orchestrator)                     │
└──────────┬─────────────────────────┬────────────────┘
           │                         │
           ▼                         ▼
┌──────────────────┐      ┌──────────────────────────┐
│     agent/       │      │       campaign/          │
│   (LangGraph)    │      │  generate_template()      │
│                  │      │  renderTemplate()         │
│  ┌────────────┐  │      │  to_html()                │
│  │ find_users │  │      └──────────────────────────┘
│  │   (tool)   │  │
│  └─────┬──────┘  │
└────────┼─────────┘
         │
         ▼
┌──────────────────┐      ┌──────────────────────────┐
│      db/         │      │        Brevo             │
│  (MongoDB Atlas) │      │  (Transactional API)     │
└──────────────────┘      └──────────────────────────┘
```

---

## 🤖 How the Agents Work

1. **Natural Language Discovery**: The user's prompt is processed by the **Discovery Agent** (`agent/core.py`). It dynamically infers filters, sorting rules, ascending/descending order, and query limit bounds.
2. **Intelligent Query Transformation**: The `find_users` tool evaluates filters case-insensitively using Python's pre-compiled BSON regex representations, allowing partial matches (e.g. searching for `selvi` matches `Porselvi A` and querying lists of names uses regex alternation patterns).
3. **Structured Template Generation**: The **Drafting Agent** generates an email template (`EmailTemplate`) with strict Pydantic formatting. The subject line and HTML body are tailored with dynamic placeholders (e.g., `{name}`, `{totalListeningTime}`) based *only* on fields available in the matched user records.
4. **Rich Terminal Visualizer**: Before sending any emails, the orchestrator renders a complete markdown-styled preview in your terminal showing the first recipient's fully compiled message alongside a recipient list.
5. **Approval Gate & Dispatch Loop**: The orchestrator asks for human validation before sending. If approved, individual HTML emails are rendered and dispatched via Brevo. Afterwards, you are prompted to start another search or exit.

---

## 📂 Project Directory Structure

```text
lookout/
├── app.py          # Application entrypoint - manages execution and prompt-input loops
├── config.py       # Configuration loader - reads dotenv and configures constants
├── agent/          # Agent core definitions
│   ├── __init__.py
│   ├── core.py     # Initializer for LangChain agent and system directives
│   └── tools.py    # Discovery tool (MongoDB) and Sender tool (Brevo Transactional API)
├── campaign/       # Email campaign components
│   ├── __init__.py
│   ├── models.py   # Pydantic schemas (EmailTemplate, EmailDraft, DispatchedResult)
│   └── drafting.py # Template generation LLM call, rendering, HTML wrapper layout
├── db/             # Database connectivity
│   ├── __init__.py
│   └── client.py   # PyMongo client instantiator
└── ui/             # Graphical text elements
    ├── __init__.py
    └── cli.py      # Terminal decorations: spinners, layouts, color formatting
```

---

## 💻 Tech Stack

- **Agent Engine**: LangChain
- **LLM**: Groq (`openai/gpt-oss-120b`)
- **Validation**: Pydantic v2
- **Database**: MongoDB Atlas via PyMongo
- **Delivery System**: Brevo API (sib-api-v3-sdk)
- **Styling**: Vanilla Python Terminal ESC Color Codes

---

## ⚙️ Setup and Installation

### 1. Clone the repository
```bash
git clone https://github.com/itslokeshx/Lookout.git
cd Lookout
```

### 2. Configure the virtual environment
```bash
uv sync
source .venv/bin/activate
```

### 3. Set environment variables
Copy the template configuration file:
```bash
cp .env.example .env
```
And populate it with your active API keys:
```env
CEREBRAS_API_KEY=csk-your-cerebras-key
GROQ_API_KEY=gsk_your_groq_key
BREVO_API_KEY=xkeysib-your_brevo_key
MONGODB_URI=mongodb+srv://your_connection_string
```

---

## 🏃 Running Lookout

Run the orchestrator:
```bash
python3 app.py
```

### Prompt Examples
- `mail to the users 3 their names is alice,bob,charlie as welcome to soulsync`
- `send reengagement mail to the user john as to make him engage again`
- `top 5 users by listening time`
- `newest signups who haven't listened to any tracks`

### Interactive CLI Controls
```text
  ▸ enter the target users: mail to the users 3 their names is alice,bob,charlie as welcome to soulsync
  ▰▰▱ Searching for users...
  ▰▰▰ Generating template...
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ▎ PREVIEW
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⦿ Welcome to SoulSync, Alice! 🎉
     Hi Alice,
     Your account is ready! We're excited to welcome you...
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ▎ TARGETS  3
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   1  Alice  alice@example.com ◂ preview
   2  Bob  bob@example.com
   3  Charlie  charlie@example.com
  
  ────────────────────────────────────────────────────────────────────
  ▸ dispatch? y/n y
  
  ▸ alice@example.com  id: <smtp-id-1>
  ▸ bob@example.com  id: <smtp-id-2>
  ▸ charlie@example.com  id: <smtp-id-3>
  
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  3 sent  ━  24.49s
  
  ────────────────────────────────────────────────────────────────────
  ▸ mail again or exit? m/e e
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

---

## 📄 License

Lookout is open-source software licensed under the [MIT License](LICENSE).
