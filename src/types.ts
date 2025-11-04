export interface AirtableRecord {
  id: string;
  fields: {
    'Client Name'?: string;
    'Post #'?: number;
    'Post Link (completed)'?: string;
    'Post Status (Checker)'?: 'Not Found' | 'Removed' | 'Live';
    'Comment Amount (Checker)'?: number;
    'Collapsed Comment Amount (Checker)'?: number;
    'Last Checked (Checker)'?: string;
  };
}

export interface RedditPost {
  kind: string;
  data: {
    title: string;
    author: string;
    subreddit: string;
    score: number;
    num_comments: number;
    created_utc: number;
    url: string;
    selftext: string;
    removed_by_category?: string | null;
    is_robot_indexable?: boolean;
    children?: RedditComment[];
  };
}

export interface RedditComment {
  kind: string;
  data: {
    author?: string;
    body?: string;
    score?: number;
    collapsed?: boolean;
    collapsed_reason?: string | null;
    children?: RedditComment[];
  };
}

export interface RedditResponse {
  kind: string;
  data: {
    children: RedditPost[];
  };
}

export interface CheckResult {
  status: 'Not Found' | 'Removed' | 'Live';
  commentCount: number;
  collapsedCount: number;
  error?: string;
}

