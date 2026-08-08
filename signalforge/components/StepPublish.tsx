
import React, { useState, useEffect } from 'react';
import { BlogPostData, WordPressConfig, UserTier, WPCategory } from '../types';
import { publishToWordPress, fetchLatestScheduledPost, verifyConnection, fetchCategories } from '../services/wordpress';
import { generateBacklinkStrategy, generateStudioAssets } from '../services/gemini';
import { checkPermission } from '../services/permissions';
import { StorageService } from '../services/storage';

interface StepPublishProps {
  data: BlogPostData;
  updateData: (updates: Partial<BlogPostData>) => void;
  onBack: () => void;
  onReset: () => void;
  userTier: UserTier;
  siteId: string;
}

const StepPublish: React.FC<StepPublishProps> = ({ data, updateData, onBack, onReset, userTier }) => {
  const [config, setConfig] = useState<WordPressConfig>({ siteUrl: '', username: '', appPassword: '' });
  const [activeTab, setActiveTab] = useState<'publish' | 'promote' | 'repurpose'>('publish');
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; link?: string } | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  
  const [categories, setCategories] = useState<WPCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);

  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now');
  const [findingSlot, setFindingSlot] = useState(false);
  
  const canUseBacklinks = checkPermission(userTier, 'hasBacklinkStrategy');
  const [generatingStrategy, setGeneratingStrategy] = useState(false);
  const [generatingStudio, setGeneratingStudio] = useState(false);

  useEffect(() => {
    const savedConfig = localStorage.getItem('signalforge_wp_config');
    if (savedConfig) {
        try {
            const parsed = JSON.parse(savedConfig);
            setConfig(parsed);
            if (parsed.siteUrl && parsed.username) {
                loadCategories(parsed);
            }
        } catch (e) {}
    }
  }, []);

  const loadCategories = async (cfg: WordPressConfig) => {
      setLoadingCats(true);
      try {
          const cats = await fetchCategories(cfg);
          setCategories(cats);
      } catch (e) {
          console.error("Failed to load categories", e);
      } finally {
          setLoadingCats(false);
      }
  };

  const handleSaveConfig = () => {
      localStorage.setItem('signalforge_wp_config', JSON.stringify(config));
      alert("Credentials saved to local browser storage.");
      loadCategories(config);
  };

  const handleTestConnection = async () => {
      setConnectionStatus({ message: "Testing..." });
      const res = await verifyConnection(config);
      setConnectionStatus(res);
      if (!res.success && res.message.includes("Authorization Failed")) {
          setShowTroubleshoot(true);
      } else if (res.success) {
          loadCategories(config);
      }
  };

  const handleSaveDraft = async () => {
    setSaveLoading(true);
    try {
      await StorageService.saveArticle(data);
      setResult({ success: true, message: "Draft successfully saved to Logs for later review." });
      setTimeout(() => setResult(null), 3000);
    } catch (e) {
      setResult({ success: false, message: "Failed to save draft." });
    } finally {
      setSaveLoading(false);
    }
  };

  const findNextSlot = async () => {
      if (!config.siteUrl || !config.username) return alert("Enter Site URL and Username first.");
      setFindingSlot(true);
      try {
          const lastDateStr = await fetchLatestScheduledPost(config);
          let nextDate = new Date();
          if (lastDateStr) {
              const lastDate = new Date(lastDateStr);
              lastDate.setDate(lastDate.getDate() + 2);
              lastDate.setHours(9, 0, 0, 0);
              nextDate = lastDate;
          } else {
              nextDate.setDate(nextDate.getDate() + 1);
              nextDate.setHours(9, 0, 0, 0);
          }
          updateData({ scheduledDate: nextDate.toISOString().slice(0, 16) });
          setScheduleMode('schedule');
      } catch (e) {} finally { setFindingSlot(false); }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.siteUrl || !config.username || !config.appPassword) return alert("Please enter all WordPress credentials.");
    setLoading(true);
    setResult(null);
    try {
      const postData = { ...data };
      if (scheduleMode === 'now') postData.scheduledDate = undefined;
      const res = await publishToWordPress(config, postData);
      if (res.success) {
        StorageService.saveArticle(data); // Audit trail
      }
      setResult(res);
    } catch (err: any) {
      setResult({ success: false, message: err.message });
    } finally { setLoading(false); }
  };

  const handleGenerateStrategy = async () => {
      if (!data.content) return alert("Generate article first.");
      setGeneratingStrategy(true);
      try {
          const titleMatch = data.content.match(/^#\s+(.+)$/m);
          const strategy = await generateBacklinkStrategy(titleMatch ? titleMatch[1] : data.topic, data.content, data.brand.domain);
          updateData({ backlinkStrategy: strategy });
      } catch (e) {
        console.error(e);
      } finally { setGeneratingStrategy(false); }
  };

  const handleGenerateStudio = async () => {
      if (!data.content) return alert("Generate article first.");
      setGeneratingStudio(true);
      try {
          const assets = await generateStudioAssets(data.content);
          updateData({ studioAssets: assets });
      } catch (e) {
        console.error(e);
      } finally { setGeneratingStudio(false); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
       <div className="flex justify-between items-center border-b border-slate-200 bg-white p-2 rounded-t-xl">
        <div className="flex">
            <button onClick={() => setActiveTab('publish')} className={`px-8 py-4 text-xs font-bold uppercase tracking-wider transition ${activeTab === 'publish' ? 'text-[#FF6A00] border-b-2 border-[#FF6A00] bg-orange-50/50' : 'text-slate-500 hover:text-slate-700'}`}>1. Publish</button>
            <button onClick={() => setActiveTab('promote')} className={`px-8 py-4 text-xs font-bold uppercase tracking-wider transition ${activeTab === 'promote' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'}`}>2. Promote</button>
            <button onClick={() => setActiveTab('repurpose')} className={`px-8 py-4 text-xs font-bold uppercase tracking-wider transition ${activeTab === 'repurpose' ? 'text-red-600 border-b-2 border-red-600 bg-red-50/50' : 'text-slate-500 hover:text-slate-700'}`}>3. Studio</button>
        </div>
        <button 
            onClick={handleSaveDraft}
            disabled={saveLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] rounded-lg text-xs font-bold transition mr-4"
        >
            {saveLoading ? 'Saving...' : '💾 Save Draft to Logs'}
        </button>
       </div>

       {activeTab === 'publish' && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
               <div className="space-y-6">
                   {result && (
                       <div className={`p-4 rounded-xl border mb-4 font-bold text-sm ${result.success ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                           {result.message}
                           {result.link && <a href={result.link} target="_blank" className="ml-2 underline block mt-1">View Post &rarr;</a>}
                       </div>
                   )}

                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                       <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-2">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">🔌 WordPress Connection</h3>
                            <button onClick={handleSaveConfig} className="text-[10px] text-indigo-600 font-bold hover:underline">Save Credentials</button>
                       </div>
                       <div>
                           <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Site URL</label>
                           <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:border-[#FF6A00]" placeholder="https://yourdomain.com" value={config.siteUrl} onChange={e => setConfig({...config, siteUrl: e.target.value})} />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Username</label>
                               <input className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:border-[#FF6A00]" placeholder="admin" value={config.username} onChange={e => setConfig({...config, username: e.target.value})} />
                           </div>
                           <div>
                               <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">App Password</label>
                               <input type="password" title="Enter a WordPress Application Password" ring-0 className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:border-[#FF6A00]" placeholder="xxxx xxxx xxxx xxxx" value={config.appPassword} onChange={e => setConfig({...config, appPassword: e.target.value})} />
                           </div>
                       </div>
                       <div className="flex justify-between items-center">
                           <div className="text-[10px] text-slate-400">Uses Application Password</div>
                           <button onClick={handleTestConnection} className="text-[10px] bg-slate-100 px-3 py-1.5 rounded font-bold hover:bg-slate-200">⚡ Test Connection</button>
                       </div>
                       {connectionStatus && (
                            <div className={`text-[10px] p-2 rounded font-bold ${connectionStatus.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {connectionStatus.message}
                            </div>
                       )}
                   </div>
                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">📅 Scheduling</h3>
                        <div>
                             <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white" value={data.selectedCategoryId || ''} onChange={(e) => updateData({ selectedCategoryId: Number(e.target.value) })} disabled={loadingCats || categories.length === 0}>
                                 <option value="">{loadingCats ? 'Loading...' : 'Default Category'}</option>
                                 {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                             </select>
                        </div>
                        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                            <button onClick={() => setScheduleMode('now')} className={`flex-1 py-2 text-xs font-bold rounded-md transition ${scheduleMode === 'now' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Draft / Now</button>
                            <button onClick={() => setScheduleMode('schedule')} className={`flex-1 py-2 text-xs font-bold rounded-md transition ${scheduleMode === 'schedule' ? 'bg-white text-[#FF6A00] shadow-sm' : 'text-slate-500'}`}>Schedule Future</button>
                        </div>
                        {scheduleMode === 'schedule' && (
                            <div className="space-y-2">
                                <input type="datetime-local" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:border-[#FF6A00] outline-none" value={data.scheduledDate || ''} onChange={e => updateData({ scheduledDate: e.target.value })} />
                                <button onClick={findNextSlot} disabled={findingSlot} className="text-[10px] font-bold text-[#FF6A00] hover:underline">
                                    {findingSlot ? 'Checking...' : 'Auto-find next 48h slot'}
                                </button>
                            </div>
                        )}
                        <button onClick={handlePublish} disabled={loading} className={`w-full py-4 rounded-xl text-white font-bold shadow-lg transition transform hover:-translate-y-0.5 ${loading ? 'bg-slate-400' : 'bg-[#FF6A00] hover:bg-[#FF8C32]'}`}>{loading ? 'Publishing...' : '🚀 Deploy to WordPress'}</button>
                   </div>
               </div>
               <div className="bg-slate-900 rounded-xl p-4 h-[600px] overflow-auto border shadow-inner custom-scrollbar">
                   <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">{data.content}</pre>
               </div>
           </div>
       )}

       {activeTab === 'repurpose' && (
           <div className="space-y-8 animate-fade-in">
               <div className="max-w-6xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
                   <h3 className="text-xl font-bold mb-4">Video & Visual Assets</h3>
                   <button onClick={handleGenerateStudio} disabled={generatingStudio} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold transition shadow-lg shadow-red-100">
                       {generatingStudio ? 'Producing Scripts...' : '🎬 Generate Video Shot List & Shorts Pack'}
                   </button>
                   {data.studioAssets && (
                       <div className="mt-8 text-left grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><h4 className="font-bold text-xs uppercase mb-2">YouTube Script</h4><pre className="text-[10px] whitespace-pre-wrap">{data.studioAssets.narrationScript}</pre></div>
                           <div className="bg-slate-50 p-4 rounded-xl border border-slate-200"><h4 className="font-bold text-xs uppercase mb-2">Short Clips</h4>{data.studioAssets.shortClips.map((c, i) => <div key={i} className="mb-4 pb-2 border-b border-slate-200"><strong>{c.title}</strong><p className="text-[10px] mt-1 italic">{c.caption}</p></div>)}</div>
                       </div>
                   )}
               </div>
           </div>
       )}

       {activeTab === 'promote' && (
           <div className="animate-fade-in max-w-4xl mx-auto py-20 text-center bg-white rounded-2xl border border-slate-200">
               <h3 className="text-2xl font-bold mb-4">Authority Promotion Plan</h3>
               <p className="text-slate-500 mb-8">Generate a custom backlink and social outreach strategy based on this specific investigative narrative.</p>
               <button onClick={handleGenerateStrategy} disabled={generatingStrategy} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-xl font-bold transition shadow-lg shadow-indigo-100">
                   {generatingStrategy ? 'Analyzing Outreach Vectors...' : '🔗 Generate Strategy Plan'}
               </button>
               {data.backlinkStrategy && (
                   <div className="mt-10 p-6 bg-slate-50 rounded-xl border text-left space-y-4">
                       <div><strong>Search Queries:</strong> {data.backlinkStrategy.searchQueries?.join(', ') || 'N/A'}</div>
                       <div><strong>Social Post:</strong> <p className="text-sm mt-1">{data.backlinkStrategy.socialPost}</p></div>
                   </div>
               )}
           </div>
       )}
    </div>
  );
};

export default StepPublish;
