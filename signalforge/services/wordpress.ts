import { WordPressConfig, BlogPostData, ExistingPost, WPCategory } from "../types";

// Helper to handle Basic Auth
const getHeaders = (config: WordPressConfig) => {
  const cleanPassword = config.appPassword.replace(/\s+/g, '');
  const credentials = btoa(`${config.username}:${cleanPassword}`);
  return {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
};

/**
 * Test the connection and check user permissions
 */
export const verifyConnection = async (config: WordPressConfig): Promise<{ success: boolean; message: string; user?: string; role?: string }> => {
  if (!config.siteUrl || !config.username || !config.appPassword) {
    return { success: false, message: "Missing credentials." };
  }
  
  const cleanUrl = config.siteUrl.replace(/\/$/, "");

  try {
    const response = await fetch(`${cleanUrl}/wp-json/wp/v2/users/me?context=edit`, {
      method: 'GET',
      headers: getHeaders(config)
    });

    if (response.status === 401 || response.status === 403) {
      return { 
        success: false, 
        message: "Authorization Failed. Check credentials." 
      };
    }

    if (!response.ok) {
      return { success: false, message: `Connection Error: ${response.status}` };
    }

    const data = await response.json();
    return { 
      success: true, 
      message: `Connected as ${data.name}`,
      user: data.name
    };

  } catch (error: any) {
    return { success: false, message: "Network Error. Check URL or CORS." };
  }
};

/**
 * Fetch categories from WordPress
 */
export const fetchCategories = async (config: WordPressConfig): Promise<WPCategory[]> => {
  if (!config.siteUrl) return [];
  const cleanUrl = config.siteUrl.replace(/\/$/, "");
  
  try {
    const response = await fetch(`${cleanUrl}/wp-json/wp/v2/categories?per_page=100`, {
      method: 'GET',
      headers: config.username ? getHeaders(config) : { 'Content-Type': 'application/json' }
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.map((cat: any) => ({
      id: cat.id,
      name: cat.name
    }));
  } catch (error) {
    return [];
  }
};

/**
 * Fetch recent posts
 */
export const fetchRecentPosts = async (config: WordPressConfig): Promise<ExistingPost[]> => {
  if (!config.siteUrl) return [];
  const cleanUrl = config.siteUrl.replace(/\/$/, "");
  
  try {
    const response = await fetch(`${cleanUrl}/wp-json/wp/v2/posts?per_page=10&_fields=id,title,link`, {
      method: 'GET',
      headers: config.username ? getHeaders(config) : { 'Content-Type': 'application/json' }
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.map((post: any) => ({
      id: post.id,
      title: post.title.rendered,
      link: post.link
    }));
  } catch (error) {
    return [];
  }
};

/**
 * Fetch the single latest scheduled post
 */
export const fetchLatestScheduledPost = async (config: WordPressConfig): Promise<string | null> => {
  if (!config.siteUrl || !config.username) return null;
  const cleanUrl = config.siteUrl.replace(/\/$/, "");

  try {
    const response = await fetch(`${cleanUrl}/wp-json/wp/v2/posts?status=future&per_page=1&orderby=date&order=desc`, {
      method: 'GET',
      headers: getHeaders(config)
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data && data.length > 0) {
      return data[0].date;
    }
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Uploads media to WordPress
 */
const uploadMedia = async (config: WordPressConfig, base64Image: string, mimeType: string, filename: string): Promise<{ id: number, url: string } | null> => {
  try {
    const byteCharacters = atob(base64Image);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    const cleanPassword = config.appPassword.replace(/\s+/g, '');
    const credentials = btoa(`${config.username}:${cleanPassword}`);
    
    const response = await fetch(`${config.siteUrl}/wp-json/wp/v2/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Disposition': `attachment; filename="${filename}"`
      },
      body: blob 
    });

    if (!response.ok) return null;

    const data = await response.json();
    return { id: data.id, url: data.source_url }; 
  } catch (error) {
    return null;
  }
};

/**
 * Posts the article to WordPress
 */
export const publishToWordPress = async (config: WordPressConfig, post: BlogPostData): Promise<{ success: boolean; message: string; link?: string }> => {
  if (!config.siteUrl || !config.username || !config.appPassword) {
    return { success: false, message: "Missing credentials." };
  }

  const cleanUrl = config.siteUrl.replace(/\/$/, "");

  try {
    let featuredMediaId = 0;

    // Upload Featured Image
    if (post.image) {
      const filename = `signalforge-${Date.now()}.png`; 
      const result = await uploadMedia(config, post.image.base64, post.image.mimeType, filename);
      if (result) {
        featuredMediaId = result.id;
      }
    }

    // Prepare content - simple Markdown to HTML conversion
    let htmlContent = (post.content || "")
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
      .replace(/\*(.*)\*/gim, '<i>$1</i>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .split('\n\n').map(para => para.trim() ? `<p>${para}</p>` : '').join('');

    const postPayload: any = {
      title: post.selectedIdea?.title || post.topic || "SignalForge Article",
      content: htmlContent,
      status: post.scheduledDate ? 'future' : 'draft',
      featured_media: featuredMediaId > 0 ? featuredMediaId : undefined,
      excerpt: post.metaDescription || '',
    };
    
    if (post.selectedCategoryId) {
        postPayload.categories = [post.selectedCategoryId];
    }

    if (post.scheduledDate) {
      postPayload.date_gmt = new Date(post.scheduledDate).toISOString(); 
    }

    const response = await fetch(`${cleanUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: getHeaders(config),
      body: JSON.stringify(postPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "WordPress API Error");
    }

    const data = await response.json();
    return { success: true, message: "Deployed successfully.", link: data.link };

  } catch (error: any) {
    return { 
      success: false, 
      message: error.message || "Network error during publish." 
    };
  }
};