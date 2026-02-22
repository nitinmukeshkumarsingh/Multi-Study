
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Camera, CameraOff, PhoneOff, Loader2, Sparkles, RefreshCcw, Volume2 } from 'lucide-react';
import { getSettings } from '../services/storage';

const decode = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

const encode = (bytes: Uint8Array) => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export const VideoTutor: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const frameIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeAudioNodesCount = useRef<number>(0);
  const isChangingCameraRef = useRef(false);

  const startSession = async (modeOverride?: 'user' | 'environment') => {
    setIsConnecting(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const settings = getSettings();
    const mode = modeOverride || facingMode;

    try {
      // Clean up previous interval before starting new one
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: { width: 640, height: 480, facingMode: mode } 
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Safe closure of previous contexts
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        await audioContextRef.current.close().catch(() => {});
      }
      if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        await outputAudioContextRef.current.close().catch(() => {});
      }

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            isChangingCameraRef.current = false;
            
            // Setup Microphone Streaming
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(2048, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (!isMicOn) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBase64 = encode(new Uint8Array(int16.buffer));
              sessionPromise.then(s => s.sendRealtimeInput({ 
                media: { data: pcmBase64, mimeType: 'audio/pcm;rate=16000' } 
              }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);

            // Setup Video Streaming
            frameIntervalRef.current = window.setInterval(() => {
              if (!isCameraOn || !videoRef.current || !canvasRef.current) return;
              const ctx = canvasRef.current.getContext('2d');
              if (!ctx) return;
              ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
              canvasRef.current.toBlob(async (blob) => {
                if (blob) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    sessionPromise.then(s => s.sendRealtimeInput({ 
                      media: { data: base64, mimeType: 'image/jpeg' } 
                    }));
                  };
                  reader.readAsDataURL(blob);
                }
              }, 'image/jpeg', 0.6);
            }, 500); // 2 FPS for better responsiveness
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              
              activeAudioNodesCount.current++;
              setIsAiSpeaking(true);
              
              sourcesRef.current.add(source);
              source.onended = () => {
                sourcesRef.current.delete(source);
                activeAudioNodesCount.current--;
                if (activeAudioNodesCount.current <= 0) {
                  setIsAiSpeaking(false);
                }
              };
            }
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              activeAudioNodesCount.current = 0;
              setIsAiSpeaking(false);
            }
          },
          onerror: (e) => {
            console.error("Live API Error:", e);
          },
          onclose: () => {
            if (!isChangingCameraRef.current) {
              endSession();
            }
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          tools: [{ googleSearch: {} }],
          systemInstruction: `You are MUKTI AI, a video tutor for ${settings.name} (${settings.academicLevel}). 
          You can see the student and hear them. Today is ${new Date().toLocaleDateString()}.
          Be helpful, visual in your explanations, and friendly. Always provide live, up-to-date info.`
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      console.error("Camera/Mic access denied or error:", err);
      setError(err.message || "Permission denied. Please ensure you have allowed camera and microphone access in your browser settings.");
      setIsConnecting(false);
      isChangingCameraRef.current = false;
    }
  };

  const endSession = () => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    
    // Safe closure of contexts
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;
    outputAudioContextRef.current = null;
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsActive(false);
    onBack();
  };

  const flipCamera = async () => {
    if (isChangingCameraRef.current) return;
    isChangingCameraRef.current = true;
    
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);

    // Close current session specifically to avoid 'onclose' triggering endSession
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    
    // Restart with new mode
    await startSession(newFacingMode);
  };

  const toggleMic = () => {
    const nextState = !isMicOn;
    setIsMicOn(nextState);
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = nextState;
      });
    }
  };

  const toggleCamera = () => {
    const nextState = !isCameraOn;
    setIsCameraOn(nextState);
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => {
        track.enabled = nextState;
      });
    }
  };

  useEffect(() => {
    // We no longer start automatically to ensure user gesture
    return () => {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleInitialStart = () => {
    setHasStarted(true);
    startSession();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#0b1221] flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in duration-500 overflow-hidden">
      
      {/* Dynamic Background: Cognitive Field */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${isAiSpeaking ? 'opacity-40' : 'opacity-20'}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#0e7490_0%,transparent_50%)] animate-pulse" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0f172a] via-[#1e293b] to-[#0891b2] opacity-50" />
        <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0%,rgba(6,182,212,0.1)_25%,transparent_50%)] animate-[spin_20s_linear_infinite]" />
      </div>

      {!hasStarted ? (
        <div className="relative z-50 flex flex-col items-center text-center max-w-md p-8 glass-panel rounded-[32px] border-white/10 shadow-2xl">
          <div className="w-20 h-20 bg-gradient-to-tr from-cyan-400 to-blue-600 rounded-3xl flex items-center justify-center shadow-lg mb-6 animate-bounce">
            <Sparkles size={40} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Ready for your Session?</h2>
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}
          <p className="text-slate-400 mb-8 leading-relaxed">
            MUKTI AI is ready to help you study through a real-time video call. 
            We'll need access to your camera and microphone.
          </p>
          <div className="flex flex-col w-full gap-3">
            <button 
              onClick={handleInitialStart}
              className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-cyan-500/20"
            >
              Start Video Tutor
            </button>
            <button 
              onClick={onBack}
              className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-2xl transition-all"
            >
              Maybe Later
            </button>
          </div>
        </div>
      ) : (
        /* Main Video Window - Fixed overflow and layout */
        <div className={`relative w-full max-w-lg h-[80vh] sm:h-[75vh] max-h-[700px] rounded-[40px] overflow-hidden bg-[#1e293b] shadow-2xl border transition-all duration-500 flex flex-col ${isAiSpeaking ? 'border-cyan-500/50 shadow-cyan-950/50 scale-[1.01]' : 'border-white/10'}`}>
          
          {/* Tutor Info Overlay */}
          <div className="absolute top-6 left-6 z-30 flex items-center gap-3">
            <div className={`w-12 h-12 bg-gradient-to-tr from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-500 ${isAiSpeaking ? 'scale-110 rotate-3' : ''}`}>
              {isAiSpeaking ? <Volume2 size={24} className="text-white animate-pulse" /> : <Sparkles size={24} className="text-white" />}
            </div>
            <div className="drop-shadow-md">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold tracking-tight">MUKTI AI</h3>
                {isAiSpeaking && (
                  <div className="flex gap-0.5 items-end h-3">
                     <div className="w-0.5 h-full bg-cyan-400 animate-[bounce_0.6s_infinite_ease-in-out_0.1s]" />
                     <div className="w-0.5 h-[60%] bg-cyan-400 animate-[bounce_0.6s_infinite_ease-in-out_0.2s]" />
                     <div className="w-0.5 h-[80%] bg-cyan-400 animate-[bounce_0.6s_infinite_ease-in-out_0.3s]" />
                  </div>
                )}
              </div>
              <p className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-500 ${isAiSpeaking ? 'text-cyan-400' : 'text-slate-400'}`}>
                {isAiSpeaking ? 'Neural Transmission' : 'Live Neural Link'}
              </p>
            </div>
          </div>

          {/* Video Feed Area */}
          <div className="flex-1 relative bg-black overflow-hidden">
            {!isCameraOn && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-500 z-10">
                  <CameraOff size={64} />
                  <p className="mt-4 font-bold">Camera is Off</p>
               </div>
            )}
            
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover transition-all duration-700 ${isCameraOn ? 'opacity-100' : 'opacity-0'} ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${isAiSpeaking ? 'brightness-[0.8] saturate-[1.2]' : ''}`} 
            />
            <canvas ref={canvasRef} className="hidden" width="320" height="240" />

            {/* AI Speaking Visualizer Glow */}
            {isAiSpeaking && (
               <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_80px_rgba(6,182,212,0.3)] border-[3px] border-cyan-500/20 rounded-t-[40px] z-20 animate-pulse" />
            )}

            {/* Connection Overlay */}
            {(isConnecting || !isActive) && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-center p-8 z-40">
                <Loader2 size={48} className="text-cyan-400 animate-spin mb-6" />
                <h4 className="text-xl font-bold text-white mb-2">
                  {isChangingCameraRef.current ? 'Switching Camera...' : 'Connecting to MUKTI AI'}
                </h4>
                <p className="text-slate-400 text-sm leading-relaxed">Initializing real-time cognitive session with live data synchronization...</p>
              </div>
            )}
          </div>

          {/* Controls Bar - Anchored to bottom, ensuring visibility */}
          <div className="flex-shrink-0 h-24 bg-[#0f172a] border-t border-white/5 flex items-center justify-between gap-2 px-6 relative z-30">
             <div className="flex gap-3">
               <button 
                 onClick={toggleMic}
                 className={`p-4 rounded-2xl transition-all active:scale-90 ${isMicOn ? 'bg-white/5 text-slate-400 border border-white/5' : 'bg-red-500/20 text-red-500 border border-red-500/20'}`}
               >
                 {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
               </button>
               
               <button 
                 onClick={toggleCamera}
                 className={`p-4 rounded-2xl transition-all active:scale-90 ${isCameraOn ? 'bg-white/5 text-slate-400 border border-white/5' : 'bg-red-500/20 text-red-500 border border-red-500/20'}`}
               >
                 {isCameraOn ? <Camera size={22} /> : <CameraOff size={22} />}
               </button>
             </div>

             <button 
               onClick={endSession}
               className="w-16 h-16 bg-red-600 hover:bg-red-500 text-white rounded-[24px] flex items-center justify-center shadow-xl shadow-red-950/40 transition-all active:scale-95 group relative -top-3"
             >
               <PhoneOff size={28} />
             </button>

             <button 
               onClick={flipCamera}
               className="p-4 rounded-2xl bg-white/5 text-slate-400 border border-white/5 active:scale-90 transition-all"
               title="Flip Camera"
             >
               <RefreshCcw size={22} />
             </button>
          </div>
        </div>
      )}

      <p className="mt-8 text-slate-600 text-[10px] font-bold uppercase tracking-[0.4em] text-center relative z-10 hidden sm:block">
        Neural Engine Powered by MUKTI v2.5
      </p>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
};
