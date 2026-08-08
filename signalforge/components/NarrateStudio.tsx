import React, { useState, useRef, useEffect } from 'react';
import { BlogPostData, SoundEffect } from '../types';
import { generateSpeech } from '../services/gemini';

interface NarrateStudioProps {
  data: BlogPostData;
  updateData: (updates: Partial<BlogPostData>) => void;
}

const VOICES = [
    { name: 'Fenrir', desc: 'Deep and authoritative' },
    { name: 'Charon', desc: 'Steady and professional' },
    { name: 'Zephyr', desc: 'Gentle and airy' },
    { name: 'Kore', desc: 'Bright and energetic' },
    { name: 'Puck', desc: 'Quick and witty' }
];

const TONES = [
    'Neutral', 'Dramatic & Intense', 'Suspenseful & Whispering', 'Joyful & Energetic', 'Engaging Storyteller'
];

// Helper to decode Base64
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Custom PCM decoding as per instructions for Gemini TTS raw output
async function decodeAudioPCM(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
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
}

export const NarrateStudio: React.FC<NarrateStudioProps> = ({ data, updateData }) => {
    const [generating, setGenerating] = useState(false);
    const [audioReady, setAudioReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Audio State
    const [voiceModel, setVoiceModel] = useState(data.studioAssets?.audioProduction?.voiceModel || 'Zephyr');
    const [toneStyle, setToneStyle] = useState(data.studioAssets?.audioProduction?.toneStyle || 'Neutral');
    const [voiceVol, setVoiceVol] = useState(data.studioAssets?.audioProduction?.voiceVol || 100);
    const [musicVol, setMusicVol] = useState(data.studioAssets?.audioProduction?.musicVol || 30);
    const [effects, setEffects] = useState<SoundEffect[]>(data.studioAssets?.audioProduction?.effects || []);
    const [newEffectWord, setNewEffectWord] = useState('');

    // Web Audio Refs
    const audioCtxRef = useRef<AudioContext | null>(null);
    const voiceBufferRef = useRef<AudioBuffer | null>(null);
    const musicBufferRef = useRef<AudioBuffer | null>(null);
    const voiceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const musicNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const voiceGainRef = useRef<GainNode | null>(null);
    const musicGainRef = useRef<GainNode | null>(null);

    const initAudio = () => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
            voiceGainRef.current = audioCtxRef.current.createGain();
            musicGainRef.current = audioCtxRef.current.createGain();
            voiceGainRef.current.connect(audioCtxRef.current.destination);
            musicGainRef.current.connect(audioCtxRef.current.destination);
        }
    };

    const decodeAudio = async (base64: string): Promise<AudioBuffer> => {
        initAudio();
        const bytes = decodeBase64(base64);
        // Using custom PCM decoder for raw PCM 24kHz Mono data returned by Gemini TTS
        return await decodeAudioPCM(bytes, audioCtxRef.current!, 24000, 1);
    };

    const handleGenerateVoice = async () => {
        if (!data.content) return alert("Write the article first!");
        setGenerating(true);
        try {
            const base64 = await generateSpeech(data.content, voiceModel);
            const buffer = await decodeAudio(base64);
            voiceBufferRef.current = buffer;
            setAudioReady(true);
            updateData({
                studioAssets: {
                    ...data.studioAssets!,
                    audioProduction: {
                        voiceModel,
                        toneStyle,
                        voiceVol,
                        musicVol,
                        effects
                    }
                }
            });
        } catch (e) {
            console.error(e);
            alert("Speech generation failed. Check console.");
        } finally {
            setGenerating(false);
        }
    };

    const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        initAudio();
        const arrayBuffer = await file.arrayBuffer();
        // Background music files (MP3/WAV) use native decodeAudioData
        const buffer = await audioCtxRef.current!.decodeAudioData(arrayBuffer);
        musicBufferRef.current = buffer;
        alert("Backing track loaded.");
    };

    const togglePlayback = () => {
        if (!audioReady) return;
        initAudio();

        if (isPlaying) {
            voiceNodeRef.current?.stop();
            musicNodeRef.current?.stop();
            setIsPlaying(false);
        } else {
            // Setup Voice
            voiceNodeRef.current = audioCtxRef.current!.createBufferSource();
            voiceNodeRef.current.buffer = voiceBufferRef.current;
            voiceGainRef.current!.gain.value = voiceVol / 100;
            voiceNodeRef.current.connect(voiceGainRef.current!);
            
            // Setup Music
            if (musicBufferRef.current) {
                musicNodeRef.current = audioCtxRef.current!.createBufferSource();
                musicNodeRef.current.buffer = musicBufferRef.current;
                musicNodeRef.current.loop = true;
                musicGainRef.current!.gain.value = musicVol / 100;
                musicNodeRef.current.connect(musicGainRef.current!);
                musicNodeRef.current.start();
            }

            voiceNodeRef.current.start();
            voiceNodeRef.current.onended = () => setIsPlaying(false);
            setIsPlaying(true);
        }
    };

    const addEffect = () => {
        if (!newEffectWord) return;
        setEffects([...effects, { id: crypto.randomUUID(), word: newEffectWord }]);
        setNewEffectWord('');
    };

    useEffect(() => {
        if (voiceGainRef.current) voiceGainRef.current.gain.value = voiceVol / 100;
    }, [voiceVol]);

    useEffect(() => {
        if (musicGainRef.current) musicGainRef.current.gain.value = musicVol / 100;
    }, [musicVol]);

    return (
        <div className="bg-[#0B0F1A] text-white p-8 rounded-2xl border border-[#1F2937] shadow-2xl animate-fade-in max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-xl">🎙️</div>
                <h2 className="text-2xl font-bold tracking-tight">NarrateAI Studio</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT: SCRIPT & FX */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Script</label>
                        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4 h-48 overflow-auto custom-scrollbar text-sm text-slate-300 leading-relaxed italic">
                            {data.content || "No content generated yet..."}
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                            <span>{data.content?.length || 0} characters</span>
                            <button 
                                onClick={handleGenerateVoice} 
                                disabled={generating}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold transition flex items-center gap-2"
                            >
                                {generating ? <span className="animate-spin">⏳</span> : '✨'} Generate Voice
                            </button>
                        </div>
                    </div>

                    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="text-orange-500">✨</span>
                            <h3 className="text-sm font-bold uppercase tracking-widest">Soundscape FX</h3>
                        </div>
                        <p className="text-[10px] text-slate-500">Map sounds to trigger when specific words are spoken.</p>
                        
                        <div className="flex flex-wrap gap-2">
                            {effects.map(fx => (
                                <div key={fx.id} className="flex items-center gap-2 bg-[#1F2937] px-3 py-1.5 rounded-lg border border-[#374151]">
                                    <span className="text-xs font-bold text-orange-400">{fx.word}</span>
                                    <button onClick={() => setEffects(effects.filter(e => e.id !== fx.id))} className="text-slate-500 hover:text-red-400">×</button>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <input 
                                className="flex-grow bg-[#0B0F1A] border border-[#1F2937] rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500"
                                placeholder="Type a word (e.g. 'mystery')"
                                value={newEffectWord}
                                onChange={e => setNewEffectWord(e.target.value)}
                            />
                            <button onClick={addEffect} className="bg-[#1F2937] hover:bg-[#374151] px-4 rounded-lg text-lg">+</button>
                        </div>
                    </div>
                </div>

                {/* RIGHT: MIXING CONSOLE */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-gradient-to-br from-[#111827] to-[#0B0F1A] border border-[#1F2937] rounded-2xl p-6 shadow-xl space-y-6">
                        <div className="flex items-center gap-2 border-b border-[#1F2937] pb-3">
                            <span className="text-indigo-400">🔊</span>
                            <h3 className="text-sm font-bold uppercase tracking-widest">Mixing Console</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-[#1F2937] rounded-xl p-6 text-center hover:border-indigo-500 transition cursor-pointer relative">
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="audio/*" onChange={handleMusicUpload} />
                                <div className="text-2xl mb-2">📤</div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Backing Track</p>
                                <p className="text-[9px] text-slate-600 mt-1">Upload MP3 / WAV</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                                        <span>🎤 VOICE VOL</span>
                                        <span>{voiceVol}%</span>
                                    </div>
                                    <input type="range" className="w-full accent-indigo-500" value={voiceVol} onChange={e => setVoiceVol(Number(e.target.value))} />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                                        <span>🎵 MUSIC VOL</span>
                                        <span>{musicVol}%</span>
                                    </div>
                                    <input type="range" className="w-full accent-orange-500" value={musicVol} onChange={e => setMusicVol(Number(e.target.value))} />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-center py-4">
                            <button 
                                onClick={togglePlayback}
                                disabled={!audioReady}
                                className={`w-16 h-16 rounded-full flex items-center justify-center transition shadow-lg ${!audioReady ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40'}`}
                            >
                                <span className="text-2xl">{isPlaying ? '⏸' : '▶'}</span>
                            </button>
                        </div>

                        <button className="w-full bg-[#1F2937] hover:bg-[#374151] py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition">
                            📦 Export Mix
                        </button>
                    </div>

                    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Voice & Style</h3>
                            <button className="text-[10px] text-indigo-400 font-bold">+ Clone Voice</button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                            {VOICES.map(v => (
                                <button 
                                    key={v.name}
                                    onClick={() => setVoiceModel(v.name)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition text-left ${voiceModel === v.name ? 'bg-indigo-600/20 border-indigo-