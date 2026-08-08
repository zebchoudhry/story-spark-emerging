import React, { useState, useEffect } from 'react';
import { BlogPostData, GeneratedImage } from '../types';
import { generateBlogImage, generateGallery } from '../services/gemini';

interface StepImagesProps {
  data: BlogPostData;
  updateData: (updates: Partial<BlogPostData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const StepImages: React.FC<StepImagesProps> = ({ data, updateData, onNext, onBack }) => {
  const [loadingMain, setLoadingMain] = useState(false);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [mainError, setMainError] = useState<string | null>(null);

  useEffect(() => {
    // Initial Generation on Load if empty
    if (data.selectedIdea) {
        if (!data.image) createMainImage();
        if (!data.gallery || data.gallery.length === 0) createGallery();
    }
  }, []);

  const createMainImage = async () => {
    if (!data.selectedIdea) return;
    setLoadingMain(true);
    setMainError(null);
    try {
      const result = await generateBlogImage(data.selectedIdea, data.brand);
      updateData({ 
        image: {
            ...result,
            prompt: `Featured image for ${data.selectedIdea.title}` 
        } 
      });
    } catch (err: any) {
      setMainError(err.message);
    } finally {
      setLoadingMain(false);
    }
  };

  const createGallery = async () => {
    if (!data.selectedIdea || !data.content) return;
    setLoadingGallery(true);
    try {
        const images = await generateGallery(data.selectedIdea, data.content, data.brand);
        updateData({ gallery: images });
    } catch (e) {
        console.error(e);
    } finally {
        setLoadingGallery(false);
    }
  };

  const copyImageMarkdown = (image: GeneratedImage) => {
      // Create a markdown string with base64 (Note: this is heavy for editors, but works for immediate preview)
      // Ideally, these are uploaded to WP first. 
      // For now, we copy a placeholder that reminds the user it will be uploaded.
      const md = `![${image.prompt}](data:${image.mimeType};base64,${image.base64})`;
      navigator.clipboard.writeText(md);
      alert("Image Markdown copied! You can paste this into the Draft editor to preview, but remember to remove it if it makes the text too laggy. The publisher will handle uploads automatically.");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Visual Asset Suite</h2>
        <p className="text-slate-500">Generating consistent brand imagery using style: <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded font-bold">{data.brand.imageStyle}</span></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT: Featured Image */}
        <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Featured Header Image</h3>
            <div className="bg-white p-3 rounded-3xl border border-slate-200 shadow-sm min-h-[300px] flex items-center justify-center relative overflow-hidden group">
                {loadingMain ? (
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-[#FF5A1F] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-bold text-xs">Rendering Main Visual...</p>
                </div>
                ) : mainError ? (
                <div className="text-center max-w-md">
                    <p className="text-red-500 mb-4 text-xs">{mainError}</p>
                    <button onClick={createMainImage} className="px-4 py-2 bg-slate-100 rounded-md hover:bg-slate-200 text-slate-700 text-xs font-bold">Retry</button>
                </div>
                ) : data.image ? (
                    <div className="relative w-full h-full">
                        <img 
                        src={`data:${data.image.mimeType};base64,${data.image.base64}`} 
                        alt="Generated featured image" 
                        className="w-full h-auto rounded-2xl object-cover shadow-sm"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                             <button 
                                onClick={createMainImage} 
                                className="bg-white/90 hover:bg-white text-slate-900 px-4 py-2 rounded-lg text-xs font-bold shadow-lg"
                            >
                                ↻ Regenerate
                            </button>
                        </div>
                    </div>
                ) : (
                    <button onClick={createMainImage} className="text-[#FF5A1F] font-bold">Generate Featured Image</button>
                )}
            </div>
        </div>

        {/* RIGHT: In-Content Gallery */}
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Editorial Gallery (Body Images)</h3>
                <button 
                    onClick={createGallery}
                    disabled={loadingGallery} 
                    className="text-xs text-[#FF5A1F] font-bold hover:underline"
                >
                    {loadingGallery ? 'Analyzing Draft...' : '↻ Regenerate All'}
                </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                {loadingGallery ? (
                    [1,2,3].map(i => (
                        <div key={i} className="aspect-square bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center animate-pulse">
                            <div className="w-6 h-6 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ))
                ) : (data.gallery && data.gallery.length > 0) ? (
                    data.gallery.map((img, idx) => (
                        <div key={idx} className="aspect-square relative group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                             <img 
                                src={`data:${img.mimeType};base64,${img.base64}`} 
                                className="w-full h-full object-cover"
                             />
                             <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition p-4 flex flex-col justify-end">
                                 <p className="text-[10px] text-white line-clamp-2 mb-2 leading-tight">{img.prompt}</p>
                                 <button 
                                    onClick={() => copyImageMarkdown(img)}
                                    className="w-full bg-white text-slate-900 py-1.5 rounded text-[10px] font-bold hover:bg-orange-50"
                                 >
                                     Copy Markdown
                                 </button>
                             </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-2 text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-2xl">
                        No gallery images yet.
                        <br/>
                        <button onClick={createGallery} className="text-orange-500 font-bold mt-2 underline">Generate Asset Suite</button>
                    </div>
                )}
            </div>
        </div>

      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button onClick={onBack} className="px-6 py-3 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition">
          Back
        </button>
        <button 
          onClick={onNext} 
          disabled={loadingMain || !data.image}
          className={`px-8 py-3 rounded-xl bg-[#FF5A1F] text-white font-bold hover:bg-orange-700 shadow-lg shadow-orange-200 disabled:opacity-50 transition transform hover:-translate-y-0.5`}
        >
          Review & Publish &rarr;
        </button>
      </div>
    </div>
  );
};

export default StepImages;