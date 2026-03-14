import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Colors, Shadows } from "../../constants/theme";
import { getLearnedWords, LearnerWord } from "../../lib/learnerModel";
import * as Speech from "expo-speech";

const STAGE_LABELS = {
  1: { label: "New", color: Colors.textSecondary, bg: Colors.surfaceSecondary },
  2: { label: "Learning", color: Colors.primaryHover, bg: Colors.primary + "22" },
  3: { label: "Known", color: Colors.accent, bg: Colors.accent + "22" },
};

export default function LearningScreen() {
  const router = useRouter();
  const [words, setWords] = useState<LearnerWord[]>([]);

  useFocusEffect(
    useCallback(() => {
      getLearnedWords().then(setWords);
    }, [])
  );

  const handleWordPress = (word: string) => {
    Speech.speak(word, { language: "en-US", rate: 0.7 });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>My Words</Text>
        <Text style={styles.count}>{words.length}</Text>
      </View>

      {/* Stage legend */}
      <View style={styles.legend}>
        {Object.entries(STAGE_LABELS).map(([stage, meta]) => (
          <View key={stage} style={[styles.legendItem, { backgroundColor: meta.bg }]}>
            <Text style={[styles.legendText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {words.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📖</Text>
            <Text style={styles.emptyTitle}>No words yet</Text>
            <Text style={styles.emptySubtitle}>
              Start a conversation to begin learning words
            </Text>
            <Pressable
              style={styles.startButton}
              onPress={() => router.push("/(tabs)/home")}
            >
              <Text style={styles.startButtonText}>Start Talking</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.wordGrid}>
            {words.map((w) => {
              const meta = STAGE_LABELS[w.stage];
              return (
                <Pressable
                  key={w.word}
                  style={[styles.wordCard, { backgroundColor: meta.bg }, Shadows.card]}
                  onPress={() => handleWordPress(w.word)}
                >
                  <Text style={[styles.wordText, { color: Colors.textPrimary }]}>
                    {w.word}
                  </Text>
                  <View style={styles.wordMeta}>
                    <Text style={[styles.stageBadge, { color: meta.color }]}>
                      {meta.label}
                    </Text>
                    <Text style={styles.seenCount}>×{w.encounteredCount}</Text>
                  </View>
                  <Text style={styles.tapHint}>🔊</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  backButton: {
    marginRight: "auto",
  },
  backText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },
  count: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.primary,
    marginLeft: "auto",
  },
  legend: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  legendItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  wordGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  wordCard: {
    width: "47%",
    padding: 16,
    gap: 8,
  },
  wordText: {
    fontSize: 22,
    fontWeight: "700",
  },
  wordMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stageBadge: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  seenCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  tapHint: {
    fontSize: 18,
    marginTop: 4,
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 56,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    maxWidth: 240,
  },
  startButton: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  startButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.surface,
  },
});
