/**
 * Client for the Python FastAPI translation backend.
 * The backend runs the 3-tier engine: dictionary → Claude RAG → NLLB.
 *
 * Start the backend with: cd files && python3 server.py
 */

// For local dev on device/emulator:
// - Android emulator: 10.0.2.2 maps to host localhost
// - iOS simulator: localhost works directly
// - Physical device: use your machine's LAN IP
import { Platform } from "react-native";

const HOST =
  Platform.OS === "android" ? "10.0.2.2" : "localhost";
const BASE_URL = `http://${HOST}:8000`;

export type TranslationDirection = "ro_to_en" | "en_to_ro";

export type TranslationResponse = {
  translation: string;
  source_text: string;
  source_lang: string;
  tier_used: string;
  confidence: number;
  latency_ms: number;
  alternatives: string[];
  breakdown: Record<string, string>;
};

export type DictSearchResult = {
  query: string;
  results: Array<{ ro: string; en: string; cat: string }>;
  count: number;
};

/**
 * Translate text via the 3-tier backend engine.
 */
export async function translate(
  text: string,
  direction: TranslationDirection = "ro_to_en",
  context: string = "",
  category?: string
): Promise<TranslationResponse> {
  const res = await fetch(`${BASE_URL}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, direction, context, category }),
  });

  if (!res.ok) {
    throw new Error(`Translation failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Search the Rohingya-English dictionary.
 */
export async function searchDictionary(
  query: string,
  limit: number = 20
): Promise<DictSearchResult> {
  const res = await fetch(
    `${BASE_URL}/dictionary/search?q=${encodeURIComponent(query)}&limit=${limit}`
  );
  if (!res.ok) throw new Error(`Dictionary search failed: ${res.status}`);
  return res.json();
}

/**
 * Check if the backend is running.
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}
