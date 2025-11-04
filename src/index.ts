import { validateConfig, config } from './config';
import { getAllRecords, filterStaleRecords, updateRecordCheckerFields } from './airtable';
import { checkRedditPost } from './reddit';

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
}

async function runCheckCycle() {
  const cycleStartTime = new Date();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 Check Cycle Started: ${cycleStartTime.toLocaleString()}`);
  console.log('='.repeat(60));

  try {
    // Fetch all records from Airtable
    console.log('\n📋 Fetching records from Airtable...');
    const allRecords = await getAllRecords();
    console.log(`✓ Found ${allRecords.length} total records`);

    // Filter to only stale records with valid post links
    const staleRecords = filterStaleRecords(allRecords);
    console.log(`✓ Found ${staleRecords.length} stale records to check`);
    
    // Apply max records limit if configured
    const recordsToCheck = config.maxRecordsToCheck > 0 
      ? staleRecords.slice(0, config.maxRecordsToCheck)
      : staleRecords;
    
    if (recordsToCheck.length < staleRecords.length) {
      console.log(`⚠ Limited to ${recordsToCheck.length} records (MAX_RECORDS_TO_CHECK=${config.maxRecordsToCheck})`);
    }

    if (recordsToCheck.length === 0) {
      console.log('✓ No stale records to check. All records are fresh!');
      return { success: 0, errors: 0, skipped: 0 };
    }

    console.log(`\n🔍 Starting to check ${recordsToCheck.length} records...\n`);

    // Process each record
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < recordsToCheck.length; i++) {
      const record = recordsToCheck[i];
      const postUrl = record.fields['Post Link (completed)'];
      const clientName = record.fields['Client Name'] || 'Unknown';
      const postNum = record.fields['Post #'] || '?';

      console.log(`\n[${i + 1}/${recordsToCheck.length}] ${clientName} - Post #${postNum}`);

      // Safety check (should never happen due to staleness filter)
      if (!postUrl) {
        console.log('  ⚠ No post URL, skipping');
        continue;
      }

      try {
        // Check the Reddit post
        const result = await checkRedditPost(postUrl);
        
        if (result.error) {
          console.log(`  ⚠ Error: ${result.error}`);
          errorCount++;
        }
        
        // Protect Live status from being downgraded to Not Found
        // (could be a temporary proxy/network issue)
        const currentStatus = record.fields['Post Status (Checker)'];
        let finalStatus = result.status;
        
        if (currentStatus === 'Live' && result.status === 'Not Found') {
          console.log(`  ℹ️ Preserving Live status (Not Found could be temporary)`);
          finalStatus = 'Live';
        }
        
        // Display results with appropriate emoji
        let statusEmoji = '?';
        if (finalStatus === 'Live') {
          statusEmoji = '✓';
        } else if (finalStatus === 'Removed') {
          statusEmoji = '✗';
        } else if (finalStatus === 'Not Found') {
          statusEmoji = '⚠';
        }
        
        console.log(`  Status: ${statusEmoji} ${finalStatus}`);
        console.log(`  Comments: ${result.commentCount}`);
        console.log(`  Collapsed: ${result.collapsedCount}`);
        
        // Update Airtable
        await updateRecordCheckerFields(
          record.id,
          finalStatus,
          result.commentCount,
          result.collapsedCount
        );
        
        successCount++;
        
        // Add a delay between requests to avoid rate limiting
        if (i < recordsToCheck.length - 1) {
          await new Promise(resolve => setTimeout(resolve, config.server.delayBetweenPostsMs));
        }
      } catch (error) {
        console.log(`  ✗ Failed to check/update: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorCount++;
      }
    }

    // Cycle Summary
    const cycleEndTime = new Date();
    const cycleDuration = (cycleEndTime.getTime() - cycleStartTime.getTime()) / 1000;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 Cycle Summary');
    console.log('='.repeat(60));
    console.log(`Total stale records found: ${staleRecords.length}`);
    console.log(`Records checked this cycle: ${recordsToCheck.length}`);
    console.log(`Successfully checked: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Cycle duration: ${cycleDuration.toFixed(1)}s`);
    console.log(`Cycle completed: ${cycleEndTime.toLocaleString()}`);
    
    return { success: successCount, errors: errorCount, skipped: staleRecords.length - recordsToCheck.length };
  } catch (error) {
    console.error('\n❌ Error during check cycle:', error);
    return { success: 0, errors: 1, skipped: 0 };
  }
}

async function main() {
  console.log('🚀 Reddit Status Checker Server');
  console.log('='.repeat(60));
  console.log('Running continuously to keep Reddit post statuses fresh');
  console.log('='.repeat(60));

  // Validate configuration
  validateConfig();
  console.log('\n✓ Configuration validated');
  console.log('\n📋 Configuration:');
  console.log(`  - Live posts become stale after: ${config.staleness.liveStaleAfterHours} hours`);
  console.log(`  - Not Found posts become stale after: ${config.staleness.notFoundStaleAfterHours} hours`);
  console.log(`  - Removed posts are rechecked: ${config.staleness.recheckRemoved ? 'Yes' : 'No'}`);
  console.log(`  - Check interval: ${formatDuration(config.server.checkIntervalMinutes)}`);
  console.log(`  - Delay between posts: ${config.server.delayBetweenPostsMs}ms`);
  if (config.maxRecordsToCheck > 0) {
    console.log(`  - Max records per cycle: ${config.maxRecordsToCheck}`);
  }

  let cycleCount = 0;
  
  // Run the first check immediately
  while (true) {
    try {
      cycleCount++;
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📅 Cycle #${cycleCount}`);
      console.log('='.repeat(60));
      
      await runCheckCycle();
      
      // Calculate next check time
      const nextCheckTime = new Date(Date.now() + config.server.checkIntervalMinutes * 60 * 1000);
      console.log(`\n💤 Sleeping for ${formatDuration(config.server.checkIntervalMinutes)}`);
      console.log(`⏰ Next check scheduled for: ${nextCheckTime.toLocaleString()}`);
      
      // Sleep until next check
      await new Promise(resolve => setTimeout(resolve, config.server.checkIntervalMinutes * 60 * 1000));
    } catch (error) {
      console.error('\n❌ Fatal error in main loop:', error);
      console.log('\n⚠️ Waiting 5 minutes before retrying...');
      await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

