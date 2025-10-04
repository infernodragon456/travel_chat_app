"use client";

import { useState, useRef, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";

// Type declarations for Web Speech API (fallback)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
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
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
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
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
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
    return new Promise((resolve) => {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        console.log("Web Speech API not supported");
        resolve(null);
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = locale;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Web Speech API error:", event.error);
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

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
    } catch (err) {
      console.error("Error starting recording:", err);
      setError(t("error_generic"));
      setIsListening(false);
    }
  }, [t]);

  // Stop recording and transcribe
  const stopListening = useCallback(async () => {
    if (
      !mediaRecorderRef.current ||
      mediaRecorderRef.current.state === "inactive"
    ) {
      setIsListening(false);
      return;
    }

    return new Promise<void>((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;

      mediaRecorder.onstop = async () => {
        setIsListening(false);
        setIsProcessing(true);

        // Create audio blob
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        audioChunksRef.current = [];

        // Stop all tracks
        streamRef.current?.getTracks().forEach((track) => track.stop());

        // Try Whisper first (PRIMARY)
        console.log("Trying Whisper API transcription...");
        let transcription = await transcribeWithWhisper(audioBlob);

        // Fallback to Web Speech API if Whisper fails
        if (!transcription) {
          console.log("Whisper failed, falling back to Web Speech API...");
          transcription = await transcribeWithWebSpeech();
        }

        if (transcription) {
          setTranscript(transcription);
        } else {
          setError(t("error_generic"));
        }

        setIsProcessing(false);
        resolve();
      };

      mediaRecorder.stop();
    });
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
