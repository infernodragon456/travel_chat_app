"use client";

import { useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Mic, MicOff, Bot, Send, Trash2 } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useUnifiedSpeechRecognition } from "@/hooks/use-unified-speech-recognition";
import { useChat } from "ai/react";
import type { Message } from "ai";
import { Button } from "@/components/ui/button";
import { EnhancedAudioPlayer } from "@/components/enhanced-audio-player";
import { usePersistedChat } from "@/hooks/use-persisted-chat";
import { WebResultCards } from "@/components/web-result-cards";

export default function SoraPage() {
  const t = useTranslations("Sora");
  const locale = useLocale();
  const [textInput, setTextInput] = useState("");

  const {
    isListening,
    isProcessing,
    transcript,
    error: speechError,
    startListening,
    stopListening,
    setTranscript,
  } = useUnifiedSpeechRecognition();

  const { messages, isLoading, append, setMessages } = useChat({
    api: "/api/getSuggestion",
    body: {
      locale: locale,
    },
  });

  const { clearChat } = usePersistedChat(locale, messages, setMessages);

  const handleSendMessage = useCallback(() => {
    if (textInput.trim()) {
      append({ role: "user", content: textInput });
      setTextInput("");
    }
  }, [textInput, append]);


  const toggleListening = async () => {
    if (isListening) {
      const transcription = await stopListening();
      if (transcription) {
        // Send the transcribed text directly to the chat
        append({ role: "user", content: transcription });
        setTranscript(""); // Clear the transcript after sending
      }
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
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearChat}
              className="gap-2"
              title={t("clear_chat")}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t("clear_chat")}</span>
            </Button>
          )}
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
                  className={`rounded-2xl px-4 py-3 max-w-[75%] ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border shadow-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.role === "assistant" && (
                    <>
                      <EnhancedAudioPlayer
                        text={m.content}
                        locale={locale}
                        messageId={m.id}
                      />
                      {(() => {
                        try {
                          type MaybeWithData = Message & { data?: unknown };
                          const raw = (m as MaybeWithData).data as string | undefined;
                          if (!raw) return null;
                          const parsed = JSON.parse(raw);
                          console.log("Parsed data:", parsed);
                          if (Array.isArray(parsed?.webSearchResults) && parsed.webSearchResults.length > 0) {
                            console.log("Web search results:", parsed.webSearchResults);
                            return <WebResultCards results={parsed.webSearchResults} />;
                          }
                        } catch {}
                        return null;
                      })()}
                    </>
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
            <div className="flex items-center justify-center mb-3">
              <button
                onClick={toggleListening}
                disabled={isLoading || isProcessing}
                className={`relative flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isListening
                    ? "bg-red-500 scale-110 shadow-lg"
                    : "bg-primary hover:bg-primary/90 shadow-md"
                }`}
                title={
                  isProcessing ? "Processing..." : "Record audio (Whisper)"
                }
              >
                {isListening && (
                  <div className="absolute w-full h-full bg-red-500 rounded-full animate-ping opacity-75"></div>
                )}
                {isProcessing ? (
                  <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin relative z-10"></div>
                ) : isListening ? (
                  <MicOff className="w-6 h-6 text-primary-foreground relative z-10" />
                ) : (
                  <Mic className="w-6 h-6 text-primary-foreground relative z-10" />
                )}
              </button>
            </div>

            {(isListening || isProcessing) && (
              <div className="mb-2 px-4 py-2 bg-muted/50 rounded-lg text-sm text-muted-foreground italic">
                {isListening
                  ? "Recording..."
                  : isProcessing
                  ? "Transcribing with Whisper..."
                  : ""}
                {transcript && ` "${transcript}"`}
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