"use client";

import { useEffect } from "react";
import { type Message } from "ai";

export function usePersistedChat(
  locale: string,
  messages: Message[],
  setMessages: (messages: Message[]) => void
) {
  const storageKey = `chat_history_${locale}`;

  // Load messages from localStorage on mount or locale change
  useEffect(() => {
    const savedMessages = localStorage.getItem(storageKey);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed);
      } catch (error) {
        console.error("Error loading chat history:", error);
      }
    } else {
      // clear messages when switching to a locale with no history
      setMessages([]);
    }
  }, [locale, storageKey, setMessages]);

  // save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, storageKey]);

  // clear chat function
  const clearChat = () => {
    localStorage.removeItem(storageKey);
    // clear audio cache for this locale
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(`audio_`) && key.includes(locale)) {
        localStorage.removeItem(key);
      }
    });
    setMessages([]);
  };

  return { clearChat };
}
