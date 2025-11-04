import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { config } from './config';
import { CheckResult, RedditComment } from './types';

/**
 * Create a proxy agent for requests
 */
function createProxyAgent(): HttpsProxyAgent<string> {
  const proxyUrl = `http://${config.proxy.username}:${config.proxy.password}@${config.proxy.host}:${config.proxy.port}`;
  return new HttpsProxyAgent(proxyUrl);
}

/**
 * Count collapsed comments recursively
 */
function countCollapsedComments(comments: any[]): number {
  let count = 0;
  
  for (const item of comments) {
    if (item.kind === 't1') { // Comment type
      const data = item.data;
      
      // Check if comment is collapsed
      if (data.collapsed === true || data.collapsed_reason) {
        count++;
      }
      
      // Check for collapsed comment based on score (Reddit often collapses low-score comments)
      if (data.score !== undefined && data.score < -4) {
        count++;
      }
      
      // Recursively check replies
      if (data.replies && typeof data.replies === 'object' && data.replies.data) {
        count += countCollapsedComments(data.replies.data.children || []);
      }
    } else if (item.kind === 'more') {
      // "more comments" links are effectively collapsed
      count += item.data.count || 0;
    }
  }
  
  return count;
}

/**
 * Check a Reddit post using the JSON API
 */
export async function checkRedditPost(postUrl: string): Promise<CheckResult> {
  try {
    // Parse the URL and remove query parameters
    const urlObj = new URL(postUrl);
    const pathname = urlObj.pathname.replace(/\/$/, ''); // Remove trailing slash
    
    // Construct the JSON API URL
    const finalUrl = `${urlObj.protocol}//${urlObj.host}${pathname}.json`;
    
    console.log(`  Checking: ${finalUrl}`);
    
    const agent = createProxyAgent();
    
    const response = await axios.get(finalUrl, {
      httpAgent: agent,
      httpsAgent: agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    // Reddit JSON API returns an array: [post, comments]
    const data = response.data;
    
    if (!Array.isArray(data) || data.length < 2) {
      return {
        status: 'Not Found',
        commentCount: 0,
        collapsedCount: 0,
        error: 'Invalid Reddit response format',
      };
    }

    const postData = data[0].data.children[0];
    const commentsData = data[1].data.children || [];
    
    // Determine post status
    let status: 'Not Found' | 'Removed' | 'Live';
    
    if (postData.data.removed_by_category) {
      // Post was removed by moderators or Reddit
      status = 'Removed';
    } else if (postData.data.is_robot_indexable === false) {
      // Post is not indexable (likely removed or deleted)
      status = 'Removed';
    } else {
      // Post is live
      status = 'Live';
    }
    
    // Get comment count from the post metadata
    const commentCount = postData.data.num_comments || 0;
    
    // Count collapsed comments
    const collapsedCount = countCollapsedComments(commentsData);
    
    return {
      status,
      commentCount,
      collapsedCount,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Handle specific HTTP errors
      if (error.response?.status === 404) {
        return {
          status: 'Not Found',
          commentCount: 0,
          collapsedCount: 0,
          error: 'Post not found (404)',
        };
      }
      
      return {
        status: 'Not Found',
        commentCount: 0,
        collapsedCount: 0,
        error: `HTTP ${error.response?.status}: ${error.message}`,
      };
    }
    
    return {
      status: 'Not Found',
      commentCount: 0,
      collapsedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

