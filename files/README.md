# Alopath Translation Engine

**Rohingya ↔ English translation pipeline for the Alopath learning app.**  
Built for hackathon speed: dictionary + Claude RAG + optional NLLB-200.

---

## 60-Minute Quickstart

### Step 1: Set your API key (30 seconds)
```bash
export ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

### Step 2: Install dependencies (2-5 minutes)
```bash
pip install anthropic fastapi uvicorn pydantic httpx
```

**Optional** — if you want NLLB-200 as a third tier:
```bash
pip install torch transformers sentencepiece protobuf
# This downloads ~1.2GB model on first run
```

### Step 3: Test the engine (1 minute)
```bash
python3 test_engine.py
```

You should see ✓ for all 10 test cases. Dictionary lookups are instant;
Claude translations take 1-3 seconds each.

### Step 4: Start the server (10 seconds)
```bash
python3 server.py
```

API docs at: http://localhost:8000/docs

### Step 5: Test the API
```bash
# Rohingya → English
curl -X POST http://localhost:8000/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "aññí fet dukh, dawai dóron", "direction": "ro_to_en"}'

# English → Rohingya
curl -X POST http://localhost:8000/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "I need medicine for my headache", "direction": "en_to_ro", "category": "health"}'
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Incoming text                                  │
│  "aññí fet dukh, dawai dóron"                   │
└──────────────────┬──────────────────────────────┘
                   ▼
┌──────────────────────────────────┐
│  TIER 1: Dictionary Lookup       │  ← Instant, free, offline
│  - Exact match                   │  ← confidence ≥ 0.9 → return
│  - Fuzzy match (typo tolerance)  │
│  - Word-by-word partial          │
└──────────────────┬───────────────┘
                   ▼ (if confidence < 0.9)
┌──────────────────────────────────┐
│  TIER 2: Claude RAG              │  ← 1-3 sec, API cost ~$0.001/call
│  - 80 most-relevant dictionary   │
│    entries as few-shot context    │
│  - Category-specific vocabulary  │
│  - Grammar rules in system prompt│
└──────────────────┬───────────────┘
                   ▼ (optional cross-check)
┌──────────────────────────────────┐
│  TIER 3: NLLB-200 (GPU)         │  ← 0.5-2 sec, free, offline
│  - Cross-validation signal       │
│  - Fallback when API is down     │
│  - Uses Rohingya script (not     │
│    Romanized — needs translit)   │
└──────────────────────────────────┘
```

## Expanding the Dictionary

The dictionary in `dictionary.py` has ~150 entries. Every entry you add
makes Claude's translations better because it has more few-shot examples.

**Best sources for new entries:**
1. Your YouTube transcription work
2. Rohingya community bilingual materials
3. UNHCR Rohingya language resources
4. Rohingya Zuban (online dictionary)

To add entries, just append to the `DICTIONARY` list:
```python
{"ro": "your romanized rohingya", "en": "english translation", "cat": "category"},
```

Going from 150 → 500 entries would be a massive quality improvement
and is probably ~2 hours of work with a native speaker.

## WebSocket for Live Translation

For real-time translation (as the user speaks/types):

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/translate');

ws.onopen = () => {
  ws.send(JSON.stringify({
    text: "aññí bimár",
    direction: "ro_to_en",
    context: "at the pharmacy",
    category: "health"
  }));
};

ws.onmessage = (event) => {
  const result = JSON.parse(event.data);
  console.log(result.translation);  // "I am sick"
  console.log(result.confidence);   // 0.85
};
```

## For the Hackathon Pitch

**What's real:**
- Dictionary lookup: 150 entries, instant, works offline
- Claude RAG translation: handles novel sentences by using dictionary as context
- 3-tier confidence scoring: knows when it's guessing vs. certain
- WebSocket API: ready for real-time UI integration
- Word-by-word breakdown: shows what it could and couldn't translate

**What you'd build next (post-hackathon):**
- Expand dictionary to 500+ entries from YouTube corpus
- Add Romanized ↔ Rohingya script transliteration for NLLB
- Fine-tune Whisper on Rohingya audio for ASR
- Build the phonological segmentation layer
- Implement graduated opacity with spaced repetition
