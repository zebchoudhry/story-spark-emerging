
import React, { useState } from 'react';
import { BlogPostData, BatchItem } from '../types';
import { performResearch, generateOutline, writeDraft, generateBlogImage, generateSEOKeywords } from '../services/gemini';
import { publishToWordPress } from '../services/wordpress';

interface StepBatchProps {
  data: BlogPostData;
  updateData: (updates: Partial<BlogPostData>) => void;
  onReset: () => void;
  onLoadItem: (item: BatchItem) => void;
}

const StepBatch: React.FC<StepBatchProps> = ({ data, updateData, onReset, onLoadItem }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);

  const processBatch = async () => {
    if (!data.batchItems || data.batchItems.length === 0) return;
    setIsProcessing(true);
    addLog("🚀 Starting bulk automation sequence...");

    const wpConfigRaw = localStorage.getItem('signalforge_wp_config');
    if (!wpConfigRaw) {
        alert("Setup WordPress in Settings first!");
        setIsProcessing(false);
        return;
    }
    const wpConfig = JSON.parse(wpConfigRaw);

    for (let i = 0; i < data.batchItems.length; i++) {
        const item = data.batchItems[i];
        if (item.status === 'COMPLETED') continue;

        setCurrentIndex(i);
        updateItem(i, { status: 'PROCESSING' });
        addLog(`📦 Processing: ${item.title}`);

        try {
            // 1. Research
            addLog(`   - Researching topic...`);
            const research = await performResearch({ title: item.title, angle: "Investigative documentary" }, item.title, 'youtube', undefined, undefined, undefined, item.url);
            
            // 2. Keywords
            addLog(`   - Generating semantic keywords...`);
            const keywords = await generateSEOKeywords(item.title);
            const nlpKeywords = keywords.join(', ');

            // 3. Outline
            addLog(`   - Creating structure...`);
            const outline = await generateOutline({ title: item.title, angle: "" }, research.summary);

            // 4. Draft
            addLog(`   - Writing narrative (Gemini 3 Pro)...`);
            const draft = await writeDraft({ title: item.title, angle: "" }, outline, research.summary, data.brand, nlpKeywords, "", item.title, data.site_id);

            // 5. Image
            addLog(`   - Generating cinematic visual...`);
            const image = await generateBlogImage({ title: item.title, angle: "" }, data.brand);

            // Update item data (for holding research/outline/draft access)
            const itemUpdates = {
                status: 'COMPLETED' as const,
                research,
                outline,
                content: draft,
                image,
                nlpKeywords,
            };

            // 6. Deploy
            addLog(`   - Deploying to WordPress (${item.scheduledDate})...`);
            const publishResult = await publishToWordPress(wpConfig, {
                ...data,
                topic: item.title,
                content: draft,
                image: image,
                scheduledDate: item.scheduledDate,
                selectedIdea: { title: item.title, angle: "" },
                nlpKeywords: nlpKeywords
            });

            if (publishResult.success) {
                updateItem(i, { ...itemUpdates, status: 'COMPLETED', wpLink: publishResult.link });
                addLog(`   ✅ SUCCESS: Published to ${publishResult.link}`);
            } else {
                updateItem(i, { ...itemUpdates, status: 'REVIEW' as any, error: publishResult.message });
                addLog(`   ⚠️ HELD: Content ready but WP Deploy failed. Check settings.`);
            }

        } catch (err: any) {
            console.error(err);
            updateItem(i, { status: 'FAILED', error: err.message });
            addLog(`   ❌ FAILED: ${err.message}`);
        }

        await new Promise(r => setTimeout(r, 2000));
    }

    setIsProcessing(false);
    setCurrentIndex(-1);
    addLog("🏁 Batch processing complete.");
  };

  const updateItem = (index: number, updates: Partial<BatchItem>) => {
    const newItems = [...(data.batchItems || [])];
    newItems[index] = { ...newItems[index], ...updates };
    updateData({ batchItems: newItems });
  };

  const completedCount = data.batchItems?.filter(i => i.status === 'COMPLETED').length || 0;
  const progress = data.batchItems ? (completedCount / data.batchItems.length) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-fade-in">
      <div className="bg-[#0B0F1A] rounded-2xl p-8 text-white border border-[#1F2937] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-red-600/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 flex justify-between items-end">
            <div>
                <h2 className="text-3xl font-extrabold mb-2 text-white">SignalForge Factory</h2>
                <p className="text-slate-400 text-sm">Processing {data.batchItems?.length} investigative articles for {data.brand.domain}</p>
            </div>
            <div className="text-right">
                <div className="text-4xl font-black text-red-600">{Math.round(progress)}%</div>
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Global Progress</div>
            </div>
        </div>
        <div className="mt-6 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[600px]">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Automated Production Queue</h3>
                <button onClick={processBatch} disabled={isProcessing} className={`px-6 py-2 rounded-lg font-bold text-xs shadow-md transition ${isProcessing ? 'bg-slate-200 text-slate-400' : 'bg-red-600 text-white hover:bg-red-700'}`}>
                    {isProcessing ? '🏭 Working...' : '▶ Start Automated Loop'}
                </button>
            </div>
            <div className="divide-y divide-slate-100 overflow-y-auto custom-scrollbar flex-grow">
                {data.batchItems?.map((item, idx) => (
                    <div key={item.id} className={`p-5 flex items-center justify-between transition group ${currentIndex === idx ? 'bg-red-50' : ''}`}>
                        <div className="flex items-center gap-5">
                            <div className={`w-3 h-3 rounded-full ${item.status === 'COMPLETED' ? 'bg-green-500' : item.status === 'FAILED' ? 'bg-red-500' : item.status === 'PROCESSING' ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`}></div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition">{item.title}</h4>
                                <div className="text-[10px] text-slate-500 flex gap-4 mt-1">
                                    <span className="flex items-center gap-1">📅 {new Date(item.scheduledDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                    {item.wpLink && <a href={item.wpLink} target="_blank" className="text-blue-600 hover:underline font-bold">View Live Post</a>}
                                    {item.error && <span className="text-red-500 font-bold">Error: {item.error}</span>}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.status}</span>
                            {item.content && (
                                <button 
                                    onClick={() => onLoadItem(item)}
                                    className="px-3 py-1 bg-slate-900 text-white text-[9px] font-bold uppercase rounded opacity-0 group-hover:opacity-100 transition"
                                >
                                    Review & Edit
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6 h-[600px]">
            <div className="bg-[#111827] rounded-xl p-6 border border-slate-800 flex-grow overflow-hidden flex flex-col">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-4 tracking-widest border-b border-slate-800 pb-2 flex justify-between">
                    <span>Factory Telemetry</span>
                    <span className="text-red-600 animate-pulse">LIVE</span>
                </h3>
                <div className="flex-grow space-y-3 font-mono text-[10px] text-slate-300 overflow-y-auto custom-scrollbar">
                    {logs.length === 0 ? <div className="h-full flex flex-col items-center justify-center opacity-30 italic"><p>Awaiting Loop Start</p></div> : logs.map((log, i) => (
                        <div key={i} className="animate-fade-in border-l border-slate-800 pl-3 py-1 hover:bg-slate-800/50 transition">{log}</div>
                    ))}
                </div>
            </div>
            <button onClick={onReset} className="w-full py-4 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-xl text-xs font-bold uppercase tracking-widest transition shadow-sm">
                🗑️ Clear Command State
            </button>
        </div>
      </div>
    </div>
  );
};

export default StepBatch;
