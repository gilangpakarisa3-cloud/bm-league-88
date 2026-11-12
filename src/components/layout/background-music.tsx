"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGlobalSeasonTheme } from '@/context/season-theme-context';
import { cn } from '@/lib/utils';

export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);
  const { theme } = useGlobalSeasonTheme();

  useEffect(() => {
    const audio = new Audio('/bgm.mp3');
    audio.loop = true;
    audio.volume = 0.35; // Default comfortable volume
    audioRef.current = audio;

    const handlePlaySuccess = () => {
      setIsPlaying(true);
      setHasInteracted(true);
    };

    // Modern browsers block autoplay without user gesture.
    // We try to autoplay first:
    const promise = audio.play();
    if (promise !== undefined) {
      promise
        .then(handlePlaySuccess)
        .catch(() => {
          // Autoplay was blocked. Wait for user's first interaction anywhere on the document.
          setIsPlaying(false);
          const enableAudioOnInteraction = () => {
            if (audioRef.current && audioRef.current.paused) {
              audioRef.current
                .play()
                .then(() => {
                  setIsPlaying(true);
                  setHasInteracted(true);
                })
                .catch(() => {});
            }
            window.removeEventListener('click', enableAudioOnInteraction);
            window.removeEventListener('keydown', enableAudioOnInteraction);
            window.removeEventListener('touchstart', enableAudioOnInteraction);
          };

          window.addEventListener('click', enableAudioOnInteraction, { once: true });
          window.addEventListener('keydown', enableAudioOnInteraction, { once: true });
          window.addEventListener('touchstart', enableAudioOnInteraction, { once: true });
        });
    }

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error("Playback error:", err);
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={togglePlay}
      title={isPlaying ? "Mute Background Music" : "Play Background Music"}
      style={{
        backgroundColor: isPlaying ? `${theme.primaryHex}1a` : 'rgba(255, 255, 255, 0.03)',
        borderColor: isPlaying ? `${theme.primaryHex}80` : 'rgba(255, 255, 255, 0.1)',
        color: isPlaying ? theme.primaryHex : 'rgba(255, 255, 255, 0.7)',
        boxShadow: isPlaying ? `0 0 15px ${theme.primaryHex}33` : undefined,
      }}
      className={cn(
        "h-10 w-10 sm:h-11 sm:w-11 rounded-2xl border transition-all hover:border-white/30 hover:brightness-125 group/music relative overflow-hidden shrink-0",
        isPlaying && "animate-pulse"
      )}
    >
      <div className="flex flex-col items-center">
        {isPlaying ? (
          <Volume2 className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 group-hover/music:scale-110" />
        ) : (
          <VolumeX className="h-4 w-4 sm:h-5 sm:w-5 opacity-60 transition-transform duration-300 group-hover/music:scale-110" />
        )}
        <span className="text-[6px] font-black uppercase tracking-widest leading-none mt-0.5">
          {isPlaying ? 'BGM' : 'OFF'}
        </span>
      </div>
    </Button>
  );
}

