/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CurrentQueue {
  id: string; // usually UUID or integer
  nomor_sekarang: number;
  nomor_sebelumnya: number;
  total_antrian: number;
  status: string; // e.g., "Menuju Meja Verifikasi"
  updated_at: string;
}

export interface QueueLog {
  id: string;
  nomor: number;
  action: string; // e.g. "PANGGIL", "LEWAT", "RESET", "INPUT_MANUAL"
  created_at: string;
}

export interface AppState {
  currentQueue: CurrentQueue;
  logs: QueueLog[];
  isSubscribed: boolean;
  connectionType: 'supabase' | 'local';
}
