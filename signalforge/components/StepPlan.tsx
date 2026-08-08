import React, { useState, useEffect } from 'react';
import { BlogPostData, ArticleSection } from '../types';
import { generateOutline } from '../services/gemini';

interface StepPlanProps {
  data: BlogPostData;
  updateData: (updates: Partial<BlogPostData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const StepPlan: React.FC<StepPlanProps> = ({ data, updateData, onNext, onBack }) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!data.outline && data.research && data.selectedIdea) {
      createPlan();
    }
  }, []);

  const createPlan = async () => {
    if (!data.selectedIdea || !data.research) return;
    setLoading(true);
    try {
      const outline = await generateOutline(data.selectedIdea, data.research.summary);
      updateData({ outline });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateSection = (index: number, field: keyof ArticleSection, value: any) => {
    if (!data.outline) return;
    const newOutline = [...data.outline];
    newOutline[index] = { ...newOutline[index], [field]: value };
    updateData({ outline: newOutline });
  };

  const addPoint = (sectionIndex: number) => {
    if (!data.outline) return;
    const newOutline = [...data.outline];
    newOutline[sectionIndex].keyPoints.push("New Point");
    updateData({ outline: newOutline });
  };

  const updatePoint = (sectionIndex: number, pointIndex: number, val: string) => {
    if (!data.outline) return;
    const newOutline = [...data.outline];
    newOutline[sectionIndex].keyPoints[pointIndex] = val;
    updateData({ outline: newOutline });
  };

  if (loading) {
    return (
        <div className="max-w-3xl mx-auto text-center py-20">
          <div className="animate-pulse text-4xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-slate-800">Architecting the Article...</h2>
          <p className="text-slate-500">Structuring arguments based on research data.</p>
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
       <div className="flex justify-between items-center">
         <div>
            <h2 className="text-2xl font-bold text-slate-900">Article Plan (Human Review)</h2>
            <p className="text-slate-500">Edit the outline before the AI writes the full draft.</p>
         </div>
         <button onClick={createPlan} className="text-sm text-[#FF5A1F] font-bold bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 hover:bg-orange-100">Regenerate Plan</button>
       </div>

       <div className="space-y-4">
         {data.outline?.map((section, idx) => (
           <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group hover:border-orange-300 transition">
             <div className="flex items-center gap-4 mb-4">
               <span className="bg-slate-100 text-slate-500 font-bold text-xs px-2 py-1 rounded uppercase tracking-wide">Section {idx + 1}</span>
               <input 
                 className="flex-grow font-bold text-lg text-slate-900 bg-transparent outline-none focus:text-[#FF5A1F] placeholder-slate-300"
                 value={section.heading}
                 onChange={(e) => updateSection(idx, 'heading', e.target.value)}
                 placeholder="Section Heading"
               />
             </div>
             <div className="pl-12 space-y-3">
               {section.keyPoints.map((point, pIdx) => (
                 <div key={pIdx} className="flex items-center gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                   <input 
                      className="flex-grow text-sm text-slate-600 bg-transparent outline-none border-b border-transparent focus:border-orange-200 transition py-1"
                      value={point}
                      onChange={(e) => updatePoint(idx, pIdx, e.target.value)}
                   />
                 </div>
               ))}
               <button onClick={() => addPoint(idx)} className="text-xs text-[#FF5A1F] font-bold opacity-0 group-hover:opacity-100 transition py-1">
                 + Add Talking Point
               </button>
             </div>
           </div>
         ))}
       </div>

       <div className="flex justify-end gap-3 pt-6">
        <button onClick={onBack} className="px-6 py-3 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition">
          Back
        </button>
        <button 
          onClick={onNext} 
          className="px-8 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition transform hover:-translate-y-0.5"
        >
          Approve Plan & Write Draft &rarr;
        </button>
      </div>
    </div>
  );
};

export default StepPlan;