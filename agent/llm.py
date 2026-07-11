from langchain_groq import ChatGroq as BaseChatGroq
from agent.config import GROQ_API_KEYS

class ChatGroq(BaseChatGroq):
    def __init__(self, **kwargs):
        primary_key = kwargs.get("api_key") or (GROQ_API_KEYS[0] if GROQ_API_KEYS else None)
        kwargs["api_key"] = primary_key
        super().__init__(**kwargs)
        
        keys = []
        if primary_key:
            keys.append(primary_key)
        for k in GROQ_API_KEYS:
            if k and k not in keys:
                keys.append(k)
        
        if not keys:
            self._instances = [BaseChatGroq(**kwargs)]
        else:
            self._instances = []
            for key in keys:
                inst_kwargs = kwargs.copy()
                inst_kwargs["api_key"] = key
                self._instances.append(BaseChatGroq(**inst_kwargs))

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        last_error = None
        for inst in self._instances:
            try:
                return inst._generate(messages, stop=stop, run_manager=run_manager, **kwargs)
            except Exception as e:
                last_error = e
        if last_error:
            raise last_error

    async def _agenerate(self, messages, stop=None, run_manager=None, **kwargs):
        last_error = None
        for inst in self._instances:
            try:
                return await inst._agenerate(messages, stop=stop, run_manager=run_manager, **kwargs)
            except Exception as e:
                last_error = e
        if last_error:
            raise last_error

    def _stream(self, messages, stop=None, run_manager=None, **kwargs):
        last_error = None
        for inst in self._instances:
            try:
                yield from inst._stream(messages, stop=stop, run_manager=run_manager, **kwargs)
                return
            except Exception as e:
                last_error = e
        if last_error:
            raise last_error

    async def _astream(self, messages, stop=None, run_manager=None, **kwargs):
        last_error = None
        for inst in self._instances:
            try:
                async for chunk in inst._astream(messages, stop=stop, run_manager=run_manager, **kwargs):
                    yield chunk
                return
            except Exception as e:
                last_error = e
        if last_error:
            raise last_error
