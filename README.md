<div align="center">

# 🔭 LOOKOUT

### AI Campaign Dispatch Engine

*Describe who to email. Let the agent handle the rest.*

![Python](https://img.shields.io/badge/Python-3.12-blue?style=flat-square&logo=python&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-Agent-green?style=flat-square)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Brevo](https://img.shields.io/badge/Brevo-Email-0092FF?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

</div>

---

## What is Lookout?

Lookout is an agentic email dispatch system built for SoulSync. You describe your audience in plain English — the agent reasons about who to target, queries the database, generates a personalized email, and dispatches it on your approval.

No SQL. No template editor. Just intent.

```
▸ target: top 3 users by listening time
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                      app.py                         │
│                  orchestrator                       │
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
│      db/         │      │        Brevo              │
│  users collection│      │  transactional email      │
└──────────────────┘      └──────────────────────────┘
```

---

## Agent flow

1. **Intent parsing** — You describe your target in natural language. The agent infers `filters`, `sort_by`, `ascending`, and `limit` from your prompt.
2. **User discovery** — The `find_users` tool queries MongoDB with those parameters and returns serialized user records.
3. **Template generation** — A structured-output LLM generates a subject and body template using only the fields that actually exist on the matched users.
4. **Rendered preview** — The template is filled with real data from the first matched user. You see exactly what the email will look like — no `{placeholder}` text.
5. **Approval gate** — Dispatch waits for your confirmation before sending anything.
6. **HTML dispatch** — Each user gets their own rendered email, wrapped in a branded HTML layout and sent via Brevo.

---

## Project structure

```
lookout/
├── app.py          entrypoint — runs the full dispatch loop
├── config.py       env config and constants
├── agent/          agent modules
│   ├── __init__.py
│   ├── core.py     finder agent with find_users tool binding
│   └── tools.py    find_users (MongoDB) and sendMail (Brevo) tools
├── campaign/       campaign processing
│   ├── __init__.py
│   ├── models.py   Pydantic schemas — EmailTemplate, EmailDraft, DispatchedResult
│   └── drafting.py template generation, rendering, HTML wrapping
├── db/             database access
│   ├── __init__.py
│   └── client.py   MongoDB client + collection reference
└── ui/             cli interface
    ├── __init__.py
    └── cli.py      CLI — gradient banner, spinner, layout, colors
```

---

## Stack

| Component | Technology |
|---|---|
| Agent framework | LangChain + LangGraph |
| LLM | Groq — `openai/gpt-oss-120b` |
| Structured output | Pydantic v2 |
| Database | MongoDB via PyMongo |
| Email delivery | Brevo Transactional API |
| Environment | python-dotenv |

---

## Setup

```bash
git clone https://github.com/itslokeshx/Lookout.git
cd Lookout

python3 -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file:

```env
GROQ_API_KEY=your_groq_api_key
BREVO_API_KEY=your_brevo_api_key
MONGODB_URI=your_mongodb_connection_string
```

Run:

```bash
python3 app.py
```

---

## Usage examples

```
▸ target: top 5 users by listening time
▸ target: users who joined in the last 7 days
▸ target: least active users this month
▸ target: top 10 listeners and send them an exclusive offer
```

---

## Available query fields

The agent can filter and sort on any of these:

| Field | Type | Description |
|---|---|---|
| `name` | string | Display name |
| `email` | string | Email address |
| `totalListeningTime` | number | Total seconds listened |
| `createdAt` | date | Account creation date |
| `updatedAt` | date | Last active date |

---

## License

MIT — see [LICENSE](LICENSE)
