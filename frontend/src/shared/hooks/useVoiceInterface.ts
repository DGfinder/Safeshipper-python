// useVoiceInterface.ts
// React hooks for voice-activated logistics interface

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  voiceInterfaceService, 
  VoiceCommand, 
  VoiceSession, 
  VoiceCapability,
  VoiceIntent 
} from "@/shared/services/voiceInterfaceService";

// Hook for voice session management
export function useVoiceSession(userId: string = 'demo-user') {
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const startSession = useCallback(() => {
    const newSession = voiceInterfaceService.startVoiceSession(userId);
    setSession(newSession);
    return newSession;
  }, [userId]);

  const endSession = useCallback(() => {
    voiceInterfaceService.endVoiceSession();
    setSession(null);
    setIsListening(false);
    setIsProcessing(false);
  }, []);

  return {
    session,
    isListening,
    isProcessing,
    setIsListening,
    setIsProcessing,
    startSession,
    endSession,
  };
}

// Hook for processing voice commands
export function useVoiceCommand(userId: string = 'demo-user') {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (audioText: string): Promise<VoiceCommand> => {
      return await voiceInterfaceService.processVoiceCommand(audioText, userId);
    },
    onSuccess: (command) => {
      // Invalidate relevant queries based on the command intent
      if (command.intent === 'shipment_status') {
        queryClient.invalidateQueries({ queryKey: ['shipments'] });
      }
      if (command.intent === 'find_vehicle') {
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      }
      if (command.intent === 'system_status') {
        queryClient.invalidateQueries({ queryKey: ['system-status'] });
      }
    },
  });
}

// Hook for voice capabilities
export function useVoiceCapabilities() {
  return useQuery({
    queryKey: ['voice-capabilities'],
    queryFn: async (): Promise<VoiceCapability[]> => {
      await new Promise(resolve => setTimeout(resolve, 300));
      return voiceInterfaceService.getVoiceCapabilities();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// Hook for recent voice commands
export function useRecentVoiceCommands(limit: number = 10) {
  return useQuery({
    queryKey: ['recent-voice-commands', limit],
    queryFn: async (): Promise<VoiceCommand[]> => {
      await new Promise(resolve => setTimeout(resolve, 200));
      return voiceInterfaceService.getRecentCommands(limit);
    },
    refetchInterval: 5000, // Refresh every 5 seconds
    staleTime: 1000, // 1 second
  });
}

// Hook for voice analytics
export function useVoiceAnalytics() {
  return useQuery({
    queryKey: ['voice-analytics'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 400));
      return voiceInterfaceService.getVoiceAnalytics();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // 10 seconds
  });
}

// Hook for speech recognition
export function useSpeechRecognition() {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;
      
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-AU';
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        finalTranscriptRef.current = '';
        setTranscript('');
      };
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }
        
        finalTranscriptRef.current = finalTranscript;
        setTranscript(finalTranscript + interimTranscript);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.onerror = (event: any) => {
        setError(event.error);
        setIsListening(false);
      };
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        setError('Failed to start speech recognition');
        console.error('Speech recognition error:', err);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    finalTranscriptRef.current = '';
    setError(null);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    finalTranscript: finalTranscriptRef.current,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}

// Hook for text-to-speech
export function useTextToSpeech() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  
  useEffect(() => {
    if ('speechSynthesis' in window) {
      setIsSupported(true);
      
      const updateVoices = () => {
        const availableVoices = speechSynthesis.getVoices();
        setVoices(availableVoices);
        
        // Try to find an Australian English voice
        const australianVoice = availableVoices.find(voice => 
          voice.lang.includes('en-AU') || voice.name.includes('Australian')
        );
        
        // Fallback to any English voice
        const englishVoice = availableVoices.find(voice => 
          voice.lang.includes('en-')
        );
        
        setSelectedVoice(australianVoice || englishVoice || availableVoices[0] || null);
      };
      
      updateVoices();
      speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const speak = useCallback((text: string, options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
  }) => {
    if (!isSupported || !text.trim()) return;
    
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.voice = selectedVoice;
    utterance.rate = options?.rate || 1.0;
    utterance.pitch = options?.pitch || 1.0;
    utterance.volume = options?.volume || 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    speechSynthesis.speak(utterance);
  }, [isSupported, selectedVoice]);

  const stop = useCallback(() => {
    if (isSupported) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  const pause = useCallback(() => {
    if (isSupported && isSpeaking) {
      speechSynthesis.pause();
    }
  }, [isSupported, isSpeaking]);

  const resume = useCallback(() => {
    if (isSupported) {
      speechSynthesis.resume();
    }
  }, [isSupported]);

  return {
    isSupported,
    isSpeaking,
    voices,
    selectedVoice,
    setSelectedVoice,
    speak,
    stop,
    pause,
    resume,
  };
}

// Complete voice interface hook combining all functionality
export function useVoiceInterface(userId: string = 'demo-user') {
  const {
    session,
    isListening: sessionListening,
    isProcessing,
    setIsProcessing,
    startSession,
    endSession,
  } = useVoiceSession(userId);

  const processCommand = useVoiceCommand(userId);
  const { data: capabilities } = useVoiceCapabilities();
  const { data: recentCommands } = useRecentVoiceCommands();
  const { data: analytics } = useVoiceAnalytics();

  const {
    isSupported: speechSupported,
    isListening: speechListening,
    transcript,
    finalTranscript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const {
    isSupported: ttsSupported,
    isSpeaking,
    speak,
    stop: stopSpeaking,
  } = useTextToSpeech();

  const [commandHistory, setCommandHistory] = useState<VoiceCommand[]>([]);
  const [isActive, setIsActive] = useState(false);

  // Combined listening state
  const isListening = sessionListening || speechListening;

  // Start voice interface
  const startVoiceInterface = useCallback(() => {
    if (!speechSupported) {
      console.warn('Speech recognition not supported');
      return;
    }

    const newSession = startSession();
    setIsActive(true);
    speak("Voice interface activated. How can I help you?");
    
    return newSession;
  }, [speechSupported, startSession, speak]);

  // Stop voice interface
  const stopVoiceInterface = useCallback(() => {
    stopListening();
    stopSpeaking();
    endSession();
    setIsActive(false);
    resetTranscript();
  }, [stopListening, stopSpeaking, endSession, resetTranscript]);

  // Process voice input
  const processVoiceInput = useCallback(async (text?: string) => {
    const inputText = text || finalTranscript;
    if (!inputText.trim()) return;

    setIsProcessing(true);
    
    try {
      const command = await processCommand.mutateAsync(inputText);
      setCommandHistory(prev => [command, ...prev.slice(0, 9)]); // Keep last 10
      
      // Speak the response if available
      if (command.response.audioResponse) {
        speak(command.response.audioResponse);
      }
      
      // Handle actions
      if (command.response.actions) {
        for (const action of command.response.actions) {
          if (action.actionType === 'navigate') {
            // Navigate to the specified route
            if (typeof window !== 'undefined' && action.target.startsWith('/')) {
              window.location.href = action.target;
            }
          }
        }
      }
      
      return command;
    } catch (error) {
      console.error('Voice command processing error:', error);
      speak("Sorry, I couldn't process that command. Please try again.");
    } finally {
      setIsProcessing(false);
      resetTranscript();
    }
  }, [finalTranscript, processCommand, speak, resetTranscript]);

  // Auto-process when speech ends and we have a transcript
  useEffect(() => {
    if (!speechListening && finalTranscript && !isProcessing) {
      processVoiceInput();
    }
  }, [speechListening, finalTranscript, isProcessing, processVoiceInput]);

  // Voice command shortcuts
  const executeQuickCommand = useCallback(async (intent: VoiceIntent, text?: string) => {
    const commandText = text || `Execute ${intent.replace('_', ' ')}`;
    return await processVoiceInput(commandText);
  }, [processVoiceInput]);

  // Get suggested commands based on context
  const getSuggestedCommands = useCallback(() => {
    const suggestions = [
      "What's the status of shipment SH-2024-1001?",
      "Find available vehicles near Perth",
      "Show system status",
      "Generate a report",
      "Check driver hours",
      "What's the weather in Kalgoorlie?",
    ];
    
    return suggestions;
  }, []);

  return {
    // Session state
    session,
    isActive,
    isListening,
    isProcessing,
    
    // Speech recognition
    speechSupported,
    transcript,
    finalTranscript,
    speechError,
    
    // Text-to-speech
    ttsSupported,
    isSpeaking,
    
    // Commands and history
    commandHistory,
    recentCommands: recentCommands || [],
    
    // Analytics and capabilities
    analytics,
    capabilities: capabilities || [],
    
    // Actions
    startVoiceInterface,
    stopVoiceInterface,
    startListening,
    stopListening,
    processVoiceInput,
    executeQuickCommand,
    speak,
    stopSpeaking,
    resetTranscript,
    getSuggestedCommands,
    
    // Loading states
    isLoading: processCommand.isPending,
    error: processCommand.error,
  };
}