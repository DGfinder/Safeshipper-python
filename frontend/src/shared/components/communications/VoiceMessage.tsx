'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { Play, Pause, Volume2, Download } from 'lucide-react';
import { format } from 'date-fns';

interface VoiceMessageProps {
  audioUrl: string;
  duration: number;
  waveformData?: number[];
  timestamp: Date;
  isOwnMessage?: boolean;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
}

interface WaveformProps {
  data: number[];
  progress: number;
  duration: number;
  isPlaying: boolean;
  onClick: (position: number) => void;
  className?: string;
}

// Interactive waveform component
function Waveform({ data, progress, duration, isPlaying, onClick, className }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (data.length === 0) return;

    const barWidth = rect.width / data.length;
    const barMaxHeight = rect.height * 0.8;
    const progressX = (progress / duration) * rect.width;

    // Draw waveform bars
    data.forEach((value, index) => {
      const barHeight = Math.max(2, (value / 255) * barMaxHeight);
      const x = index * barWidth;
      const y = (rect.height - barHeight) / 2;

      // Determine color based on progress
      const barCenter = x + barWidth / 2;
      const isPlayed = barCenter <= progressX;
      
      ctx.fillStyle = isPlayed ? '#3B82F6' : '#D1D5DB';
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });

    // Draw progress line
    if (isPlaying || progress > 0) {
      ctx.strokeStyle = '#1E40AF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, rect.height);
      ctx.stroke();
    }
  }, [data, progress, duration, isPlaying]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleClick = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const position = (x / rect.width) * duration;
    onClick(position);
  };

  // Generate default waveform if no data provided
  const waveformData = data.length > 0 ? data : Array.from({ length: 40 }, () => Math.random() * 255);

  return (
    <div 
      ref={containerRef}
      className={cn('cursor-pointer hover:opacity-80 transition-opacity', className)}
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-8"
        style={{ width: '100%', height: '32px' }}
      />
    </div>
  );
}

export function VoiceMessage({
  audioUrl,
  duration,
  waveformData = [],
  timestamp,
  isOwnMessage = false,
  className,
  onPlay,
  onPause,
}: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout>();

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio(audioUrl);
    audio.preload = 'metadata';
    
    audio.addEventListener('loadstart', () => setIsLoading(true));
    audio.addEventListener('canplay', () => setIsLoading(false));
    audio.addEventListener('error', () => {
      setError('Failed to load audio');
      setIsLoading(false);
    });
    
    audioRef.current = audio;

    return () => {
      audio.remove();
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [audioUrl]);

  // Toggle play/pause
  const togglePlayback = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
        onPause?.();
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
        onPlay?.();
        
        // Update progress
        progressIntervalRef.current = setInterval(() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            
            if (audioRef.current.ended) {
              setIsPlaying(false);
              setCurrentTime(0);
              audioRef.current.currentTime = 0;
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
              }
            }
          }
        }, 100);
      }
    } catch (error) {
      setError('Failed to play audio');
      setIsPlaying(false);
    }
  }, [isPlaying, onPlay, onPause]);

  // Seek to position
  const seekTo = useCallback((position: number) => {
    if (!audioRef.current) return;
    
    const clampedPosition = Math.max(0, Math.min(position, duration));
    audioRef.current.currentTime = clampedPosition;
    setCurrentTime(clampedPosition);
  }, [duration]);

  // Download audio
  const downloadAudio = useCallback(() => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `voice-message-${format(timestamp, 'yyyy-MM-dd-HH-mm-ss')}.webm`;
    link.click();
  }, [audioUrl, timestamp]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border max-w-sm',
        isOwnMessage 
          ? 'bg-blue-500 text-white border-blue-600' 
          : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* Play/Pause Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={togglePlayback}
        disabled={isLoading || !!error}
        className={cn(
          'w-10 h-10 rounded-full flex-shrink-0',
          isOwnMessage 
            ? 'text-white hover:bg-blue-400' 
            : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
        )}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : error ? (
          <Volume2 className="w-4 h-4 opacity-50" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </Button>

      {/* Waveform and Info */}
      <div className="flex-1 min-w-0">
        {error ? (
          <div className="text-sm opacity-75">
            Unable to load voice message
          </div>
        ) : (
          <>
            {/* Waveform */}
            <Waveform
              data={waveformData}
              progress={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onClick={seekTo}
              className="mb-1"
            />
            
            {/* Time Info */}
            <div className="flex justify-between items-center text-xs opacity-75">
              <span>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <span>
                {format(timestamp, 'HH:mm')}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Download Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={downloadAudio}
        className={cn(
          'w-8 h-8 rounded-full flex-shrink-0',
          isOwnMessage 
            ? 'text-white hover:bg-blue-400' 
            : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
        )}
      >
        <Download className="w-3 h-3" />
      </Button>
    </div>
  );
}

export default VoiceMessage;