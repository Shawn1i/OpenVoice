"""
Dictionary Expander
====================
Tools to grow the dictionary from various sources.
This is the bridge between "hackathon demo" and "production system."

For the hackathon: run the Claude-powered extraction on any
bilingual Rohingya-English text you have, and it will auto-generate
new dictionary entries.
"""

import os
import json
import anthropic
from dictionary import DICTIONARY

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


def extract_pairs_from_text(bilingual_text: str) -> list[dict]:
    """
    Given any bilingual Rohingya-English text (lesson transcript,
    community document, YouTube subtitle file, etc.), use Claude to
    extract word/phrase pairs.
    
    This is the fastest way to grow your dictionary during the hackathon.
    Just paste in text from any source and get structured entries back.
    """
    
    existing = "\n".join([f"  {e['ro']} → {e['en']}" for e in DICTIONARY[:50]])
    
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4000,
        system="""You extract Rohingya-English word pairs from bilingual text.

RULES:
1. Output ONLY valid JSON — an array of objects with "ro", "en", and "cat" fields.
2. "ro" must be Romanized Rohingya (Latin script with accents like á, é, í, ó, ú).
3. "cat" must be one of: greeting, basic, pronoun, number, body, health, food, 
   transport, shopping, time, home, family, verb, adjective, question, emergency, education
4. Skip entries that are unclear or where you're not confident in the pairing.
5. Include both individual words AND useful phrases.
6. No duplicates. No English-only entries.
7. Do NOT wrap in markdown code fences. Return raw JSON only.""",
        messages=[{
            "role": "user",
            "content": f"""Extract Rohingya-English pairs from this text. 
Here are existing entries to avoid duplicating:
{existing}

TEXT TO PROCESS:
{bilingual_text}"""
        }]
    )
    
    raw = response.content[0].text.strip()
    # Clean potential markdown fences
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
    if raw.endswith("```"):
        raw = raw.rsplit("```", 1)[0]
    
    try:
        entries = json.loads(raw)
        return [e for e in entries if "ro" in e and "en" in e and "cat" in e]
    except json.JSONDecodeError:
        print(f"Failed to parse Claude response as JSON:\n{raw[:200]}")
        return []


def process_subtitle_file(srt_path: str) -> list[dict]:
    """
    Process a .srt or .vtt subtitle file from YouTube.
    Extracts text lines and sends them for pair extraction.
    """
    with open(srt_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Strip timing lines from SRT format
    import re
    lines = []
    for line in content.split("\n"):
        line = line.strip()
        # Skip empty lines, numbers, and timestamp lines
        if not line:
            continue
        if line.isdigit():
            continue
        if re.match(r'\d{2}:\d{2}:\d{2}', line):
            continue
        lines.append(line)
    
    text = "\n".join(lines)
    return extract_pairs_from_text(text)


def merge_into_dictionary(new_entries: list[dict], output_path: str = None):
    """
    Merge new entries into the dictionary, deduplicating.
    """
    existing_ro = {e["ro"].lower() for e in DICTIONARY}
    unique_new = [e for e in new_entries if e["ro"].lower() not in existing_ro]
    
    print(f"New unique entries: {len(unique_new)} (from {len(new_entries)} extracted)")
    
    if unique_new:
        # Generate code to append
        code_lines = ["\n    # === Auto-extracted entries ==="]
        for e in unique_new:
            ro = e["ro"].replace('"', '\\"')
            en = e["en"].replace('"', '\\"')
            cat = e["cat"].replace('"', '\\"')
            code_lines.append(f'    {{"ro": "{ro}", "en": "{en}", "cat": "{cat}"}},')
        
        code = "\n".join(code_lines)
        print(f"\nAdd these to DICTIONARY in dictionary.py:\n{code}")
        
        if output_path:
            with open(output_path, "w") as f:
                json.dump(unique_new, f, indent=2, ensure_ascii=False)
            print(f"\nAlso saved to: {output_path}")
    
    return unique_new


# ============================================================
# Interactive mode
# ============================================================

if __name__ == "__main__":
    import sys
    
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("Set ANTHROPIC_API_KEY first!")
        sys.exit(1)
    
    print("=" * 55)
    print("  Dictionary Expander")
    print("  Paste bilingual Rohingya-English text below.")
    print("  Press Ctrl+D (or Ctrl+Z on Windows) when done.")
    print("=" * 55)
    
    if len(sys.argv) > 1:
        # File mode: process a subtitle file
        path = sys.argv[1]
        print(f"Processing file: {path}")
        entries = process_subtitle_file(path)
    else:
        # Interactive mode: paste text
        print("\nPaste text (Ctrl+D to finish):\n")
        try:
            text = sys.stdin.read()
        except KeyboardInterrupt:
            sys.exit(0)
        
        if not text.strip():
            print("No text provided.")
            sys.exit(1)
        
        entries = extract_pairs_from_text(text)
    
    if entries:
        print(f"\nExtracted {len(entries)} entries:")
        for e in entries:
            print(f"  {e['ro']:25s} → {e['en']:30s} [{e['cat']}]")
        
        merge_into_dictionary(entries, "new_entries.json")
    else:
        print("No entries extracted. Try providing more bilingual content.")
