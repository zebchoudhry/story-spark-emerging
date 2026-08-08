
import React, { useState, useEffect } from 'react';
import StepInput from './components/StepInput';
import StepResearch from './components/StepResearch';
import StepPlan from './components/StepPlan';
import StepDraft from './components/StepDraft';
import StepImages from './components/StepImages';
import StepPublish from './components/StepPublish';
import SettingsModal from './components/SettingsModal';
import HistoryModal from './components/HistoryModal';
import { BlogPostData, WorkflowStep, SiteProfile, UserProfile } from './types';
import { StorageService } from './services/storage';

// Parse Story Spark deep-link params once on load, then strip from URL
const getSparkParams = () => {
  const params = new URLSearchParams(window.location.search);
  const topic = params.get('topic') || '';
  const sourceMode = (params.get('sourceMode') as BlogPostData['sourceMode']) || null;
  const sourceText = params.get('sourceText') || '';
  const sourceStoryUrl = params.get('sourceUrl') || '';
  const storySparkId = params.get('storySparkId') || '';
  const site = params.get('site') || '';
  if (topic) {
    // Remove params from URL so refresh doesn't re-trigger
    window.history.replaceState({}, '', window.location.pathname);
  }
  return { topic, sourceMode, sourceText, sourceStoryUrl, storySparkId, site };
};

const sparkParams = getSparkParams();

const App: React.FC = () => {
  // Internal User Profile - Default to ENTERPRISE for internal command center
  const user: UserProfile = {
    id: 'admin_internal',
    name: 'BeyondThePeripheral System',
    tier: 'ENTERPRISE', 
    usage: { articlesThisMonth: 0, maxArticles: 9999 }
  };

  const [hasLaunched, setHasLaunched] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeSite, setActiveSite] = useState<string>(() => {
    if (sparkParams.site) return sparkParams.site;
    return localStorage.getItem('signalforge_active_site') || 'beyond';
  });
  
  const [step, setStep] = useState<WorkflowStep>(WorkflowStep.STRATEGY);

  const [data, setData] = useState<BlogPostData>(() => {
    // If arriving from Story Spark, use deep-link params instead of saved state
    if (sparkParams.topic) {
      const siteId = sparkParams.site || localStorage.getItem('signalforge_active_site') || 'beyond';
      return {
        id: crypto.randomUUID(),
        site_id: siteId,
        topic: sparkParams.topic,
        sourceMode: sparkParams.sourceMode || 'radar',
        sourceText: sparkParams.sourceText || undefined,
        sourceStoryUrl: sparkParams.sourceStoryUrl || undefined,
        storySparkId: sparkParams.storySparkId || undefined,
        brand: {
          domain: siteId === 'fozias' ? 'fozias.com' : 'beyondtheperipheral.com',
          voice: siteId === 'fozias' ? 'Authoritative' : 'Investigative',
          imageStyle: 'Cinematic realism'
        }
      };
    }

    const saved = localStorage.getItem(`autoblog_data_${activeSite}`);
    if (saved) return JSON.parse(saved);
    
    return {
      id: crypto.randomUUID(),
      site_id: activeSite,
      topic: '',
      sourceMode: 'keyword',
      brand: {
        domain: activeSite === 'fozias' ? 'fozias.com' : 'beyondtheperipheral.com',
        voice: activeSite === 'fozias' ? 'Authoritative' : 'Investigative',
        imageStyle: 'Cinematic realism'
      }
    };
  });

  useEffect(() => {
    localStorage.setItem('signalforge_active_site', activeSite);
  }, [activeSite]);

  useEffect(() => {
    // Auto-save logic with quota resilience
    try {
      const serializedData = JSON.stringify(data);
      // Heuristic: If serialized data is over 3MB, be wary of auto-saving every state change
      // especially since LocalStorage is typically 5MB total.
      if (serializedData.length > 3.5 * 1024 * 1024) {
        console.warn("Active workspace is very large (>3.5MB). Auto-save throttled to prevent quota errors.");
        return;
      }
      
      StorageService.safeSetItem(`autoblog_data_${activeSite}`, serializedData);
    } catch (e) {
      console.warn("Auto-save failed: Browser storage might be full or data is too large.");
    }
  }, [data, activeSite]);

  const updateData = (updates: Partial<BlogPostData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);
  
  const reset = () => {
    if (confirm("Reset current pipeline?")) {
      setStep(WorkflowStep.STRATEGY);
      setData({
        id: crypto.randomUUID(),
        site_id: activeSite,
        topic: '',
        sourceMode: 'keyword',
        brand: data.brand
      });
    }
  };

  const handleSiteChange = (siteId: string) => {
    setActiveSite(siteId);
    setStep(WorkflowStep.STRATEGY);
    // Reload data logic handled by useEffect/useState init
    window.location.reload(); 
  };

  const loadArticleFromHistory = (loadedData: BlogPostData) => {
      setData(loadedData);
      setStep(WorkflowStep.DRAFT);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#111827] pb-20 font-sans">
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <HistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} onLoadArticle={loadArticleFromHistory} />

      <header className="bg-[#0B0F1A] border-b border-[#1F2937] sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-lg text-white tracking-tighter">SignalForge</span>
            </div>
            <select 
              value={activeSite} 
              onChange={(e) => handleSiteChange(e.target.value)}
              className="bg-[#111827] text-[#FF6A00] border border-[#374151] rounded px-2 py-1 text-xs font-bold uppercase tracking-wider outline-none cursor-pointer"
            >
              <option value="beyond">BeyondThePeripheral</option>
              <option value="fozias">Fozias (Authority)</option>
            </select>
          </div>
          
          <div className="hidden md:flex items-center bg-[#111827] rounded-md border border-[#1F2937] p-1">
            {["Strategy", "Briefing", "Plan", "Draft", "Assets", "Deploy"].map((label, idx) => (
               <div 
                 key={idx} 
                 className={`px-4 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-colors ${step === idx ? 'bg-[#FF6A00] text-white' : 'text-[#4B5563]'}`}
               >
                  {label}
               </div>
            ))}
          </div>
          
          <div className="flex items-center gap-3">
             <button onClick={() => setShowHistory(true)} className="text-[10px] text-gray-300 font-bold hover:text-white px-3 py-1.5 rounded hover:bg-[#1F2937] transition flex items-center gap-1">📜 LOGS</button>
             <button onClick={() => setShowSettings(true)} className="text-[10px] text-white font-bold border border-[#374151] px-3 py-1.5 rounded bg-[#1F2937] hover:bg-[#2D3748] transition">CONFIG</button>
             <button onClick={reset} className="text-[10px] text-[#9CA3AF] border border-[#1F2937] px-3 py-1.5 rounded bg-[#111827] hover:text-white transition">RESET</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {step === WorkflowStep.STRATEGY && <StepInput data={data} updateData={updateData} onNext={nextStep} siteId={activeSite} />}
        {step === WorkflowStep.RESEARCH && <StepResearch data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} userTier={user.tier} />}
        {step === WorkflowStep.PLAN && <StepPlan data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />}
        {step === WorkflowStep.DRAFT && <StepDraft data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} siteId={activeSite} userTier={user.tier} />}
        {step === WorkflowStep.VISUALS && <StepImages data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />}
        {step === WorkflowStep.PUBLISH && <StepPublish data={data} updateData={updateData} onBack={prevStep} onReset={reset} userTier={user.tier} siteId={activeSite} />}
      </main>
    </div>
  );
};

export default App;
