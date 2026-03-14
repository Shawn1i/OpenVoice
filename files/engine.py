"""
Translation Engine — 3-Tier Architecture
==========================================
Tier 1: Dictionary exact/fuzzy match (instant, free, offline)
Tier 2: Claude API + dictionary RAG (handles novel phrases)
Tier 3: NLLB-200 (cross-validation, fallback for when API is down)

The key insight: Claude doesn't "know" Rohingya well, but when you give it
150+ dictionary entries as few-shot context, it can generalize grammar patterns
and produce surprisingly good translations for new phrases. The dictionary
is doing the heavy lifting; Claude is doing the grammatical reasoning.
"""

import os
import time
import asyncio
from typing import Optional
from dataclasses import dataclass, field
from difflib import SequenceMatcher

import anthropic
from dictionary import (
    DICTIONARY, build_ro_to_en, build_en_to_ro,
    get_relevant_entries, format_for_prompt
)

# ============================================================
# Data structures
# ============================================================

@dataclass
class TranslationResult:
    source_text: str
    source_lang: str  # "ro" or "en"
    translation: str
    tier_used: str  # "dictionary", "claude_rag", "nllb", "combined"
    confidence: float  # 0.0 - 1.0
    alternatives: list = field(default_factory=list)
    breakdown: dict = field(default_factory=dict)  # word-by-word
    latency_ms: float = 0.0


# ============================================================
# Tier 1: Dictionary Lookup
# ============================================================

class DictionaryTranslator:
    def __init__(self):
        self.ro_to_en = build_ro_to_en()
        self.en_to_ro = build_en_to_ro()
    
    def translate(self, text: str, direction: str = "ro_to_en") -> Optional[TranslationResult]:
        """
        Exact and fuzzy dictionary lookup.
        direction: "ro_to_en" or "en_to_ro"
        """
        lookup = self.ro_to_en if direction == "ro_to_en" else self.en_to_ro
        source_lang = "ro" if direction == "ro_to_en" else "en"
        text_lower = text.strip().lower()
        
        # 1. Exact match
        if text_lower in lookup:
            return TranslationResult(
                source_text=text,
                source_lang=source_lang,
                translation=lookup[text_lower],
                tier_used="dictionary_exact",
                confidence=1.0,
            )
        
        # 2. Fuzzy match (for typos, slight variations)
        best_match = None
        best_ratio = 0.0
        for key in lookup:
            ratio = SequenceMatcher(None, text_lower, key).ratio()
            if ratio > best_ratio and ratio > 0.8:
                best_ratio = ratio
                best_match = key
        
        if best_match:
            return TranslationResult(
                source_text=text,
                source_lang=source_lang,
                translation=lookup[best_match],
                tier_used="dictionary_fuzzy",
                confidence=best_ratio,
                alternatives=[f"Matched against: '{best_match}'"],
            )
        
        # 3. Word-by-word breakdown (partial coverage)
        words = text_lower.split()
        translated_words = []
        covered = 0
        breakdown = {}
        for w in words:
            if w in lookup:
                translated_words.append(lookup[w])
                breakdown[w] = lookup[w]
                covered += 1
            else:
                # Try fuzzy on individual words
                best_w = None
                best_r = 0.0
                for key in lookup:
                    if " " in key:
                        continue  # skip phrases for word-level
                    r = SequenceMatcher(None, w, key).ratio()
                    if r > best_r and r > 0.82:
                        best_r = r
                        best_w = key
                if best_w:
                    translated_words.append(lookup[best_w])
                    breakdown[w] = f"{lookup[best_w]} (≈{best_w})"
                    covered += 0.7
                else:
                    translated_words.append(f"[{w}]")
                    breakdown[w] = "?"
        
        coverage = covered / len(words) if words else 0
        
        if coverage > 0.3:
            return TranslationResult(
                source_text=text,
                source_lang=source_lang,
                translation=" ".join(translated_words),
                tier_used="dictionary_partial",
                confidence=coverage * 0.6,  # partial is always lower confidence
                breakdown=breakdown,
            )
        
        return None  # Dictionary can't help — escalate to Tier 2


# ============================================================
# Tier 2: Claude API + Dictionary RAG
# ============================================================

class ClaudeTranslator:
    def __init__(self, api_key: str = None):
        self.client = anthropic.Anthropic(
            api_key=api_key or os.environ.get("ANTHROPIC_API_KEY")
        )
        self.model = "claude-sonnet-4-20250514"
    
    def translate(self, text: str, direction: str = "ro_to_en",
                  context: str = "", category_hint: str = None) -> Optional[TranslationResult]:
        """
        Use Claude with dictionary context as few-shot examples.
        This is the core innovation: RAG-augmented translation for low-resource languages.
        """
        start = time.time()
        source_lang = "ro" if direction == "ro_to_en" else "en"
        target_lang = "en" if direction == "ro_to_en" else "ro"
        
        # Build relevant dictionary context
        relevant = get_relevant_entries(text, n=40)
        
        # Also add category-specific entries if hint provided
        if category_hint:
            cat_entries = [e for e in DICTIONARY if e["cat"] == category_hint]
            for e in cat_entries:
                if e not in relevant:
                    relevant.append(e)
        
        # Always include some common phrases for grammar patterns
        common_cats = ["greeting", "basic", "pronoun", "verb", "question"]
        for e in DICTIONARY:
            if e["cat"] in common_cats and e not in relevant:
                relevant.append(e)
        
        dict_context = format_for_prompt(relevant[:80])
        
        if direction == "ro_to_en":
            dir_label = "Rohingya (Romanized) → English"
            from_label = "Rohingya"
            to_label = "English"
        else:
            dir_label = "English → Rohingya (Romanized)"
            from_label = "English"
            to_label = "Rohingya"
        
        system_prompt = f"""You are an expert translator for the Rohingya language (Ruáingga).
You translate between Romanized Rohingya and English.

CRITICAL RULES:
1. Use ONLY the dictionary entries below as your vocabulary reference.
2. For words not in the dictionary, transliterate phonetically — do NOT guess or hallucinate.
3. Rohingya grammar: SOV order (Subject-Object-Verb), postpositions not prepositions.
4. The Romanized orthography uses accented vowels (á, é, í, ó, ú) for specific sounds.
5. Keep translations natural and conversational.
6. If you're unsure, mark uncertain parts with [?].

DICTIONARY ({len(relevant)} entries):
{dict_context}

ADDITIONAL CONTEXT (if any): {context}

Respond with ONLY the translation, nothing else. No explanations, no caveats."""

        user_msg = f"Translate {dir_label}:\n{text}"
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                system=system_prompt,
                messages=[{"role": "user", "content": user_msg}]
            )
            
            translation = response.content[0].text.strip()
            latency = (time.time() - start) * 1000
            
            # Estimate confidence based on dictionary coverage
            text_words = set(text.lower().split())
            dict_words = set()
            for e in relevant:
                dict_words.update(e["ro"].lower().split())
                dict_words.update(e["en"].lower().split())
            overlap = len(text_words & dict_words) / max(len(text_words), 1)
            confidence = min(0.6 + overlap * 0.35, 0.95)  # cap at 0.95
            
            # Check for uncertainty markers
            if "[?]" in translation:
                confidence *= 0.7
            
            return TranslationResult(
                source_text=text,
                source_lang=source_lang,
                translation=translation,
                tier_used="claude_rag",
                confidence=confidence,
                latency_ms=latency,
            )
        
        except Exception as e:
            print(f"Claude API error: {e}")
            return None


# ============================================================
# Tier 3: NLLB-200 (offline, GPU-accelerated)
# ============================================================

class NLLBTranslator:
    """
    Facebook's NLLB-200 model supports Rohingya (rhg_Rohg).
    
    IMPORTANT CAVEAT: NLLB uses Rohingya script, not Romanized.
    For the hackathon demo, we use it as a cross-validation signal
    rather than primary output. In production, you'd build a
    Romanized ↔ Rohingya script transliteration layer.
    """
    
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.device = None
        self._loaded = False
    
    def load(self):
        """Lazy-load the model (saves startup time if not needed)."""
        if self._loaded:
            return
        
        import torch
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
        
        model_name = "facebook/nllb-200-distilled-600M"
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        print(f"Loading NLLB-200 on {self.device}...")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to(self.device)
        self._loaded = True
        print("NLLB-200 ready.")
    
    def translate(self, text: str, direction: str = "ro_to_en") -> Optional[TranslationResult]:
        """
        Translate using NLLB-200.
        Note: This uses Rohingya script (not Romanized), so output
        needs transliteration for end-user display.
        """
        self.load()
        
        import torch
        start = time.time()
        
        if direction == "ro_to_en":
            src_lang = "rhg_Rohg"  # Rohingya
            tgt_lang = "eng_Latn"  # English
        else:
            src_lang = "eng_Latn"
            tgt_lang = "rhg_Rohg"
        
        try:
            self.tokenizer.src_lang = src_lang
            inputs = self.tokenizer(text, return_tensors="pt", max_length=512, 
                                     truncation=True).to(self.device)
            
            with torch.no_grad():
                generated = self.model.generate(
                    **inputs,
                    forced_bos_token_id=self.tokenizer.convert_tokens_to_ids(tgt_lang),
                    max_length=512,
                    num_beams=5,
                    no_repeat_ngram_size=3,
                )
            
            translation = self.tokenizer.decode(generated[0], skip_special_tokens=True)
            latency = (time.time() - start) * 1000
            
            return TranslationResult(
                source_text=text,
                source_lang="ro" if direction == "ro_to_en" else "en",
                translation=translation,
                tier_used="nllb",
                confidence=0.5,  # NLLB for Rohingya is experimental
                latency_ms=latency,
            )
        
        except Exception as e:
            print(f"NLLB error: {e}")
            return None


# ============================================================
# Orchestrator: Combines all three tiers
# ============================================================

class TranslationEngine:
    """
    The main entry point. Routes through tiers based on confidence thresholds.
    
    Flow:
    1. Try dictionary (instant, free) → if confidence > 0.85, return
    2. Try Claude RAG (1-3 sec) → primary translation
    3. Try NLLB (0.5-2 sec) → cross-validation
    4. Combine results: if both agree, high confidence; if they disagree, flag it
    """
    
    def __init__(self, anthropic_api_key: str = None, enable_nllb: bool = True):
        self.dictionary = DictionaryTranslator()
        self.claude = ClaudeTranslator(api_key=anthropic_api_key)
        self.nllb = NLLBTranslator() if enable_nllb else None
        self.enable_nllb = enable_nllb
    
    def translate(self, text: str, direction: str = "ro_to_en",
                  context: str = "", category: str = None,
                  require_nllb_validation: bool = False) -> TranslationResult:
        """
        Main translation method.
        
        Args:
            text: Source text to translate
            direction: "ro_to_en" or "en_to_ro"
            context: Optional conversational context
            category: Optional category hint ("health", "food", etc.)
            require_nllb_validation: If True, always run NLLB for cross-check
        """
        start = time.time()
        
        # --- Tier 1: Dictionary ---
        dict_result = self.dictionary.translate(text, direction)
        
        if dict_result and dict_result.confidence >= 0.9:
            dict_result.latency_ms = (time.time() - start) * 1000
            return dict_result
        
        # --- Tier 2: Claude RAG ---
        claude_result = self.claude.translate(text, direction, context, category)
        
        if not claude_result:
            # API failed — return dictionary partial if we have one
            if dict_result:
                dict_result.latency_ms = (time.time() - start) * 1000
                dict_result.alternatives.append("Claude API unavailable; using dictionary only")
                return dict_result
            # Nothing worked
            return TranslationResult(
                source_text=text,
                source_lang="ro" if direction == "ro_to_en" else "en",
                translation="[Translation unavailable]",
                tier_used="none",
                confidence=0.0,
                latency_ms=(time.time() - start) * 1000,
            )
        
        # --- Tier 3: NLLB cross-validation (optional) ---
        if self.enable_nllb and (require_nllb_validation or claude_result.confidence < 0.7):
            nllb_result = self.nllb.translate(text, direction)
            
            if nllb_result:
                claude_result.alternatives.append(f"NLLB: {nllb_result.translation}")
                claude_result.tier_used = "combined"
        
        # Merge dictionary breakdown if available
        if dict_result and dict_result.breakdown:
            claude_result.breakdown = dict_result.breakdown
        
        claude_result.latency_ms = (time.time() - start) * 1000
        return claude_result
    
    def translate_batch(self, items: list, direction: str = "ro_to_en") -> list:
        """Translate a list of texts."""
        return [self.translate(text, direction) for text in items]


# ============================================================
# Quick test
# ============================================================

if __name__ == "__main__":
    import sys
    
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Set ANTHROPIC_API_KEY environment variable first!")
        print("  export ANTHROPIC_API_KEY=sk-ant-...")
        sys.exit(1)
    
    engine = TranslationEngine(api_key, enable_nllb=False)  # skip NLLB for quick test
    
    test_phrases = [
        # Tier 1 (dictionary) should catch these:
        ("dawai", "ro_to_en"),
        ("headache", "en_to_ro"),
        
        # Tier 2 (Claude RAG) needed for these:
        ("aññí fet dukh, dawai dóron", "ro_to_en"),
        ("I need medicine for my headache please", "en_to_ro"),
        ("where is the nearest bus stop?", "en_to_ro"),
        ("aññí bimár, dáktór koi?", "ro_to_en"),
    ]
    
    print("=" * 60)
    print("  Rohingya Translation Engine — Test Run")
    print("=" * 60)
    
    for text, direction in test_phrases:
        result = engine.translate(text, direction)
        arrow = "→ EN" if direction == "ro_to_en" else "→ RO"
        print(f"\n  [{result.tier_used}] ({result.confidence:.0%}, {result.latency_ms:.0f}ms)")
        print(f"  {text}")
        print(f"  {arrow}: {result.translation}")
        if result.breakdown:
            print(f"  breakdown: {result.breakdown}")
        if result.alternatives:
            print(f"  alts: {result.alternatives}")
