import os
import google.generativeai as genai
from typing import List, Dict

MODEL = "gemini-1.5-flash"

def configure_gemini():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY in environment")
    genai.configure(api_key=api_key)


async def ask_gemini(prompt: str, context_chunks: List[Dict[str, str]] = None) -> Dict:
    """
    Call Gemini with a user query and optional retrieved chunks (RAG).
    
    Args:
        prompt (str): User question
        context_chunks (List[Dict]): [{"text": "...", "score": 0.85, "source": "..."}]
    
    Returns:
        dict with {"answer": str, "confidence": float, "sources": List[str]}
    """
    context = ""
    sources = []

    if context_chunks:
        context_lines = []
        for c in context_chunks:
            context_lines.append(c.get("text", ""))
            if "fileId" in c:
                sources.append(c["fileId"])
        context = "\n\n".join(context_lines)

    final_prompt = f"""
You are an AI assistant for customer FAQs.

User query:
{prompt}

Relevant context from company documents:
{context}

Answer concisely and politely.
If context is insufficient, say "I'm not sure, let me connect you to a human agent."
"""

    response = genai.GenerativeModel(MODEL).generate_content(final_prompt)

    # Extract text safely
    answer = response.text if hasattr(response, "text") else str(response)

    return {
        "answer": answer.strip(),
        "confidence": 0.8 if context else 0.5,  # TODO: compute dynamically
        "sources": sources,
    }
