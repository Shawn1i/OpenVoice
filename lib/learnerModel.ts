import AsyncStorage from "@react-native-async-storage/async-storage";

export type LearnerWord = {
  word: string;
  encounteredCount: number;
  successfulRecalls: number;
  stage: 1 | 2 | 3; // 1=full translation, 2=gap/hint, 3=English only
};

export type LearnerProfile = {
  words: Record<string, LearnerWord>;
  totalConversations: number;
  currentScenario: string | null;
};

const STORAGE_KEY = "openvoice_learner_profile";

const STAGE_THRESHOLDS = {
  toStage2: 3,  // seen 3+ times → start introducing gaps
  toStage3: 8,  // recalled 8+ times → mostly English
};

export async function getProfile(): Promise<LearnerProfile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { words: {}, totalConversations: 0, currentScenario: null };
}

export async function saveProfile(profile: LearnerProfile): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export async function recordWordEncounter(word: string): Promise<LearnerWord> {
  const profile = await getProfile();
  const normalized = word.toLowerCase().trim();
  const existing = profile.words[normalized] ?? {
    word: normalized,
    encounteredCount: 0,
    successfulRecalls: 0,
    stage: 1,
  };

  existing.encounteredCount += 1;

  // Advance stage based on thresholds
  if (existing.encounteredCount >= STAGE_THRESHOLDS.toStage2 && existing.stage < 2) {
    existing.stage = 2;
  }
  if (existing.successfulRecalls >= STAGE_THRESHOLDS.toStage3 && existing.stage < 3) {
    existing.stage = 3;
  }

  profile.words[normalized] = existing;
  await saveProfile(profile);
  return existing;
}

export async function recordSuccessfulRecall(word: string): Promise<void> {
  const profile = await getProfile();
  const normalized = word.toLowerCase().trim();
  if (profile.words[normalized]) {
    profile.words[normalized].successfulRecalls += 1;
    if (profile.words[normalized].successfulRecalls >= STAGE_THRESHOLDS.toStage3) {
      profile.words[normalized].stage = 3;
    }
    await saveProfile(profile);
  }
}

export async function getLearnedWords(): Promise<LearnerWord[]> {
  const profile = await getProfile();
  return Object.values(profile.words).sort((a, b) => b.encounteredCount - a.encounteredCount);
}

/**
 * Apply graduated opacity to a sentence.
 * Stage 1 words → fully translated (shown in native language)
 * Stage 2 words → shown with a tap-to-reveal hint
 * Stage 3 words → shown in English, no translation
 */
export function applyGraduatedOpacity(
  englishSentence: string,
  wordMap: Record<string, LearnerWord>
): Array<{ text: string; isGap: boolean; isEnglish: boolean; original: string }> {
  const tokens = englishSentence.split(/(\s+)/);
  return tokens.map((token) => {
    const key = token.toLowerCase().replace(/[^a-z]/g, "");
    const wordData = wordMap[key];
    if (!wordData) return { text: token, isGap: false, isEnglish: false, original: token };
    if (wordData.stage === 3) return { text: token, isGap: false, isEnglish: true, original: token };
    if (wordData.stage === 2) return { text: "___", isGap: true, isEnglish: false, original: token };
    return { text: token, isGap: false, isEnglish: false, original: token };
  });
}
