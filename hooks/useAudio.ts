import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import { useState, useRef, useCallback } from "react";

export type RecordingState = "idle" | "recording" | "processing" | "playing";

export function useAudio() {
  const [state, setState] = useState<RecordingState>("idle");
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) throw new Error("Microphone permission denied");

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setState("recording");
    } catch (err) {
      console.error("startRecording error:", err);
      setState("idle");
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current) return null;
    setState("processing");
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      return uri ?? null;
    } catch (err) {
      console.error("stopRecording error:", err);
      setState("idle");
      return null;
    }
  }, []);

  const speakText = useCallback(
    (text: string, onDone?: () => void) => {
      setState("playing");
      Speech.speak(text, {
        language: "en-US",
        rate: 0.75, // slower for language learners
        pitch: 1.0,
        onDone: () => {
          setState("idle");
          onDone?.();
        },
        onError: () => setState("idle"),
      });
    },
    []
  );

  const stopSpeaking = useCallback(() => {
    Speech.stop();
    setState("idle");
  }, []);

  return { state, startRecording, stopRecording, speakText, stopSpeaking };
}
