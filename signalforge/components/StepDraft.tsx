
import React, { useState, useEffect } from 'react';
import { BlogPostData, LinkSuggestion, ExistingPost, WordPressConfig, Jurisdiction, UserTier } from '../types';
import { writeDraft, generateLinkSuggestions, generateMetaDescription, analyzeGEO } from '../services/gemini';
import { checkPermission } from '../services/permissions';

interface StepDraftProps {
  data: BlogPostData;
  updateData: (updates: Partial<BlogPostData>) => void;
  onNext: () => void;
  onBack: () => void;
  userTier: UserTier;
  siteId: string;
}

const StepDraft: React.FC<StepDraftProps> = ({ data, updateData, onNext, onBack, userTier, siteId }) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'verification' | 'geo' | 'seo' | 'links'>('verification'); 
  const [showSidePanel, setShowSidePanel] = useState(true);
  
  // Feature Permissions
  const canUseLegalSafeMode = checkPermission(userTier, 'hasLegalSafeMode');
  const canUseGEO = checkPermission(userTier, 'hasGEOScoring');
  const canUseLinks = checkPermission(userTier, 'hasInternalLinking');

  const [legalSafeMode, setLegalSafeMode] = useState(canUseLegalSafeMode);
  
  // Link State
  const [analyzingLinks, setAnalyzingLinks] = useState(false);
  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);
  const [linkSourceMode, setLinkSourceMode] = useState<'demo' | 'wp'>('demo');

  // GEO State
  const [geoData, setGeoData] = useState<{score: number, analysis: string} | null>(null);
  const [analyzingGeo, setAnalyzingGeo] = useState(false);

  useEffect(() => {
    // Auto-generate if not exists, but ensure prerequisites
    if (!data.content && data.outline && (data.selectedIdea || data.topic)) {
      generateContent();
    }
  }, []);

  const generateContent = async () => {
    if ((!data.selectedIdea && !data.topic) || !data.outline || !data.research) {
        alert("Missing prerequisites (Idea, Topic, or Research). Go back and ensure all steps are completed.");
        return;
    }
    setLoading(true);
    try {
      const draft = await writeDraft(
          data.selectedIdea!, 
          data.outline, 
          data.research.summary, 
          data.brand,
          data.nlpKeywords,
          data.sourceMode === 'transcript' ? data.sourceText : undefined,
          data.topic, // Pass fallback topic
          siteId // Pass siteId to fixed signature
      );
      
      const meta = await generateMetaDescription(draft, data.topic);
      updateData({ content: draft, metaDescription: meta });
      
      if (canUseGEO) {
        runGeoAnalysis(draft);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to write draft. Please try regenerating.");
    } finally {
      setLoading(false);
    }
  };

  const runGeoAnalysis = async (content: string) => {
      setAnalyzingGeo(true);
      try {
          const result = await analyzeGEO(content, data.topic);
          setGeoData(result);
      } catch (e) {
          console.error(e);
      } finally {
          setAnalyzingGeo(false);
      }
  };

  // Stats
  const verifiedCount = data.research?.claims?.filter(c => c.status === 'VERIFIED').length || 0;
  const unverifiedCount = data.research?.claims?.filter(c => c.status === 'UNVERIFIED').length || 0;
  
  // Link Analysis (Demo)
  const loadDemoData = () => {
    const demoPosts: ExistingPost[] = [
      { id: 1, title: "The Future of SEO in 2025", link: "https://example.com/future-seo-2025" },
      { id: 2, title: "How to Use AI for Content Writing", link: "https://example.com/ai-content-writing" }
    ];
    setLinkSourceMode('demo');
    runLinkAnalysis(demoPosts);
  };

  const runLinkAnalysis = async (posts: ExistingPost[]) => {
    if (!data.content) return;
    setAnalyzingLinks(true);
    try {
      const suggestions = await generateLinkSuggestions(data.content, posts);
      setSuggestions(suggestions);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzingLinks(false);
    }
  };

  if (loading) return (
      <div className="max-w-4xl mx-auto text-center py-20">
          <div className="animate-pulse text-6xl mb-4">✍️</div>
          <h2 className="text-2xl font-bold text-slate-800">Forging Your Article...</h2>
          <p className="text-slate-500">The AI is writing, applying strict editorial guidelines, and verifying constraints.</p>
      </div>
  );

  return (
    <div className="max-w-full mx-auto h-full flex gap-6 px-4">
      {/* Editor Area (Left) */}
      <div className="flex-grow flex flex-col space-y-4 max-w-5xl">
         {/* Toolbar */}
         <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200">
             <div className="flex gap-2">
                 <button onClick={generateContent} className="text-xs font-bold text-[#FF6A00] bg-orange-50 px-3 py-1.5 rounded hover:bg-orange-100 transition">
                    ↻ Regenerate Draft
                 </button>
             </div>
             <div className="text-xs font-mono text-slate-400">
                 Markdown Editor
             </div>
         </div>

         <div className="bg-white p-4 rounded-xl border border-slate-200 h-[600px]">
             <textarea 
                className="w-full h-full p-4 outline-none font-mono text-sm resize-none custom-scrollbar"
                value={data.content}
                onChange={(e) => updateData({ content: e.target.value })}
                placeholder="# Your article will appear here..."
             />
         </div>
         <div className="flex justify-end gap-3">
             <button onClick={onBack} className="px-6 py-2 rounded-lg text-slate-600 font-bold hover:bg-slate-100 transition">Back</button>
             <button onClick={onNext} className="bg-[#FF6A00] text-white px-8 py-2 rounded-lg font-bold hover:bg-[#FF8C32] shadow-lg shadow-orange-200">Confirm & Visualize &rarr;</button>
         </div>
      </div>

      {/* RIGHT: Forensic Command Sidebar */}
      {showSidePanel && (
        <div className="w-80 flex-shrink-0 flex flex-col h-[800px] sticky top-4">
          
          <div className="flex bg-[#0B0F1A] rounded-t-lg border border-[#1F2937] overflow-hidden">
             <button onClick={() => setActiveTab('verification')} className={`flex-1 py-3 text-[9px] font-bold uppercase transition ${activeTab === 'verification' ? 'bg-[#1F2937] text-[#14B8A6]' : 'text-[#6B7280]'}`}>Legal</button>
             <button onClick={() => setActiveTab('geo')} className={`flex-1 py-3 text-[9px] font-bold uppercase transition ${activeTab === 'geo' ? 'bg-[#1F2937] text-orange-500' : 'text-[#6B7280]'}`}>GEO</button>
             <button onClick={() => setActiveTab('seo')} className={`flex-1 py-3 text-[9px] font-bold uppercase transition ${activeTab === 'seo' ? 'bg-[#1F2937] text-green-500' : 'text-[#6B7280]'}`}>SEO</button>
             <button onClick={() => setActiveTab('links')} className={`flex-1 py-3 text-[9px] font-bold uppercase transition ${activeTab === 'links' ? 'bg-[#1F2937] text-blue-500' : 'text-[#6B7280]'}`}>Links</button>
          </div>

          <div className="flex-grow overflow-y-auto bg-white border-x border-b border-[#E5E7EB] rounded-b-lg shadow-sm p-4 custom-scrollbar">
            
             {/* --- FORENSIC & LEGAL DASHBOARD --- */}
             {activeTab === 'verification' && (
                 <div className="space-y-6">
                     
                     {canUseLegalSafeMode ? (
                        <>
                            <div>
                                <label className="text-[9px] text-[#6B7280] font-bold uppercase mb-2 block">Defamation Jurisdiction</label>
                                <select 
                                    className="w-full text-xs border border-[#D1D5DB] rounded p-2 bg-[#F9FAFB] font-bold text-[#374151]"
                                    value={data.brand.jurisdiction}
                                    onChange={(e) => updateData({ brand: { ...data.brand, jurisdiction: e.target.value as Jurisdiction } })}
                                >
                                    <option value="US">🇺🇸 US (Moderate)</option>
                                    <option value="UK_EU">🇬🇧/🇪🇺 UK & EU (Strict)</option>
                                </select>
                            </div>

                            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-3 flex justify-between items-center">
                                <div>
                                    <h4 className="text-[10px] font-bold text-[#991B1B] uppercase">Legal Safe Mode</h4>
                                    <p className="text-[9px] text-[#B91C1C]">Block output if unverified.</p>
                                </div>
                                <div onClick={() => setLegalSafeMode(!legalSafeMode)} className={`w-10 h-5 rounded-full relative cursor-pointer ${legalSafeMode ? 'bg-[#DC2626]' : 'bg-gray-300'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full absolute top-1 ${legalSafeMode ? 'left-6' : 'left-1'}`}></div>
                                </div>
                            </div>
                        </>
                     ) : (
                         <div className="bg-slate-100 p-4 rounded text-center">
                             <p className="text-xs text-slate-500">Legal Safety & Jurisdiction controls are locked.</p>
                             <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase">Upgrade to Studio</p>
                         </div>
                     )}

                     {/* Impact Tracker */}
                     <div className="space-y-3">
                         <h4 className="text-[10px] font-bold text-[#111827] uppercase tracking-wider border-b border-[#E5E7EB] pb-1">Litigation Audit Log</h4>
                         <div className="space-y-1">
                             <div className="flex justify-between text-[10px]"><span className="text-[#14B8A6] font-bold">VERIFIED</span><span>{verifiedCount}</span></div>
                             <div className="w-full bg-[#E5E7EB] h-1.5 rounded-full"><div className="bg-[#14B8A6] h-full" style={{ width: `${(verifiedCount / (verifiedCount + unverifiedCount || 1)) * 100}%` }}></div></div>
                         </div>
                         <div className="space-y-1">
                             <div className="flex justify-between text-[10px]"><span className="text-[#F59E0B] font-bold">UNVERIFIED</span><span>{unverifiedCount}</span></div>
                             <div className="w-full bg-[#E5E7EB] h-1.5 rounded-full"><div className="bg-[#F59E0B] h-full" style={{ width: `${(unverifiedCount / (verifiedCount + unverifiedCount || 1)) * 100}%` }}></div></div>
                         </div>
                     </div>
                 </div>
             )}

             {/* --- GEO TAB (Gated) --- */}
             {activeTab === 'geo' && (
                canUseGEO ? (
                    <div className="space-y-4">
                        <div className="bg-orange-50 rounded-lg p-5 text-center border border-orange-100">
                            {analyzingGeo ? <div className="animate-spin text-xl">🟠</div> : <div className="text-4xl font-extrabold text-orange-600">{geoData?.score || 0}%</div>}
                            <div className="text-[10px] text-orange-800 font-bold uppercase">LLM Citation Score</div>
                            <button onClick={() => data.content && runGeoAnalysis(data.content)} className="text-[10px] mt-3 underline">Re-Analyze</button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-xs text-slate-500">GEO Scoring locked.</p>
                        <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase">Upgrade to Studio</p>
                    </div>
                )
            )}
            
            {/* --- LINKS TAB (Gated) --- */}
            {activeTab === 'links' && (
                canUseLinks ? (
                    <div className="space-y-4">
                        <button onClick={loadDemoData} className="w-full py-2 bg-[#1F2937] text-white text-[10px] font-bold uppercase rounded">Load Demo Links</button>
                        {suggestions.map((s, i) => (
                            <div key={i} className="bg-blue-50 p-2 rounded text-xs">{s.originalText} -> {s.url}</div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-xs text-slate-500">Internal Linking locked.</p>
                        <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase">Upgrade to Studio</p>
                    </div>
                )
            )}
            
            {/* SEO Tab is open to all tiers */}
            {activeTab === 'seo' && <div>SEO Keywords...</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default StepDraft;
