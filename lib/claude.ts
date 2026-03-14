const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

// IMPORTANT: In production, route through your backend — never ship API keys in client code.
// For hackathon demo, set this via environment or replace with your key.
const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? "";

export type ScenarioType = "doctor" | "work" | "school" | "store" | "free";

const SCENARIO_CONTEXTS: Record<ScenarioType, string> = {
  doctor: "medical clinic or hospital visit",
  work: "workplace or job interview",
  school: "school or classroom",
  store: "grocery store or retail shop",
  free: "everyday general conversation",
};

export type TranslationResponse = {
  englishText: string;
  translatedText: string;
  highlightWord: string;
  highlightTranslation: string;
  audioScript: string;
};

/**
 * Sends user speech (as text) to Claude and gets back:
 * - English translation
 * - Rohingya translation (approximated via Claude since no Rohingya TTS exists)
 * - One key vocabulary word to highlight
 */
export async function processUserSpeech(
  userSpeechText: string,
  scenario: ScenarioType,
  learnedWords: string[]
): Promise<TranslationResponse> {
  const systemPrompt = `You are a language learning assistant for Rohingya refugees learning English.
The user is in a ${SCENARIO_CONTEXTS[scenario]} scenario.
Words they have already started learning: ${learnedWords.join(", ") || "none yet"}.

When the user speaks in Rohingya or their native language, you:
1. Provide a natural English translation
2. Provide a simplified Rohingya back-translation for confirmation
3. Pick ONE high-value English word from the exchange to highlight as a vocabulary anchor
4. Keep all responses extremely simple — beginner level

Respond ONLY in this exact JSON format with no extra text:
{
  "englishText": "The English translation of what they said",
  "translatedText": "Simplified Rohingya confirmation text",
  "highlightWord": "oneword",
  "highlightTranslation": "Rohingya meaning of that word",
  "audioScript": "Slow, clear English sentence to be read aloud for the learner"
}`;

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userSpeechText }],
    }),
  });

  const data = await response.json();
  const raw = data.content?.[0]?.text ?? "{}";

  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return {
      englishText: userSpeechText,
      translatedText: "",
      highlightWord: "",
      highlightTranslation: "",
      audioScript: userSpeechText,
    };
  }
}

/**
 * Generates a scenario-based micro-lesson prompt.
 * Returns a simple English phrase to practice with Rohingya gloss.
 */
export async function generateMicroLesson(scenario: ScenarioType): Promise<{
  englishPhrase: string;
  rohingyaGloss: string;
  context: string;
}> {
  const systemPrompt = `You are creating a micro-lesson for a Rohingya refugee learning English for ${SCENARIO_CONTEXTS[scenario]}.
Generate ONE simple, immediately useful English phrase for this context.
Respond ONLY in this JSON format:
{
  "englishPhrase": "Simple English phrase",
  "rohingyaGloss": "Approximate Rohingya meaning",
  "context": "One sentence explaining when to use this"
}`;

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      messages: [{ role: "user", content: `Give me a lesson for ${scenario}` }],
      system: systemPrompt,
    }),
  });

  const data = await response.json();
  const raw = data.content?.[0]?.text ?? "{}";
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return { englishPhrase: "Hello", rohingyaGloss: "হ্যালো", context: "Greeting someone" };
  }
}
