# Reddit Status Checker Server

A continuously running Node.js + TypeScript server that monitors Reddit post statuses using residential proxies (anyip.io) and keeps Airtable records fresh.

## Features

- 🔄 **Continuous Monitoring**: Runs as a server, automatically checking posts on a schedule
- 🎯 **Smart Staleness Detection**: Only checks posts that need updating based on configurable rules:
  - Live posts: Rechecked every 12 hours (configurable)
  - Not Found posts: Rechecked every 24 hours (configurable)
  - Removed posts: Never rechecked (configurable)
- ✅ Fetches records from Airtable "NEW Reddit Fulfilment" table
- 🌐 Uses residential proxies from anyip.io for requests
- 📊 Checks Reddit posts via JSON API
- 📝 Updates Airtable with:
  - Post Status: "Live", "Removed", or "Not Found"
  - Comment Amount
  - Collapsed Comment Amount
  - Last Checked timestamp

## Prerequisites

- Node.js (v18 or higher)
- npm
- Airtable API token
- anyip.io proxy credentials

## Installation

1. Clone or navigate to this directory

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:

```env
# Airtable Configuration
AIRTABLE_TOKEN=your_airtable_token_here
AIRTABLE_BASE_ID=appHLVZ9IBCVeqhkR
AIRTABLE_TABLE_ID=tblOpYVCHE8F4ivTa

# AnyIP.io Proxy Configuration
PROXY_HOST=proxy.anyip.io
PROXY_PORT=8080
PROXY_USERNAME=your_anyip_username
PROXY_PASSWORD=your_anyip_password

# Optional: Limit how many records to check per cycle (0 = unlimited)
MAX_RECORDS_TO_CHECK=0

# Staleness Configuration (in hours)
LIVE_STALE_AFTER_HOURS=12
NOT_FOUND_STALE_AFTER_HOURS=24
RECHECK_REMOVED=false

# Server Configuration
CHECK_INTERVAL_MINUTES=30
DELAY_BETWEEN_POSTS_MS=2000
```

## Getting Your Credentials

### Airtable API Token

1. Go to https://airtable.com/create/tokens
2. Click "Create new token"
3. Give it a name (e.g., "Reddit Checker")
4. Add these scopes:
   - `data.records:read`
   - `data.records:write`
5. Add access to your "Reddit PR" base
6. Create the token and copy it to your `.env` file

### AnyIP.io Proxy

1. Log in to your anyip.io account
2. Find your proxy credentials (username and password)
3. The proxy host is typically `proxy.anyip.io` or similar
4. The port is usually `8080` or `8000`
5. Add these credentials to your `.env` file

## Usage

### Development Mode

Run the server with TypeScript directly (with hot reload on code changes):

```bash
npm run dev
```

### Production Mode

Build and run the compiled JavaScript:

```bash
npm run build
npm start
```

### Running as a Background Service

You can use tools like `pm2` to run this as a background service:

```bash
# Install pm2 globally
npm install -g pm2

# Build the project
npm run build

# Start with pm2
pm2 start dist/index.js --name reddit-checker

# View logs
pm2 logs reddit-checker

# Stop the service
pm2 stop reddit-checker
```

## How It Works

### Server Loop

The server runs continuously in an infinite loop:

1. **Check Cycle**: Every configured interval (default: 30 minutes)
2. **Fetch All Records**: Gets all records from the "NEW Reddit Fulfilment" table
3. **Filter Stale Records**: Identifies which posts need checking based on staleness rules
4. **Check Posts**: For each stale post, checks its status via Reddit API
5. **Update Airtable**: Saves the results back to Airtable
6. **Sleep**: Waits until the next check interval

### Staleness Rules

Posts are considered "stale" and need rechecking based on their current status:

- **Live posts** 🟢: Become stale after 12 hours (configurable)
  - Reason: These are active posts that might get removed or collect more comments
  
- **Not Found posts** 🟡: Become stale after 24 hours (configurable)
  - Reason: These might have been temporarily unavailable or could reappear
  
- **Removed posts** 🔴: Never become stale (by default, configurable)
  - Reason: Once removed, they typically stay removed, no need to keep checking

### Post Checking Process

For each stale post:

1. **Parse URL**: Removes query parameters and constructs the Reddit JSON API URL
2. **Make Request**: Uses residential proxy to fetch post data
3. **Determine Status**:
   - **Live**: Post exists and is not removed
   - **Removed**: Post has `removed_by_category` or `is_robot_indexable: false`
   - **Not Found**: 404 error or invalid response
4. **Count Comments**: Extracts total comment count from post metadata
5. **Count Collapsed**: Identifies hidden/downvoted comments
6. **Update Airtable**: Saves all fields including current timestamp

## Collapsed Comments

The tool identifies collapsed comments by:
- Comments with `collapsed: true` flag
- Comments with a `collapsed_reason`
- Comments with a score below -4 (Reddit's typical threshold)
- "Load more comments" links (these represent hidden comment threads)

## Output

The server provides detailed console output for each check cycle:

```
🚀 Reddit Status Checker Server
============================================================
Running continuously to keep Reddit post statuses fresh
============================================================

✓ Configuration validated

📋 Configuration:
  - Live posts become stale after: 12 hours
  - Not Found posts become stale after: 24 hours
  - Removed posts are rechecked: No
  - Check interval: 30 minutes
  - Delay between posts: 2000ms

============================================================
📅 Cycle #1
============================================================

============================================================
🔄 Check Cycle Started: 11/4/2025, 10:30:00 AM
============================================================

📋 Fetching records from Airtable...
✓ Found 150 total records
✓ Found 8 stale records to check

🔍 Starting to check 8 records...

[1/8] Jose Amador - Post #5
  Checking: https://reddit.com/r/example/comments/abc123/title.json
  Status: ✓ Live
  Comments: 42
  Collapsed: 3
✓ Updated record rec07PX7qBisPCPTh

...

============================================================
📊 Cycle Summary
============================================================
Total stale records found: 8
Records checked this cycle: 8
Successfully checked: 7
Errors: 1
Cycle duration: 24.3s
Cycle completed: 11/4/2025, 10:30:24 AM

💤 Sleeping for 30 minutes
⏰ Next check scheduled for: 11/4/2025, 11:00:24 AM
```

## Error Handling

The tool handles various error scenarios:
- Missing or invalid post URLs
- 404 (post not found/removed)
- Network errors
- Proxy errors
- Airtable API errors

Errors are logged but don't stop the entire process - the tool will continue checking remaining records.

## Configuration Options

- `MAX_RECORDS_TO_CHECK`: Limit the number of records to check per run (0 = no limit)
- Useful for testing or processing in batches

## Troubleshooting

### "Configuration errors" on startup
- Make sure your `.env` file exists and has all required variables
- Check that your Airtable token and proxy credentials are correct

### "Proxy error" or connection timeouts
- Verify your anyip.io credentials
- Check that your proxy subscription is active
- Try using a different proxy server if available

### "Airtable API Error"
- Verify your Airtable token has the correct permissions
- Check that the base ID and table ID are correct

### "Post not found (404)"
- This is normal for deleted/removed posts
- The tool will mark these as not existing (unchecked) in Airtable

## License

MIT

