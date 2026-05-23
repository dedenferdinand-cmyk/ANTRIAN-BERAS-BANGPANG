/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

interface SupabaseConfig {
  url: string;
  key: string;
  source: 'env' | 'custom' | 'none';
}

export function getSupabaseCredentials(): SupabaseConfig {
  // Read from Vite environment variables
  const envUrl = ((import.meta as any).env?.VITE_SUPABASE_URL as string) || '';
  const envKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || '';
  
  // Read from localStorage (for dynamic setup directly in UI)
  const customUrl = localStorage.getItem('bulog_supabase_url') || '';
  const customKey = localStorage.getItem('bulog_supabase_anon_key') || '';
  
  if (customUrl && customKey) {
    return {
      url: customUrl,
      key: customKey,
      source: 'custom',
    };
  }
  
  if (envUrl && envKey) {
    return {
      url: envUrl,
      key: envKey,
      source: 'env',
    };
  }
  
  return {
    url: '',
    key: '',
    source: 'none',
  };
}

export function initSupabaseClient() {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) {
    return null;
  }
  try {
    // Basic verification of URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('Supabase URL must start with http:// or https://');
    }
    return createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        }
      }
    });
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    return null;
  }
}
