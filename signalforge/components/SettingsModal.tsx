
import React, { useState, useEffect } from 'react';
import { WordPressConfig } from '../types';
import { verifyConnection } from '../services/wordpress';
import { StorageService } from '../services/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<WordPressConfig>({ siteUrl: '', username: '', appPassword: '' });
  const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('signalforge_wp_config');
      if (saved) {
        try {
          setConfig(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse saved config", e);
        }
      }
      setStatus(null);
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('signalforge_wp_config', JSON.stringify(config));
    // Dispatch a storage event so other components can pick up changes if needed
    window.dispatchEvent(new Event("storage"));
    onClose();
  };

  const handleTest = async () => {
    setLoading(true);
    setStatus({ message: "Testing connection..." });
    const res = await verifyConnection(config);
    setStatus(res);
    setLoading(false);
  };

  const handleClearStorage = () => {
    if (confirm("DANGER: This will permanently delete all local history, saved drafts, and generated images across all sites. Configuration will be preserved. Proceed?")) {
      StorageService.clearAllData();
      alert("Local data cleared. Reloading application...");
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-700">
        
        {/* Header */}
        <div className="bg-[#0B0F1A] p-5 flex justify-between items-center border-b border-slate-800">
            <div>
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    ⚙️ Global Settings
                </h3>
                <p className="text-slate-400 text-xs mt-1">Configure your WordPress integration.</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition text-xl font-bold">✕</button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
             <section className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-1">Integration</h4>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">WordPress Site URL</label>
                  <input 
                    className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-[#FF6A00] transition" 
                    value={config.siteUrl} 
                    onChange={e => setConfig({...config, siteUrl: e.target.value})}
                    placeholder="https://mysite.com"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Username</label>
                        <input 
                            className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-[#FF6A00] transition"
                            value={config.username}
                            onChange={e => setConfig({...config, username: e.target.value})}
                            placeholder="admin"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">App Password</label>
                        <input 
                            type="password"
                            className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-[#FF6A00] transition"
                            value={config.appPassword}
                            onChange={e => setConfig({...config, appPassword: e.target.value})}
                            placeholder="xxxx xxxx xxxx xxxx"
                        />
                    </div>
                </div>

                <div className="bg-slate-50 p-3 rounded text-[10px] text-slate-500 border border-slate-100">
                    Note: You must use an <strong>Application Password</strong> (Users &gt; Profile), not your login password.
                </div>
             </section>
             
             <section className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-1">Data Management</h4>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                    <div>
                        <p className="text-[10px] font-bold text-red-700 uppercase">Clear Local Cache</p>
                        <p className="text-[9px] text-red-600 mt-0.5">Free up space if encountering storage errors.</p>
                    </div>
                    <button 
                        onClick={handleClearStorage}
                        className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold rounded-md hover:bg-red-700 transition"
                    >
                        Purge Everything
                    </button>
                </div>
             </section>
             
             {/* Status Output */}
             {status && (
                 <div className={`text-xs p-3 rounded font-bold border ${status.success ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                     {status.message}
                 </div>
             )}

             <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                 <button 
                    onClick={handleTest} 
                    disabled={loading}
                    className="text-xs font-bold text-slate-500 hover:text-[#FF6A00] transition flex items-center gap-2"
                 >
                    {loading ? 'Testing...' : '⚡ Test Connection'}
                 </button>
                 <button 
                    onClick={handleSave} 
                    className="bg-[#FF6A00] text-white px-6 py-2.5 rounded-lg font-bold hover:bg-[#FF8C32] shadow-lg shadow-orange-100 transition transform hover:-translate-y-0.5"
                 >
                    Save Configuration
                 </button>
             </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
