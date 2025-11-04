import { validateConfig } from './config';
import { getRecordsWithPostLinks, updateRecordCheckerFields } from './airtable';
import { checkRedditPost } from './reddit';

async function main() {
  console.log('🚀 Reddit Status Checker');
  console.log('========================\n');

  // Validate configuration
  validateConfig();
  console.log('✓ Configuration validated\n');

  try {
    // Fetch records from Airtable
    console.log('📋 Fetching records from Airtable...');
    const records = await getRecordsWithPostLinks();
    console.log(`✓ Found ${records.length} records with post links\n`);

    if (records.length === 0) {
      console.log('No records to check. Exiting.');
      return;
    }

    // Process each record
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const postUrl = record.fields['Post Link (completed)'];
      const clientName = record.fields['Client Name'] || 'Unknown';
      const postNum = record.fields['Post #'] || '?';

      console.log(`\n[${i + 1}/${records.length}] ${clientName} - Post #${postNum}`);
      
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
        
        // Display results with appropriate emoji
        let statusEmoji = '?';
        if (result.status === 'Live') {
          statusEmoji = '✓';
        } else if (result.status === 'Removed') {
          statusEmoji = '✗';
        } else if (result.status === 'Not Found') {
          statusEmoji = '⚠';
        }
        
        console.log(`  Status: ${statusEmoji} ${result.status}`);
        console.log(`  Comments: ${result.commentCount}`);
        console.log(`  Collapsed: ${result.collapsedCount}`);
        
        // Update Airtable
        await updateRecordCheckerFields(
          record.id,
          result.status,
          result.commentCount,
          result.collapsedCount
        );
        
        successCount++;
        
        // Add a small delay between requests to avoid rate limiting
        if (i < records.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.log(`  ✗ Failed to check/update: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorCount++;
      }
    }

    // Summary
    console.log('\n========================');
    console.log('📊 Summary');
    console.log('========================');
    console.log(`Total records: ${records.length}`);
    console.log(`Successfully checked: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the main function
main();

