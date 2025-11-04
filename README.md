# Reddit Status Checker

A Node.js + TypeScript tool that checks Reddit post statuses using residential proxies (anyip.io) and updates Airtable records.

## Features

- ✅ Fetches records from Airtable "NEW Reddit Fulfilment" table
- 🌐 Uses residential proxies from anyip.io for requests
- 📊 Checks Reddit posts via JSON API
- 📝 Updates Airtable with:
  - Post Status (if the post is still live)
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

# Optional: Limit how many records to check per run (0 = all)
MAX_RECORDS_TO_CHECK=10
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

Run with TypeScript directly (faster for testing):

```bash
npm run dev
```

### Production Mode

Build and run the compiled JavaScript:

```bash
npm run build
npm start
```

Or use the shortcut:

```bash
npm run check
```

## How It Works

1. **Fetch Records**: The tool fetches all records from the "NEW Reddit Fulfilment" table that have a "Post Link (completed)" URL.

2. **Check Each Post**: For each record:
   - Constructs the Reddit JSON API URL (adds `.json` to the post URL)
   - Makes a request through the residential proxy
   - Parses the JSON response to extract:
     - Post existence/status (checks if removed)
     - Total comment count
     - Number of collapsed comments (downvoted or hidden comments)

3. **Update Airtable**: Updates the record with:
   - ✅ Post Status (Checker): `true` if live, `false` if removed
   - 📊 Comment Amount (Checker): Total number of comments
   - 🔻 Collapsed Comment Amount (Checker): Number of collapsed/hidden comments
   - ⏰ Last Checked (Checker): Current timestamp

4. **Rate Limiting**: Adds a 2-second delay between requests to avoid Reddit rate limiting.

## Collapsed Comments

The tool identifies collapsed comments by:
- Comments with `collapsed: true` flag
- Comments with a `collapsed_reason`
- Comments with a score below -4 (Reddit's typical threshold)
- "Load more comments" links (these represent hidden comment threads)

## Output

The tool provides detailed console output:

```
🚀 Reddit Status Checker
========================

✓ Configuration validated

📋 Fetching records from Airtable...
✓ Found 10 records with post links

[1/10] Jose Amador - Post #5
  Checking: https://reddit.com/r/example/comments/abc123/title.json
  Status: ✓ Live
  Comments: 42
  Collapsed: 3
✓ Updated record rec07PX7qBisPCPTh

...

========================
📊 Summary
========================
Total records: 10
Successfully checked: 9
Errors: 1

✅ Done!
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

