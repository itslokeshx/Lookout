from langchain_core.messages import HumanMessage
from agent.core import finder_agent
from agent.tools import query_cache

prompt = """if the authProvider is google then mail them if not then dont: because the gmail is legit and if i mean all where i have 163 users soo it should able to send it in future i will send to 1000 so make it capable
mail to all users those are using gmail the mail is about informing as the wrapper feature is added in the profile page so update the app by downloading the latest verison from this link:https://github.com/itslokeshx/SoulSync/releases/download/v3.0/SoulSync_3.0.0.apk where put this link as download button and can also use it the web. here detailed about wrapper":It includes a full-screen responsive modal, real-time stats for your listening history, a vinyl disc for your top songs, and a shareable concert ticket pass"""

response = finder_agent.invoke({"messages": [HumanMessage(content=prompt)]})
for msg in response["messages"]:
    print(msg.type, getattr(msg, "name", ""), getattr(msg, "content", ""))

print("Users in cache:", len(getattr(query_cache, "last_matched_users", [])))
