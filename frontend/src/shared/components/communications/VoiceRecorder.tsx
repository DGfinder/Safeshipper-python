'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { 
  Mic, 
  MicOff, 
  Square, 
  Play, 
  Pause, 
  Send, 
  Trash2, 
  Volume2,
  X
} from 'lucide-react';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number, waveformData: number[]) => void;
  onCancel?: () => void;
  maxDuration?: number; // in seconds
  className?: string;
  variant?: 'inline' | 'modal';
  isOpen?: boolean;
}

interface AudioVisualizerProps {
  audioData: number[];
  isRecording: boolean;
  currentTime?: number;
  duration?: number;
  className?: string;
}

// Real-time audio visualizer component
function AudioVisualizer({ 
  audioData, 
  isRecording, 
  currentTime = 0, 
  duration = 0,
  className 
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (audioData.length === 0) return;

    const barWidth = rect.width / audioData.length;
    const barMaxHeight = rect.height * 0.8;

    // Draw progress line
    if (duration > 0) {
      const progressX = (currentTime / duration) * rect.width;
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, rect.height);
      ctx.stroke();
    }

    // Draw waveform bars
    audioData.forEach((value, index) => {
      const barHeight = (value / 255) * barMaxHeight;
      const x = index * barWidth;
      const y = (rect.height - barHeight) / 2;

      // Color based on recording state and progress
      let color = '#D1D5DB'; // default gray
      if (isRecording) {
        color = '#EF4444'; // red while recording
      } else if (duration > 0 && currentTime > 0) {
        const barTime = (index / audioData.length) * duration;
        color = barTime <= currentTime ? '#3B82F6' : '#D1D5DB';
      }

      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });
  }, [audioData, isRecording, currentTime, duration]);

  useEffect(() => {
    if (isRecording) {
      const animate = () => {
        draw();
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
    } else {
      draw();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw, isRecording]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('w-full h-12 rounded', className)}
      style={{ width: '100%', height: '48px' }}
    />
  );
}

export function VoiceRecorder({
  onRecordingComplete,
  onCancel,
  maxDuration = 300, // 5 minutes default
  className,
  variant = 'inline',
  isOpen = true,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [audioData, setAudioData] = useState<number[]>([]);
  const [hasRecording, setHasRecording] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout>();
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout>();
  const animationFrameRef = useRef<number>();

  // Initialize audio context and analyzer
  const initializeAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;
      
      // Create audio context and analyzer
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      setPermissionError(null);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setPermissionError('Microphone access denied. Please allow microphone permissions.');
    }
  }, []);

  // Analyze audio data for visualization
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Convert to smaller array for visualization (32 bars)
    const barCount = 32;
    const step = Math.floor(bufferLength / barCount);
    const newAudioData: number[] = [];

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += dataArray[i * step + j];
      }
      newAudioData.push(sum / step);
    }

    setAudioData(newAudioData);

    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    }
  }, [isRecording]);

  // Start recording
  const startRecording = useCallback(async () => {
    await initializeAudio();
    
    if (!mediaRecorderRef.current) {
      setPermissionError('Failed to initialize microphone');
      return;
    }

    audioChunksRef.current = [];
    setIsRecording(true);
    setRecordingTime(0);
    setHasRecording(false);
    setAudioData([]);

    mediaRecorderRef.current.start(100); // Collect data every 100ms
    
    // Start recording timer
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= maxDuration) {
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    // Start audio analysis
    analyzeAudio();
  }, [initializeAudio, maxDuration, analyzeAudio]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || !isRecording) return;

    setIsRecording(false);
    mediaRecorderRef.current.stop();
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Process the recording
    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
      setHasRecording(true);
      
      // Create audio element for playback
      const audio = new Audio(URL.createObjectURL(audioBlob));
      playbackAudioRef.current = audio;
    };

    // Clean up streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  }, [isRecording]);

  // Play/pause recording
  const togglePlayback = useCallback(() => {
    if (!playbackAudioRef.current) return;

    if (isPlaying) {
      playbackAudioRef.current.pause();
      setIsPlaying(false);
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    } else {
      playbackAudioRef.current.play();
      setIsPlaying(true);
      
      // Update playback time
      playbackTimerRef.current = setInterval(() => {
        if (playbackAudioRef.current) {
          setPlaybackTime(playbackAudioRef.current.currentTime);
          
          if (playbackAudioRef.current.ended) {
            setIsPlaying(false);
            setPlaybackTime(0);
            if (playbackTimerRef.current) {
              clearInterval(playbackTimerRef.current);
            }
          }
        }
      }, 100);
    }
  }, [isPlaying]);

  // Send recording
  const sendRecording = useCallback(() => {
    if (!hasRecording || !audioChunksRef.current.length) return;

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
    onRecordingComplete(audioBlob, recordingTime, audioData);
    
    // Reset state
    setHasRecording(false);
    setRecordingTime(0);
    setPlaybackTime(0);
    setAudioData([]);
  }, [hasRecording, recordingTime, audioData, onRecordingComplete]);

  // Delete recording
  const deleteRecording = useCallback(() => {
    setHasRecording(false);
    setRecordingTime(0);
    setPlaybackTime(0);
    setAudioData([]);
    audioChunksRef.current = [];
    
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const content = (
    <div className={cn('bg-white dark:bg-gray-800 rounded-lg border p-4 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-gray-500" />
          <span className="font-medium">Voice Message</span>
        </div>
        {variant === 'modal' && onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Permission Error */}
      {permissionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {permissionError}
        </div>
      )}

      {/* Waveform Visualizer */}
      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
        {(isRecording || hasRecording) ? (
          <AudioVisualizer
            audioData={audioData}
            isRecording={isRecording}
            currentTime={playbackTime}
            duration={recordingTime}
          />
        ) : (
          <div className="h-12 flex items-center justify-center text-gray-400">
            <Mic className="w-6 h-6 mr-2" />
            <span>Ready to record</span>
          </div>
        )}
      </div>

      {/* Time Display */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>
          {isRecording ? 'Recording...' : hasRecording ? 'Recorded' : 'Press mic to start'}
        </span>
        <span>
          {hasRecording && isPlaying 
            ? formatTime(Math.floor(playbackTime))
            : formatTime(recordingTime)
          }
          {maxDuration && ` / ${formatTime(maxDuration)}`}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {!hasRecording ? (
          // Recording Controls
          <Button
            variant={isRecording ? "destructive" : "default"}
            size="lg"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!!permissionError}
            className={cn(
              'w-16 h-16 rounded-full transition-all duration-200',
              isRecording && 'recording-indicator'
            )}
          >
            {isRecording ? (
              <Square className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </Button>
        ) : (
          // Playback Controls
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={deleteRecording}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={togglePlayback}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={sendRecording}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="flex items-center justify-center gap-2 text-red-600">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">Recording in progress...</span>
        </div>
      )}
    </div>
  );

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-md">
          {content}
        </div>
      </div>
    );
  }

  return content;
}

export default VoiceRecorder;