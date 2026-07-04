# 👁️ Lookout

**An agent that watches your user base and reaches out to the ones who matter most — with reasoning you can see, and nothing sent without your approval.**

---

## What is Lookout?

Lookout connects to your user database, identifies your top 5 users by a chosen engagement metric, and drafts a personalized email for each one — explaining *why* that user was picked, not just generating generic copy.

Every draft passes through a human approval gate before anything is sent. Lookout decides who deserves recognition and what to say. You decide whether it actually goes out.

Built to be **database-agnostic** — point it at any collection with a numeric metric field and an email field, and it works.

## Why this exists

Manually reviewing user data to find and thank your most engaged users doesn't scale past a handful of people. Lookout automates the *finding* and the *drafting* — the two time-consuming parts — while keeping a human in control of the *sending*.

## How it works

```
Your database
      │
      ▼
[ Fetch Tool ]  → pulls users + their metric values, live
      │
      ▼
[ Ranking ]     → deterministic code selects top 5 by metric
      │            (no LLM involved in the math)
      ▼
[ Agent ]       → for each of the 5 users, generates:
      │            - a personalized email draft
      │            - a plain-language reason for the pick
      ▼
[ Approval Gate ] → you review each draft + reasoning
      │              Approve / Edit / Reject
      ▼
[ Email Tool ]    → sends only what you approved
```

## Example output

```json
{
  "user_id": "665f...",
  "email": "user@example.com",
  "metric_value": 4820,
  "reason": "Top 1 by total minutes listened this month — 3x the average of the next closest user.",
  "draft_subject": "You're one of our most active listeners 🎧",
  "draft_body": "Hey Alex, we noticed you've spent over 4,800 minutes...",
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
| Approval UI | React |
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

1. Lookout fetches your data and ranks the top N users
2. It drafts a personalized email + reasoning for each
3. Drafts appear in the approval queue (`localhost:3000`)
4. Approve, edit, or reject each one
5. Approved emails send immediately

## What Lookout is NOT (v1 scope)

- Not a full campaign platform — no retention/win-back strategies yet (planned for v1.1)
- Not autonomous sending — every email requires explicit human approval
- Not multi-channel — email only for now

## Roadmap

- [ ] Multiple campaign strategies (reward / retention / win-back) — agent chooses based on data, not just top-N
- [ ] At-risk user detection (declining engagement, not just top performers)
- [ ] Campaign history + memory (don't reward the same user twice in a row)
- [ ] Postgres and CSV connectors alongside MongoDB
- [ ] Send outcome tracking (opens/clicks feeding back into future picks)

## License

MIT