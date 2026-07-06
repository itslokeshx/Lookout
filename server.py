"""
Lookout API — FastAPI backend bridging the React frontend to the agent pipeline.

Endpoints:
  POST /api/find-users      — Run agent to find users + generate email template
  POST /api/approve-dispatch — Send the approved campaign to all matched users
  GET  /api/dispatch-history — List past dispatches
"""

import time
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.messages import HumanMessage

from agent import finder_agent, sendMail, get_tool_result
from campaign import generate_template, renderTemplate, to_html

app = FastAPI(title="Lookout API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

dispatches: dict = {}
dispatch_history: list[dict] = []


class FindUsersRequest(BaseModel):
    prompt: str

class ApproveDispatchRequest(BaseModel):
    dispatch_id: str


@app.post("/api/find-users")
async def find_users_endpoint(req: FindUsersRequest):
    """
    1. Invoke the finder_agent with the user's prompt
    2. Process matched users (normalize minutesListened)
    3. Generate an email template via LLM
    4. Return users + rendered preview + dispatch_id for approval
    """
    try:
        response = finder_agent.invoke(
            {"messages": [HumanMessage(content=req.prompt)]}
        )
        matched_users = get_tool_result(response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {e}")

    if not matched_users:
        return {"users": [], "template": None, "dispatch_id": None}

    for i, user in enumerate(matched_users):
        user["minutesListened"] = round(user.pop("totalListeningTime", 0) / 60)
        user["rank"] = i + 1

    try:
        template = generate_template(matched_users, req.prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Template generation error: {e}")

    preview = renderTemplate(template, matched_users[0])

    dispatch_id = str(uuid.uuid4())
    dispatches[dispatch_id] = {
        "prompt": req.prompt,
        "users": matched_users,
        "template": template,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    return {
        "users": matched_users,
        "template": {
            "recipient": preview.recipient,
            "subject": preview.subject,
            "body": preview.body,
            "reason": template.reason,
        },
        "dispatch_id": dispatch_id,
    }


@app.post("/api/approve-dispatch")
async def approve_dispatch_endpoint(req: ApproveDispatchRequest):
    """
    Send the campaign to every matched user.
    Returns per-recipient results and a summary.
    """
    dispatch = dispatches.get(req.dispatch_id)
    if not dispatch:
        raise HTTPException(status_code=404, detail="Dispatch not found")

    users = dispatch["users"]
    template = dispatch["template"]
    start = time.time()

    results = []
    sent_count = 0
    failed_count = 0

    for user in users:
        draft = renderTemplate(template, user)
        html_body = to_html(draft)
        result = sendMail.invoke({
            "receiver": draft.recipient,
            "subject": draft.subject,
            "body": html_body,
        })

        if "Failed" in result:
            detail = result.split("Failed:")[-1].strip()
            results.append({"recipient": draft.recipient, "success": False, "detail": detail})
            failed_count += 1
        else:
            detail = result.split("(")[-1].rstrip(")") if "(" in result else ""
            results.append({"recipient": draft.recipient, "success": True, "detail": detail})
            sent_count += 1

    duration = round(time.time() - start, 2)

    summary = {
        "totalUsers": len(users),
        "sent": sent_count,
        "failed": failed_count,
        "rejected": 0,
        "duration": duration,
    }

    dispatch_history.insert(0, {
        "id": req.dispatch_id,
        "prompt": dispatch["prompt"],
        "totalUsers": len(users),
        "sent": sent_count,
        "failed": failed_count,
        "status": "sent" if failed_count == 0 else "sent",
        "timestamp": dispatch["created_at"],
    })

    del dispatches[req.dispatch_id]

    return {
        "results": results,
        "summary": summary,
        "duration": duration,
    }


@app.get("/api/dispatch-history")
async def dispatch_history_endpoint():
    """Return recent dispatch history."""
    return dispatch_history
