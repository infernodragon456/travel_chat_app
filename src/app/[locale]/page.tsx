"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Mic, MicOff, Bot, Volume2 } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useChat } from "ai/react";
import type { Message } from "ai";

export default function SoraPage() {
  const t = useTranslations("Sora");
  const locale = useLocale();
  const lastSpokenMessageId = useRef<string | null>(null);

  const {
    isListening,
    transcript,
    error: speechError,
    startListening,
    stopListening,
    setTranscript,
  } = useSpeechRecognition();

  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(
    null
  );
  const [locationError, setLocationError] = useState<string | null>(null);

  const speak = useCallback((text: string, lang: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const { messages, isLoading, append } = useChat({
    api: "/api/getSuggestion",
    body: {
      lat: location?.lat,
      lon: location?.lon,
      locale: locale,
    },
    onFinish: (message) => {
      if (
        message.role === "assistant" &&
        message.id !== lastSpokenMessageId.current
      ) {
        speak(message.content, locale);
        lastSpokenMessageId.current = message.id;
      }
    },
  });

  const getLocation = useCallback(() => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationError(t("error_permission"));
      }
    );
  }, [t]);

  useEffect(() => {
    getLocation();
  }, [getLocation]);

  useEffect(() => {
    if (!isListening && transcript && location) {
      append({ role: "user", content: transcript });
      setTranscript("");
    } else if (!isListening && transcript && !location) {
      getLocation();
    }
  }, [isListening, transcript, location, append, setTranscript, getLocation]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-sm">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ModeToggle />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl flex-1 flex flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto p-4 rounded-xl bg-muted/50">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Bot size={48} className="mb-4" />
                <p className="text-lg">{t("subtitle")}</p>
              </div>
            )}

            {messages.map((m: Message) => (
              <div
                key={m.id}
                className={`flex gap-3 items-start ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                    <Bot size={20} />
                  </div>
                )}
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] relative group ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p>{m.content}</p>
                  {m.role === "assistant" && (
                    <button
                      onClick={() => speak(m.content, locale)}
                      className="absolute -right-10 top-1/2 -translate-y-1/2 p-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Volume2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start items-start">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                  <Bot size={20} />
                </div>
                <div className="rounded-lg px-4 py-2 max-w-[80%] bg-muted flex items-center">
                  <div className="w-2 h-2 bg-foreground rounded-full animate-pulse mr-2"></div>
                  <div className="w-2 h-2 bg-foreground rounded-full animate-pulse delay-75 mr-2"></div>
                  <div className="w-2 h-2 bg-foreground rounded-full animate-pulse delay-150"></div>
                </div>
              </div>
            )}
          </div>

          <div className="relative mt-4">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2">
              <button
                onClick={toggleListening}
                className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 ${
                  isListening
                    ? "bg-red-500 scale-110"
                    : "bg-primary hover:bg-primary/90"
                }`}
              >
                {isListening && (
                  <div className="absolute w-full h-full bg-red-500 rounded-full animate-ping"></div>
                )}
                {isListening ? (
                  <MicOff className="w-8 h-8 text-primary-foreground" />
                ) : (
                  <Mic className="w-8 h-8 text-primary-foreground" />
                )}
              </button>
            </div>
          </div>

          <div className="h-20 text-center flex items-center justify-center text-muted-foreground">
            <p>
              {isListening
                ? t("listening")
                : transcript
                ? `"${transcript}"`
                : t("speak_button")}
            </p>
          </div>
          {(speechError || locationError) && (
            <p className="text-sm text-center text-red-500">
              {speechError || locationError}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
