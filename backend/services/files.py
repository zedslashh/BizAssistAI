import os
from typing import List
from PyPDF2 import PdfReader
from docx import Document

from ..vectorstore.store import VectorStore



# --- File Parsing ---
def parse_pdf(file_path: str) -> str:
    """
    Extract raw text from a PDF file.
    """
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text


def parse_txt(file_path: str) -> str:
    """
    Extract raw text from a plain .txt file.
    """
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()


def parse_docx(file_path: str) -> str:
    """
    Extract raw text from a DOCX (Word) file.
    """
    doc = Document(file_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def parse_file(file_path: str) -> str:
    """
    Auto-detect file type and extract text.
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return parse_pdf(file_path)
    elif ext == ".txt":
        return parse_txt(file_path)
    elif ext == ".docx":
        return parse_docx(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


# --- Chunking ---
def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """
    Split text into overlapping chunks.
    """
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        start = end - overlap if end < len(words) else end
    return chunks


# --- Orchestration ---
async def process_file(org_id: str, file_id: str, file_path: str):
    """
    Full pipeline:
      1. Parse file
      2. Chunk text
      3. Embed + save vectors in FAISS
      4. Save metadata in MongoDB
    """
    raw_text = parse_file(file_path)
    chunks = chunk_text(raw_text)

    metas = [{"page": i + 1} for i in range(len(chunks))]

    store = VectorStore()
    await store.add_texts_with_db(chunks, metas, org_id, file_id)
    store.save(f"vectorstore_data/{org_id}.faiss")

    return {"chunks": len(chunks), "status": "indexed"}
