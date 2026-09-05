"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Rewind, FastForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatCallDuration } from "@/lib/utils";

export default function CrmAudioPlayer({ src, className }: { src: string, className?: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
    };

    const setAudioTime = () => {
      setProgress(audio.currentTime);
    };

    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", setAudioData);
    audio.addEventListener("timeupdate", setAudioTime);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", setAudioData);
      audio.removeEventListener("timeupdate", setAudioTime);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Number(e.target.value);
    audio.currentTime = time;
    setProgress(time);
  };

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime += seconds;
  };

  const toggleSpeed = () => {
    const audio = audioRef.current;
    if (!audio) return;
    let newSpeed = 1;
    if (playbackRate === 1) newSpeed = 1.5;
    else if (playbackRate === 1.5) newSpeed = 2;
    else newSpeed = 1;

    audio.playbackRate = newSpeed;
    setPlaybackRate(newSpeed);
  };

  return (
    <div className={cn("flex flex-col gap-2 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl p-3 border border-indigo-100 dark:border-indigo-900/50", className)}>
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {/* Progress Bar */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium text-indigo-700/70 w-8 text-right">{formatCallDuration(progress)}</span>
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={progress}
          onChange={handleSeek}
          className="flex-1 h-1.5 bg-indigo-200 dark:bg-indigo-800 rounded-full appearance-none cursor-pointer accent-indigo-600"
        />
        <span className="text-[10px] font-medium text-indigo-700/70 w-8">{formatCallDuration(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <button 
          onClick={toggleSpeed}
          className="text-[11px] font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800 px-2 py-1 rounded-md transition-colors"
        >
          {playbackRate}x
        </button>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => skip(-10)} 
            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 transition-colors"
            title="-10 soniya"
          >
            <Rewind className="h-4 w-4" />
          </button>
          
          <button 
            onClick={togglePlayPause} 
            className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-transform active:scale-95"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>

          <button 
            onClick={() => skip(10)} 
            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 transition-colors"
            title="+10 soniya"
          >
            <FastForward className="h-4 w-4" />
          </button>
        </div>
        
        <div className="w-8"></div> {/* Spacer for centering */}
      </div>
    </div>
  );
}
