import axios from 'axios';
import { config } from './config';
import { AirtableRecord } from './types';

const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

/**
 * Get all records from the Airtable table with Post Links
 */
export async function getAllRecords(): Promise<AirtableRecord[]> {
  try {
    const url = `${AIRTABLE_API_BASE}/${config.airtable.baseId}/${config.airtable.tableId}`;
    const allRecords: AirtableRecord[] = [];
    let offset: string | undefined;

    // Paginate through all records
    do {
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${config.airtable.token}`,
        },
        params: {
          offset,
        },
      });

      allRecords.push(...(response.data.records as AirtableRecord[]));
      offset = response.data.offset;
    } while (offset);

    return allRecords;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Airtable API Error:', error.response?.data || error.message);
    } else {
      console.error('Error fetching records:', error);
    }
    throw error;
  }
}

/**
 * Filter records to only those that need checking (stale records with valid post links)
 */
export function filterStaleRecords(records: AirtableRecord[]): AirtableRecord[] {
  const now = new Date();
  
  return records.filter(record => {
    const fields = record.fields;
    
    // Must have a valid post link
    if (!fields['Post Link (completed)']) {
      return false;
    }
    
    const status = fields['Post Status (Checker)'];
    const lastChecked = fields['Last Checked (Checker)'];
    
    // If never checked, it's stale
    if (!lastChecked) {
      return true;
    }
    
    const lastCheckedDate = new Date(lastChecked);
    const hoursSinceCheck = (now.getTime() - lastCheckedDate.getTime()) / (1000 * 60 * 60);
    
    // Removed posts are never stale (unless configured to recheck)
    if (status === 'Removed' && !config.staleness.recheckRemoved) {
      return false;
    }
    
    // Live posts are stale after configured hours (default 12)
    if (status === 'Live') {
      return hoursSinceCheck >= config.staleness.liveStaleAfterHours;
    }
    
    // Not Found posts are stale after configured hours (default 24)
    if (status === 'Not Found') {
      return hoursSinceCheck >= config.staleness.notFoundStaleAfterHours;
    }
    
    // If no status set yet, it's stale
    return true;
  });
}

/**
 * Update a record in Airtable with checker results
 */
export async function updateRecordCheckerFields(
  recordId: string,
  status: 'Not Found' | 'Removed' | 'Live',
  commentCount: number,
  collapsedCount: number
): Promise<void> {
  try {
    const url = `${AIRTABLE_API_BASE}/${config.airtable.baseId}/${config.airtable.tableId}/${recordId}`;
    
    const updateData = {
      fields: {
        'Post Status (Checker)': status,
        'Comment Amount (Checker)': commentCount,
        'Collapsed Comment Amount (Checker)': collapsedCount,
        'Last Checked (Checker)': new Date().toISOString(),
      },
    };

    await axios.patch(url, updateData, {
      headers: {
        Authorization: `Bearer ${config.airtable.token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`✓ Updated record ${recordId}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Airtable Update Error:', error.response?.data || error.message);
    } else {
      console.error('Error updating record:', error);
    }
    throw error;
  }
}

