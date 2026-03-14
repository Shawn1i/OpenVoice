import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Colors, Shadows } from "../constants/theme";
import { RecordingState } from "../hooks/useAudio";

type Props = {
  state: RecordingState;
  onPressIn: () => void;
  onPressOut: () => void;
};

export function MicButton({ state, onPressIn, onPressOut }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state === "recording") {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, { toValue: 1.6, duration: 900, useNativeDriver: true }),
            Animated.timing(pulseOpacity, { toValue: 0.3, duration: 450, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
            Animated.timing(pulseOpacity, { toValue: 0, duration: 450, useNativeDriver: true }),
          ]),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      pulseOpacity.setValue(0);
    }
  }, [state]);

  const isActive = state === "recording";
  const isDisabled = state === "processing" || state === "playing";

  const label =
    state === "recording"
      ? "Listening..."
      : state === "processing"
      ? "Thinking..."
      : state === "playing"
      ? "Speaking..."
      : "Hold to Speak";

  return (
    <View style={styles.container}>
      {/* Pulse ring */}
      <Animated.View
        style={[
          styles.pulse,
          {
            transform: [{ scale: pulseAnim }],
            opacity: pulseOpacity,
          },
        ]}
      />

      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        style={[
          styles.button,
          isActive && styles.buttonActive,
          isDisabled && styles.buttonDisabled,
        ]}
      >
        <Text style={styles.icon}>🎙</Text>
      </Pressable>

      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  pulse: {
    position: "absolute",
    width: 120,
    height: 120,
    backgroundColor: Colors.primary,
    borderRadius: 60,
  },
  button: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.mic,
  },
  buttonActive: {
    backgroundColor: Colors.primaryHover,
  },
  buttonDisabled: {
    backgroundColor: Colors.surfaceSecondary,
    ...Shadows.card,
  },
  icon: {
    fontSize: 48,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
