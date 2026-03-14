import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const phrases = [
  'I need a doctor',
  'My child is sick',
  'Where is the bus stop?',
  'I am looking for work',
];

export default function ExploreScreen() {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Explore</ThemedText>
        <ThemedText style={styles.subtitle}>
          Replace this screen with your Rohingya phrase flow next.
        </ThemedText>

        <View style={styles.card}>
          <ThemedText type="subtitle">Sample phrases</ThemedText>
          {phrases.map((phrase) => (
            <ThemedText key={phrase} style={styles.phrase}>
              • {phrase}
            </ThemedText>
          ))}
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    gap: 20,
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  phrase: {
    fontSize: 16,
  },
});
