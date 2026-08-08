
import React, { useEffect, useState } from 'react';
import { StorageService, HistoryItem } from '../services/storage';
import { BlogPostData } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadArticle: (data: BlogPostData) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, onLoadArticle }) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setHistory(StorageService.getHistory());
    }
  }, [isOpen]);

  const handleLoad = (id: string, siteId: string) => {
    if (confirm("Load this archived session? Unsaved changes in your current workspace will be lost.")) {
      const data = StorageService.loadLocalArticle(id, siteId);
      if (data) {
        onLoadArticle(data);
        onClose();
      } else {
        alert("Failed to load article data. It may have been cleared from browser storage.");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#0B0F1A] rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-800 flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#111827]">
            <div>
                <h3 className="text-white font-bold text-xl flex items-center gap-2">
                    📂 Production Logs
                </h3>
                <p className="text-gray-400 text-xs mt-1">Local archive of recent autoblogging runs.</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition text-2xl font-bold">✕</button>
        </div>

        {/* List */}
        <div className="flex-grow overflow-y-auto p-0">
            {history.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                    <p>No production history found.</p>
                </div>
            ) : (
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#1F2937] text-gray-400 text-[10px] uppercase font-bold sticky top-0">
                        <tr>
                            <th className="p-4">Topic / Keyword</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {history.map((item) => (
                            <tr key={item.id} className="hover:bg-[#1F2937] transition group">
                                <td className="p-4">
                                    <div className="text-sm font-bold text-white group-hover:text-[#FF6A00] transition">
                                        {item.topic || "Untitled Draft"}
                                    </div>
                                    <div className="text-[10px] text-gray-500 font-mono">{item.id.slice(0,8)}</div>
                                </td>
                                <td className="p-4 text-xs text-gray-400">
                                    {new Date(item.date).toLocaleDateString()} <span className="text-gray-600">{new Date(item.date).toLocaleTimeString()}</span>
                                </td>
                                <td className="p-4">
                                    <span className={`text-[9px] font-bold px-2 py-1 rounded border ${
                                        item.status === 'SCHEDULED' ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-gray-800 text-gray-400 border-gray-700'
                                    }`}>
                                        {item.status || 'DRAFT'}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <button 
                                        onClick={() => handleLoad(item.id, item.siteId)}
                                        className="text-xs bg-[#FF6A00] hover:bg-[#FF8C32] text-white px-3 py-1.5 rounded font-bold transition"
                                    >
                                        Load
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
