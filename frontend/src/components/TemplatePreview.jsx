import { Mail, Check, X, Loader2, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { useState, useMemo } from 'react';

function renderTemplate(template, user) {
  if (!template || !user) return { subject: '', body: '' };
  let subject = template;
  let body = arguments[2] || '';
  // This is called as renderTemplate(subjectTpl, bodyTpl, user) or renderTemplate(tpl, user)
  return null;
}

function fillTemplate(str, user) {
  if (!str) return '';
  return str.replace(/\{(\w+)\}/g, (match, key) => {
    return user[key] !== undefined && user[key] !== null ? String(user[key]) : match;
  });
}

function draftToHtml(subject, body, productName = 'LookOut') {
  const lines = body.split('\n');
  const bodyParts = [];
  let bulletBuffer = [];

  function flushBullets() {
    if (!bulletBuffer.length) return;
    let itemsHtml = '';
    for (const item of bulletBuffer) {
      itemsHtml += `<tr><td valign="top" style="padding:0 10px 12px 0;width:24px;">
<div style="width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#a78bfa);margin-top:7px;"></div>
</td>
<td style="padding:0 0 12px;font-size:15px;line-height:1.6;color:#e2e8f0;">
${item}</td></tr>`;
    }
    bodyParts.push(
      `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 16px 4px;width:100%;">${itemsHtml}</table>`
    );
    bulletBuffer = [];
  }

  for (const rawLine of lines) {
    const stripped = rawLine.trim();
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    const singleLinkRegex = /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/;

    const isBullet = stripped.startsWith('•') || stripped.startsWith('- ') || stripped.startsWith('* ');
    if (isBullet) {
      let text = stripped.replace(/^[•\-\*]\s*/, '');
      text = text.replace(linkRegex, '<a href="$2" style="color:#a78bfa;text-decoration:underline;">$1</a>');
      bulletBuffer.push(text);
      continue;
    }

    flushBullets();

    if (!stripped) {
      bodyParts.push('<div style="height:10px;"></div>');
      continue;
    }

    const singleLinkMatch = stripped.match(singleLinkRegex);
    if (singleLinkMatch) {
      const linkText = singleLinkMatch[1];
      const linkUrl = singleLinkMatch[2];
      bodyParts.push(
        `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;"><tr><td align="center" style="border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6,#a78bfa);">
<a href="${linkUrl}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;letter-spacing:0.3px;">${linkText}</a></td></tr></table>`
      );
      continue;
    }

    let processed = stripped.replace(linkRegex, '<a href="$2" style="color:#a78bfa;text-decoration:underline;font-weight:600;">$1</a>');
    bodyParts.push(
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#e2e8f0;">${processed}</p>`
    );
  }

  flushBullets();
  const bodyHtml = bodyParts.join('\n');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f14;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.06);">
<tr>
<td style="padding:36px 44px 28px;background:linear-gradient(135deg,#18182a 0%,#1e1b3a 50%,#1a1632 100%);border-bottom:1px solid rgba(255,255,255,0.06);">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td>
<span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">${productName}</span>
</td>
</tr></table>
</td>
</tr>
<tr>
<td style="padding:36px 44px 40px;background-color:#16161e;">
${bodyHtml}
</td>
</tr>
<tr>
<td style="padding:24px 44px;background-color:#121218;border-top:1px solid rgba(255,255,255,0.05);">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td>
<p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">
You received this because you're a ${productName} member.
</p>
</td>
<td align="right" valign="middle">
<span style="font-size:11px;font-weight:600;color:#4b5563;letter-spacing:0.5px;text-transform:uppercase;">Powered by LookOut</span>
</td>
</tr></table>
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export default function TemplatePreview({
  template,
  users = [],
  settings,
  onApprove,
  onReject,
  isApproving = false,
}) {
  const [previewIdx, setPreviewIdx] = useState(0);
  const [previewTab, setPreviewTab] = useState('html');
  const [iframeHeight, setIframeHeight] = useState('400px');
  const [isEditing, setIsEditing] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [hasEdited, setHasEdited] = useState(false);

  if (!template) return null;

  const subjectTpl = hasEdited ? editSubject : (template.subject_template || template.subject || '');
  const bodyTpl = hasEdited ? editBody : (template.body_template || template.body || '');

  const emailField = settings?.field_mapping?.email || 'email';
  const nameField = settings?.field_mapping?.name || 'name';

  const previewUser = users[previewIdx] || {};
  const renderedSubject = fillTemplate(subjectTpl, previewUser);
  const renderedBody = fillTemplate(bodyTpl, previewUser);
  const recipientEmail = previewUser[emailField] || previewUser.email || 'recipient@example.com';
  const recipientName = previewUser[nameField] || previewUser.name || previewUser.username || '';

  const bodyLines = renderedBody.split('\n').filter(l => l.trim());

  const htmlContent = useMemo(() => {
    return draftToHtml(renderedSubject, renderedBody, settings?.product_name || 'LookOut');
  }, [renderedSubject, renderedBody, settings]);

  const handleIframeLoad = (e) => {
    if (e.target && e.target.contentWindow && e.target.contentWindow.document.body) {
      setTimeout(() => {
        const height = e.target.contentWindow.document.body.scrollHeight;
        setIframeHeight(`${height + 30}px`);
      }, 50);
    }
  };

  const startEdit = () => {
    if (!hasEdited) {
      setEditSubject(template.subject_template || template.subject || '');
      setEditBody(template.body_template || template.body || '');
    }
    setIsEditing(true);
  };

  const saveEdit = () => {
    setHasEdited(true);
    setIsEditing(false);
  };

  const cancelEdit = () => {
    if (!hasEdited) {
      setEditSubject('');
      setEditBody('');
    }
    setIsEditing(false);
  };

  const handleApprove = () => {
    if (hasEdited) {
      onApprove(editSubject, editBody);
    } else {
      onApprove();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-accent-muted">
              <Mail size={13} className="text-accent" />
            </div>
            <span className="text-sm font-medium text-text-primary">
              Email preview
            </span>
            {hasEdited && (
              <span className="text-[10px] text-warning font-medium uppercase tracking-wider ml-1">edited</span>
            )}
          </div>

          <div className="flex items-center bg-surface-raised border border-border p-0.5 rounded-lg">
            <button
              onClick={() => setPreviewTab('html')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                previewTab === 'html'
                  ? 'bg-surface text-text-primary shadow-sm'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              HTML
            </button>
            <button
              onClick={() => setPreviewTab('text')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                previewTab === 'text'
                  ? 'bg-surface text-text-primary shadow-sm'
                  : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              Plain Text
            </button>
          </div>
        </div>

        {users.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewIdx(Math.max(0, previewIdx - 1))}
              disabled={previewIdx === 0}
              className="p-1 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-surface-hover transition-all disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-text-tertiary tabular-nums min-w-[4rem] text-center">
              {previewIdx + 1} of {users.length}
            </span>
            <button
              onClick={() => setPreviewIdx(Math.min(users.length - 1, previewIdx + 1))}
              disabled={previewIdx === users.length - 1}
              className="p-1 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-surface-hover transition-all disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 bg-surface-raised border-b border-border space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-text-tertiary uppercase tracking-wider w-14 shrink-0">To</span>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm text-text-secondary font-mono truncate">
                {recipientEmail}
              </span>
              {recipientName && (
                <span className="text-xs text-text-tertiary">({recipientName})</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-text-tertiary uppercase tracking-wider w-14 shrink-0">Subject</span>
            <span className="text-sm font-semibold text-text-primary">
              {renderedSubject}
            </span>
          </div>
        </div>

        {previewTab === 'html' ? (
          <div className="bg-[#0f0f14]">
            <iframe
              srcDoc={htmlContent}
              title="HTML Email Preview"
              style={{ height: iframeHeight }}
              className="w-full border-none block"
              onLoad={handleIframeLoad}
            />
          </div>
        ) : (
          <div className="px-6 py-6 bg-surface space-y-3">
            {bodyLines.map((line, i) => (
              <p key={i} className="text-sm text-text-secondary leading-relaxed m-0">
                {line}
              </p>
            ))}
          </div>
        )}

        {template.reason && (
          <div className="px-5 pb-4">
            <div className="px-4 py-2.5 rounded-lg bg-surface-raised border border-border">
              <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">Why this template — </span>
              <span className="text-xs text-text-secondary">{template.reason}</span>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {isEditing && (
        <div className="mt-4 rounded-xl border border-border bg-surface-raised p-5 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Edit Template</span>
            <span className="text-[10px] text-text-tertiary">Use {'{field_name}'} for placeholders</span>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">Subject</label>
            <input
              type="text"
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none transition-all duration-200 focus:border-border-strong"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">Body</label>
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={6}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none transition-all duration-200 focus:border-border-strong resize-y leading-relaxed"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={saveEdit}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-surface text-xs font-semibold transition-all hover:bg-accent-hover cursor-pointer"
            >
              <Check size={12} /> Save changes
            </button>
            <button
              onClick={cancelEdit}
              className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-text-secondary hover:bg-surface-hover transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={handleApprove}
          disabled={isApproving || isEditing}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-accent text-surface text-sm font-medium transition-all duration-150 hover:bg-accent-hover disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {isApproving ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Check size={15} />
          )}
          {isApproving ? 'Dispatching…' : `Approve & Send to ${users.length || 'All'}`}
        </button>
        {!isEditing && (
          <button
            onClick={startEdit}
            disabled={isApproving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-text-secondary text-sm font-medium transition-all duration-150 hover:bg-surface-hover hover:text-text-primary disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <Pencil size={14} />
            Edit
          </button>
        )}
        <button
          onClick={onReject}
          disabled={isApproving || isEditing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-text-secondary text-sm font-medium transition-all duration-150 hover:bg-surface-hover hover:text-text-primary disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          <X size={15} />
          Reject
        </button>
      </div>
    </div>
  );
}
