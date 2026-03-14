import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GraduatedSentence } from "../../components/GraduatedSentence";
import { MicButton } from "../../components/MicButton";
import { Colors, Shadows } from "../../constants/theme";
import { useAudio } from "../../hooks/useAudio";
import { processUserSpeech, ScenarioType, TranslationResponse } from "../../lib/claude";
import {
  applyGraduatedOpacity,
  getLearnedWords,
  getProfile,
  LearnerWord,
  recordWordEncounter,
  recordSuccessfulRecall,
} from "../../lib/learnerModel";

export default function ConversationScreen() {
  const router = useRouter();
  const { scenario = "free" } = useLocalSearchParams<{ scenario: ScenarioType }>();
  const { state, startRecording, stopRecording, speakText } = useAudio();

  const [response, setResponse] = useState<TranslationResponse | null>(null);
  const [wordMap, setWordMap] = useState<Record<string, LearnerWord>>({});
  const [highlightVisible, setHighlightVisible] = useState(false);
  const [learnedWords, setLearnedWords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Load learner profile on mount
  useEffect(() => {
    (async () => {
      const profile = await getProfile();
      setWordMap(profile.words);
      const words = await getLearnedWords();
      setLearnedWords(words.map((w) => w.word));
    })();
  }, []);

  const handlePressIn = async () => {
    setError(null);
    await startRecording();
  };

  const handlePressOut = async () => {
    const uri = await stopRecording();
    if (!uri) return;

    // In production: send audio to Whisper for transcription.
    // For prototype: simulate with a placeholder user utterance per scenario.
    const mockUserSpeech = getMockUserSpeech(scenario as ScenarioType);

    try {
      const result = await processUserSpeech(
        mockUserSpeech,
        scenario as ScenarioType,
        learnedWords
      );
      setResponse(result);
      setHighlightVisible(true);

      // Record the highlight word in learner model
      if (result.highlightWord) {
        await recordWordEncounter(result.highlightWord);
        const updated = await getProfile();
        setWordMap(updated.words);
        setLearnedWords(Object.keys(updated.words));
      }

      // Animate response in
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      // Auto-play the English audio script
      speakText(result.audioScript);
    } catch (e) {
      setError("Could not connect. Check your internet connection.");
    }
  };

  const tokens =
    response && Object.keys(wordMap).length > 0
      ? applyGraduatedOpacity(response.englishText, wordMap)
      : response
      ? [{ text: response.englishText, isGap: false, isEnglish: false, original: response.englishText }]
      : [];

  return (
    <View style={styles.screen}>
      {/* Back + Scenario Header */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.scenarioLabel}>{scenario.toUpperCase()}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Response card */}
        {response && (
          <Animated.View style={[styles.responseCard, { opacity: fadeAnim }]}>
            {/* Graduated opacity English sentence */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>ENGLISH</Text>
              <GraduatedSentence
                tokens={tokens}
                onWordReveal={(word) => recordSuccessfulRecall(word)}
              />
            </View>

            {/* Native language confirmation */}
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>YOUR LANGUAGE</Text>
              <Text style={styles.translatedText}>{response.translatedText}</Text>
            </View>

            {/* Highlighted vocabulary word */}
            {highlightVisible && response.highlightWord && (
              <View style={styles.wordHighlight}>
                <Text style={styles.wordHighlightLabel}>WORD TO LEARN</Text>
                <View style={styles.wordRow}>
                  <Text style={styles.highlightEnglish}>{response.highlightWord}</Text>
                  <Text style={styles.highlightArrow}>→</Text>
                  <Text style={styles.highlightNative}>{response.highlightTranslation}</Text>
                </View>
              </View>
            )}

            {/* Replay button */}
            <Pressable
              style={styles.replayButton}
              onPress={() => response && speakText(response.audioScript)}
            >
              <Text style={styles.replayText}>🔊  Hear Again</Text>
            </Pressable>
          </Animated.View>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Gap instruction */}
        {Object.keys(wordMap).length > 0 && (
          <View style={styles.hint}>
            <Text style={styles.hintText}>
              Tap ___ to reveal a word you've seen before
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Mic CTA */}
      <View style={styles.micArea}>
        <MicButton
          state={state}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        />
      </View>
    </View>
  );
}

// Mock user speech per scenario — replaces real Whisper transcription in prototype
function getMockUserSpeech(scenario: ScenarioType): string {
  const map: Record<ScenarioType, string> = {
    doctor: "I have a headache and I need to see a doctor for a prescription",
    work: "I am looking for a job and want to know about the work schedule",
    school: "I want to enroll my child in school and meet the teacher",
    store: "I need to buy groceries and find out the price of this item",
    free: "Hello, I want to practice speaking English today",
  };
  return map[scenario];
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 4,
  },
  backText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  scenarioLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 2,
  },
  content: {
    padding: 24,
    gap: 16,
    paddingBottom: 40,
  },
  responseCard: {
    backgroundColor: Colors.surface,
    padding: 24,
    gap: 16,
    ...Shadows.card,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 2,
  },
  translatedText: {
    fontSize: 18,
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  wordHighlight: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 16,
    gap: 8,
  },
  wordHighlightLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 2,
  },
  wordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  highlightEnglish: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  highlightArrow: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  highlightNative: {
    fontSize: 22,
    fontWeight: "400",
    color: Colors.primaryHover,
  },
  replayButton: {
    backgroundColor: Colors.primary,
    padding: 14,
    alignItems: "center",
  },
  replayText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.surface,
    letterSpacing: 0.5,
  },
  errorCard: {
    backgroundColor: "#FFF0EE",
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
  },
  hint: {
    padding: 12,
    alignItems: "center",
  },
  hintText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  micArea: {
    paddingVertical: 40,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});
