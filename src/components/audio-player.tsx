"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "./ui/button";

interface AudioPlayerProps {
  text: string;
  locale: string;
}

export function AudioPlayer({ text, locale }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePlayPause = () => {
    if (!window.speechSynthesis) {
      alert("Text-to-speech not supported in this browser");
      return;
    }

    if (isPlaying) {
      // Pause/Stop
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      // Play
      window.speechSynthesis.cancel(); // Cancel any existing

      const utterance = new SpeechSynthesisUtterance(text);

      // Set proper language codes for better voice selection
      utterance.lang = locale === "ja" ? "ja-JP" : "en-US";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = isMuted ? 0 : 1;

      // Try to select a better voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find((voice) =>
        voice.lang.startsWith(locale === "ja" ? "ja" : "en")
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    if (utteranceRef.current && isPlaying) {
      // Restart with new volume
      window.speechSynthesis.cancel();
      handlePlayPause();
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-muted/30">
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePlayPause}
        className="h-8 w-8 p-0"
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleMuteToggle}
        className="h-8 w-8 p-0"
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </Button>

      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full bg-primary transition-all ${
            isPlaying ? "animate-pulse" : ""
          }`}
          style={{ width: isPlaying ? "100%" : "0%" }}
        />
      </div>

      <span className="text-xs text-muted-foreground">TTS</span>
    </div>
  );
}
