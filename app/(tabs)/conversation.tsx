import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { GraduatedSentence } from "../../components/GraduatedSentence";
import { MicButton } from "../../components/MicButton";
import { Colors, Shadows } from "../../constants/theme";
import { useAudio } from "../../hooks/useAudio";
import {
  translate,
  TranslationResponse as BackendResponse,
  TranslationDirection,
  healthCheck,
} from "../../lib/translationApi";
import {
  processUserSpeech,
  ScenarioType,
  TranslationResponse as ClaudeResponse,
} from "../../lib/claude";
import {
  applyGraduatedOpacity,
  getLearnedWords,
  getProfile,
  LearnerWord,
  recordWordEncounter,
  recordSuccessfulRecall,
} from "../../lib/learnerModel";

type ConversationEntry = {
  id: number;
  input: string;
  direction: TranslationDirection;
  translation: string;
  tierUsed: string;
  confidence: number;
  breakdown: Record<string, string>;
};

export default function ConversationScreen() {
  const router = useRouter();
  const { scenario = "free" } = useLocalSearchParams<{ scenario: ScenarioType }>();
  const { state, startRecording, stopRecording, speakText } = useAudio();

  const [inputText, setInputText] = useState("");
  const [direction, setDirection] = useState<TranslationDirection>("ro_to_en");
  const [entries, setEntries] = useState<ConversationEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [wordMap, setWordMap] = useState<Record<string, LearnerWord>>({});

  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const entryIdRef = useRef(0);

  // Check backend health + load learner profile on mount
  useEffect(() => {
    healthCheck().then(setBackendOnline);
    (async () => {
      const profile = await getProfile();
      setWordMap(profile.words);
    })();
  }, []);

  const handleTranslate = async () => {
    const text = inputText.trim();
    if (!text || loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await translate(text, direction, scenario);

      const entry: ConversationEntry = {
        id: entryIdRef.current++,
        input: text,
        direction,
        translation: result.translation,
        tierUsed: result.tier_used,
        confidence: result.confidence,
        breakdown: result.breakdown,
      };

      setEntries((prev) => [...prev, entry]);
      setInputText("");

      // Record words for learner model
      const words = result.translation.split(/\s+/);
      for (const w of words.slice(0, 3)) {
        const clean = w.replace(/[^a-zA-Z]/g, "").toLowerCase();
        if (clean.length > 2) {
          await recordWordEncounter(clean);
        }
      }
      const updatedProfile = await getProfile();
      setWordMap(updatedProfile.words);

      // Auto-speak the translation if it's to English
      if (direction === "ro_to_en") {
        speakText(result.translation);
      }

      // Animate
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Scroll to bottom
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      setError(
        backendOnline === false
          ? "Backend not running. Start it with: cd files && python3 server.py"
          : `Translation failed: ${e.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMicPressIn = async () => {
    setError(null);
    await startRecording();
  };

  const handleMicPressOut = async () => {
    const uri = await stopRecording();
    if (!uri) return;

    // For hackathon MVP: use scenario-based mock text since we don't have Whisper yet
    // In production this would send audio to Whisper ASR
    const mockText = getMockUserSpeech(scenario as ScenarioType);
    setInputText(mockText);
    setDirection("ro_to_en");
  };

  const toggleDirection = () => {
    setDirection((d) => (d === "ro_to_en" ? "en_to_ro" : "ro_to_en"));
  };

  const dirLabel =
    direction === "ro_to_en" ? "Rohingya → English" : "English → Rohingya";

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.scenarioLabel}>{(scenario as string).toUpperCase()}</Text>
        {backendOnline === false && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineText}>Backend offline</Text>
          </View>
        )}
      </View>

      {/* Conversation entries */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {entries.length === 0 && !error && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyTitle}>Start translating</Text>
            <Text style={styles.emptySubtitle}>
              Type in Rohingya or English below, or hold the mic to speak
            </Text>
          </View>
        )}

        {entries.map((entry) => {
          const isRoToEn = entry.direction === "ro_to_en";
          const tokens =
            isRoToEn && Object.keys(wordMap).length > 0
              ? applyGraduatedOpacity(entry.translation, wordMap)
              : [
                  {
                    text: entry.translation,
                    isGap: false,
                    isEnglish: false,
                    original: entry.translation,
                  },
                ];

          return (
            <View key={entry.id} style={styles.entryCard}>
              {/* Input */}
              <View style={styles.inputRow}>
                <Text style={styles.dirBadge}>
                  {isRoToEn ? "RO" : "EN"}
                </Text>
                <Text style={styles.inputText}>{entry.input}</Text>
              </View>

              {/* Translation */}
              <View style={styles.translationRow}>
                <Text style={styles.dirBadge}>
                  {isRoToEn ? "EN" : "RO"}
                </Text>
                <View style={{ flex: 1 }}>
                  {isRoToEn ? (
                    <GraduatedSentence
                      tokens={tokens}
                      onWordReveal={(word) => recordSuccessfulRecall(word)}
                    />
                  ) : (
                    <Text style={styles.translationText}>
                      {entry.translation}
                    </Text>
                  )}
                </View>
              </View>

              {/* Meta */}
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  {entry.tierUsed} · {Math.round(entry.confidence * 100)}%
                </Text>
                {isRoToEn && (
                  <Pressable onPress={() => speakText(entry.translation)}>
                    <Text style={styles.speakBtn}>🔊</Text>
                  </Pressable>
                )}
              </View>

              {/* Word breakdown if available */}
              {Object.keys(entry.breakdown).length > 0 && (
                <View style={styles.breakdownRow}>
                  {Object.entries(entry.breakdown).map(([word, meaning]) => (
                    <Text key={word} style={styles.breakdownItem}>
                      {word} → {meaning}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Input area */}
      <View style={styles.inputArea}>
        {/* Direction toggle */}
        <Pressable style={styles.dirToggle} onPress={toggleDirection}>
          <Text style={styles.dirToggleText}>{dirLabel}</Text>
        </Pressable>

        <View style={styles.inputRow2}>
          <TextInput
            style={styles.textInput}
            placeholder={
              direction === "ro_to_en"
                ? "Type in Rohingya..."
                : "Type in English..."
            }
            placeholderTextColor={Colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleTranslate}
            returnKeyType="send"
            multiline={false}
            editable={!loading}
          />

          {/* Send button */}
          <Pressable
            style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
            onPress={handleTranslate}
            disabled={loading || !inputText.trim()}
          >
            <Text style={styles.sendBtnText}>
              {loading ? "..." : "→"}
            </Text>
          </Pressable>
        </View>

        {/* Mic button (smaller, secondary) */}
        <View style={styles.micRow}>
          <MicButton
            state={state}
            onPressIn={handleMicPressIn}
            onPressOut={handleMicPressOut}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function getMockUserSpeech(scenario: ScenarioType): string {
  const map: Record<ScenarioType, string> = {
    doctor: "aññí fet dukh, dawai dóron",
    work: "aññí kám goró dóron",
    school: "aññí notún ingrézi forón",
    store: "eká dám kitá?",
    free: "tui kémon asó?",
  };
  return map[scenario] ?? "assalamu alaikum";
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
  backButton: { padding: 4 },
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
  offlineBadge: {
    backgroundColor: Colors.error + "22",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  offlineText: {
    fontSize: 10,
    color: Colors.error,
    fontWeight: "600",
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 8,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    maxWidth: 260,
  },
  entryCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    gap: 10,
    ...Shadows.card,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  dirBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.surface,
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    letterSpacing: 1,
    overflow: "hidden",
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  translationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  translationText: {
    fontSize: 18,
    color: Colors.textPrimary,
    lineHeight: 26,
    fontWeight: "500",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaText: {
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  speakBtn: { fontSize: 20 },
  breakdownRow: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 10,
    gap: 4,
  },
  breakdownItem: {
    fontSize: 12,
    color: Colors.textSecondary,
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
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 12,
    gap: 8,
  },
  dirToggle: {
    alignSelf: "center",
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  dirToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  inputRow2: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: Colors.surfaceSecondary,
  },
  sendBtnText: {
    fontSize: 22,
    color: Colors.surface,
    fontWeight: "700",
  },
  micRow: {
    alignItems: "center",
    paddingVertical: 8,
    transform: [{ scale: 0.6 }],
  },
});
