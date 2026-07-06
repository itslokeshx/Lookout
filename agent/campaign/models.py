from pydantic import BaseModel


class EmailTemplate(BaseModel):
    subject_template: str
    body_template: str
    reason: str


class EmailDraft(BaseModel):
    recipient: str
    subject: str
    body: str


class DispatchedResult(BaseModel):
    totalUsers: int
    sent: int
    failed: int
    rejected: int = 0
    duration: float = 0.0
