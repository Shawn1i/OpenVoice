"""
Rohingya-English Dictionary
============================
Romanized Rohingya orthography (the form the community actually uses).
This is the RAG backbone — Claude uses these entries as few-shot examples
to generalize translations for novel phrases.

Sources: Rohingya community materials, educational resources, linguistic documentation.
Format: Each entry has rohingya (Romanized), english, category, and optional notes.

TO EXPAND: Add entries from your YouTube transcription work. Even 200 more
entries dramatically improves Claude's generalization ability.
"""

import json

DICTIONARY = [
    # === Greetings & Common Phrases ===
    {"ro": "assalamu alaikum", "en": "peace be upon you", "cat": "greeting"},
    {"ro": "walaikum assalam", "en": "and peace be upon you too", "cat": "greeting"},
    {"ro": "tui kémon asó?", "en": "how are you?", "cat": "greeting"},
    {"ro": "aññí bála así", "en": "I am fine", "cat": "greeting"},
    {"ro": "tuar nám ki?", "en": "what is your name?", "cat": "greeting"},
    {"ro": "aññír nám", "en": "my name is", "cat": "greeting"},
    {"ro": "shukuriya", "en": "thank you", "cat": "greeting"},
    {"ro": "maáf goró", "en": "sorry / excuse me", "cat": "greeting"},
    {"ro": "hó", "en": "yes", "cat": "basic"},
    {"ro": "ná", "en": "no", "cat": "basic"},
    {"ro": "sáida", "en": "help", "cat": "basic"},
    {"ro": "doya gori", "en": "please", "cat": "basic"},
    {"ro": "khoda hafez", "en": "goodbye", "cat": "greeting"},

    # === Pronouns ===
    {"ro": "aññí", "en": "I / me", "cat": "pronoun"},
    {"ro": "tui", "en": "you (informal)", "cat": "pronoun"},
    {"ro": "tuñí", "en": "you (formal)", "cat": "pronoun"},
    {"ro": "ité", "en": "he / she / it", "cat": "pronoun"},
    {"ro": "aññára", "en": "we / us", "cat": "pronoun"},
    {"ro": "tuñára", "en": "you all", "cat": "pronoun"},
    {"ro": "itára", "en": "they / them", "cat": "pronoun"},

    # === Numbers ===
    {"ro": "ek", "en": "one", "cat": "number"},
    {"ro": "dui", "en": "two", "cat": "number"},
    {"ro": "tin", "en": "three", "cat": "number"},
    {"ro": "sair", "en": "four", "cat": "number"},
    {"ro": "fáns", "en": "five", "cat": "number"},
    {"ro": "só", "en": "six", "cat": "number"},
    {"ro": "shát", "en": "seven", "cat": "number"},
    {"ro": "áth", "en": "eight", "cat": "number"},
    {"ro": "nó", "en": "nine", "cat": "number"},
    {"ro": "dosh", "en": "ten", "cat": "number"},

    # === Body & Health (critical for pharmacy scenario) ===
    {"ro": "matá", "en": "head", "cat": "body"},
    {"ro": "sók", "en": "eye", "cat": "body"},
    {"ro": "nák", "en": "nose", "cat": "body"},
    {"ro": "kán", "en": "ear", "cat": "body"},
    {"ro": "dánth", "en": "tooth / teeth", "cat": "body"},
    {"ro": "gola", "en": "throat", "cat": "body"},
    {"ro": "buk", "en": "chest", "cat": "body"},
    {"ro": "fet", "en": "stomach / belly", "cat": "body"},
    {"ro": "fité", "en": "back (body)", "cat": "body"},
    {"ro": "áth", "en": "hand", "cat": "body"},
    {"ro": "gora", "en": "leg / foot", "cat": "body"},
    {"ro": "dukh", "en": "pain", "cat": "health"},
    {"ro": "jor", "en": "fever", "cat": "health"},
    {"ro": "kashi", "en": "cough", "cat": "health"},
    {"ro": "tánda", "en": "cold (illness)", "cat": "health"},
    {"ro": "matá dukh", "en": "headache", "cat": "health"},
    {"ro": "fet dukh", "en": "stomach ache", "cat": "health"},
    {"ro": "dawai", "en": "medicine", "cat": "health"},
    {"ro": "dawai-wala", "en": "pharmacist / doctor", "cat": "health"},
    {"ro": "golí", "en": "tablet / pill", "cat": "health"},
    {"ro": "dáktór", "en": "doctor", "cat": "health"},
    {"ro": "haspatal", "en": "hospital", "cat": "health"},
    {"ro": "bimár", "en": "sick / ill", "cat": "health"},
    {"ro": "bála oiye", "en": "to get better / recover", "cat": "health"},

    # === Food & Grocery ===
    {"ro": "vát", "en": "rice (cooked)", "cat": "food"},
    {"ro": "sául", "en": "rice (uncooked)", "cat": "food"},
    {"ro": "ruti", "en": "bread / flatbread", "cat": "food"},
    {"ro": "fani", "en": "water", "cat": "food"},
    {"ro": "dúd", "en": "milk", "cat": "food"},
    {"ro": "más", "en": "fish", "cat": "food"},
    {"ro": "murgí", "en": "chicken", "cat": "food"},
    {"ro": "goru", "en": "beef / cow", "cat": "food"},
    {"ro": "dim", "en": "egg", "cat": "food"},
    {"ro": "torkari", "en": "vegetables / curry", "cat": "food"},
    {"ro": "lón", "en": "salt", "cat": "food"},
    {"ro": "morsá", "en": "chili / pepper", "cat": "food"},
    {"ro": "tel", "en": "oil", "cat": "food"},
    {"ro": "siní", "en": "sugar", "cat": "food"},
    {"ro": "sá", "en": "tea", "cat": "food"},
    {"ro": "ful", "en": "fruit", "cat": "food"},
    {"ro": "am", "en": "mango", "cat": "food"},
    {"ro": "kola", "en": "banana", "cat": "food"},

    # === Transport ===
    {"ro": "gari", "en": "car / vehicle", "cat": "transport"},
    {"ro": "bosh", "en": "bus", "cat": "transport"},
    {"ro": "tikit", "en": "ticket", "cat": "transport"},
    {"ro": "stéshon", "en": "station", "cat": "transport"},
    {"ro": "bosh tháma", "en": "bus stop", "cat": "transport"},
    {"ro": "ré-el gari", "en": "train", "cat": "transport"},
    {"ro": "háñsa", "en": "walk / to walk", "cat": "transport"},
    {"ro": "zao", "en": "go", "cat": "transport"},
    {"ro": "aó", "en": "come", "cat": "transport"},
    {"ro": "koi?", "en": "where?", "cat": "transport"},
    {"ro": "kitá dur?", "en": "how far?", "cat": "transport"},

    # === Shopping & Money ===
    {"ro": "dám", "en": "price / cost", "cat": "shopping"},
    {"ro": "toyká", "en": "money", "cat": "shopping"},
    {"ro": "kinón", "en": "to buy", "cat": "shopping"},
    {"ro": "beson", "en": "to sell", "cat": "shopping"},
    {"ro": "rosid", "en": "receipt", "cat": "shopping"},
    {"ro": "dokan", "en": "shop / store", "cat": "shopping"},
    {"ro": "ságor-dokan", "en": "market / bazaar", "cat": "shopping"},
    {"ro": "beshi", "en": "too much / expensive", "cat": "shopping"},
    {"ro": "kom", "en": "less / cheap", "cat": "shopping"},
    {"ro": "eká dám kitá?", "en": "how much does this cost?", "cat": "shopping"},

    # === Time ===
    {"ro": "aizou", "en": "today", "cat": "time"},
    {"ro": "aijá", "en": "yesterday", "cat": "time"},
    {"ro": "aittá", "en": "tomorrow", "cat": "time"},
    {"ro": "bélá", "en": "morning", "cat": "time"},
    {"ro": "dufor", "en": "noon / afternoon", "cat": "time"},
    {"ro": "biál", "en": "evening", "cat": "time"},
    {"ro": "raat", "en": "night", "cat": "time"},
    {"ro": "shomoy", "en": "time", "cat": "time"},
    {"ro": "gonta", "en": "hour", "cat": "time"},
    {"ro": "minit", "en": "minute", "cat": "time"},

    # === Home & Family ===
    {"ro": "gór", "en": "house / home", "cat": "home"},
    {"ro": "baba", "en": "father", "cat": "family"},
    {"ro": "maa", "en": "mother", "cat": "family"},
    {"ro": "fúa", "en": "son", "cat": "family"},
    {"ro": "fúi", "en": "daughter", "cat": "family"},
    {"ro": "bái", "en": "brother", "cat": "family"},
    {"ro": "bón", "en": "sister", "cat": "family"},
    {"ro": "hámesh", "en": "family", "cat": "family"},
    {"ro": "sailla", "en": "child / children", "cat": "family"},

    # === Common Verbs ===
    {"ro": "kháña", "en": "to eat", "cat": "verb"},
    {"ro": "fañi kháña", "en": "to drink water", "cat": "verb"},
    {"ro": "háñsa", "en": "to walk", "cat": "verb"},
    {"ro": "dekhón", "en": "to see / look", "cat": "verb"},
    {"ro": "hunón", "en": "to hear / listen", "cat": "verb"},
    {"ro": "kóon", "en": "to say / speak", "cat": "verb"},
    {"ro": "likhón", "en": "to write", "cat": "verb"},
    {"ro": "forhón", "en": "to read", "cat": "verb"},
    {"ro": "forón", "en": "to learn", "cat": "verb"},
    {"ro": "kám goró", "en": "to work", "cat": "verb"},
    {"ro": "uñón", "en": "to sleep", "cat": "verb"},
    {"ro": "thaón", "en": "to stay / live", "cat": "verb"},
    {"ro": "dóron", "en": "to need / want", "cat": "verb"},
    {"ro": "fáron", "en": "to be able to / can", "cat": "verb"},
    {"ro": "zánon", "en": "to know", "cat": "verb"},

    # === Emergency / Essential Phrases ===
    {"ro": "sáida lage!", "en": "I need help!", "cat": "emergency"},
    {"ro": "fulish bólaó!", "en": "call the police!", "cat": "emergency"},
    {"ro": "dáktór lage", "en": "I need a doctor", "cat": "emergency"},
    {"ro": "aññí bimár", "en": "I am sick", "cat": "emergency"},
    {"ro": "aññí háráiye geisí", "en": "I am lost", "cat": "emergency"},
    {"ro": "aññí búizí ná", "en": "I don't understand", "cat": "emergency"},
    {"ro": "ingrézi kóon fáron?", "en": "can you speak English?", "cat": "emergency"},
    {"ro": "doya gori aste aste kóon", "en": "please speak slowly", "cat": "emergency"},

    # === Adjectives ===
    {"ro": "boro", "en": "big / large", "cat": "adjective"},
    {"ro": "sotu", "en": "small / little", "cat": "adjective"},
    {"ro": "bála", "en": "good", "cat": "adjective"},
    {"ro": "kharáf", "en": "bad", "cat": "adjective"},
    {"ro": "gorom", "en": "hot", "cat": "adjective"},
    {"ro": "tánda", "en": "cold", "cat": "adjective"},
    {"ro": "notún", "en": "new", "cat": "adjective"},
    {"ro": "furáñá", "en": "old", "cat": "adjective"},

    # === Question Words ===
    {"ro": "ki?", "en": "what?", "cat": "question"},
    {"ro": "koi?", "en": "where?", "cat": "question"},
    {"ro": "kón?", "en": "who?", "cat": "question"},
    {"ro": "kitá?", "en": "how much? / how many?", "cat": "question"},
    {"ro": "kéddia?", "en": "when?", "cat": "question"},
    {"ro": "kéne?", "en": "why?", "cat": "question"},
    {"ro": "kémon?", "en": "how?", "cat": "question"},
]

# === Indexing functions ===

def build_ro_to_en():
    """Rohingya → English lookup"""
    return {e["ro"].lower(): e["en"] for e in DICTIONARY}

def build_en_to_ro():
    """English → Rohingya lookup"""
    return {e["en"].lower(): e["ro"] for e in DICTIONARY}

def build_by_category():
    """Group entries by category"""
    cats = {}
    for e in DICTIONARY:
        cats.setdefault(e["cat"], []).append(e)
    return cats

def get_relevant_entries(text, n=30):
    """
    Find dictionary entries most relevant to a piece of text.
    Used to build few-shot context for Claude.
    Simple but effective: checks for word overlap.
    """
    text_lower = text.lower()
    text_words = set(text_lower.split())
    scored = []
    for entry in DICTIONARY:
        score = 0
        ro_words = set(entry["ro"].lower().split())
        en_words = set(entry["en"].lower().split())
        # Direct substring match (highest signal)
        if entry["ro"].lower() in text_lower or entry["en"].lower() in text_lower:
            score += 10
        # Word overlap
        score += len(text_words & ro_words) * 3
        score += len(text_words & en_words) * 3
        if score > 0:
            scored.append((score, entry))
    
    scored.sort(key=lambda x: -x[0])
    return [e for _, e in scored[:n]]

def format_for_prompt(entries):
    """Format dictionary entries as context for Claude."""
    lines = []
    for e in entries:
        lines.append(f"  {e['ro']}  →  {e['en']}")
    return "\n".join(lines)


if __name__ == "__main__":
    print(f"Dictionary loaded: {len(DICTIONARY)} entries")
    print(f"Categories: {list(build_by_category().keys())}")
    print(f"\nSample relevant entries for 'I have a headache and need medicine':")
    relevant = get_relevant_entries("I have a headache and need medicine")
    for e in relevant:
        print(f"  {e['ro']:20s} → {e['en']}")
