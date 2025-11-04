import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  airtable: {
    token: process.env.AIRTABLE_TOKEN || '',
    baseId: process.env.AIRTABLE_BASE_ID || 'appHLVZ9IBCVeqhkR',
    tableId: process.env.AIRTABLE_TABLE_ID || 'tblOpYVCHE8F4ivTa',
  },
  proxy: {
    host: process.env.PROXY_HOST || 'proxy.anyip.io',
    port: parseInt(process.env.PROXY_PORT || '8080', 10),
    username: process.env.PROXY_USERNAME || '',
    password: process.env.PROXY_PASSWORD || '',
  },
  maxRecordsToCheck: parseInt(process.env.MAX_RECORDS_TO_CHECK || '0', 10),
  staleness: {
    // How long before a "Live" post is considered stale (in hours)
    liveStaleAfterHours: parseInt(process.env.LIVE_STALE_AFTER_HOURS || '12', 10),
    // How long before a "Not Found" post is considered stale (in hours)
    notFoundStaleAfterHours: parseInt(process.env.NOT_FOUND_STALE_AFTER_HOURS || '24', 10),
    // "Removed" posts are never rechecked (set to false)
    recheckRemoved: process.env.RECHECK_REMOVED === 'true',
  },
  server: {
    // How often to run the check cycle (in minutes)
    checkIntervalMinutes: parseInt(process.env.CHECK_INTERVAL_MINUTES || '30', 10),
    // Delay between checking individual posts (in milliseconds)
    delayBetweenPostsMs: parseInt(process.env.DELAY_BETWEEN_POSTS_MS || '2000', 10),
  },
};

export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.airtable.token) {
    errors.push('AIRTABLE_TOKEN is required');
  }
  if (!config.proxy.username) {
    errors.push('PROXY_USERNAME is required');
  }
  if (!config.proxy.password) {
    errors.push('PROXY_PASSWORD is required');
  }

  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    console.error('\nPlease check your .env file');
    process.exit(1);
  }
}

