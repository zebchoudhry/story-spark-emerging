import React from 'react';

interface LandingPageProps {
  onLaunch: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLaunch }) => {
  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white font-sans selection:bg-[#FF6A00] selection:text-white">
      
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-[#0B0F1A]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-[0_0_10px_rgba(255,106,0,0.5)]" fill="none">
                        <path d="M20 82 H80 L75 72 C65 72 60 68 60 62 V58 H90 V52 H10 V58 H40 V62 C40 68 35 72 25 72 L20 82Z" fill="#9CA3AF" />
                        <path d="M32 15 V48 C32 58 38 62 50 62 C62 62 68 58 68 48 V15 H60 V48 C60 52 58 54 50 54 C42 54 40 52 40 48 V15 H32Z" fill="#F3F4F6" />
                        <path d="M50 10 L56 35 L50 62 L44 35 Z" fill="#FF6A00" />
                    </svg>
                </div>
                <div>
                    <span className="font-extrabold text-xl tracking-tight leading-none block">SignalForge</span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mt-0.5">Intelligence Engine</span>
                </div>
            </div>
            <div className="flex gap-4">
                <button className="text-sm font-bold text-gray-400 hover:text-white transition">Features</button>
                <button className="text-sm font-bold text-gray-400 hover:text-white transition">Pricing</button>
                <button onClick={onLaunch} className="bg-[#FF6A00] hover:bg-[#FF8C32] text-white px-6 py-2 rounded font-bold text-sm transition transform hover:-translate-y-0.5 shadow-[0_0_15px_rgba(255,106,0,0.3)]">
                    Launch Terminal &rarr;
                </button>
            </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-20 pb-32 overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(31,41,55,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(31,41,55,0.4)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F1A] via-transparent to-[#0B0F1A] pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/30 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-widest mb-6 animate-fade-in">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                System Operational v2.4
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
                The Era of AI Slop is Over.<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-500">Welcome to SignalForge.</span>
            </h1>
            
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                The world's first <span className="text-white font-bold">Forensic Content Intelligence Engine</span>. 
                We verify claims, structure arguments, and automate authority—not just text.
            </p>
            
            <div className="flex justify-center gap-4">
                <button 
                    onClick={onLaunch}
                    className="bg-[#FF6A00] hover:bg-[#FF8C32] text-white px-10 py-4 rounded-lg font-bold text-lg transition shadow-[0_0_30px_rgba(255,106,0,0.4)] flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Initialize Workflow
                </button>
                <button className="bg-gray-800 hover:bg-gray-700 text-white px-10 py-4 rounded-lg font-bold text-lg transition border border-gray-700">
                    View Evidence
                </button>
            </div>
        </div>
      </div>

      {/* Agitation / Stats */}
      <div className="border-y border-gray-800 bg-[#0F1422]">
          <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-x divide-gray-800">
              <div className="px-4">
                  <div className="text-4xl font-extrabold text-[#DC2626] mb-2">95%</div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Of AI Content is Unverified</div>
                  <p className="text-gray-500 text-sm mt-2">ChatGPT hallucinates facts. SignalForge verifies them against live index.</p>
              </div>
              <div className="px-4">
                  <div className="text-4xl font-extrabold text-[#14B8A6] mb-2">6-Pillar</div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Forensic Trust Scoring</div>
                  <p className="text-gray-500 text-sm mt-2">We score sources on provenance, bias, and recency before writing a single word.</p>
              </div>
              <div className="px-4">
                  <div className="text-4xl font-extrabold text-[#FF6A00] mb-2">Studio</div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cross-Media Assets</div>
                  <p className="text-gray-500 text-sm mt-2">Turn one article into a documentary script, B-Roll list, and Reels pack.</p>
              </div>
          </div>
      </div>

      {/* Feature Grid (Bento) */}
      <div className="max-w-6xl mx-auto px-6 py-24">
          <h2 className="text-3xl font-bold text-center mb-16">Forensic Intelligence Suite</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-2 gap-6 h-auto md:h-[600px]">
              
              {/* Box 1: Evidence Board */}
              <div className="md:col-span-2 row-span-2 bg-gray-900 rounded-2xl border border-gray-800 p-8 relative overflow-hidden group hover:border-gray-700 transition">
                  <div className="absolute top-0 right-0 p-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
                  <div className="relative z-10">
                      <div className="w-12 h-12 bg-indigo-900/50 rounded-lg flex items-center justify-center text-2xl mb-6 border border-indigo-500/30">⚖️</div>
                      <h3 className="text-2xl font-bold mb-4">Forensic Evidence Board</h3>
                      <p className="text-gray-400 mb-8 max-w-md">The system ingests multimodal sources (Video, Audio, Text) and creates a claim-level verification matrix using live Google Search Grounding.</p>
                      
                      {/* UI Mockup */}
                      <div className="bg-[#0B0F1A] border border-gray-700 rounded-xl p-4 max-w-lg shadow-2xl">
                          <div className="flex gap-2 mb-3">
                              <span className="h-2 w-2 rounded-full bg-red-500"></span>
                              <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                              <span className="h-2 w-2 rounded-full bg-green-500"></span>
                          </div>
                          <div className="space-y-3">
                              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded border border-gray-700">
                                  <div className="text-xs text-gray-300">Claim: Market crash predicted in Q4...</div>
                                  <span className="text-[9px] bg-[#14B8A6]/20 text-[#14B8A6] px-2 py-0.5 rounded border border-[#14B8A6]/30 font-bold">VERIFIED</span>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded border border-gray-700">
                                  <div className="text-xs text-gray-300">Claim: CEO resigned secretly...</div>
                                  <span className="text-[9px] bg-[#F59E0B]/20 text-[#F59E0B] px-2 py-0.5 rounded border border-[#F59E0B]/30 font-bold">UNVERIFIED</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Box 2: Legal Safety */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 hover:border-gray-700 transition">
                  <div className="w-10 h-10 bg-red-900/30 rounded-lg flex items-center justify-center text-xl mb-4 border border-red-500/30">🛡️</div>
                  <h3 className="text-lg font-bold mb-2">Legal Safety Layer</h3>
                  <p className="text-sm text-gray-400">Automated Living Person Detection and Libel Harm Scoring based on US/UK jurisdiction.</p>
              </div>

              {/* Box 3: Studio Mode */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 hover:border-gray-700 transition">
                  <div className="w-10 h-10 bg-orange-900/30 rounded-lg flex items-center justify-center text-xl mb-4 border border-orange-500/30">🎬</div>
                  <h3 className="text-lg font-bold mb-2">Studio Mode</h3>
                  <p className="text-sm text-gray-400">Auto-generate Documentary Scripts, Shot Lists, and Short-form clips from your articles.</p>
              </div>
          </div>
      </div>

      {/* Pricing Tiers */}
      <div className="max-w-6xl mx-auto px-6 pb-32">
          <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Authority Scaling Plans</h2>
              <p className="text-gray-400">Choose the intelligence level required for your operation.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Creator */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 hover:border-gray-600 transition">
                  <h3 className="text-xl font-bold text-white mb-2">Creator</h3>
                  <div className="text-3xl font-extrabold text-white mb-6">£49<span className="text-base font-normal text-gray-500">/mo</span></div>
                  <ul className="space-y-4 text-sm text-gray-400 mb-8">
                      <li className="flex gap-2"><span>✓</span> 10 Investigations/mo</li>
                      <li className="flex gap-2"><span>✓</span> Basic Verification</li>
                      <li className="flex gap-2"><span>✓</span> WordPress Publishing</li>
                  </ul>
                  <button className="w-full py-3 border border-gray-600 rounded-lg font-bold hover:bg-gray-800">Select Creator</button>
              </div>

              {/* Agency - Highlight */}
              <div className="bg-gray-900 border-2 border-[#FF6A00] rounded-2xl p-8 relative transform md:-translate-y-4 shadow-2xl shadow-orange-900/20">
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#FF6A00] text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase">Recommended</div>
                  <h3 className="text-xl font-bold text-white mb-2">Agency</h3>
                  <div className="text-3xl font-extrabold text-white mb-6">£399<span className="text-base font-normal text-gray-500">/mo</span></div>
                  <ul className="space-y-4 text-sm text-gray-300 mb-8">
                      <li className="flex gap-2 text-white"><span className="text-[#FF6A00]">✓</span> <strong>Multi-Brand Workspaces</strong></li>
                      <li className="flex gap-2"><span>✓</span> <strong>Backlink Strategy Agent</strong></li>
                      <li className="flex gap-2"><span>✓</span> Bias Resilience Scoring</li>
                      <li className="flex gap-2"><span>✓</span> Litigation Audit Logs</li>
                  </ul>
                  <button onClick={onLaunch} className="w-full py-3 bg-[#FF6A00] hover:bg-[#FF8C32] text-white rounded-lg font-bold shadow-lg">Launch Agency Tier</button>
              </div>

              {/* Enterprise */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 hover:border-gray-600 transition">
                  <h3 className="text-xl font-bold text-white mb-2">Enterprise</h3>
                  <div className="text-3xl font-extrabold text-white mb-6">Custom</div>
                  <ul className="space-y-4 text-sm text-gray-400 mb-8">
                      <li className="flex gap-2"><span>✓</span> Unlimited Investigations</li>
                      <li className="flex gap-2"><span>✓</span> Dedicated SLA</li>
                      <li className="flex gap-2"><span>✓</span> Custom Jurisdiction Rules</li>
                  </ul>
                  <button className="w-full py-3 border border-gray-600 rounded-lg font-bold hover:bg-gray-800">Contact Sales</button>
              </div>
          </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 bg-[#05080F]">
          <div className="max-w-6xl mx-auto px-6 text-center text-gray-500 text-sm">
              <p>&copy; 2024 SignalForge Intelligence. "We Automate Authority".</p>
          </div>
      </footer>
    </div>
  );
};

export default LandingPage;