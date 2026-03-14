import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">OpenVoice</ThemedText>
      <ThemedText style={styles.subtitle}>
        A translator that gradually teaches English.
      </ThemedText>

      <View style={styles.buttonGroup}>
        <Pressable style={styles.button} onPress={() => router.push('/explore')}>
          <ThemedText style={styles.buttonText}>Go to Explore</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 16,
  },
  buttonGroup: {
    marginTop: 16,
    width: '100%',
    maxWidth: 280,
  },
  button: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
