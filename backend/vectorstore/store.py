import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any
import os
import pickle

class VectorStore:
    def __init__(self, dim: int = 768, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)
        self.dim = dim
        self.index = faiss.IndexFlatL2(dim)
        self.metadata: List[Dict[str, Any]] = []  # parallel array for metadata

    def embed(self, texts: List[str]) -> np.ndarray:
        return np.array(self.model.encode(texts, normalize_embeddings=True))

    def add_texts(self, texts: List[str], metadatas: List[Dict[str, Any]]):
        assert len(texts) == len(metadatas)
        vectors = self.embed(texts)
        self.index.add(vectors)
        self.metadata.extend(metadatas)

    def search(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        q_vec = self.embed([query])
        distances, indices = self.index.search(q_vec, k)
        results = []
        for i, idx in enumerate(indices[0]):
            if idx == -1: 
                continue
            results.append({
                "text": self.metadata[idx].get("text"),
                "score": float(distances[0][i]),
                **self.metadata[idx]
            })
        return results

    def save(self, path: str):
        faiss.write_index(self.index, os.path.join(path, "faiss.index"))
        with open(os.path.join(path, "metadata.pkl"), "wb") as f:
            pickle.dump(self.metadata, f)

    def load(self, path: str):
        self.index = faiss.read_index(os.path.join(path, "faiss.index"))
        with open(os.path.join(path, "metadata.pkl"), "rb") as f:
            self.metadata = pickle.load(f)
