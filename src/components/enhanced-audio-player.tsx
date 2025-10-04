"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Download } from "lucide-react";
import { Button } from "./ui/button";

interface EnhancedAudioPlayerProps {
  text: string;
  locale: string;
  messageId: string;
}

export function EnhancedAudioPlayer({
  text,
  locale,
  messageId,
}: EnhancedAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [useWebSpeech, setUseWebSpeech] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Try to load cached audio from localStorage
  useEffect(() => {
    const cachedAudio = localStorage.getItem(`audio_${messageId}`);
    if (cachedAudio) {
      setAudioUrl(cachedAudio);
    }
  }, [messageId]);

  // Generate audio file
  const generateAudio = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, locale }),
      });

      const data = await response.json();

      if (data.fallback || data.error) {
        // Fallback to Web Speech API
        console.log("Using Web Speech API fallback");
        setUseWebSpeech(true);
        setIsLoading(false);
        return;
      }

      // Convert base64 to blob URL
      const audioBlob = base64ToBlob(data.audioContent, "audio/mp3");
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      // Cache the audio URL
      localStorage.setItem(`audio_${messageId}`, url);
    } catch (error) {
      console.error("Error generating audio:", error);
      setUseWebSpeech(true);
    }
    setIsLoading(false);
  };

  const handlePlayPause = async () => {
    if (useWebSpeech) {
      handleWebSpeechPlayPause();
      return;
    }

    if (!audioUrl) {
      await generateAudio();
      return;
    }

    if (!audioRef.current) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.addEventListener("timeupdate", () => {
        setCurrentTime(audio.currentTime);
      });

      audio.addEventListener("loadedmetadata", () => {
        setDuration(audio.duration);
      });

      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleWebSpeechPlayPause = () => {
    if (!window.speechSynthesis) {
      alert("Text-to-speech not supported in this browser");
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = locale === "ja" ? "ja-JP" : "en-US";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = isMuted ? 0 : 1;

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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
  };

  const handleDownload = () => {
    if (audioUrl) {
      const a = document.createElement("a");
      a.href = audioUrl;
      a.download = `sora_tts_${messageId}.mp3`;
      a.click();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-2 mt-2 p-3 rounded-lg bg-muted/30">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePlayPause}
          disabled={isLoading}
          className="h-8 w-8 p-0"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
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

        {!useWebSpeech && audioUrl && (
          <>
            <span className="text-xs text-muted-foreground min-w-[40px]">
              {formatTime(currentTime)}
            </span>

            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
            />

            <span className="text-xs text-muted-foreground min-w-[40px]">
              {formatTime(duration)}
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-8 w-8 p-0"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
          </>
        )}

        {useWebSpeech && (
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full bg-primary transition-all ${
                isPlaying ? "animate-pulse" : ""
              }`}
              style={{ width: isPlaying ? "100%" : "0%" }}
            />
          </div>
        )}

        <span className="text-xs text-muted-foreground">
          {useWebSpeech ? "Web TTS" : "AI TTS"}
        </span>
      </div>
    </div>
  );
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
