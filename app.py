import time

from langchain_core.messages import HumanMessage

from agent import finder_agent, sendMail, get_tool_result
from campaign import DispatchedResult, generate_template, renderTemplate, to_html
from ui import Spinner, banner, show_template, show_recipients, ask_approval
from ui import show_send_result, show_aborted, show_no_match, show_summary, prompt_input, ask_loop


def run_dispatch(user_prompt: str):
    start = time.time()

    with Spinner("Searching for users..."):
        response = finder_agent.invoke({"messages": [HumanMessage(content=user_prompt)]})
        matched_users = get_tool_result(response)

    if not matched_users:
        show_no_match()
        return DispatchedResult(totalUsers=0, sent=0, failed=0, duration=round(time.time() - start, 2))

    for i, user in enumerate(matched_users):
        user["minutesListened"] = round(user.pop("totalListeningTime", 0) / 60)
        user["rank"] = i + 1

    with Spinner("Generating template..."):
        template = generate_template(matched_users, user_prompt)

    preview = renderTemplate(template, matched_users[0])
    show_template(preview)
    show_recipients(matched_users)

    if not ask_approval():
        show_aborted()
        return DispatchedResult(
            totalUsers=len(matched_users), sent=0, failed=0,
            rejected=len(matched_users), duration=round(time.time() - start, 2)
        )

    sent, failed = 0, 0
    for user in matched_users:
        draft = renderTemplate(template, user)
        html_body = to_html(draft)
        result = sendMail.invoke({"receiver": draft.recipient, "subject": draft.subject, "body": html_body})
        if "Failed" in result:
            show_send_result(draft.recipient, False, result.split("Failed:")[-1].strip())
            failed += 1
        else:
            detail = result.split("(")[-1].rstrip(")") if "(" in result else ""
            show_send_result(draft.recipient, True, detail)
            sent += 1

    dispatch = DispatchedResult(
        totalUsers=len(matched_users), sent=sent, failed=failed,
        duration=round(time.time() - start, 2)
    )
    show_summary(dispatch)
    return dispatch


if __name__ == "__main__":
    banner()
    while True:
        prompt = prompt_input()
        if not prompt:
            break
        print()
        run_dispatch(prompt)
        if not ask_loop():
            break
