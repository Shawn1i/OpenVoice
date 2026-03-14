#!/usr/bin/env python3
"""
Quick smoke test — run this to verify the pipeline works.
Usage: ANTHROPIC_API_KEY=sk-ant-... python3 test_engine.py
"""

import os
import sys
import time

# Check API key
api_key = os.environ.get("ANTHROPIC_API_KEY")
if not api_key:
    print("=" * 55)
    print("  Set your API key first:")
    print("  export ANTHROPIC_API_KEY=sk-ant-api03-...")
    print("=" * 55)
    sys.exit(1)

from engine import TranslationEngine

print("Initializing engine (dictionary + Claude, no NLLB)...")
engine = TranslationEngine(api_key, enable_nllb=False)

# === Test cases ===
tests = [
    # (text, direction, expected_tier, description)
    ("dawai", "ro_to_en", "dictionary", "Single word — exact match"),
    ("headache", "en_to_ro", "dictionary", "English → Rohingya — exact"),
    ("fani", "ro_to_en", "dictionary", "Basic noun"),
    ("eká dám kitá?", "ro_to_en", "dictionary", "Common phrase — exact"),
    
    ("aññí fet dukh, dawai dóron", "ro_to_en", "claude", 
     "Full sentence — needs Claude for grammar"),
    ("I need medicine for my stomach pain", "en_to_ro", "claude",
     "English sentence → Rohingya"),
    ("where is the bus stop? I need to go to the hospital", "en_to_ro", "claude",
     "Multi-sentence — complex"),
    ("aññí bimár, dáktór koi?", "ro_to_en", "claude",
     "Rohingya sentence — needs context"),
    ("can you speak slowly please? I am learning English", "en_to_ro", "claude",
     "Conversational request"),
    ("aññí notún ingrézi forón", "ro_to_en", "claude",
     "I am learning new English"),
]

print("\n" + "=" * 65)
print("  Translation Engine — Smoke Test")
print("=" * 65)

passed = 0
total = len(tests)
total_time = 0

for text, direction, expected_tier_prefix, desc in tests:
    start = time.time()
    result = engine.translate(text, direction)
    elapsed = (time.time() - start) * 1000
    total_time += elapsed
    
    tier_ok = result.tier_used.startswith(expected_tier_prefix)
    has_translation = (result.translation 
                       and result.translation != "[Translation unavailable]"
                       and len(result.translation) > 0)
    
    status = "✓" if (tier_ok and has_translation) else "✗"
    if has_translation:
        passed += 1
    
    arrow = "RO→EN" if direction == "ro_to_en" else "EN→RO"
    
    print(f"\n{status} [{arrow}] {desc}")
    print(f"  Input:       {text}")
    print(f"  Output:      {result.translation}")
    print(f"  Tier:        {result.tier_used} (conf: {result.confidence:.0%}, {elapsed:.0f}ms)")
    if result.breakdown:
        print(f"  Breakdown:   {result.breakdown}")

print(f"\n{'=' * 65}")
print(f"  Results: {passed}/{total} passed | Total time: {total_time:.0f}ms")
print(f"  Avg latency: {total_time/total:.0f}ms per translation")
print(f"{'=' * 65}")

if passed == total:
    print("\n  All tests passed! The engine is ready.")
    print("  Start the server with: python3 server.py")
elif passed >= total * 0.7:
    print("\n  Mostly working. Check failed cases above.")
    print("  Dictionary lookups should be instant; Claude calls ~1-3s each.")
else:
    print("\n  Several failures. Check your API key and network connection.")
