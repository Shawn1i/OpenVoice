import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "../constants/theme";

type Token = {
  text: string;
  isGap: boolean;
  isEnglish: boolean;
  original: string;
};

type Props = {
  tokens: Token[];
  onWordReveal?: (word: string) => void;
};

export function GraduatedSentence({ tokens, onWordReveal }: Props) {
  const [revealed, setRevealedSet] = useState<Set<number>>(new Set());

  const handleReveal = (index: number, word: string) => {
    setRevealedSet((prev) => new Set([...prev, index]));
    onWordReveal?.(word);
  };

  return (
    <View style={styles.container}>
      {tokens.map((token, i) => {
        if (token.text.trim() === "") {
          return <Text key={i} style={styles.space}> </Text>;
        }

        if (token.isGap && !revealed.has(i)) {
          return (
            <Pressable key={i} onPress={() => handleReveal(i, token.original)} style={styles.gap}>
              <Text style={styles.gapText}>___</Text>
            </Pressable>
          );
        }

        if (token.isEnglish) {
          return (
            <View key={i} style={styles.englishBadge}>
              <Text style={styles.englishText}>{token.text}</Text>
            </View>
          );
        }

        if (revealed.has(i)) {
          return (
            <View key={i} style={styles.revealedBadge}>
              <Text style={styles.revealedText}>{token.original}</Text>
            </View>
          );
        }

        return (
          <Text key={i} style={styles.normal}>
            {token.text}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
  },
  space: {
    width: 4,
  },
  normal: {
    fontSize: 18,
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  gap: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingHorizontal: 2,
    paddingBottom: 2,
  },
  gapText: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: "700",
  },
  englishBadge: {
    backgroundColor: Colors.accent + "22",
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  englishText: {
    fontSize: 18,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  revealedBadge: {
    backgroundColor: Colors.primary + "22",
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  revealedText: {
    fontSize: 18,
    color: Colors.primaryHover,
    fontWeight: "600",
  },
});
