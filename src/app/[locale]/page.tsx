"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Mic, MicOff, Bot, Volume2, Send } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useChat } from "ai/react";
import type { Message } from "ai";
import { Button } from "@/components/ui/button";

export default function SoraPage() {
  const t = useTranslations("Sora");
  const locale = useLocale();
  const lastSpokenMessageId = useRef<string | null>(null);
  const [textInput, setTextInput] = useState("");

  const {
    isListening,
    transcript,
    error: speechError,
    startListening,
    stopListening,
    setTranscript,
    isSupported,
  } = useSpeechRecognition();

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

  const handleSendMessage = useCallback(() => {
    if (textInput.trim()) {
      append({ role: "user", content: textInput });
      setTextInput("");
    }
  }, [textInput, append]);

  const handleVoiceInput = useCallback(() => {
    if (!isListening && transcript) {
      append({ role: "user", content: transcript });
      setTranscript("");
    }
  }, [isListening, transcript, append, setTranscript]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
      handleVoiceInput();
    } else {
      startListening();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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

      <main className="flex-1 flex flex-col items-center p-4 overflow-hidden">
        <div className="w-full max-w-3xl flex-1 flex flex-col min-h-0">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 rounded-xl bg-muted/50 mb-4">
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground px-4">
                <Bot size={64} className="mb-4 text-primary" />
                <p className="text-xl font-semibold mb-2">{t("subtitle")}</p>
                <p className="text-sm opacity-75">{t("placeholder")}</p>
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
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                    <Bot size={22} />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 max-w-[75%] relative group ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.role === "assistant" && (
                    <button
                      onClick={() => speak(m.content, locale)}
                      className="absolute -right-10 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Read aloud"
                    >
                      <Volume2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start items-start">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                  <Bot size={22} />
                </div>
                <div className="rounded-2xl px-4 py-3 bg-card border shadow-sm flex items-center gap-1">
                  <div className="w-2 h-2 bg-foreground/60 rounded-full animate-pulse"></div>
                  <div
                    className="w-2 h-2 bg-foreground/60 rounded-full animate-pulse"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-foreground/60 rounded-full animate-pulse"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t bg-background pt-4">
            {isSupported && (
              <div className="flex items-center justify-center mb-3">
                <button
                  onClick={toggleListening}
                  disabled={isLoading}
                  className={`relative flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isListening
                      ? "bg-red-500 scale-110 shadow-lg"
                      : "bg-primary hover:bg-primary/90 shadow-md"
                  }`}
                >
                  {isListening && (
                    <div className="absolute w-full h-full bg-red-500 rounded-full animate-ping opacity-75"></div>
                  )}
                  {isListening ? (
                    <MicOff className="w-6 h-6 text-primary-foreground relative z-10" />
                  ) : (
                    <Mic className="w-6 h-6 text-primary-foreground relative z-10" />
                  )}
                </button>
              </div>
            )}

            {isListening && transcript && (
              <div className="mb-2 px-4 py-2 bg-muted/50 rounded-lg text-sm text-muted-foreground italic">
                &ldquo;{transcript}&rdquo;
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={t("placeholder")}
                disabled={isLoading}
                className="flex-1 px-4 py-3 border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!textInput.trim() || isLoading}
                size="icon"
                className="h-auto px-4 rounded-xl"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>

            {speechError && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                {t("error_speech_not_supported")}
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
