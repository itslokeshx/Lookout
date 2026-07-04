# 👁️ Lookout

**An agent that watches your user base and reaches out to the ones who matter most — with reasoning you can see, and nothing sent without your approval.**

---

## What is Lookout?

Lookout connects to your user database, ranks users by a chosen engagement metric, and hands the top 5 to an AI agent that drafts a personalized email for each one — with a clear, human-readable reason for the pick.

The ranking is deterministic code. The agent never chooses *who* — it decides *how to communicate* with the people ranking already selected. Every draft passes through a human approval gate before anything sends.

Built to be **database-agnostic** — point it at any collection with a numeric metric field and an email field, and it works.

## Why this exists

Manually reviewing user data to find and thank your most engaged users doesn't scale past a handful of people. Lookout automates the *ranking* and the *drafting* — the two time-consuming parts — while keeping a human in control of the *sending*.

## How it works

```
Your database
      │
      ▼
[ Fetch Tool ]        → pulls users + their metric values, live
      │
      ▼
[ Ranking ]            → deterministic code selects top 5 by metric
      │                   (no LLM involved in the math)
      ▼
[ Context Builder ]    → shapes raw numbers into structured signals
      │                   e.g. { rank: 1, engagement_tier: "high" }
      ▼
[ Agent ]              → for each of the 5 users, generates:
      │                    - a personalized email draft
      │                    - a plain-language reason for the pick
      ▼
[ Approval Dashboard ] → you review each draft + reasoning
      │                    Approve / Edit / Reject
      ▼
[ Email Tool ]         → sends only what you approved
```

## Example output

```json
{
  "user_id": "665f...",
  "email": "user@example.com",
  "rank": 1,
  "engagement_tier": "high",
  "reason": "Ranked #1 this month, well ahead of the next closest user by engagement.",
  "draft_subject": "You're one of our most active users 🎧",
  "draft_body": "Hey Alex, we noticed how engaged you've been this month...",
  "status": "pending"
}
```

## Tech stack

| Layer | Tool |
|---|---|
| Agent orchestration | LangChain |
| Structured output | Pydantic |
| LLM | Groq (Llama 3.1) |
| Backend | FastAPI |
| Approval dashboard | React |
| Database | MongoDB (config-driven, swappable) |
| Email delivery | Resend |

## Setup

```bash
git clone https://github.com/itslokeshx/lookout.git
cd lookout
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file:

```
MONGO_URI=your_mongodb_connection_string
GROQ_API=your_groq_api_key
RESEND_API_KEY=your_resend_api_key
```

Configure your target collection in `config.py`:

```python
COLLECTION_NAME = "users"
METRIC_FIELD = "minutes_listened"
EMAIL_FIELD = "email"
TOP_N = 5
```

## Usage

```bash
python main.py
```

1. Lookout fetches your data and deterministically ranks the top N users
2. The Context Builder shapes each user's raw metrics into structured signals
3. The agent drafts a personalized email + reasoning per user
4. Drafts appear in the Approval Dashboard
5. Approve, edit, or reject each one
6. Approved emails send immediately

## Project structure

```
lookout/
├── main.py
├── agent.py
├── tools.py
├── models.py
├── prompts.py
├── config.py
└── email_service.py
```

## What Lookout is NOT (v1 scope)

- Not a full campaign platform — no retention/win-back strategies yet (planned for v1.1)
- Not autonomous sending — every email requires explicit human approval
- Not multi-channel — email only for now
- The agent does not choose *who* gets contacted — ranking is deterministic; the agent only decides *how* to communicate

## Roadmap

- [ ] Mission-driven campaign selection (reward / retention / win-back) — agent chooses strategy, not just recipients, based on live data
- [ ] At-risk user detection (declining engagement, not just top performers)
- [ ] Campaign history + memory (don't reward the same user twice in a row)
- [ ] Postgres and CSV connectors alongside MongoDB
- [ ] Send outcome tracking (opens/clicks feeding back into future picks)

## License

MIT