import json
import time

from langchain_core.messages import HumanMessage, ToolMessage

from models import DispatchedResult
from agent import finder_agent
from drafting import generate_template, renderTemplate
from tools import sendMail


def get_tool_result(agent_response):
    for msg in agent_response["messages"]:
        if isinstance(msg, ToolMessage) and msg.name == "find_users":
            return json.loads(msg.content)
    return None


def run_dispatch(user_prompt: str):
    start = time.time()
    response = finder_agent.invoke({"messages": [HumanMessage(content=user_prompt)]})
    matched_users = get_tool_result(response)

    if not matched_users:
        print("No users matched.")
        return DispatchedResult(totalUsers=0, sent=0, failed=0, duration=round(time.time() - start, 2))

    for i, user in enumerate(matched_users):
        user["minutesListened"] = round(user.pop("totalListeningTime", 0) / 60)
        user["rank"] = i + 1

    template = generate_template(matched_users, user_prompt)
    preview = renderTemplate(template, matched_users[0])

    print(f"Matched {len(matched_users)} users.")
    print(f"\nSubject: {preview.subject}\n\n{preview.body}")
    print(f"\nRecipients:")
    for user in matched_users:
        print(f"  {user['rank']}. {user['name']} ({user['email']})")
    print()
    choice = input("Approve this template for all matched users? (y/n): ").strip().lower()

    if choice != "y":
        print("Aborted.")
        return DispatchedResult(
            totalUsers=len(matched_users), sent=0, failed=0,
            rejected=len(matched_users), duration=round(time.time() - start, 2)
        )

    sent, failed = 0, 0
    for user in matched_users:
        draft = renderTemplate(template, user)
        result = sendMail.invoke({"receiver": draft.recipient, "subject": draft.subject, "body": draft.body})
        if "Failed" in result:
            print(f"  ✗ {result}")
            failed += 1
        else:
            print(f"  ✓ {result}")
            sent += 1

    return DispatchedResult(
        totalUsers=len(matched_users), sent=sent, failed=failed,
        duration=round(time.time() - start, 2)
    )


if __name__ == "__main__":
    prompt = input("Describe who to email: ")
    result = run_dispatch(prompt)
    print(result)
