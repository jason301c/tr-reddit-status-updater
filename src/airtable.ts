import axios from 'axios';
import { config } from './config';
import { AirtableRecord } from './types';

const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

/**
 * Get all records from the Airtable table with Post Links
 */
export async function getRecordsWithPostLinks(): Promise<AirtableRecord[]> {
  try {
    const url = `${AIRTABLE_API_BASE}/${config.airtable.baseId}/${config.airtable.tableId}`;
    
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${config.airtable.token}`,
      },
      params: {
        filterByFormula: 'NOT({Post Link (completed)} = "")',
        maxRecords: config.maxRecordsToCheck > 0 ? config.maxRecordsToCheck : undefined,
      },
    });

    return response.data.records as AirtableRecord[];
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

