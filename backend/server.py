import time
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage

from agent.core import build_finder_agent, get_tool_result
from agent.chat_agent import build_chat_agent
from agent.tools import sendMail
from agent.campaign import generate_template, renderTemplate, to_html
from agent.config_store import (
    load_settings,
    save_settings,
    list_databases,
    list_collections,
    get_sample_document,
    check_join_relationship,
    LookoutSettings,
    FieldMapping,
    MetricField,
    JoinConfig,
)
from agent.field_mapper import suggest_field_mapping

app = FastAPI(title="Lookout API", version="2.0.0")

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


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = Field(default_factory=list)


class SaveSettingsRequest(BaseModel):
    db_name: str
    collection_name: str
    field_mapping: dict
    metrics: list[dict] = Field(default_factory=list)
    sender_name: str = ""
    sender_email: str = ""
    product_name: str = ""
    enrichment: dict | None = None


class SuggestMappingRequest(BaseModel):
    db_name: str
    primary_collection: str
    secondary_collection: str | None = None


class CheckJoinRequest(BaseModel):
    db_name: str
    primary_collection: str
    secondary_collection: str
    local_key: str
    foreign_key: str


@app.get("/api/settings")
async def get_settings():
    settings = load_settings()
    return settings.model_dump()


@app.post("/api/settings")
async def update_settings(req: SaveSettingsRequest):
    settings = LookoutSettings(
        db_name=req.db_name,
        collection_name=req.collection_name,
        field_mapping=FieldMapping(**req.field_mapping),
        metrics=[MetricField(**m) for m in req.metrics if m.get("field", "").strip()],
        sender_name=req.sender_name,
        sender_email=req.sender_email,
        product_name=req.product_name,
        enrichment=JoinConfig(**req.enrichment) if req.enrichment else None,
        setup_complete=True,
    )
    save_settings(settings)
    return {"status": "saved"}


@app.get("/api/databases")
async def get_databases():
    try:
        return {"databases": list_databases()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cannot connect to MongoDB: {e}")


@app.get("/api/collections/{db_name}")
async def get_collections(db_name: str):
    try:
        return {"collections": list_collections(db_name)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sample/{db_name}/{collection_name}")
async def get_sample(db_name: str, collection_name: str):
    doc = get_sample_document(db_name, collection_name)
    if not doc:
        return {"sample": None, "fields": []}

    fields = []
    for k, v in doc.items():
        fields.append({
            "name": k,
            "type": type(v).__name__,
            "sample": repr(v)[:100],
        })

    return {"sample": doc, "fields": fields}


@app.post("/api/suggest-mapping")
async def suggest_mapping(req: SuggestMappingRequest):
    primary_sample = get_sample_document(req.db_name, req.primary_collection)
    if not primary_sample:
        raise HTTPException(status_code=404, detail="Primary collection is empty.")

    secondary_sample = None
    if req.secondary_collection:
        secondary_sample = get_sample_document(req.db_name, req.secondary_collection)
        if not secondary_sample:
            raise HTTPException(status_code=404, detail="Secondary collection is empty.")

    try:
        suggestion = suggest_field_mapping(primary_sample, secondary_sample)
        return suggestion.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Field mapping suggestion failed: {e}")


@app.post("/api/check-join")
async def check_join(req: CheckJoinRequest):
    result = check_join_relationship(
        req.db_name,
        req.primary_collection,
        req.secondary_collection,
        req.local_key,
        req.foreign_key,
    )
    return result


@app.post("/api/find-users")
async def find_users_endpoint(req: FindUsersRequest):
    try:
        agent = build_finder_agent()
        response = agent.invoke(
            {"messages": [HumanMessage(content=req.prompt)]}
        )
        matched_users = get_tool_result(response)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Agent error: {e}")

    if not matched_users:
        return {"users": [], "template": None, "dispatch_id": None}

    settings = load_settings()

    for i, user in enumerate(matched_users):
        for metric in settings.metrics:
            raw = user.get(metric.field, 0)
            if metric.unit == "seconds" and isinstance(raw, (int, float)):
                user["minutesListened"] = round(raw / 60)
        user["rank"] = i + 1

    try:
        template = generate_template(matched_users, req.prompt)
    except Exception as e:
        import traceback
        traceback.print_exc()
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
        "status": "sent" if failed_count == 0 else "partial",
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
    return dispatch_history


@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    try:
        agent = build_chat_agent()

        messages = []
        for msg in req.history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            else:
                from langchain_core.messages import AIMessage
                messages.append(AIMessage(content=msg["content"]))

        messages.append(HumanMessage(content=req.message))

        response = agent.invoke({"messages": messages})

        ai_messages = [
            m for m in response["messages"]
            if hasattr(m, "content") and m.content and m.type == "ai"
        ]

        reply = ai_messages[-1].content if ai_messages else "I couldn't process that request."

        return {"reply": reply}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Chat error: {e}")
