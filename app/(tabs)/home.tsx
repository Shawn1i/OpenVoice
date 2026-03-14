import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Colors, Shadows } from "../../constants/theme";
import { ScenarioType } from "../../lib/claude";

const SCENARIOS: { type: ScenarioType; label: string; emoji: string; description: string }[] = [
  { type: "doctor", label: "Doctor", emoji: "🏥", description: "Clinic & hospital" },
  { type: "work", label: "Work", emoji: "🏗", description: "Job & workplace" },
  { type: "school", label: "School", emoji: "📚", description: "Classroom & learning" },
  { type: "store", label: "Store", emoji: "🛒", description: "Shopping & errands" },
  { type: "free", label: "Free Talk", emoji: "💬", description: "Any conversation" },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.wordmark}>OpenVoice</Text>
        <Text style={styles.subtitle}>Choose where you are today</Text>
      </View>

      {/* Scenario Grid */}
      <View style={styles.grid}>
        {SCENARIOS.map((s) => (
          <Pressable
            key={s.type}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() =>
              router.push({ pathname: "/(tabs)/conversation", params: { scenario: s.type } })
            }
          >
            <Text style={styles.cardEmoji}>{s.emoji}</Text>
            <Text style={styles.cardLabel}>{s.label}</Text>
            <Text style={styles.cardDescription}>{s.description}</Text>
          </Pressable>
        ))}
      </View>

      {/* Words learned link */}
      <Pressable
        style={styles.wordsButton}
        onPress={() => router.push("/(tabs)/learning")}
      >
        <Text style={styles.wordsButtonText}>📖  My Words</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 40,
    gap: 32,
  },
  header: {
    gap: 8,
  },
  wordmark: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: "400",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    width: "47%",
    backgroundColor: Colors.surface,
    padding: 20,
    gap: 8,
    ...Shadows.card,
  },
  cardPressed: {
    backgroundColor: Colors.surfaceSecondary,
  },
  cardEmoji: {
    fontSize: 36,
  },
  cardLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  cardDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  wordsButton: {
    backgroundColor: Colors.surfaceSecondary,
    padding: 18,
    alignItems: "center",
  },
  wordsButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
});
