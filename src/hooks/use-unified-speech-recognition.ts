"use client";

import { useState, useRef, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";

// ================== HELPER FUNCTIONS (RE-ADDED) ==================

/**
 * Encodes a raw AudioBuffer into a WAV file (Blob).
 */
function audioBufferToWav(audioBuffer: AudioBuffer): Blob {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  const buffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // WAV header
  writeString(0, "RIFF");
  view.setUint32(4, 36 + length * numberOfChannels * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * 2, true);
  view.setUint16(32, numberOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, length * numberOfChannels * 2, true);

  // PCM data
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(
        -1,
        Math.min(1, audioBuffer.getChannelData(channel)[i])
      );
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true
      );
      offset += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Decodes any audio blob into a raw AudioBuffer and then converts it to a WAV Blob.
 */
async function convertToWav(audioBlob: Blob): Promise<Blob> {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const audioContext = new AudioContextClass();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const wavBlob = audioBufferToWav(audioBuffer);
    audioContext.close();
    return wavBlob;
  } catch (error) {
    console.error("❌ Audio conversion to WAV failed:", error);
    // Return original blob as a fallback, though it may not be supported
    return audioBlob;
  }
}

// ================== SPEECH RECOGNITION HOOK ==================

// Type declarations for Web Speech API (fallback)
// ... (interfaces remain the same, not shown for brevity)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export const useUnifiedSpeechRecognition = () => {
  const t = useTranslations("Sora");
  const locale = useLocale();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Try Whisper API transcription (PRIMARY)
  const transcribeWithWhisper = useCallback(
    async (audioBlob: Blob): Promise<string | null> => {
      try {
        console.log("🔄 Converting audio to WAV for compatibility...");
        // ================== FIX IS HERE ==================
        // Convert the recorded blob to WAV format before sending.
        const wavBlob = await convertToWav(audioBlob);
        const audioFile = new File([wavBlob], "recording.wav", {
          type: "audio/wav",
        });
        // ================== END OF FIX ===================

        console.log("📤 Sending WAV audio to Whisper API:", {
          name: audioFile.name,
          type: audioFile.type,
          size: audioFile.size,
        });

        const formData = new FormData();
        formData.append("audio", audioFile);
        formData.append("locale", locale);

        const response = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Whisper API error:", errorData);
          return null;
        }

        const result = await response.json();
        return result.text;
      } catch (error) {
        console.error("Whisper transcription failed:", error);
        return null;
      }
    },
    [locale]
  );

  // Fallback to Web Speech API
  const transcribeWithWebSpeech = useCallback((): Promise<string | null> => {
    // ... (This function remains the same)
    return new Promise((resolve) => {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return resolve(null);
      const recognition = new SpeechRecognition();
      recognition.lang = locale;
      recognition.onresult = (e) =>
        resolve(e.results.item(0).item(0).transcript);
      recognition.onerror = (e) => {
        console.error("Web Speech API error:", e.error);
        resolve(null);
      };
      recognition.start();
    });
  }, [locale]);

  // Start recording audio
  const startListening = useCallback(async () => {
    try {
      setError(null);
      setTranscript("");
      setIsListening(true);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // ================== FIX IS HERE ==================
      // 1. Explicitly find a supported MIME type
      const supportedTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4", // Often supported in Safari/Chrome
      ];
      const mimeType = supportedTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      if (!mimeType) {
        console.error("❌ No supported audio format found");
        setError("Your browser does not support audio recording.");
        setIsListening(false);
        return;
      }

      console.log(`🎙️ Using supported audio format: ${mimeType}`);

      // 2. Pass the chosen mimeType to the MediaRecorder constructor
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      // ================== END OF FIX ===================

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      console.log("✅ Recording started");
    } catch (err) {
      console.error("❌ Error starting recording:", err);
      setError(t("error_generic"));
      setIsListening(false);
    }
  }, [t]);

  // Stop recording and transcribe
  const stopListening = useCallback(async () => {
    // ... (This function remains the same, except for logging)
    if (
      !mediaRecorderRef.current ||
      mediaRecorderRef.current.state === "inactive"
    ) {
      return;
    }

    mediaRecorderRef.current.onstop = async () => {
      setIsListening(false);
      setIsProcessing(true);
      const audioBlob = new Blob(audioChunksRef.current, {
        type: mediaRecorderRef.current?.mimeType ?? "audio/webm",
      });
      console.log("🎵 Original audio blob created:", {
        size: `${(audioBlob.size / 1024).toFixed(2)} KB`,
        type: audioBlob.type,
      });

      audioChunksRef.current = [];
      streamRef.current?.getTracks().forEach((track) => track.stop());

      if (audioBlob.size < 1000) {
        setError("Recording too short.");
        setIsProcessing(false);
        return;
      }

      let transcription = await transcribeWithWhisper(audioBlob);
      if (!transcription) {
        transcription = await transcribeWithWebSpeech();
      }
      if (transcription) {
        setTranscript(transcription);
      } else {
        setError(t("error_generic"));
      }
      setIsProcessing(false);
    };

    mediaRecorderRef.current.stop();
  }, [transcribeWithWhisper, transcribeWithWebSpeech, t]);

  return {
    isListening,
    isProcessing,
    transcript,
    error,
    startListening,
    stopListening,
    setTranscript,
  };
};
