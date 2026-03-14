"""
Translation API Server
=======================
FastAPI server that exposes the 3-tier translation engine.

Run: python3 server.py
Then: http://localhost:8000/docs for interactive API docs

Endpoints:
  POST /translate          — Single translation
  POST /translate/batch    — Batch translation
  GET  /dictionary/search  — Search dictionary
  GET  /health             — Health check
  WS   /ws/translate       — WebSocket for live/streaming translation
"""

import os
import json
import time
import asyncio
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from engine import TranslationEngine, TranslationResult
from dictionary import DICTIONARY, get_relevant_entries, build_by_category

# ============================================================
# Config
# ============================================================

API_KEY = os.environ.get("ANTHROPIC_API_KEY")
ENABLE_NLLB = os.environ.get("ENABLE_NLLB", "false").lower() == "true"
PORT = int(os.environ.get("PORT", 8000))

# ============================================================
# App setup
# ============================================================

engine: Optional[TranslationEngine] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine
    print("Starting translation engine...")
    if not API_KEY:
        print("WARNING: No ANTHROPIC_API_KEY set. Claude translation tier disabled.")
        print("  Set it with: export ANTHROPIC_API_KEY=sk-ant-...")
    engine = TranslationEngine(
        anthropic_api_key=API_KEY,
        enable_nllb=ENABLE_NLLB,
    )
    print(f"Engine ready. NLLB={'enabled' if ENABLE_NLLB else 'disabled (set ENABLE_NLLB=true to enable)'}.")
    print(f"Dictionary: {len(DICTIONARY)} entries loaded.")
    yield
    print("Shutting down.")

app = FastAPI(
    title="Alopath Translation API",
    description="Rohingya ↔ English translation engine for the Alopath learning app",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Request / Response models
# ============================================================

class TranslateRequest(BaseModel):
    text: str = Field(..., description="Text to translate", examples=["aññí bimár"])
    direction: str = Field("ro_to_en", description="'ro_to_en' or 'en_to_ro'")
    context: str = Field("", description="Optional conversational context")
    category: Optional[str] = Field(None, description="Category hint: health, food, transport, etc.")

class TranslateResponse(BaseModel):
    translation: str
    source_text: str
    source_lang: str
    tier_used: str
    confidence: float
    latency_ms: float
    alternatives: list = []
    breakdown: dict = {}

class BatchRequest(BaseModel):
    items: list[str]
    direction: str = "ro_to_en"

class BatchResponse(BaseModel):
    translations: list[TranslateResponse]
    total_latency_ms: float

class DictEntry(BaseModel):
    ro: str
    en: str
    cat: str

# ============================================================
# Endpoints
# ============================================================

@app.get("/health")
def health():
    return {
        "status": "ok",
        "dictionary_size": len(DICTIONARY),
        "claude_enabled": API_KEY is not None,
        "nllb_enabled": ENABLE_NLLB,
    }

@app.post("/translate", response_model=TranslateResponse)
def translate(req: TranslateRequest):
    """Translate a single phrase between Rohingya and English."""
    result = engine.translate(
        text=req.text,
        direction=req.direction,
        context=req.context,
        category=req.category,
    )
    return TranslateResponse(
        translation=result.translation,
        source_text=result.source_text,
        source_lang=result.source_lang,
        tier_used=result.tier_used,
        confidence=result.confidence,
        latency_ms=result.latency_ms,
        alternatives=result.alternatives,
        breakdown=result.breakdown,
    )

@app.post("/translate/batch", response_model=BatchResponse)
def translate_batch(req: BatchRequest):
    """Translate multiple phrases at once."""
    start = time.time()
    results = engine.translate_batch(req.items, req.direction)
    return BatchResponse(
        translations=[
            TranslateResponse(
                translation=r.translation,
                source_text=r.source_text,
                source_lang=r.source_lang,
                tier_used=r.tier_used,
                confidence=r.confidence,
                latency_ms=r.latency_ms,
                alternatives=r.alternatives,
                breakdown=r.breakdown,
            )
            for r in results
        ],
        total_latency_ms=(time.time() - start) * 1000,
    )

@app.get("/dictionary/search")
def dictionary_search(
    q: str = Query(..., description="Search query"),
    limit: int = Query(20, le=50),
):
    """Search the Rohingya-English dictionary."""
    results = get_relevant_entries(q, n=limit)
    return {"query": q, "results": results, "count": len(results)}

@app.get("/dictionary/categories")
def dictionary_categories():
    """List all dictionary categories with entry counts."""
    cats = build_by_category()
    return {cat: len(entries) for cat, entries in cats.items()}

@app.get("/dictionary/all")
def dictionary_all():
    """Return the full dictionary."""
    return {"entries": DICTIONARY, "count": len(DICTIONARY)}


# ============================================================
# WebSocket for live translation (as user types / speaks)
# ============================================================

@app.websocket("/ws/translate")
async def ws_translate(ws: WebSocket):
    """
    WebSocket endpoint for real-time translation.
    
    Send JSON: {"text": "...", "direction": "ro_to_en", "context": ""}
    Receive JSON: {"translation": "...", "confidence": 0.9, ...}
    
    This enables the "live translation" UX where translations
    update as the user is speaking or typing.
    """
    await ws.accept()
    print("WebSocket client connected")
    
    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)
            
            text = msg.get("text", "").strip()
            if not text:
                continue
            
            direction = msg.get("direction", "ro_to_en")
            context = msg.get("context", "")
            category = msg.get("category")
            
            # Run translation
            result = engine.translate(
                text=text,
                direction=direction,
                context=context,
                category=category,
            )
            
            await ws.send_json({
                "translation": result.translation,
                "source_text": result.source_text,
                "tier_used": result.tier_used,
                "confidence": result.confidence,
                "latency_ms": result.latency_ms,
                "breakdown": result.breakdown,
            })
    
    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")


# ============================================================
# Run
# ============================================================

if __name__ == "__main__":
    import uvicorn
    
    print(f"""
╔══════════════════════════════════════════════╗
║         Alopath Translation Server           ║
╠══════════════════════════════════════════════╣
║  API Docs:  http://localhost:{PORT}/docs       ║
║  Health:    http://localhost:{PORT}/health      ║
║  WebSocket: ws://localhost:{PORT}/ws/translate  ║
╚══════════════════════════════════════════════╝
""")
    
    uvicorn.run(app, host="0.0.0.0", port=PORT)
