
import { BlogPostData } from '../types';

const HISTORY_INDEX_KEY = 'signalforge_history_index';

export interface HistoryItem {
  id: string;
  siteId: string;
  topic: string;
  date: string;
  status?: string;
}

export const StorageService = {
  
  /**
   * Safely set item in localStorage with error handling for quota issues
   */
  safeSetItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
        console.warn("LocalStorage Quota Exceeded. Attempting aggressive pruning...");
        
        // Strategy 1: Prune 5 items
        StorageService.pruneOldest(5);
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (retryError) {
          console.warn("Still full. Attempting to prune 50% of history...");
          
          // Strategy 2: Prune 50% of history
          const history = StorageService.getHistory();
          StorageService.pruneOldest(Math.max(5, Math.floor(history.length / 2)));
          
          try {
            localStorage.setItem(key, value);
            return true;
          } catch (lastDitchError) {
            console.error("Critical Storage Error: LocalStorage is full even after aggressive pruning. Data too large.", lastDitchError);
            return false;
          }
        }
      }
      return false;
    }
  },

  /**
   * Remove the N oldest articles from storage
   */
  pruneOldest: (count: number = 3) => {
    const history = StorageService.getHistory();
    if (history.length === 0) return;

    // History is unshifted (newest first), so slice from end (oldest)
    const toRemove = history.slice(-count);
    const remaining = history.slice(0, history.length - count);

    toRemove.forEach(item => {
      const storagePath = `signalforge/output/${item.siteId}/${item.id}`;
      localStorage.removeItem(storagePath);
    });

    localStorage.setItem(HISTORY_INDEX_KEY, JSON.stringify(remaining));
  },

  saveArticle: async (article: BlogPostData): Promise<string> => {
    const id = article.id || crypto.randomUUID();
    const siteId = article.site_id || 'beyond';
    
    // Simulating Directory Isolation: /output/{site_id}/{id}
    const storagePath = `signalforge/output/${siteId}/${id}`;
    
    try {
        const indexRaw = localStorage.getItem(HISTORY_INDEX_KEY);
        let index = indexRaw ? JSON.parse(indexRaw) : [];
        index = index.filter((i: any) => i.id !== id);
        index.unshift({
            id,
            siteId,
            topic: article.topic || article.selectedIdea?.title || "Untitled",
            date: new Date().toISOString()
        });
        
        // Use safeSetItem to handle quota errors
        StorageService.safeSetItem(HISTORY_INDEX_KEY, JSON.stringify(index));
        StorageService.safeSetItem(storagePath, JSON.stringify(article));
    } catch (e) {
      console.error("Storage Save Failed", e);
    }

    return id;
  },

  getHistory: (): HistoryItem[] => {
    try {
        const raw = localStorage.getItem(HISTORY_INDEX_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  },

  loadLocalArticle: (id: string, siteId: string): BlogPostData | null => {
      try {
          const storagePath = `signalforge/output/${siteId}/${id}`;
          const raw = localStorage.getItem(storagePath);
          return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
  },

  clearAllData: () => {
    const history = StorageService.getHistory();
    history.forEach(item => {
      localStorage.removeItem(`signalforge/output/${item.siteId}/${item.id}`);
    });
    localStorage.removeItem(HISTORY_INDEX_KEY);
    localStorage.removeItem('autoblog_data_beyond');
    localStorage.removeItem('autoblog_data_fozias');
    localStorage.removeItem('signalforge_active_site');
  }
};
