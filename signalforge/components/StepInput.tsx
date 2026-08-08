
import React, { useState } from 'react';
import { BlogPostData, ArticleIdea } from '../types';
import { generateIdeas } from '../services/gemini';

interface StepInputProps {
  data: BlogPostData;
  updateData: (updates: Partial<BlogPostData>) => void;
  onNext: () => void;
  siteId: string;
}

const StepInput: React.FC<StepInputProps> = ({ data, updateData, onNext, siteId }) => {
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<ArticleIdea[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!data.topic) return alert("Enter Target Topic.");
    setLoading(true);
    setErrorMsg(null);
    setIdeas([]);
    try {
      const generatedIdeas = await generateIdeas(data.topic, data.brand, data.sourceMode, siteId);
      setIdeas(generatedIdeas);
    } catch (e: any) {
      setErrorMsg(e.message || "Engine Failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {data.storySparkId || data.sourceStoryUrl ? (
        <div className="flex items-center gap-3 bg-[#0B0F1A] border border-[#FF6A00]/40 rounded-lg px-4 py-3">
          <span className="text-[#FF6A00] font-bold text-xs uppercase tracking-wider">Story Spark</span>
          <span className="text-[#9CA3AF] text-xs">Topic imported from Story Spark.</span>
          {data.sourceStoryUrl && (
            <a href={data.sourceStoryUrl} target="_blank" rel="noopener noreferrer" className="text-[#FF6A00] text-xs underline ml-auto">View Source</a>
          )}
        </div>
      ) : null}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden p-8">
        <h2 className="text-xl font-bold mb-6">Pipeline: {siteId === 'fozias' ? 'Fozias Authority' : 'Beyond Exploratory'}</h2>
        <div className="space-y-4">
            <div>
                <label className="text-xs font-bold text-[#374151] mb-2 block uppercase tracking-widest">Target Topic</label>
                <input 
                  className="w-full text-lg px-4 py-3 border border-gray-300 rounded-lg focus:border-[#FF6A00] outline-none" 
                  placeholder={siteId === 'fozias' ? "e.g. Traditional Wazwan preparation" : "e.g. Secret underground AI labs"}
                  value={data.topic} 
                  onChange={e => updateData({topic: e.target.value})} 
                />
            </div>
            {errorMsg && <div className="p-3 bg-red-50 text-red-600 rounded text-xs font-bold uppercase tracking-wide border border-red-100">{errorMsg}</div>}
            <button onClick={handleAnalyze} disabled={loading} className="w-full py-4 rounded-lg font-bold text-sm bg-[#FF6A00] text-white">
                {loading ? 'VALIDATING POLICY & GENERATING...' : '⚡ INITIALIZE STRATEGY'}
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ideas.map((idea, idx) => (
          <div key={idx} onClick={() => { updateData({ selectedIdea: idea }); onNext(); }} className="bg-white p-6 rounded-xl border-l-4 border-l-[#FF6A00] hover:shadow-lg cursor-pointer transition">
            <h4 className="font-bold text-lg mb-2">{idea.title}</h4>
            <p className="text-sm text-[#4B5563]">{idea.angle}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StepInput;
