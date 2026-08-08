import React, { useEffect, useState } from 'react';
import { BlogPostData, Claim, ResearchSource, TrustPillars, UserTier } from '../types';
import { performResearch } from '../services/gemini';
import { checkPermission } from '../services/permissions';

interface StepResearchProps {
  data: BlogPostData;
  updateData: (updates: Partial<BlogPostData>) => void;
  onNext: () => void;
  onBack: () => void;
  userTier: UserTier;
}

const StepResearch: React.FC<StepResearchProps> = ({ data, updateData, onNext, onBack, userTier }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSourceIndex, setExpandedSourceIndex] = useState<number | null>(null);

  // Permission Checks
  const hasFullForensics = checkPermission(userTier, 'hasFullVerificationUI');
  const hasBiasResilience = checkPermission(userTier, 'hasBiasResilience');

  useEffect(() => {
    if (!data.research && data.selectedIdea) {
      fetchResearch();
    }
  }, []);

  const fetchResearch = async () => {
    if (!data.selectedIdea) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await performResearch(
        data.selectedIdea, 
        data.topic, 
        data.sourceMode, 
        data.sourceText,
        data.mediaData,
        data.mediaMimeType,
        data.youtubeUrl
      );
      updateData({ research: result });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
      switch (status) {
          case 'VERIFIED':
              return (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#F0FDFA] text-[#14B8A6] border border-[#14B8A6] shadow-[0_0_8px_rgba(20,184,166,0.2)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]"></span> Verified
                  </span>
              );
          case 'UNVERIFIED':
              return (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#FFFBEB] text-[#B45309] border border-[#FBBF24]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span> Unverified
                  </span>
              );
          case 'REJECTED':
              return (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#FEF2F2] text-[#DC2626] border border-[#DC2626] opacity-70">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></span> Rejected
                  </span>
              );
          default:
              return null;
      }
  };
  
  const getResilienceBadge = (level: string) => {
      if (level === 'HIGH') return <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 font-bold" title="Multi-source, Cross-bias Independence">🛡️ HIGH RESILIENCE</span>;
      if (level === 'MEDIUM') return <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-bold" title="Independently Corroborated">🛡️ MED RESILIENCE</span>;
      return <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200 font-bold" title="Echo Chamber Risk">⚠️ LOW RESILIENCE</span>;
  };

  const renderPillarBar = (label: string, score: number) => (
      <div className="flex items-center gap-2 mb-1">
          <div className="w-24 text-[9px] font-bold text-[#6B7280] uppercase tracking-wide text-right">{label}</div>
          <div className="flex-grow bg-[#E5E7EB] h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${score >= 4 ? 'bg-[#14B8A6]' : score >= 3 ? 'bg-[#F59E0B]' : 'bg-[#DC2626]'}`} 
                style={{ width: `${(score / 5) * 100}%` }}
              ></div>
          </div>
          <div className="w-4 text-[9px] font-mono text-[#374151] font-bold">{score}</div>
      </div>
  );
  
  const renderBiasMeter = (orientation: string) => {
      const pos = orientation === 'Left' ? 10 : orientation === 'Center-Left' ? 30 : orientation === 'Center' ? 50 : orientation === 'Center-Right' ? 70 : orientation === 'Right' ? 90 : 50;
      return (
          <div className="w-full h-2 bg-gradient-to-r from-blue-300 via-slate-200 to-red-300 rounded-full relative mt-1">
              <div 
                className="w-2 h-2 bg-[#111827] border border-white rounded-full absolute top-0 transform -translate-y-0.5 shadow-sm"
                style={{ left: `${pos}%` }}
              ></div>
          </div>
      );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center animate-pulse">
         <div className="flex flex-col items-center justify-center space-y-6">
             <div className="relative">
                 <div className="w-24 h-24 rounded-full border-4 border-[#1F2937] border-t-[#FF6A00] animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center text-2xl">⚖️</div>
             </div>
             <div className="space-y-2">
                 <h2 className="text-2xl font-bold text-[#111827]">Forensic & Legal Audit in Progress</h2>
                 <p className="text-[#6B7280] font-mono text-xs uppercase tracking-widest">
                    Running 6-Pillar Trust Analysis, Bias Profiling & Propaganda Detection...
                 </p>
             </div>
         </div>
      </div>
    );
  }

  const verifiedCount = data.research?.claims?.filter(c => c.status === 'VERIFIED').length || 0;
  const unverifiedCount = data.research?.claims?.filter(c => c.status === 'UNVERIFIED').length || 0;
  const rejectedCount = data.research?.claims?.filter(c => c.status === 'REJECTED').length || 0;
  const hardBansDetected = data.research?.legalSummary?.hardBansDetected || 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* Header Stat Bar */}
      <div className="flex flex-col md:flex-row justify-between items-end border-b border-[#E5E7EB] pb-6">
        <div>
           <div className="flex items-center gap-3 mb-2">
               <h2 className="text-3xl font-extrabold text-[#111827] tracking-tight">Evidence Board</h2>
               {!hasFullForensics && <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-1 rounded uppercase">Basic Mode</span>}
           </div>
           <p className="text-[#6B7280] text-sm max-w-2xl">
              SignalForge has extracted <strong>{data.research?.claims?.length || 0}</strong> claims. 
              {hasFullForensics ? ' Review the verification status below.' : ' Upgrade to Studio Tier for full forensic audit logs.'}
           </p>
        </div>
        
        <div className="flex gap-4 mt-4 md:mt-0">
            <div className="text-center">
                <div className="text-2xl font-bold text-[#14B8A6]">{verifiedCount}</div>
                <div className="text-[9px] uppercase font-bold text-[#6B7280] tracking-wider">Verified</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold text-[#F59E0B]">{unverifiedCount}</div>
                <div className="text-[9px] uppercase font-bold text-[#6B7280] tracking-wider">Unverified</div>
            </div>
            <div className="text-center">
                <div className="text-2xl font-bold text-[#DC2626]">{rejectedCount}</div>
                <div className="text-[9px] uppercase font-bold text-[#6B7280] tracking-wider">Rejected</div>
            </div>
            <button 
                onClick={fetchResearch} 
                className="ml-4 px-4 py-2 bg-white border border-[#E5E7EB] hover:border-[#FF6A00] text-[#FF6A00] rounded-lg font-bold text-xs transition shadow-sm h-10 my-auto"
            >
                ↻ Re-Verify
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Verification Log (Claims) */}
        <div className="lg:col-span-2 space-y-6">
            <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
                📂 Claim Verification Log
            </h3>
            
            <div className="space-y-3">
                {data.research?.claims?.map((claim, idx) => (
                    <div 
                        key={idx} 
                        className={`p-4 rounded-lg border bg-white shadow-sm transition group relative ${
                            claim.status === 'REJECTED' ? 'border-[#FECACA] bg-[#FEF2F2] opacity-75' : 
                            claim.status === 'VERIFIED' ? 'border-[#CCFBF1] hover:border-[#14B8A6]' : 
                            'border-[#FDE68A]'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-mono text-[10px] text-[#9CA3AF] uppercase">CLM-{String(idx + 1).padStart(3, '0')}</span>
                            <div className="flex items-center gap-2">
                                {/* Only show deep forensics if tier allows */}
                                {hasBiasResilience && claim.resilienceScore && getResilienceBadge(claim.resilienceScore)}
                                
                                {claim.legalAudit?.isLivingPerson && (
                                    <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold border border-purple-200" title="Living Person Detected">👤 LP</span>
                                )}
                                {hasFullForensics && claim.harmProfile?.totalScore && claim.harmProfile.totalScore >= 3 && (
                                    <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold border border-red-200" title={`High Harm Risk: ${claim.harmProfile.totalScore}`}>🛡️ HIGH RISK</span>
                                )}
                                {getStatusBadge(claim.status)}
                            </div>
                        </div>
                        
                        <p className={`text-sm font-medium mb-3 ${claim.status === 'REJECTED' ? 'text-[#991B1B] line-through' : 'text-[#1F2937]'}`}>
                            "{claim.claimText}"
                        </p>
                        
                        {hasFullForensics && claim.legalAudit?.flaggedForHardBan && (
                            <div className="bg-red-900 text-white text-[10px] p-2 rounded mb-2 font-bold flex items-center gap-2">
                                ⛔ HARD BAN DETECTED: {claim.legalAudit.banReason}
                            </div>
                        )}
                        
                        <div className="flex items-start gap-2 text-xs border-t border-dashed border-gray-200 pt-2">
                            <span className="text-lg">⚖️</span>
                            <div>
                                <span className="font-bold text-[#4B5563] mr-1">Evidence:</span>
                                <span className="text-[#6B7280]">{claim.verificationReasoning}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Right: Sources & Legal Dashboard */}
        <div className="space-y-6">
             
            {/* Legal Safety Dashboard (Studio+) */}
            {hasFullForensics ? (
                <div className="bg-[#0B0F1A] p-5 rounded-xl border border-[#1F2937] text-white">
                    <h4 className="text-xs font-bold text-[#FF6A00] uppercase mb-2 flex items-center gap-2">
                        🛡️ Legal Safety Layer
                    </h4>
                    
                    {hardBansDetected > 0 ? (
                        <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-4 text-xs font-bold">
                            ⛔ {hardBansDetected} HARD BANS DETECTED.
                        </div>
                    ) : (
                        <div className="bg-green-900/20 border border-green-800 text-green-400 p-3 rounded mb-4 text-xs font-bold flex items-center gap-2">
                            ✅ No Hard Bans Detected
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-slate-100 p-5 rounded-xl border border-slate-200 text-slate-500">
                    <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">🔒 Legal Safety Layer</h4>
                    <p className="text-xs">Living Person Detection & Harm Scoring disabled.</p>
                    <p className="text-[10px] mt-2 uppercase font-bold text-indigo-600">Upgrade to Studio Tier</p>
                </div>
            )}

            <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
                🔗 Provenance & Forensic Scoring
            </h3>
            
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
                <div className="bg-[#F9FAFB] px-4 py-2 border-b border-[#E5E7EB] text-[10px] font-bold text-[#6B7280] uppercase flex justify-between">
                    <span>Source Intelligence</span>
                    <span>Trust Threshold: 80</span>
                </div>
                <div className="divide-y divide-[#E5E7EB]">
                    {data.research?.sources.map((source, idx) => (
                        <div key={idx} className="transition">
                            <div 
                                className="p-4 hover:bg-[#F9FAFB] cursor-pointer"
                                onClick={() => hasFullForensics ? setExpandedSourceIndex(expandedSourceIndex === idx ? null : idx) : null}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex-grow pr-2">
                                        <a href={source.url} target="_blank" className="font-bold text-sm text-[#111827] line-clamp-1">{source.title}</a>
                                        {/* Bias/Incentive badges (Agency+) */}
                                        {hasBiasResilience && (
                                            <div className="flex gap-2 mt-1">
                                                {source.forensics?.incentive?.hasIncentive && <span className="text-[9px] bg-yellow-100 text-yellow-800 px-1 rounded border border-yellow-200 font-bold">💰 AD</span>}
                                                {source.forensics?.isPropaganda && <span className="text-[9px] bg-red-100 text-red-800 px-1 rounded border border-red-200 font-bold">🚩 PROP</span>}
                                            </div>
                                        )}
                                    </div>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${source.trustScore >= 80 ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#FEF2F2] text-[#DC2626]'}`}>
                                        TS: {source.trustScore}
                                    </span>
                                </div>
                                
                                {hasFullForensics && (
                                    <div className="flex justify-between items-center mt-1">
                                        <div className="text-[9px] text-[#6B7280] font-bold">
                                            {expandedSourceIndex === idx ? '▼' : '▶ Analysis'}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Expanded Forensic View (Studio+) */}
                            {hasFullForensics && expandedSourceIndex === idx && source.pillars && (
                                <div className="bg-[#F8FAFC] p-4 border-y border-[#E2E8F0] shadow-inner">
                                    <h5 className="text-[10px] font-bold text-[#1E293B] uppercase mb-2">Forensic Trust Breakdown</h5>
                                    <div className="grid grid-cols-1 gap-1 mb-3">
                                        {renderPillarBar('Provenance', source.pillars.provenance)}
                                        {renderPillarBar('Evidence Type', source.pillars.evidenceType)}
                                        {renderPillarBar('Editorial', source.pillars.editorialStandards)}
                                        {renderPillarBar('Corroboration', source.pillars.corroboration)}
                                    </div>
                                    {/* Agency Only: Bias Meter */}
                                    {hasBiasResilience && source.forensics && (
                                        <div className="border-t border-[#E2E8F0] pt-3 mt-3">
                                            <h5 className="text-[10px] font-bold text-[#1E293B] uppercase mb-1">Bias Profile: {source.forensics.bias.orientation}</h5>
                                            {renderBiasMeter(source.forensics.bias.orientation)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-[#E5E7EB]">
        <button onClick={onBack} className="px-6 py-3 rounded-lg text-[#374151] font-bold hover:bg-[#F3F4F6] transition border border-transparent">
          Back to Strategy
        </button>
        <button 
          onClick={onNext} 
          disabled={hardBansDetected > 0}
          className="px-8 py-3 rounded-lg bg-[#0B0F1A] text-white font-bold hover:bg-[#1F2937] shadow-lg disabled:opacity-50"
        >
          {hardBansDetected > 0 ? '⛔ BLOCKED: Resolve Hard Bans' : 'Confirm Evidence & Plan →'}
        </button>
      </div>
    </div>
  );
};

export default StepResearch;