/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Tv, 
  UserCog, 
  Volume2, 
  VolumeX, 
  Wifi, 
  WifiOff, 
  Clock, 
  RotateCcw, 
  SkipForward, 
  ArrowRight, 
  KeyRound, 
  Settings, 
  Database, 
  Lock, 
  ChevronRight, 
  Sparkles, 
  Menu,
  X,
  HelpCircle,
  FileCheck2,
  ListRestart,
  Minimize2,
  Maximize2,
  Monitor,
  Copy,
  Megaphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { initSupabaseClient, getSupabaseCredentials } from './supabaseClient';
import { CurrentQueue, QueueLog } from './types';

// Standard fallback values
const DEFAULT_TOTAL_ANTRIAN = 1138;
const DEFAULT_ADMIN_PASSWORD = 'wargaluyubisa';

// Global registry of played announcement IDs to prevent double/continuous looping on same/other sync tabs
const processedAnnouncementIds = new Set<string>();

// Pre-defined Announcement presets for operator
const ANNOUNCEMENT_PRESETS = [
  {
    id: 'syarat_ambil',
    title: 'Persyaratan Pengambilan Bantuan',
    icon: '📢',
    text: 'Mohon perhatian, berikut adalah informasi mengenai persyaratan pengambilan bantuan pangan desa. Pertama, jika diwakilkan oleh anggota keluarga yang berada dalam satu Kartu Keluarga, berkas yang harus dibawa adalah: KTP asli dan fotokopi penerima, KTP asli dan fotokopi yang mewakili, serta fotokopi Kartu Keluarga. Kedua, jika diwakilkan oleh orang lain yang berbeda Kartu Keluarga, berkas yang harus dibawa adalah: KTP asli dan fotokopi penerima, fotokopi Kartu Keluarga penerima, KTP asli dan fotokopi yang mewakili, serta fotokopi Kartu Keluarga yang mewakili. Harap siapkan seluruh dokumen tersebut untuk mempermudah proses verifikasi petugas panitia. Terima kasih.',
    desc: 'Syarat dokumen perwakilan satu KK atau perwakilan beda KK.'
  },
  {
    id: 'bebas_pintu',
    title: 'Akses Pintu Keluar Masuk Aula',
    icon: '🚪',
    text: 'Dihimbau kepada seluruh bapak, ibu, dan warga penerima manfaat. Demi kenyamanan, ketertiban, dan kelancaran bersama, dimohon untuk tidak berdiri, berkumpul, atau menghalangi jalan di depan pintu masuk dan pintu keluar aula balai desa. Untuk bapak dan ibu yang telah menyelesaikan verifikasi atau sedang memindahkan beras bantuan Bulog, mohon dapat lewat dengan aman, dan berikan jalan yang lapang bagi warga lain yang berlalu-lalang serta petugas pelaksana. Kerjasama Anda sangat dihargai agar acara berjalan dengan baik dan lancar. Terima kasih.',
    desc: 'Mengingatkan warga agar tidak berkerumun menghalangi pintu keluar-masuk.'
  },
  {
    id: 'tertib',
    title: 'Himbauan Tertib Antrian',
    icon: '🗣️',
    text: 'Mohon perhatian kepada seluruh Keluarga Penerima Manfaat bantuan pangan desa. Untuk menjaga kelancaran dan ketertiban bersama selama kegiatan penyaluran beras ini berlangsung, dimohon bapak, ibu, dan seluruh hadirin agar tetap berada di area antrian utama dengan tertib, menjaga jarak, serta bersabar menunggu panggilan nomor antrian Anda. Harap tidak saling berdesakan. Atas kesabaran dan kerjasamanya kami ucapkan banyak terima kasih.',
    desc: 'Himbauan warga agar rapi, berbaris tertib, dan tidak berdesakan.'
  },
  {
    id: 'berkas',
    title: 'Persiapan Berkas Administrasi',
    icon: '📄',
    text: 'Kepada seluruh Keluarga Penerima Manfaat yang memegang nomor antrian berikutnya, dimohon bantuan untuk segera mempersiapkan berkas dokumen administrasi pendukung Anda sekarang. Berkas yang diperlukan meliputi: Kartu Tanda Penduduk asli, Kartu Keluarga asli, serta Surat Undangan resmi penerimaan bantuan pangan dari desa. Mohon pastikan dokumen Anda sudah lengkap demi mempercepat proses verifikasi di meja petugas kami. Terima kasih.',
    desc: 'Mengingatkan warga menyiapkan KTP, KK, dan surat undangan.'
  },
  {
    id: 'cek_beras',
    title: 'Pengecekan Kondisi Beras',
    icon: '🌾',
    text: 'Himbauan ramah bagi bapak dan ibu penerima manfaat yang telah selesai diverifikasi dan menerima karung beras bantuan pangan Bulog sebesar sepuluh kilogram. Sebelum Anda meninggalkan area aula desa, dimohon untuk memeriksa kembali kondisi fisik karung beras Anda serta kualitas beras di dalamnya secara teliti. Jika ada kendala fisik atau kualitas yang kurang baik, harap segera melaporkannya kepada panitia petugas di lokasi agar dapat dibantu lebih lanjut sebelum Anda pulang. Terima kasih.',
    desc: 'Himbauan memeriksa kondisi fisik karung & kualitas beras.'
  },
  {
    id: 'istirahat',
    title: 'Istirahat / Jeda Layanan',
    icon: '☕',
    text: 'Pengumuman penting bagi seluruh peserta antrian bantuan pangan Desa Wargaluyu. Demi menjaga stamina petugas, pelayanan verifikasi pembagian beras bantuan pangan akan dinonaktifkan sementara untuk jeda istirahat petugas selama kurang lebih lima belas menit ke depan. Layanan verifikasi antrian akan segera kami buka kembali secara normal setelah masa istirahat selesai. Kami memohon maaf atas ketidaknyamanan bapak ibu, dan terima kasih atas kesediaannya menunggu.',
    desc: 'Pengumuman jeda istirahat verifikasi bantuan selama 15 menit.'
  }
];

// Web Audio API Ding-Dong synthesiser
const playChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // First Chime - High Note
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // Second Chime - Harmonious lower note, slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.18); // E5
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.25, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.7);

    osc2.start(now + 0.18);
    osc2.stop(now + 1.0);
  } catch (err) {
    console.error('Gagal memputar bunyi chime:', err);
  }
};

// Web Audio API Airport Chime Synthesizer - Realistic high-end 4-tone chime progression (F-Major Arpeggio)
const playAirportChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonious airport arpeggio: F4 (349Hz) -> A4 (440Hz) -> C5 (523Hz) -> F5 (698Hz)
    const tones = [
      { freq: 349.23, delay: 0.0, duration: 1.5, vol: 0.18 },
      { freq: 440.00, delay: 0.22, duration: 1.5, vol: 0.18 },
      { freq: 523.25, delay: 0.44, duration: 1.5, vol: 0.20 },
      { freq: 698.46, delay: 0.66, duration: 2.0, vol: 0.22 }
    ];

    tones.forEach((tone) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(tone.freq, now + tone.delay);
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.setValueAtTime(0, now + tone.delay);
      gainNode.gain.linearRampToValueAtTime(tone.vol, now + tone.delay + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + tone.delay + tone.duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(now + tone.delay);
      osc.stop(now + tone.delay + tone.duration);
    });
  } catch (err) {
    console.error('Gagal memutar bunyi chime bandara:', err);
  }
};

// Kabupaten Bandung professional SVG shield representation - Real Coat of Arms replica
const SvgKabupatenBandung = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 120 145" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Shield Outer Shadow & Border */}
    <path 
      d="M 15,10 H 105 V 65 C 105,100 60,123 60,123 C 60,123 15,100 15,65 Z" 
      fill="#FFEB3B" 
      stroke="#1E1E1E" 
      strokeWidth="3.5" 
      strokeLinejoin="round"
    />
    
    {/* Shield Content clipped to form the shield bounds */}
    <g clipPath="url(#bandung-shield-clip)">
      <clipPath id="bandung-shield-clip">
        <path d="M 15,10 H 105 V 65 C 105,100 60,123 60,123 C 60,123 15,100 15,65 Z" />
      </clipPath>
      
      {/* 1. Yellow Background everywhere initially */}
      <rect x="0" y="0" width="120" height="140" fill="#FFEB3B" />
      
      {/* 2. Red Left Area */}
      {/* Red bottom left quadrant bounded by diagonal and vertical center split */}
      <path d="M 15,10 L 60,56 L 60,123 C 60,123 15,100 15,65 Z" fill="#D32F2F" />

      {/* 3. Blue Waves Right Area */}
      {/* Bounded by vertical split from x=60, y=56 to bottom point, and diagonal to edge */}
      <path d="M 60,56 L 105,101 V 65 C 105,100 60,123 60,123 Z" fill="#0288D1" />
      
      {/* White waves in Blue section */}
      <path d="M 60,65 C 70,61 80,71 90,65 C 100,59 105,65 105,65" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 60,77 C 70,73 80,83 90,77 C 100,71 105,77 105,77" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 60,89 C 70,85 80,95 90,89 C 100,83 105,89 105,89" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 60,101 C 70,97 80,107 90,101 C 100,95 105,101 105,101" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 60,113 C 70,109 80,119 90,113 C 95,109 100,113 100,113" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />

      {/* 4. Green mountain trapezoid in yellow section */}
      <polygon points="72,25 92,25 98,34 66,34" fill="#2E7D32" stroke="#1E1E1E" strokeWidth="1" />

      {/* 5. Symmetrical Green Leaf branch in Red section (Tea leaves) */}
      {/* Vertical green stem */}
      <line x1="36" y1="52" x2="36" y2="108" stroke="#2E7D32" strokeWidth="3" strokeLinecap="round" />
      {/* Symmetrical leaves */}
      {/* Top Leaf */}
      <path d="M 36,44 Q 32,49 36,54 Q 40,49 36,44" fill="#2E7D32" stroke="#1B5E20" strokeWidth="1" />
      {/* Pair 1 at y=58 */}
      <path d="M 36,58 Q 28,55 30,62 Q 34,60 36,58" fill="#2E7D32" stroke="#1B5E20" strokeWidth="1" />
      <path d="M 36,58 Q 44,55 42,62 Q 38,60 36,58" fill="#2E7D32" stroke="#1B5E20" strokeWidth="1" />
      {/* Pair 2 at y=70 */}
      <path d="M 36,70 Q 24,66 26,74 Q 32,72 36,70" fill="#2E7D32" stroke="#1B5E20" strokeWidth="1" />
      <path d="M 36,70 Q 48,66 46,74 Q 40,72 36,70" fill="#2E7D32" stroke="#1B5E20" strokeWidth="1" />
      {/* Pair 3 at y=82 */}
      <path d="M 36,82 Q 22,78 24,86 Q 30,84 36,82" fill="#2E7D32" stroke="#1B5E20" strokeWidth="1" />
      <path d="M 36,82 Q 50,78 48,86 Q 42,84 36,82" fill="#2E7D32" stroke="#1B5E20" strokeWidth="1" />
      {/* Pair 4 at y=94 */}
      <path d="M 36,94 Q 24,90 26,98 Q 32,96 36,94" fill="#2E7D32" stroke="#1B5E20" strokeWidth="1" />
      <path d="M 36,94 Q 48,90 46,98 Q 40,96 36,94" fill="#2E7D32" stroke="#1B5E20" strokeWidth="1" />
      
      {/* 6. Stepped Black Diagonal Line (Castle wall effect separating Top-Yellow and bottom) */}
      <line x1="15" y1="10" x2="105" y2="101" stroke="#000000" strokeWidth="4.5" strokeLinecap="square" />
      {/* Battlements along the diagonal using a parallel dashed line */}
      <line x1="18.5" y1="6.5" x2="108.5" y2="97.5" stroke="#000000" strokeWidth="5.5" strokeDasharray="6 7" strokeLinecap="square" />
    </g>

    {/* Yellow Ribbon Banner with Motto */}
    {/* Fold Left shadow/tail */}
    <path d="M 15,124 L 5,120 L 9,128 L 5,136 L 15,132 Z" fill="#FBC02D" stroke="#000000" strokeWidth="1.2" strokeLinejoin="round" />
    {/* Fold Right shadow/tail */}
    <path d="M 105,124 L 115,120 L 111,128 L 115,136 L 105,132 Z" fill="#FBC02D" stroke="#000000" strokeWidth="1.2" strokeLinejoin="round" />
    {/* Main central banner rectangle */}
    <rect x="12" y="123" width="96" height="15" fill="#FFEB3B" stroke="#000000" strokeWidth="1.5" strokeLinejoin="round" />
    {/* Motto ribbon text */}
    <text 
      x="60" 
      y="133" 
      fill="#000000" 
      fontSize="5.8" 
      fontWeight="900" 
      textAnchor="middle" 
      fontFamily="'Space Grotesk', 'Inter', sans-serif" 
      letterSpacing="0"
    >
      REPEH RAPIH KERTA RAHARJA
    </text>
  </svg>
);

// Bulog digital official SVG brand representation - Cheerful Bantuan Pangan Rice Sack Mascot
const SvgBulogLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 120 125" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Shadow beneath mascot */}
    <ellipse cx="60" cy="115" rx="30" ry="6" fill="#000000" fillOpacity="0.12" />

    {/* Mascot Boots / Legs */}
    {/* Left Leg (Mascot's Right, our Left) */}
    <path d="M 45,95 L 40,110 L 28,110 C 26,105 28,95 35,93 Z" fill="#F57C00" stroke="#1E1E1E" strokeWidth="1.8" />
    <path d="M 38,105 C 38,105 44,103 45,108" stroke="#1E1E1E" strokeWidth="1.5" />
    {/* Right Leg (Mascot's Left, our Right) */}
    <path d="M 75,95 L 80,110 L 92,110 C 94,105 92,95 85,93 Z" fill="#F57C00" stroke="#1E1E1E" strokeWidth="1.8" />
    <path d="M 82,105 C 82,105 76,103 75,108" stroke="#1E1E1E" strokeWidth="1.5" />

    {/* Rice Sack Body - Rounded organic sack container */}
    <path 
      d="M 32,25 Q 60,22 88,25 C 89,50 93,82 86,100 Q 60,103 34,100 C 27,82 31,50 32,25 Z" 
      fill="#F9F8F6" 
      stroke="#1E1E1E" 
      strokeWidth="2.5" 
      strokeLinejoin="round" 
    />

    {/* Blue top seal opening of the Rice Sack */}
    <path 
      d="M 30,25 C 30,25 45,20 60,21 C 75,20 90,25 90,25 C 90,25 92,20 85,17 C 72,15 48,15 35,17 C 28,20 30,25 30,25 Z" 
      fill="#0B3C9B" 
      stroke="#1E1E1E" 
      strokeWidth="2" 
    />

    {/* Cute Big Cartoon Eyes */}
    {/* Eye Left */}
    <ellipse cx="48" cy="48" rx="7" ry="10" fill="#FFFFFF" stroke="#000000" strokeWidth="2" />
    <ellipse cx="49" cy="49" rx="3" ry="4" fill="#000000" />
    <circle cx="48.5" cy="47" r="1" fill="#FFFFFF" />
    {/* Eye Right */}
    <ellipse cx="72" cy="48" rx="7" ry="10" fill="#FFFFFF" stroke="#000000" strokeWidth="2" />
    <ellipse cx="71" cy="49" rx="3" ry="4" fill="#000000" />
    <circle cx="70.5" cy="47" r="1" fill="#FFFFFF" />

    {/* Sweet happy eyebrows */}
    <path d="M 40,36 Q 48,34 52,39" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <path d="M 80,36 Q 72,34 68,39" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" fill="none" />

    {/* Warm happy orange-pink cheeks */}
    <ellipse cx="38" cy="58" rx="4" ry="2.5" fill="#FF8A65" />
    <ellipse cx="82" cy="58" rx="4" ry="2.5" fill="#FF8A65" />

    {/* Giant Friendly Smiling Mouth */}
    <path d="M 46,59 C 46,59 50,73 60,73 C 70,73 74,59 74,59 Z" fill="#1E1E1E" stroke="#1E1E1E" strokeWidth="1.5" />
    <path d="M 50,67 C 54,67 56,72 60,72 C 64,72 66,67 70,67 C 68,72 62,73 60,73 C 58,73 52,72 50,67 Z" fill="#E53935" />

    {/* Printed Bulog leaf ribbon logo inside the center/chest of the sack */}
    <g transform="translate(54, 76) scale(0.6)">
      {/* Golden grain leaf path */}
      <path d="M 10,2 C 15,2 18,10 10,18 C 2,10 5,2 10,2 Z" fill="#FFC107" />
      {/* Blue wavy water ribbon line representing BULOG */}
      <path d="M 2,12 Q 10,6 18,12 T 22,20" stroke="#0B3C9B" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>

    {/* Decorative Batik belt/wrapping on the lower parts of the sack */}
    <path 
      d="M 33.5,82 Q 60,86 86.5,82 L 85.5,91 Q 60,95 34.5,91 Z" 
      fill="#0B3C9B" 
      stroke="#1E1E1E" 
      strokeWidth="1.5" 
    />
    {/* Gold rice grain patterns on batik wrap */}
    <path d="M 38,87 L 41,84 M 44,88 L 41,84" stroke="#FFD54F" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M 50,88 L 53,85 M 56,89 L 53,85" stroke="#FFD54F" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M 62,88 L 65,85 M 68,89 L 65,85" stroke="#FFD54F" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M 74,87 L 77,84 M 80,88 L 77,84" stroke="#FFD54F" strokeWidth="1.5" strokeLinecap="round" />

    {/* OK gesture Left Hand (Mascot's Right, our Left) */}
    <path 
      d="M 31,52 C 26,50 18,52 18,60 C 18,65 24,67 28,63" 
      fill="#FFFFFF" 
      stroke="#1E1E1E" 
      strokeWidth="1.8" 
      strokeLinejoin="round" 
    />
    <path d="M 20,53 C 16,55 18,61 22,58" stroke="#1E1E1E" strokeWidth="1.5" fill="none" />
    <path d="M 22,50 C 20,52 22,57 24,54" stroke="#1E1E1E" strokeWidth="1.5" fill="none" />

    {/* Right Hand carrying a beautiful Bowl of Rice grains */}
    {/* Hand arm segment */}
    <path d="M 87,55 Q 96,58 98,66" stroke="#1E1E1E" strokeWidth="1.8" fill="none" />
    {/* Rice Bowl (clay brown) */}
    <path d="M 92,62 L 112,62 C 114,72 108,76 102,76 C 96,76 90,72 92,62 Z" fill="#8D6E63" stroke="#1E1E1E" strokeWidth="1.8" strokeLinejoin="round" />
    {/* Bowl rim detail */}
    <ellipse cx="102" cy="62" rx="10" ry="2" fill="#A1887F" stroke="#1E1E1E" strokeWidth="1.5" />
    {/* Fluffy white Rice heap overflowing */}
    <path d="M 94,62 Q 102,51 110,62 Z" fill="#FFFFFF" stroke="#1E1E1E" strokeWidth="1.5" />
    {/* Grains specks details on rice mound */}
    <circle cx="100.5" cy="58" r="0.6" fill="#B0BEC5" />
    <circle cx="104.5" cy="57" r="0.6" fill="#B0BEC5" />
    <circle cx="98.5" cy="60" r="0.6" fill="#B0BEC5" />
    <circle cx="102.5" cy="59" r="0.6" fill="#B0BEC5" />

    {/* Small brand text below mascot/sack */}
    <text x="60" y="123" fill="#0B3C9B" fontSize="6.5" fontWeight="black" textAnchor="middle" fontFamily="sans-serif" letterSpacing="0.2">BANTUAN PANGAN</text>
  </svg>
);

// Indonesian TTS Narrator Voice engine - General purpose speaking helper
const speakText = (text: string, cancelCurrent: boolean = true) => {
  if (!('speechSynthesis' in window)) return;
  try {
    if (cancelCurrent) {
      window.speechSynthesis.cancel(); // Stop any pending spoken texts immediately
      window.dispatchEvent(new CustomEvent('bulog_announcement_end'));
    }
    
    // Clean emojis and decorative elements from synthesized text so TTS engine speaks it correctly
    const cleanSpeechText = text
      .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '') // strip emojis
      .replace(/✅|📢/g, '')
      .replace(/\*/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
    utterance.lang = 'id-ID';
    
    // Read live preferences from localStorage so it respects settings instantly
    const savedVoiceName = localStorage.getItem('bulog_selected_voice') || '';
    const savedPitch = parseFloat(localStorage.getItem('bulog_voice_pitch') || '1.15');
    const savedRate = parseFloat(localStorage.getItem('bulog_voice_rate') || '0.85');
    
    utterance.rate = savedRate;
    utterance.pitch = savedPitch;
    
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = voices.find(v => v.name === savedVoiceName);
    
    // Broad list of female voice keywords in any language to guarantee female voice
    const femaleKeywords = [
      'female', 'perempuan', 'gadis', 'savitri', 'zira', 'siti', 'indiana', 
      'damayanti', 'sri', 'melati', 'yasmin', 'girl', 'woman', 'microsoft zira', 
      'google us english', 'hazel', 'heera', 'haruka', 'huihui', 'elsa', 
      'karen', 'moira', 'tessa', 'veena', 'victoria', 'soft', 'lh', 'en-us'
    ];

    // Try to find Indonesian female voice first if no custom selected voice works
    if (!selectedVoice) {
      selectedVoice = voices.find(v => {
        const isIndo = v.lang.toLowerCase().includes('id-') || v.lang.toLowerCase().includes('id_');
        const name = v.name.toLowerCase();
        return isIndo && femaleKeywords.some(kw => name.includes(kw));
      });
    }

    // Fallback 1: Indonesian voice (broadly)
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.toLowerCase().includes('id-') || v.lang.toLowerCase().includes('id_'));
    }

    // Fallback 2: Any Female voice in the system (e.g. English female)
    if (!selectedVoice) {
      selectedVoice = voices.find(v => {
        const name = v.name.toLowerCase();
        return femaleKeywords.some(kw => name.includes(kw));
      });
    }

    // Apply voice
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      
      // If we are using the fallback voice and it is not a female, bump pitch to sounding female
      const voiceName = selectedVoice.name.toLowerCase();
      const isActuallyFemale = femaleKeywords.some(kw => voiceName.includes(kw));
      if (!isActuallyFemale && !savedPitch) {
        utterance.pitch = 1.35; // Bump pitch to sound female on default male voices
      }
    }

    // Hook events to sync the AI Presenter avatar in real-time
    utterance.onstart = () => {
      window.dispatchEvent(new CustomEvent('bulog_announcement_start', { detail: { text } }));
    };
    utterance.onend = () => {
      window.dispatchEvent(new CustomEvent('bulog_announcement_end'));
    };
    utterance.onerror = () => {
      window.dispatchEvent(new CustomEvent('bulog_announcement_end'));
    };

    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error('Gagal memproses pengumuman suara:', error);
    window.dispatchEvent(new CustomEvent('bulog_announcement_end'));
  }
};

// Play immersive airport chime first, then read announcement with brief classic delay
const speakTextWithChime = (text: string) => {
  if (!('speechSynthesis' in window)) return;
  try {
    // Stop any currently running speech
    window.speechSynthesis.cancel();
    window.dispatchEvent(new CustomEvent('bulog_announcement_end'));
    
    // Play the magnificent four-tone airport paging bell chime
    playAirportChime();
    
    // Delay speech to let the beautiful bell ring out and decay, sounding exactly like a real airport announcement
    setTimeout(() => {
      speakText(text, false); // Cancel false as we just did it
    }, 1300);
  } catch (err) {
    console.error('Gagal memutar pengumuman ber-chime:', err);
    speakText(text, true);
  }
};

// Indonesian TTS Narrator Voice announcement - Uses speakText
const speakIndonesian = (number: number) => {
  speakText(`Nomor antrian ${number}. Silakan menuju meja verifikasi.`);
};

// AI Virtual Presenter component that shows a beautiful Indonesian female digital announcer speaking in real-time
const AiPresenterVideoFeed = ({ text, isPlaying }: { text: string; isPlaying: boolean }) => {
  return (
    <AnimatePresence>
      {isPlaying && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          className="fixed bottom-24 right-8 z-[200] w-full max-w-sm rounded-[2.5rem] border-4 border-amber-400 bg-slate-900/95 p-6 shadow-[0_0_50px_rgba(251,191,36,0.4)] text-white overflow-hidden backdrop-blur-md"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-4">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="text-[10px] sm:text-xs font-display font-black tracking-widest text-slate-300 uppercase">
                SIARAN LANGSUNG AI PRESENTER
              </span>
            </div>
            <span className="bg-amber-400/10 text-amber-400 text-[10px] font-black px-2.5 py-0.5 rounded-full select-none">
              SRI (SISTEM REALTIME INDONESIA)
            </span>
          </div>

          <div className="flex flex-col items-center space-y-4">
            {/* Visual Portrait Container */}
            <div className="relative w-44 h-44 rounded-full overflow-hidden border-4 border-emerald-500/80 shadow-[0_0_25px_rgba(16,185,129,0.4)] bg-slate-950">
              {/* Pulsing ring waves around the portrait to represent speech audio waves */}
              <div className="absolute inset-x-0 bottom-0 top-0 rounded-full animate-ping border border-emerald-500/20 pointer-events-none scale-105"></div>
              
              {/* Generated image of beautiful female announcer */}
              <img
                src="/src/assets/images/ai_presenter_avatar_1779724325849.png"
                alt="AI Presenter Sri"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-all duration-300 scale-105 animate-pulse"
              />

              {/* Live soundwave overlay effect */}
              {isPlaying && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-end space-x-1 px-3 py-1 rounded-full bg-slate-900/95 border border-slate-800 shadow-lg scale-90">
                  <div className="w-1 bg-emerald-400 rounded-full h-3 animate-pulse"></div>
                  <div className="w-1 bg-emerald-400 rounded-full h-5 animate-pulse" style={{ animationDelay: '0.15s' }}></div>
                  <div className="w-1 bg-emerald-400 rounded-full h-4 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <div className="w-1 bg-emerald-400 rounded-full h-2 animate-pulse" style={{ animationDelay: '0.45s' }}></div>
                </div>
              )}
            </div>

            {/* Speaking subtitles textbox */}
            <div className="w-full text-center bg-slate-950/80 border border-slate-800/60 p-3.5 rounded-2xl">
              <span className="block text-[8px] font-black text-slate-500 tracking-widest uppercase mb-1 font-mono">
                TEKS BANTUAN SUARA SEKARANG
              </span>
              <p className="text-[11px] leading-relaxed text-slate-200 line-clamp-3 select-none italic font-sans font-medium">
                "{text || 'Memproses berkas antrian KPM...'}"
              </p>
            </div>
            
            <div className="flex items-center space-x-1.5 text-[9px] text-slate-500 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              <span>Teknologi Sintesis Audio Pemerintahan Desa AI</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  // Navigation Path Setup
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  
  // App-level Modes & Audio Unlocking Gesture
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(
    localStorage.getItem('bulog_audio_unlocked') === 'true'
  );
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const [isTvFullscreen, setIsTvFullscreen] = useState<boolean>(false);
  
  // States to track active speech announcement and toggle the AI Voice Presenter in real-time
  const [isPlayingAnnouncement, setIsPlayingAnnouncement] = useState<boolean>(false);
  const [currentAnnouncementText, setCurrentAnnouncementText] = useState<string>('');

  useEffect(() => {
    const handleStart = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsPlayingAnnouncement(true);
      setCurrentAnnouncementText(customEvent.detail?.text || '');
    };
    const handleEnd = () => {
      setIsPlayingAnnouncement(false);
      setCurrentAnnouncementText('');
    };

    window.addEventListener('bulog_announcement_start', handleStart);
    window.addEventListener('bulog_announcement_end', handleEnd);
    return () => {
      window.removeEventListener('bulog_announcement_start', handleStart);
      window.removeEventListener('bulog_announcement_end', handleEnd);
    };
  }, []);
  
  // Custom Voice Preferences State
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => localStorage.getItem('bulog_selected_voice') || '');
  const [voicePitch, setVoicePitch] = useState<number>(() => parseFloat(localStorage.getItem('bulog_voice_pitch') || '1.25'));
  const [voiceRate, setVoiceRate] = useState<number>(() => parseFloat(localStorage.getItem('bulog_voice_rate') || '0.85'));
  
  // Dynamic settings panel
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [tempSupaUrl, setTempSupaUrl] = useState<string>('');
  const [tempSupaKey, setTempSupaKey] = useState<string>('');

  // Primary Queue State
  const [currentQueue, setCurrentQueue] = useState<CurrentQueue>(() => {
    const stored = localStorage.getItem('bulog_queue_state');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (_) {}
    }
    return {
      id: '1',
      nomor_sekarang: 0,
      nomor_sebelumnya: 0,
      total_antrian: DEFAULT_TOTAL_ANTRIAN,
      status: 'Mulai Penyaluran Beras',
      updated_at: new Date().toISOString()
    };
  });

  const [logs, setLogs] = useState<QueueLog[]>(() => {
    const stored = localStorage.getItem('bulog_queue_logs');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (_) {}
    }
    return [];
  });
  const [connectionMode, setConnectionMode] = useState<'supabase' | 'local'>('local');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'local_storage'>('local_storage');
  
  // Visual Flash trigger when number is called
  const [isCallingFlash, setIsCallingFlash] = useState<boolean>(false);
  
  // Track last announced log identifier to prevent duplicate loops
  const lastCallEventRef = useRef<string>('');
  const queueChannelRef = useRef<any>(null);

  // Announcement state editor
  const [customAnnouncementText, setCustomAnnouncementText] = useState<string>('');

  // Auto Synchronize Clock Ref
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Synchronize dynamic URL credentials if scanned from QR Code/Shared Link
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlParam = params.get('supa_url');
      const keyParam = params.get('supa_key');
      if (urlParam && keyParam) {
        let finalUrl = urlParam;
        let finalKey = keyParam;
        try {
          finalUrl = decodeURIComponent(urlParam);
        } catch (_) {}
        try {
          finalKey = decodeURIComponent(keyParam);
        } catch (_) {}

        localStorage.setItem('bulog_supabase_url', finalUrl.trim());
        localStorage.setItem('bulog_supabase_anon_key', finalKey.trim());
        
        // Clear parameters immediately to keep URL pristine
        const cleanedUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanedUrl);
        
        // Force reload and refresh state seamlessly
        alert('✅ Sinkronisasi Berhasil!\n\nPerangkat Handphone & Laptop Anda sekarang telah terhubung ke database online Supabase yang sama secara realtime!');
        window.location.reload();
      }
    }
  }, []);

  // Listen to address changes (SPA routing)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // HTML5 storage event sync (Realtime local sync for dual-tab / extended screen displays on same laptop)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'bulog_queue_state' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setCurrentQueue(parsed);
        } catch (_) {}
      }
      if (e.key === 'bulog_queue_logs') {
        try {
          const parsed = e.newValue ? JSON.parse(e.newValue) : [];
          setLogs(parsed);
        } catch (_) {}
      }
      if (e.key === 'bulog_selected_voice' && e.newValue) {
        setSelectedVoiceName(e.newValue);
      }
      if (e.key === 'bulog_voice_pitch' && e.newValue) {
        setVoicePitch(parseFloat(e.newValue));
      }
      if (e.key === 'bulog_voice_rate' && e.newValue) {
        setVoiceRate(parseFloat(e.newValue));
      }
      if (e.key === 'bulog_audio_unlocked' && e.newValue) {
        setAudioUnlocked(e.newValue === 'true');
      }
      if (e.key === 'bulog_play_announcement' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.action === 'STOP') {
            window.speechSynthesis.cancel();
            window.dispatchEvent(new CustomEvent('bulog_announcement_end'));
          } else if (parsed.text) {
            const announcementId = parsed.id ? String(parsed.id) : '';
            if (announcementId) {
              if (processedAnnouncementIds.has(announcementId)) {
                return; // already processed, do not repeat!
              }
              processedAnnouncementIds.add(announcementId);
            }
            speakTextWithChime(parsed.text);
          }
        } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const navigateTo = (pathUrl: string) => {
    window.history.pushState({}, '', pathUrl);
    setCurrentPath(pathUrl);
  };

  // Live clock scheduler
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Esc key hook for Fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsTvFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Preload speech synthesis voices for synchronous responsiveness
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        
        // Auto-select a high-quality female Indonesian voice as initial default if none selected yet
        if (!localStorage.getItem('bulog_selected_voice') && voices.length > 0) {
          const femaleKeywords = ['female', 'perempuan', 'gadis', 'savitri', 'zira', 'siti', 'indiana', 'damayanti', 'sri', 'melati', 'yasmin', 'girl', 'woman', 'soft'];
          const match = voices.find(v => {
            const isIndo = v.lang.toLowerCase().includes('id-') || v.lang.toLowerCase().includes('id_');
            const name = v.name.toLowerCase();
            return isIndo && femaleKeywords.some(kw => name.includes(kw));
          }) || voices.find(v => v.lang.toLowerCase().includes('id-') || v.lang.toLowerCase().includes('id_'));
          
          if (match) {
            setSelectedVoiceName(match.name);
            localStorage.setItem('bulog_selected_voice', match.name);
          }
        }
      };
      
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Initialize Supabase Connection
  useEffect(() => {
    const creds = getSupabaseCredentials();
    setTempSupaUrl(creds.url);
    setTempSupaKey(creds.key);

    const supabase = initSupabaseClient();
    if (!supabase) {
      // Graceful fallback to pure LocalStorage Backup Mode
      setConnectionMode('local');
      setConnectionStatus('local_storage');
      
      // Seed Initial Local state if needed
      const storedQueue = localStorage.getItem('bulog_queue_state');
      const storedLogs = localStorage.getItem('bulog_queue_logs');
      if (storedQueue) {
        try {
          setCurrentQueue(JSON.parse(storedQueue));
        } catch (_) {}
      }
      if (storedLogs) {
        try {
          setLogs(JSON.parse(storedLogs));
        } catch (_) {}
      }
      return;
    }

    setConnectionMode('supabase');
    setConnectionStatus('reconnecting');

    // 1. Fetch current queue details
    async function fetchDatabaseState() {
      try {
        const { data, error } = await supabase!.from('current_queue').select('*').eq('id', 1).single();
        if (data) {
          setCurrentQueue(data);
          // Sync back to local storage as continuous real-time backup
          localStorage.setItem('bulog_queue_state', JSON.stringify(data));
        } else if (error && error.code === 'PGRST116') {
          // Row missing, attempt basic insert initializer
          const initialRow = {
            id: 1,
            nomor_sekarang: 0,
            nomor_sebelumnya: 0,
            total_antrian: DEFAULT_TOTAL_ANTRIAN,
            status: 'Menuju Meja Verifikasi',
            updated_at: new Date().toISOString()
          };
          await supabase!.from('current_queue').insert(initialRow);
          setCurrentQueue(initialRow);
        }
        
        // Fetch last 500 logs to reconstruct statuses accurately
        const { data: logsData } = await supabase!
          .from('logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);
        if (logsData) {
          setLogs(logsData);
          localStorage.setItem('bulog_queue_logs', JSON.stringify(logsData));
        }
        setConnectionStatus('connected');
      } catch (err) {
        console.error('Error fetching Supabase initialization:', err);
        setConnectionStatus('local_storage');
      }
    }

    fetchDatabaseState();

    // 2. Subscribe to Realtime update stream
    const queueChannel = supabase
      .channel('realtime_queue')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'current_queue', filter: 'id=eq.1' },
        (payload) => {
          const updated = payload.new as CurrentQueue;
          setCurrentQueue(updated);
          localStorage.setItem('bulog_queue_state', JSON.stringify(updated));
          setConnectionStatus('connected');
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'logs' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setLogs([]);
            localStorage.setItem('bulog_queue_logs', '[]');
          } else if (payload.eventType === 'INSERT') {
            const newLog = payload.new as QueueLog;
            setLogs(prev => {
              const updated = [newLog, ...prev.filter(l => l.id !== newLog.id)].slice(0, 500);
              localStorage.setItem('bulog_queue_logs', JSON.stringify(updated));
              return updated;
            });
          }
        }
      )
      .on(
        'broadcast',
        { event: 'announcement' },
        (payload) => {
          const text = payload.payload?.text;
          const announcementId = payload.payload?.id ? String(payload.payload.id) : '';
          if (text) {
            if (announcementId) {
              if (processedAnnouncementIds.has(announcementId)) {
                return; // already processed, do not repeat!
              }
              processedAnnouncementIds.add(announcementId);
            }
            speakTextWithChime(text);
          }
        }
      )
      .on(
        'broadcast',
        { event: 'announcement_stop' },
        () => {
          window.speechSynthesis.cancel();
          window.dispatchEvent(new CustomEvent('bulog_announcement_end'));
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('reconnecting');
        }
      });

    queueChannelRef.current = queueChannel;

    // Auto reconnect timer
    const reconnectInterval = setInterval(() => {
      if (queueChannel.state === 'closed') {
        queueChannel.track({});
      }
    }, 6000);

    // 3. Fallback Polling interval to secure absolute cross-device synchronisation (e.g., if Supabase Realtime/Replication is disabled or blocked)
    const fallbackSyncInterval = setInterval(async () => {
      try {
        const { data: queueData } = await supabase!.from('current_queue').select('*').eq('id', 1).single();
        if (queueData) {
          // Compare fields systematically to prevent redundant state re-renders
          setCurrentQueue(prev => {
            if (
              prev.nomor_sekarang !== queueData.nomor_sekarang || 
              prev.status !== queueData.status || 
              prev.total_antrian !== queueData.total_antrian || 
              prev.updated_at !== queueData.updated_at
            ) {
              localStorage.setItem('bulog_queue_state', JSON.stringify(queueData));
              return queueData;
            }
            return prev;
          });
          setConnectionStatus('connected');
        }
        
        // Poll logs to ensure logs match
        const { data: logsData } = await supabase!
          .from('logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);
        if (logsData) {
          setLogs(prev => {
            if (prev.length !== logsData.length || (prev[0] && logsData[0] && prev[0].id !== logsData[0].id)) {
              localStorage.setItem('bulog_queue_logs', JSON.stringify(logsData));
              return logsData;
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn('Fallback sync failed:', err);
      }
    }, 2000); // Poll every 2 seconds for high response speed

    return () => {
      clearInterval(reconnectInterval);
      clearInterval(fallbackSyncInterval);
      supabase.removeChannel(queueChannel);
      queueChannelRef.current = null;
    };
  }, [tempSupaUrl, tempSupaKey]);

  // Audio Playback Listener — triggers chime & voice whenever `nomor_sekarang` or `updated_at` transforms
  useEffect(() => {
    const queueKey = `${currentQueue.nomor_sekarang}_${currentQueue.updated_at}`;
    
    // Safety lock: Don't speak on original cold load zero, or if event key matches previously spoken track
    if (currentQueue.nomor_sekarang === 0 || lastCallEventRef.current === queueKey) {
      return;
    }
    
    lastCallEventRef.current = queueKey;

    if (audioUnlocked) {
      // Trigger visual flashing notification
      setIsCallingFlash(true);
      const flashTimer = setTimeout(() => setIsCallingFlash(false), 5000); // flash boundary

      // Chime + Delayed speech
      playChime();
      const speakDelay = setTimeout(() => {
        speakIndonesian(currentQueue.nomor_sekarang);
      }, 1200);

      return () => {
        clearTimeout(flashTimer);
        clearTimeout(speakDelay);
      };
    }
  }, [currentQueue.nomor_sekarang, currentQueue.updated_at, audioUnlocked]);

  // Save changes inside local state engine (Acts as write Proxy for fallback or connected DB)
  const executeQueueStateUpdate = async (
    nextNum: number, 
    prevNum: number, 
    statusText: string, 
    logAction: string,
    actionDesc: string,
    customLogs?: { nomor: number; action: string }[]
  ) => {
    const freshTimestamp = new Date().toISOString();
    const updatedModel: CurrentQueue = {
      ...currentQueue,
      nomor_sekarang: nextNum,
      nomor_sebelumnya: prevNum,
      status: statusText,
      updated_at: freshTimestamp
    };

    // Save locale storage backup first
    localStorage.setItem('bulog_queue_state', JSON.stringify(updatedModel));
    setCurrentQueue(updatedModel);

    // Create log record
    const dummyLogId = String(Date.now());
    let logsToCreate: QueueLog[] = [];
    const isReset = logAction === 'RESET';

    if (customLogs && customLogs.length > 0) {
      logsToCreate = customLogs.map((cl, idx) => ({
        id: `${dummyLogId}_${idx}`,
        nomor: cl.nomor,
        action: cl.action,
        created_at: freshTimestamp
      }));
    } else {
      logsToCreate = [
        {
          id: dummyLogId,
          nomor: nextNum,
          action: logAction,
          created_at: freshTimestamp
        }
      ];
    }

    // If it is a RESET action, clear the previous logs history completely (for TV & Laptop sync)
    const newLogsList = isReset ? [] : [...logsToCreate, ...logs].slice(0, 500);
    localStorage.setItem('bulog_queue_logs', JSON.stringify(newLogsList));
    setLogs(newLogsList);

    // Attempt Supabase server synchronisation
    const supabase = initSupabaseClient();
    if (supabase && connectionMode === 'supabase') {
      try {
        const { error: queueErr } = await supabase
          .from('current_queue')
          .update({
            nomor_sekarang: nextNum,
            nomor_sebelumnya: prevNum,
            status: statusText,
            updated_at: freshTimestamp
          })
          .eq('id', 1);

        if (queueErr) throw queueErr;

        if (isReset) {
          // If reset, clear all logs in the database table safely (not using gt(id) for UUID safety)
          await supabase.from('logs').delete().not('action', 'is', null);
        } else {
          // Insert logs to database in parallel if multiple, or sequentially
          for (const logItem of logsToCreate) {
            await supabase.from('logs').insert({
              nomor: logItem.nomor,
              action: logItem.action,
              created_at: freshTimestamp
            });
          }
        }
      } catch (err) {
        console.warn('Gagal sinkronisasi Supabase, fallback aktif:', err);
        setConnectionStatus('reconnecting');
      }
    }
  };

  const handleManualCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('bulog_supabase_url', tempSupaUrl.trim());
    localStorage.setItem('bulog_supabase_anon_key', tempSupaKey.trim());
    setShowConfigModal(false);
    // Reload components to trigger state refresh
    window.location.reload();
  };

  const clearManualCredentials = () => {
    localStorage.removeItem('bulog_supabase_url');
    localStorage.removeItem('bulog_supabase_anon_key');
    setTempSupaUrl('');
    setTempSupaKey('');
    setShowConfigModal(false);
    window.location.reload();
  };

  // Helper date formatters in Indonesian
  const formatIndoDate = (date: Date) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatIndoTime = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} WIB`;
  };

  // Admin state controls
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(
    localStorage.getItem('bulog_admin_logged_in') === 'true'
  );
  const [adminAuthError, setAdminAuthError] = useState<string>('');

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const envPassword = (import.meta as any).env?.VITE_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
    if (adminPasswordInput === envPassword) {
      setIsAdminAuthenticated(true);
      setAdminAuthError('');
      localStorage.setItem('bulog_admin_logged_in', 'true');
    } else {
      setAdminAuthError('Password salah! Silakan hubungi operator desa.');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem('bulog_admin_logged_in');
  };

  // Unlock Browser Sound Gestures
  const handleUnlockAudio = (targetRoute: string) => {
    setAudioUnlocked(true);
    localStorage.setItem('bulog_audio_unlocked', 'true');
    
    // Play warm unlock sound to notify user browser successfully received the gesture
    playChime();
    
    // Send to correct router endpoint
    navigateTo(targetRoute);
  };

  // Core administrative functions
  const handleCallNext = () => {
    const nextVal = currentQueue.nomor_sekarang + 1;
    if (nextVal > currentQueue.total_antrian) {
      alert(`Semua nomor antrian telah selesai dipanggil! (Mencapai batas ${currentQueue.total_antrian})`);
      return;
    }
    executeQueueStateUpdate(
      nextVal,
      currentQueue.nomor_sekarang,
      'Menuju Meja Verifikasi Bantuan',
      'PANGGIL',
      `Memanggil nomor antrian ${nextVal}`
    );
  };

  const handleRecall = () => {
    if (currentQueue.nomor_sekarang <= 0) {
      alert('Tidak ada antrian aktif saat ini.');
      return;
    }
    // Update timestamp only to force TV announcement to retrigger in realtime stream
    executeQueueStateUpdate(
      currentQueue.nomor_sekarang,
      currentQueue.nomor_sebelumnya,
      'Panggilan Ulang - Menuju Meja Verifikasi',
      'ULANG',
      `Memanggil ulang nomor antrian ${currentQueue.nomor_sekarang}`
    );
  };

  const handlePlayAnnouncement = (text: string) => {
    if (!text.trim()) {
      alert('Silakan tulis isi teks pengumuman suara terlebih dahulu!');
      return;
    }
    
    // Generate unique ID for this play instance, log it locally so we ignore duplicate sync reflects
    const announcementId = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7);
    processedAnnouncementIds.add(announcementId);

    // Play locally instantly with beautiful airport chime
    speakTextWithChime(text);

    // Sync via LocalStorage (for same-laptop dual tab sync)
    localStorage.setItem('bulog_play_announcement', JSON.stringify({
      id: announcementId,
      text
    }));

    // Broadcast via Supabase (for cross-device realtime sync)
    if (queueChannelRef.current) {
      queueChannelRef.current.send({
        type: 'broadcast',
        event: 'announcement',
        payload: { id: announcementId, text }
      });
    }
  };

  const handleStopAnnouncement = () => {
    // Cancel locally instantly
    window.speechSynthesis.cancel();

    // Trigger localstorage stop
    localStorage.setItem('bulog_play_announcement', JSON.stringify({
      id: Date.now(),
      text: '',
      action: 'STOP'
    }));

    // Broadcast stop via Supabase
    if (queueChannelRef.current) {
      queueChannelRef.current.send({
        type: 'broadcast',
        event: 'announcement_stop'
      });
    }
  };

  const handleCompleteCurrent = () => {
    const current = currentQueue.nomor_sekarang;
    if (current === 0) {
      alert('Mulai panggil antrian pertama terlebih dahulu.');
      return;
    }
    const nextVal = current + 1;
    if (nextVal > currentQueue.total_antrian) {
      executeQueueStateUpdate(
        current,
        current,
        `KPM Nomor ${current} Selesai Disalurkan`,
        'SELESAI',
        `Menyelesaikan penyaluran untuk nomor ${current}`,
        [{ nomor: current, action: 'SELESAI' }]
      );
      alert(`Antrian Nomor ${current} berhasil disalurkan. Semua nomor antrian telah selesai!`);
      return;
    }
    executeQueueStateUpdate(
      nextVal,
      current,
      `KPM Nomor ${current} Selesai. Memanggil Nomor ${nextVal} Menuju Meja Verifikasi`,
      'PANGGIL',
      `Menyelesaikan nomor ${current}, memanggil nomor ${nextVal}`,
      [
        { nomor: current, action: 'SELESAI' },
        { nomor: nextVal, action: 'PANGGIL' }
      ]
    );
  };

  const handleSkipCurrent = () => {
    const current = currentQueue.nomor_sekarang;
    if (current === 0) {
      alert('Mulai panggil antrian pertama terlebih dahulu.');
      return;
    }
    const nextVal = current + 1;
    if (nextVal > currentQueue.total_antrian) {
      executeQueueStateUpdate(
        current,
        current,
        `Antrian Nomor ${current} Ditandai Tidak Datang`,
        'LEWAT',
        `Melewati nomor ${current}`,
        [{ nomor: current, action: 'LEWAT' }]
      );
      alert(`Antrian Nomor ${current} ditandai tidak datang (melewati). Semua nomor antrian telah selesai!`);
      return;
    }
    executeQueueStateUpdate(
      nextVal,
      current,
      `Nomor ${current} Tidak Datang / Dilewati. Memanggil Nomor ${nextVal} Menuju Meja Verifikasi`,
      'PANGGIL',
      `Melewati nomor ${current}, memanggil nomor ${nextVal}`,
      [
        { nomor: current, action: 'LEWAT' },
        { nomor: nextVal, action: 'PANGGIL' }
      ]
    );
  };

  const handleCallSkipped = (num: number) => {
    executeQueueStateUpdate(
      num,
      currentQueue.nomor_sekarang,
      `Memanggil Kembali Nomor ${num} (Antrian Terlewat)`,
      'PANGGIL',
      `Memanggil kembali nomor antrian terlewat ${num}`
    );
  };

  const handleCustomInputCall = (num: number) => {
    if (num < 1 || num > currentQueue.total_antrian) {
      alert(`Masukkan nomor antrian yang valid (1 - ${currentQueue.total_antrian})`);
      return;
    }
    executeQueueStateUpdate(
      num,
      currentQueue.nomor_sekarang,
      'Menuju Meja Verifikasi Bantuan',
      'INPUT_MANUAL',
      `Memasukkan manual nomor antrian ${num}`
    );
  };

  const handleResetQueue = () => {
    if (confirm('Apakah Anda yakin ingin MERESET ulang seluruh nomor antrian dari awal (0)?')) {
      executeQueueStateUpdate(
        0,
        0,
        'Mulai Penyaluran Beras',
        'RESET',
        'Mereset nomor antrian kembali ke awal'
      );
    }
  };

  const handleTestVoice = () => {
    if (!('speechSynthesis' in window)) {
      alert('Fitur TTS tidak didukung di peramban ini.');
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const text = "Satu. Silakan menuju meja verifikasi bantuan pangan desa Wargaluyu.";
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.pitch = voicePitch;
      utterance.rate = voiceRate;
      
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.name === selectedVoiceName);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateTotalAntrian = (total: number) => {
    if (total < 1) return;
    const freshTimestamp = new Date().toISOString();
    const updated = {
      ...currentQueue,
      total_antrian: total,
      updated_at: freshTimestamp
    };
    setCurrentQueue(updated);
    localStorage.setItem('bulog_queue_state', JSON.stringify(updated));

    const supabase = initSupabaseClient();
    if (supabase && connectionMode === 'supabase') {
      supabase.from('current_queue').update({ total_antrian: total, updated_at: freshTimestamp }).eq('id', 1).then();
    }
  };

  // Compute individual KPM statuses from log history
  const kpmStatuses = useMemo(() => {
    const statuses: Record<number, 'SELESAI' | 'LEWAT' | 'PANGGIL'> = {};
    
    // Sort logs chronologically to reconstruct state step-by-step
    const chronologicalLogs = [...logs].reverse();
    for (const log of chronologicalLogs) {
      if (log.action === 'SELESAI') {
        statuses[log.nomor] = 'SELESAI';
      } else if (log.action === 'LEWAT' || log.action === 'ABSEN' || log.action === 'TIDAK_DATANG') {
        statuses[log.nomor] = 'LEWAT';
      } else if (log.action === 'PANGGIL' || log.action === 'INPUT_MANUAL' || log.action === 'ULANG') {
        if (statuses[log.nomor] !== 'SELESAI') {
          statuses[log.nomor] = 'PANGGIL';
        }
      } else if (log.action === 'RESET') {
        for (const key in statuses) {
          delete statuses[key];
        }
      }
    }
    return statuses;
  }, [logs]);

  // Extract a list of all queue numbers that are currently 'LEWAT' (skipped / absent/ belum selesai)
  const skippedNumbers = useMemo(() => {
    const list: number[] = [];
    const maxCalled = Math.max(
      currentQueue.nomor_sekarang,
      ...logs.map(l => l.nomor),
      0
    );
    for (let i = 1; i <= maxCalled; i++) {
      if (kpmStatuses[i] === 'LEWAT') {
        list.push(i);
      }
    }
    return list.sort((a, b) => a - b);
  }, [kpmStatuses, currentQueue.nomor_sekarang, logs]);

  // Extract count of successfully served families
  // Extract count of successfully served families
  const totalCompletedCount = useMemo(() => {
    return Object.values(kpmStatuses).filter(status => status === 'SELESAI').length;
  }, [kpmStatuses]);

  // Calculated Progress parameters (Synced with actual "Selesai" / Completed KPMs)
  const percentProgress = currentQueue.total_antrian > 0 
    ? Math.min(100, Math.round((totalCompletedCount / currentQueue.total_antrian) * 100)) 
    : 0;

  const currentStatusString = currentQueue.status || 'Menuju Meja Verifikasi';

  // Extract list of prior called numbers
  const priorNumbers = logs
    .filter(log => log.action === 'PANGGIL' || log.action === 'INPUT_MANUAL' || log.action === 'LEWAT')
    .map(log => log.nomor)
    .filter((num, index, self) => self.indexOf(num) === index) // Unique values
    .filter(num => num !== currentQueue.nomor_sekarang) // Exclude current number
    .slice(0, 5); // Take top 5

  return (
    <div id="app_root" className={`min-h-screen font-sans transition-colors duration-300 ${themeMode === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* 1. SEED UNLOCKING INTERACTIVE POPUP / SOUND SHIELD */}
      {!audioUnlocked && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white text-slate-900 w-full max-w-xl rounded-2xl shadow-2xl p-6 md:p-8 border-t-8 border-bulog-blue overflow-hidden relative"
          >
            {/* Background design ornaments */}
            <div className="absolute right-0 top-0 w-32 h-32 bg-bulog-yellow/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
            <div className="absolute left-0 bottom-0 w-32 h-32 bg-bulog-blue/10 rounded-full blur-2xl -ml-16 -mb-16"></div>

            <div className="flex justify-center mb-6">
              {/* Dynamic Logo Presentation */}
              <div className="flex items-center space-x-3 bg-slate-50/80 py-2 px-4 rounded-xl border border-slate-150 shadow-inner">
                <SvgBulogLogo className="w-12 h-12 select-none" />
                <div className="w-px h-8 bg-slate-200"></div>
                <SvgKabupatenBandung className="w-12 h-12 select-none" />
              </div>
            </div>

            <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-900 text-center tracking-tight leading-tight">
              SISTEM ANTRIAN PENYALURAN RASTRA
            </h1>
            <p className="text-sm font-medium text-slate-500 text-center mt-1">
              Desa Wargaluyu, Kecamatan Arjasari, Kabupaten Bandung
            </p>

            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 my-6 text-slate-700 text-sm space-y-2">
              <div className="flex items-start space-x-2.5">
                <FileCheck2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <p>
                  Sistem ini menggunakan fitur <strong>Web Speech Synthesis</strong> dan audio bekerjasama secara real-time untuk melakukan panggilan suara dalam Bahasa Indonesia demi kemudahan penyaluran bahan pangan Bulog di Aula Desa.
                </p>
              </div>
              <p className="text-xs text-slate-500 italic pl-7">
                *Browser membutuhkan interaksi aktif pengguna sebelum mengizinkan bunyi audio bekerja secara otomatis.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                id="btn_view_tv"
                onClick={() => handleUnlockAudio('/')}
                className="flex items-center justify-center space-x-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-transform hover:-translate-y-0.5"
              >
                <Tv className="w-5 h-5" />
                <span className="text-left font-sans">
                  <span className="block text-xs font-normal text-blue-200">Buka Layar Utama</span>
                  Layar Display TV
                </span>
              </button>
              
              <button
                id="btn_view_admin"
                onClick={() => handleUnlockAudio('/admin')}
                className="flex items-center justify-center space-x-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-transform hover:-translate-y-0.5"
              >
                <UserCog className="w-5 h-5" />
                <span className="text-left font-sans">
                  <span className="block text-xs font-normal text-emerald-100 font-sans">Kelola Panggilan</span>
                  Panel Petugas (HP)
                </span>
              </button>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
              <span>Pangan Makmur Desa Wargaluyu © 2026</span>
              <div className="flex items-center space-x-1 font-mono bg-slate-100 text-slate-600 py-0.5 px-2 rounded">
                <Clock className="w-3.5 h-3.5 mr-1" />
                <span>12:59 UTC</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* HEADER UTAMA / TOP NAV BAR */}
      <header className={`border-b ${themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} sticky top-0 z-40 px-4 py-3 shadow-xs`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigateTo('/')}>
            {/* Visual Logo */}
            <SvgBulogLogo className="w-11 h-11 select-none shrink-0" />
            <SvgKabupatenBandung className="w-11 h-11 select-none shrink-0" />
            <div>
              <h1 className="text-xs md:text-sm font-display font-bold uppercase tracking-tight text-blue-700 dark:text-blue-400">
                Sistem Antrian Beras Bulog
              </h1>
              <p className="text-[10px] text-slate-500 font-sans dark:text-slate-400">
                Desa Wargaluyu • Kec. Arjasari • KAB. BANDUNG
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Dynamic Realtime Connection Indicators */}
            <div className="hidden sm:flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 py-1 px-2.5 rounded-lg text-xs font-mono">
              {connectionStatus === 'connected' ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold tracking-tight">SUPABASE ONLINE</span>
                </>
              ) : connectionStatus === 'reconnecting' ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium tracking-tight">MENGHUBUNGKAN...</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold tracking-tight">🖥️ SINKRON DUAL-LAYAR LOKAL</span>
                </>
              )}
            </div>

            {/* Quick Route Switchers */}
            <div id="route_actions" className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                id="btn_nav_tv"
                onClick={() => navigateTo('/')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1 transition-colors ${currentPath === '/' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              >
                <Tv className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Display TV</span>
              </button>
              
              <button
                id="btn_nav_admin"
                onClick={() => navigateTo('/admin')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1 transition-colors ${currentPath === '/admin' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              >
                <UserCog className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Panel Petugas</span>
              </button>
            </div>

            {/* Setting Cog Trigger */}
            <button
              id="btn_settings_cog"
              onClick={() => setShowConfigModal(true)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer transition-colors"
              title="Konfigurasi Supabase"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Language/Voice Status */}
            <button
              id="audio_status_pills"
              onClick={() => setAudioUnlocked(prev => !prev)}
              className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${audioUnlocked ? 'border-indigo-200 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-700 text-slate-400'}`}
              title={audioUnlocked ? "Suara Panggilan Aktif" : "Suara Panggilan Dibisukan"}
            >
              {audioUnlocked ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* DETAILED ROOT VIEW ROUTERS */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        
        {/* ==================== VIEW 1: DISPLAY TV LAYOUT (PATH: '/') ==================== */}
        {currentPath === '/' && (
          <>
            {/* 1. IMMERSIVE FULLSCREEN TV VIEW OVERLAY */}
            {isTvFullscreen ? (
              <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-6 md:p-8 select-none overflow-hidden h-screen w-screen font-sans">
                {/* Ambient Background Glows */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-900/10 rounded-full blur-[150px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-900/10 rounded-full blur-[150px] pointer-events-none"></div>
                
                {/* Header */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 flex items-center justify-between shadow-2xl relative z-10">
                  <div className="flex items-center space-x-4">
                    <SvgBulogLogo className="w-16 h-16 shrink-0 bg-white/10 rounded-full p-1" />
                    <div>
                      <span className="bg-amber-400 text-slate-950 text-[11px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider">
                        SISTEM REALTIME PENYALURAN CADANGAN PANGAN
                      </span>
                      <h1 className="text-xl md:text-3xl font-display font-black tracking-tight text-white mt-1.5 leading-none">
                        PEMERINTAH DESA WARGALUYU
                      </h1>
                      <p className="text-xs md:text-sm font-semibold text-emerald-400 mt-1">
                        Kecamatan Arjasari • Kabupaten Bandung • Provinsi Jawa Barat
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right hidden xl:block">
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none font-bold">LOKASI PENYALURAN</p>
                      <p className="text-md font-extrabold text-blue-400 mt-1 uppercase">AULA BALAI DESA WARGALUYU</p>
                    </div>
                    <div className="w-px h-10 bg-slate-800 hidden xl:block"></div>
                    <SvgKabupatenBandung className="w-16 h-16 shrink-0" />
                    
                    {/* Exit button */}
                    <button
                      onClick={() => setIsTvFullscreen(false)}
                      className="bg-red-650 hover:bg-red-700 text-white font-bold py-3 px-5 rounded-2xl text-xs flex items-center space-x-2 transition-transform active:scale-95 cursor-pointer shadow-lg border border-red-500/30"
                    >
                      <Minimize2 className="w-4 h-4" />
                      <span>TUTUP FULLSCREEN [ESC]</span>
                    </button>
                  </div>
                </div>

                {/* Main Content Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6 items-stretch flex-1 relative z-10 min-h-0">
                  {/* Giant Active Queue Panel (takes 2/3 cols) */}
                  <div className="lg:col-span-2 flex flex-col justify-between">
                    <div className={`rounded-3xl border-4 text-center p-6 md:p-8 flex flex-col justify-between h-full relative overflow-hidden transition-all duration-300 ${
                      isCallingFlash 
                        ? 'border-amber-400 bg-blue-950/80 shadow-[0_0_60px_rgba(255,199,44,0.35)] animate-pulse' 
                        : 'border-slate-800 bg-slate-900/40 shadow-2xl backdrop-blur-xs'
                    }`}>
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                        <span className="bg-blue-950 text-blue-400 border border-blue-900/50 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                          NOMOR ANTRIAN YANG SEDANG DIPANGGIL
                        </span>
                        <span className="text-xs text-slate-400 font-mono flex items-center">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                          Realtime Update Aktif
                        </span>
                      </div>

                      {/* LCD Board Display - Standard Legible Clean Typography */}
                      <div className="py-2 flex-1 flex flex-col justify-center items-center">
                        <div className="relative inline-block my-1 bg-slate-950 px-16 md:px-24 py-8 rounded-[3rem] border-8 border-slate-800 shadow-[0_0_40px_rgba(245,158,11,0.15),inset_0_0_30px_rgba(0,0,0,0.9)] min-w-[320px] md:min-w-[440px] text-center">
                          {/* Real highly readable clean numbers */}
                          <span className="relative z-10 text-[14rem] md:text-[20rem] lg:text-[23rem] font-sans font-black leading-none tracking-tight text-amber-400 drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] select-none">
                            {currentQueue.nomor_sekarang || '00'}
                          </span>
                        </div>

                        {/* Animated status banner */}
                        <div className="mt-6">
                          <motion.div 
                            animate={{ scale: isCallingFlash ? [1, 1.05, 1] : 1 }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className={`inline-flex items-center space-x-3 px-8 py-3.5 rounded-2xl text-lg md:text-xl font-bold shadow-2xl ${
                              isCallingFlash 
                                ? 'bg-amber-400 text-slate-950' 
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            <span className="relative flex h-4 w-4">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
                            </span>
                            <span>STATUS: {currentStatusString}</span>
                          </motion.div>
                        </div>
                      </div>

                      {/* Progress bar info */}
                      <div className="border-t border-slate-800/80 pt-4 mt-2">
                        <div className="flex items-center justify-between text-xs md:text-sm font-semibold text-slate-400 mb-2">
                          <span>Progres Antrian Penyaluran Bahan Pangan:</span>
                          <span className="font-mono bg-slate-950 text-slate-350 py-1 px-3 rounded-lg text-xs font-bold border border-slate-800">
                            {totalCompletedCount} dari {currentQueue.total_antrian} Keluarga Penerima Manfaat (KPM) Selesai
                          </span>
                        </div>

                        <div className="h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800 shadow-inner">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-700 via-emerald-500 to-amber-350 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${percentProgress}%` }}
                          ></div>
                        </div>
                        
                        <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1 font-mono">
                          <span>Mulai (0)</span>
                          <span>Progress {percentProgress}% Selesai</span>
                          <span>Total KPM ({currentQueue.total_antrian})</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Side Column: Clock & History */}
                  <div className="flex flex-col justify-between space-y-6">
                    
                    {/* Live Large Clock panel */}
                    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center flex flex-col justify-center items-center backdrop-blur-xs min-h-[140px]">
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block mb-2">JAM DIGITAL DESA (UTC+7)</span>
                      <div className="font-mono text-4xl md:text-5xl font-black text-amber-400 select-none tracking-wide">
                        {formatIndoTime(currentTime)}
                      </div>
                      <div className="text-xs text-emerald-300 font-bold mt-2 uppercase tracking-wide">
                        {formatIndoDate(currentTime)}
                      </div>
                    </div>

                    {/* Immersive TV Skipped / Incomplete Queues Panel */}
                    {skippedNumbers.length > 0 && (
                      <div className="bg-slate-900/40 border-2 border-amber-500/30 rounded-3xl p-5 shadow-2xl flex flex-col justify-between backdrop-blur-xs">
                        <div>
                          <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest block border-b border-amber-950 pb-2 mb-3">
                            ⚠️ TERLEWAT (BELUM SELESAI)
                          </span>
                          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                            {skippedNumbers.map(num => (
                              <span key={`tv_skipped_${num}`} className="bg-amber-400 text-slate-950 font-mono font-black px-2.5 py-1 rounded-xl text-sm shadow animate-pulse">
                                No. {num}
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-2 font-semibold font-sans">Harap segera melapor ke petugas di meja pelayanan</p>
                      </div>
                    )}

                    {/* Prior Called Numbers history panel */}
                    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-2xl flex-1 flex flex-col justify-between backdrop-blur-xs">
                      <div>
                        <span className="text-[11px] text-slate-400 uppercase font-black tracking-widest block border-b border-slate-800 pb-3 mb-4">
                          ANTRIAN SEBELUMNYA / PRIOR
                        </span>
                        
                        <div className="space-y-3">
                          {priorNumbers.length > 0 ? (
                            priorNumbers.slice(0, 4).map((num, i) => (
                              <div 
                                key={`prior_fs_${num}_${i}`}
                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                                  i === 0 
                                    ? 'bg-blue-950/40 border-blue-900/60 shadow-lg text-white font-bold' 
                                    : 'bg-transparent border-slate-900/40 text-slate-500'
                                }`}
                              >
                                <span className="text-xs text-slate-400 font-sans font-medium">Panggilan terakhir {i === 0 ? '(Lalu)' : ''}</span>
                                <span className={`font-sans text-2xl font-black ${i === 0 ? 'text-blue-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]' : 'text-slate-500'}`}>
                                  No. {num}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="py-12 text-center text-xs text-slate-500 italic font-sans animate-pulse">
                              Belum ada panggilan antrian...
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/60 flex justify-between items-center text-[11px] text-slate-500 font-mono">
                        <span className="flex items-center">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                          Koneksi Supabase Sinkron
                        </span>
                        <span>Desa Wargaluyu</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Running Text Marquee at the bottom of the TV screen */}
                <div className="bg-amber-400 border-t-4 border-amber-500 text-slate-950 py-4 px-6 rounded-2xl shadow-2xl relative z-10 flex items-center font-display font-black text-lg md:text-xl overflow-hidden uppercase select-none">
                  <div className="bg-slate-950 text-white shrink-0 text-xs font-black py-1 px-3 rounded-md tracking-wider mr-4 shadow-md flex items-center space-x-1.5 animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span>INFO DESA</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <marquee scrollamount="5" className="font-bold tracking-wide">
                      📢 PEMERINTAH DESA WARGALUYU KECAMATAN ARJASARI - CADANGAN PANGAN NASIONAL TAHUN 2026. SETIAP KELUARGA PENERIMA MANFAAT (KPM) MENERIMA SEBANYAK 20KG BERAS BULOG DAN 4 LITER MINYAK GORENG GRATIS. PASTIKAN DOKUMEN KK, KTP ASLI, DAN SURAT UNDANGAN RESMI TELAH SIAP UNTUK DIVERIFIKASI OLEH PETUGAS DI MEJA PELAYANAN AULA DESA. TERIMA KASIH ATAS KETERTIBAN ANDA.
                    </marquee>
                  </div>
                </div>
              </div>
            ) : (
              // 2. NORMAL NON-FULLSCREEN TV LAYOUT VIEW
              <div id="tv_display_viewport" className="space-y-6 font-sans">
                
                {/* ACTION BANNER TO TOGGLE IMMERSIVE TV SCREEN */}
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between select-none gap-3 shadow-md ${
                  themeMode === 'dark' 
                    ? 'bg-slate-900 border-slate-800 text-slate-100' 
                    : 'bg-blue-50/50 border-blue-100 text-slate-800'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/65 text-blue-700 dark:text-blue-400 rounded-xl flex items-center justify-center">
                      <Tv className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-xs md:text-sm font-bold font-sans">Layar Display TV Balai Desa</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-sans">Tekan tombol di sebelah kanan untuk beralih ke Mode TV Fullscreen berskala besar yang pas dipasang di aula desa.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsTvFullscreen(true)}
                    className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 dark:bg-blue-650 dark:hover:bg-blue-600 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer tracking-wide"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>🖥️ BUKA TV FULLSCREEN</span>
                  </button>
                </div>

                {/* Visual alert message for mobile display of TV view */}
                <div className="sm:hidden bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 p-3 rounded-xl text-xs flex items-center space-x-2 border border-blue-100">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>Layar TV direkomendasikan dipasang mendatar (Landscape) pada Layar TV Aula Desa.</span>
                </div>

            {/* HIGHLY PROFESSIONAL VILLAGE GOVERNMENT HEADER FOR TV LAYOUT */}
            <div className={`p-6 rounded-3xl border transition-all flex flex-col md:flex-row items-center justify-between shadow-lg select-none gap-4 overflow-hidden relative ${
              themeMode === 'dark' 
                ? 'bg-slate-900 border-slate-800' 
                : 'bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white border-blue-950'
            }`}>
              {/* Abstract decorative shine */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_50%)] pointer-events-none"></div>

              <div className="flex items-center space-x-4 relative z-10">
                <SvgBulogLogo className="w-16 h-16 filter drop-shadow-md shrink-0 bg-white/10 rounded-full p-1" />
                <div>
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider">
                    SISTEM REALTIME PENYALURAN CADANGAN PANGAN
                  </span>
                  <h1 className="text-lg md:text-2xl font-display font-black tracking-tight mt-1 leading-none text-white">
                    PEMERINTAH DESA WARGALUYU
                  </h1>
                  <p className="text-xs font-semibold text-emerald-300 dark:text-slate-300 leading-normal font-sans mt-0.5">
                    Pelayanan Penyaluran Cadangan Pangan • Kecamatan Arjasari, Kabupaten Bandung
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 border-l border-white/20 pl-4 py-2 shrink-0 self-stretch justify-center md:justify-end relative z-10">
                <SvgKabupatenBandung className="w-14 h-14 filter drop-shadow-md shrink-0" />
                <div className="text-center md:text-left">
                  <p className="text-sm font-bold text-amber-300 uppercase tracking-widest leading-none">KAB. BANDUNG</p>
                  <p className="text-[10px] font-semibold text-emerald-200 mt-0.5 italic">"Repeh Rapih Kerta Raharja"</p>
                </div>
              </div>
            </div>

            {/* Grid structure */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              
              {/* LEFT COLUMN/SIDES (2/3 Grid): Main Display Active Card */}
              <div className="lg:col-span-2 flex flex-col justify-between">
                <div className={`rounded-3xl border-4 text-center p-6 md:p-10 flex flex-col justify-between h-full relative overflow-hidden transition-all duration-300 ${
                  isCallingFlash 
                    ? 'border-bulog-yellow bg-blue-100 dark:bg-blue-950/60 shadow-[0_0_50px_rgba(255,199,44,0.6)] animate-pulse' 
                    : themeMode === 'dark' 
                      ? 'border-slate-800 bg-slate-900 shadow-xl' 
                      : 'border-white bg-white shadow-xl'
                }`}>
                  
                  {/* Decorative background stripes for official government feel */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-bulog-yellow/5 rounded-full blur-xl"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-700/5 rounded-full blur-xl"></div>

                  {/* Card Header information */}
                  <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 select-none">
                    <div className="text-left">
                      <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        Lokasi Penyaluran Utama
                      </span>
                      <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-1 uppercase">
                        AULA BALAI DESA WARGALUYU
                      </h2>
                    </div>

                    <div className="flex flex-col items-end mt-2 md:mt-0 font-mono text-xs text-slate-400">
                      <span>{formatIndoDate(currentTime)}</span>
                      <span className="font-bold text-blue-700 dark:text-blue-400 mt-0.5 text-sm">{formatIndoTime(currentTime)}</span>
                    </div>
                  </div>

                  {/* Main Giant Queue Number Callout Center (Digital look) */}
                  <div className="py-8 md:py-12 select-none relative flex flex-col items-center">
                    <p className="text-sm md:text-base font-display font-bold uppercase tracking-widest text-slate-400 mb-4">
                      NOMOR ANTRIAN YANG SEDANG DIPANGGIL
                    </p>

                    <div className="relative inline-block bg-slate-950 py-6 px-16 rounded-[2.5rem] border-4 border-slate-850 shadow-[0_0_25px_rgba(245,158,11,0.1),inset_0_0_20px_rgba(0,0,0,0.8)] max-w-xs md:max-w-sm w-full text-center">
                      {/* Real highly readable clean numbers */}
                      <span className="relative z-10 font-sans text-[10rem] md:text-[14rem] lg:text-[15rem] font-black leading-none tracking-tight text-amber-400 drop-shadow-[0_4px_10px_rgba(0,0,0,0.55)] select-none">
                        {currentQueue.nomor_sekarang || '00'}
                      </span>
                    </div>

                    {/* Highlighted text badge of verification */}
                    <div className="flex justify-center mt-6">
                      <motion.div 
                        initial={{ scale: 0.95 }}
                        animate={{ scale: isCallingFlash ? [1, 1.05, 1] : 1 }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className={`inline-flex items-center space-x-2.5 px-6 py-2.5  rounded-2xl text-base md:text-lg font-bold shadow-md cursor-default ${
                          isCallingFlash 
                            ? 'bg-amber-400 text-slate-950 animate-bounce' 
                            : 'bg-emerald-500 text-white'
                        }`}
                      >
                        <span className="relative flex h-3.5 w-3.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white"></span>
                        </span>
                        <span>STATUS: {currentStatusString}</span>
                      </motion.div>
                    </div>
                  </div>

                  {/* Real-time bar percentage */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-6 mt-4">
                    <div className="flex items-center justify-between text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">
                      <span>Progres Antrian Beras Hari Ini:</span>
                      <span className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-1 px-3 rounded-lg text-xs font-bold font-sans">
                        {totalCompletedCount} dari {currentQueue.total_antrian} Keluarga Penerima Manfaat (KPM) Selesai
                      </span>
                    </div>

                    <div className="h-4 bg-slate-150 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-700 via-emerald-500 to-amber-300 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${percentProgress}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 font-mono">
                      <span>Mulai (0)</span>
                      <span>Progress {percentProgress}% Selesai</span>
                      <span>Total KPM ({currentQueue.total_antrian})</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* RIGHT COLUMN (1/3 Grid): Queue Status, Prior History & Audio Controller */}
              <div className="space-y-6 flex flex-col justify-between">
                
                {/* Audio Status Card & Quick Instructions */}
                <div className={`p-6 rounded-3xl shadow-md border ${themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-150 text-slate-800'}`}>
                  <h3 className="text-sm font-display font-medium text-slate-400 uppercase tracking-wider mb-3">
                    Status Audio Sistem
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center space-x-2">
                        <Volume2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-semibold">Suara Panggilan</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${audioUnlocked ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {audioUnlocked ? 'AKTIF (id-ID)' : 'MATI'}
                      </span>
                    </div>

                    {!audioUnlocked ? (
                      <button
                        id="btn_retry_audio"
                        onClick={() => handleUnlockAudio('/')}
                        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition-colors flex items-center justify-center space-x-2"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>Aktifkan Audio Suara TV</span>
                      </button>
                    ) : (
                      <div className="text-[11px] text-slate-400 text-center italic">
                        "Setiap nomor dipanggil akan otomatis dimumkan dlm Bahasa Indonesia"
                      </div>
                    )}
                  </div>
                </div>

                {/* Riwayat 5 Nomor Terakhir */}
                <div className={`p-6 rounded-3xl shadow-md border flex-1 flex flex-col justify-between ${themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-150 text-slate-800'}`}>
                  <div>
                    <h3 className="text-xs md:text-sm font-display font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 select-none">
                      RIWAYAT PANGGILAN TERAKHIR
                    </h3>

                    <div className="space-y-3 select-none">
                      {priorNumbers.length > 0 ? (
                        priorNumbers.map((num, i) => (
                          <div 
                            key={`prior_${num}_${i}`}
                            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                              i === 0 
                                ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 font-bold' 
                                : 'bg-transparent border-slate-100 dark:border-slate-800/30 text-slate-400'
                            }`}
                          >
                            <span className="text-xs">Antrian Sebelumnya {i === 0 ? '(Terbaru)' : ''}</span>
                            <span className={`font-mono text-xl md:text-2xl font-bold ${i === 0 ? 'text-blue-700 dark:text-blue-400' : 'text-slate-400'}`}>
                              No. {num}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="py-10 text-center text-xs text-slate-400 italic">
                          Belum ada riwayat panggilan antrian.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-400">
                    <span className="flex items-center text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                      Realtime Sync Aktif
                    </span>
                    <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400">Desa Wargaluyu</span>
                  </div>
                </div>

                {/* Antrian Terlewat / Belum Selesai (Normal Screen) */}
                {skippedNumbers.length > 0 && (
                  <div className={`p-6 rounded-3xl shadow-md border ${themeMode === 'dark' ? 'bg-slate-900 border-slate-800 border-t-amber-500' : 'bg-white border-slate-150 border-t-amber-500 text-slate-800'}`}>
                    <h3 className="text-xs md:text-sm font-display font-bold text-amber-500 uppercase tracking-widest border-b border-amber-100 dark:border-amber-950 pb-3 mb-4 select-none flex items-center justify-between">
                      <span>⚠️ ANTRIAN TERLEWATI</span>
                      <span className="bg-amber-400 text-slate-950 text-[10px] py-0.5 px-2 rounded-full font-sans font-black">{skippedNumbers.length} Orang</span>
                    </h3>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto select-none">
                      {skippedNumbers.map(num => (
                        <span key={`tv_normal_skipped_${num}`} className="bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300 font-mono font-bold px-3 py-1.5 rounded-xl text-base border border-amber-150/40 dark:border-amber-900 shadow-sm">
                          No. {num}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 italic mt-3">
                      *Bagi warga dengan nomor di atas, harap melapor ke meja verifikasi pendaftaran di aula desa.
                    </p>
                  </div>
                )}

              </div>
            </div>

            {/* Running Text Marquee at the bottom of the TV screen */}
            <div className="bg-amber-400 border-t-2 border-amber-500 text-slate-950 py-3.5 px-6 rounded-2xl shadow-md flex items-center font-display font-semibold text-sm md:text-base overflow-hidden uppercase select-none mt-6">
              <div className="bg-slate-950 text-white shrink-0 text-[10px] font-black py-0.5 px-2 rounded tracking-wider mr-4 shadow-md flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span>INFO DESA</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <marquee scrollamount="4" className="font-extrabold tracking-wide">
                  📢 PEMERINTAH DESA WARGALUYU KECAMATAN ARJASARI - CADANGAN PANGAN NASIONAL TAHUN 2026. SETIAP KELUARGA PENERIMA MANFAAT (KPM) MENERIMA SEBANYAK 20KG BERAS BULOG DAN 4 LITER MINYAK GORENG GRATIS. PASTIKAN DOKUMEN KK, KTP ASLI, DAN SURAT UNDANGAN RESMI TELAH SIAP UNTUK DIVERIFIKASI OLEH PETUGAS DI MEJA PELAYANAN AULA DESA. TERIMA KASIH ATAS KETERTIBAN ANDA.
                </marquee>
              </div>
            </div>

          </div>
        )}
      </>
    )}

        {/* ==================== VIEW 2: PANEL PETUGAS / ADMIN (PATH: '/admin') ==================== */}
        {currentPath === '/admin' && (
          <div id="admin_editor_viewport" className="space-y-6 max-w-lg mx-auto">
            
            {/* Admin Authentication Card (Pencegah Akses Umum) */}
            {!isAdminAuthenticated ? (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-3xl shadow-xl border ${themeMode === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 text-slate-800'}`}
              >
                <div className="text-center pb-6">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-display font-bold">Autentikasi Petugas</h2>
                  <p className="text-xs text-slate-400 mt-1">Masukkan kata sandi administrator Desa Wargaluyu untuk mengontrol antrian</p>
                </div>

                <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Kata Sandi Petugas:</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <KeyRound className="w-4 h-4 text-slate-400" />
                      </div>
                      <input
                        id="pwd_admin"
                        type="password"
                        required
                        value={adminPasswordInput}
                        onChange={(e) => setAdminPasswordInput(e.target.value)}
                        placeholder="Contoh: wargaluyubisa"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono tracking-widest text-slate-900 dark:text-white"
                      />
                    </div>
                    {adminAuthError && (
                      <p className="text-xs text-red-500 font-medium mt-1.5">{adminAuthError}</p>
                    )}
                  </div>

                  <button
                    id="btn_admin_login"
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition-colors text-sm flex items-center justify-center space-x-1"
                  >
                    <span>Masuk Panel Petugas</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="bg-slate-50 dark:bg-slate-805 rounded-xl p-3 border border-slate-100 dark:border-slate-800 my-4 text-[11px] text-slate-500 mt-6 leading-relaxed">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">💡 Info Pengembang:</p>
                  <p>Secara default, kata sandinya adalah <code className="bg-slate-200 dark:bg-slate-700 py-0.5 px-1 rounded font-bold font-mono">wargaluyubisa</code>. Anda dapat mengubahnya di berkas <code className="font-mono">.env</code> dengan variabel <code className="font-mono">VITE_ADMIN_PASSWORD</code>.</p>
                </div>
              </motion.div>
            ) : (
              // PANEL PETUGAS TERVERIFIKASI
              <div className="space-y-6">
                
                {/* Header Petugas */}
                <div className="flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/35">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold">
                      <UserCog className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">Login Aktif</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-white">Panel Operator HP Desa</span>
                    </div>
                  </div>

                  <button
                    id="btn_admin_logout"
                    onClick={handleAdminLogout}
                    className="py-1 px-2.5 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/65 dark:text-red-400 dark:hover:bg-red-900 rounded-lg text-xs font-semibold"
                  >
                    Logout
                  </button>
                </div>

                {/* DUAL SCREEN LAPTOP + TV SYNC GUIDE */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-850 border-2 border-blue-450 dark:border-slate-700 p-5 rounded-3xl flex flex-col space-y-3.5 shadow-md">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl shrink-0 select-none">🖥️</span>
                    <div className="space-y-1">
                      <p className="font-display font-extrabold text-[12px] text-blue-600 dark:text-blue-400 tracking-wider uppercase flex items-center space-x-1.5">
                        <span>SINKRONISASI DUAL-LAYAR LAPTOP + TV AKSES</span>
                        <span className="bg-emerald-550 text-white text-[8px] px-1.5 py-0.5 rounded font-black font-sans tracking-normal animate-pulse">AKTIF (100% OFFLINE)</span>
                      </p>
                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-sans">
                        Anda dapat menampilkan antrian pada <b>TV Aula</b> dan mengontrol panggilan melalui <b>Layar Laptop</b> yang sama secara instan tanpa membutuhkan koneksi internet atau HP!
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-[11px] leading-relaxed text-slate-650 dark:text-slate-400 space-y-2 border-t border-slate-150 dark:border-slate-800/80 pt-3">
                    <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">Cara Setup Antrian Dua Layar (Laptop ke TV):</p>
                    <ol className="list-decimal pl-4.5 space-y-1 font-sans">
                      <li>Hubungkan Laptop Anda ke TV menggunakan kabel <b>HDMI</b> atau VGA.</li>
                      <li>Tekan tombol keyboard <kbd className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-bold font-mono">Windows + P</kbd> lalu pilih opsi <b>"Extend"</b> (Tampilkan Layar Terpisah / Perpanjang Layar).</li>
                      <li>Buka website antrian ini dalam 2 Jendela/Tab browser yang terpisah:
                        <ul className="list-disc pl-4.5 mt-1 space-y-0.5 text-[10.5px]">
                          <li><b>Layar TV:</b> Buka <span className="bg-slate-100 dark:bg-slate-800 px-1 rounded font-bold text-blue-600 dark:text-blue-400">Display TV (/)</span>, geser jendela tersebut ke layar TV, lalu aktifkan mode Fullscreen.</li>
                          <li><b>Layar Laptop:</b> Buka <span className="bg-slate-150/85 dark:bg-slate-850 px-1 rounded font-bold text-emerald-600 dark:text-emerald-400">Panel Petugas (/admin)</span> tetap di monitor utama laptop Anda.</li>
                        </ul>
                      </li>
                      <li>Kini, setiap tombol panggil yang Anda klik di laptop akan <b>mengubah TV aula secara instan dan mengeluarkan suara bel/TTS panggilan</b> secara offline tanpa perlu internet!</li>
                    </ol>
                  </div>
                </div>

                {/* ACTIVE QUEUE CONTROLS CARD */}
                <div className={`p-6 rounded-3xl shadow-lg border relative overflow-hidden ${themeMode === 'dark' ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-150'}`}>
                  
                  {/* Connection Header for Mobile */}
                  <div className="flex items-center justify-between border-b pb-4 mb-5 border-slate-100 dark:border-slate-800 select-none">
                    <span className="text-xs font-display font-bold text-slate-400 uppercase tracking-wider">Status Antrian Aktif</span>
                    
                    <div className="flex items-center space-x-1.5 font-mono text-[10px] bg-slate-50 dark:bg-slate-800/60 py-0.5 px-2 rounded-lg text-slate-500">
                      {connectionStatus === 'connected' ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="text-emerald-600 font-bold">SUPABASE ONLINE</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                          <span className="text-blue-600 font-bold">DUAL-LAYAR LOKAL</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Gigantic Number display in panels */}
                  <div className="text-center py-4">
                    <div className="text-[6rem] md:text-[7rem] font-display font-extrabold leading-none text-blue-700 dark:text-blue-400 tracking-tight">
                      {currentQueue.nomor_sekarang}
                    </div>
                    <div className="text-xs font-bold font-display uppercase tracking-widest text-slate-400 mt-1">
                      NOMOR ANTRIAN AKTIF TAMPIL DI TV
                    </div>
                  </div>

                  {/* Secondary info slots (Sisa antrian, Total dll) */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-805 p-3 rounded-2xl border border-slate-150/40 dark:border-slate-800 my-4 select-none">
                    <div className="text-center border-r border-slate-200 dark:border-slate-800/40">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Sisa Antrian</span>
                      <span className="text-lg font-mono font-bold text-rose-500">
                        {Math.max(0, currentQueue.total_antrian - currentQueue.nomor_sekarang)}
                      </span>
                    </div>

                    <div className="text-center">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Total KPM Terdaftar</span>
                      <span className="text-lg font-mono font-bold text-slate-700 dark:text-slate-350">
                        {currentQueue.total_antrian}
                      </span>
                    </div>
                  </div>

                  {/* CHANGER ACTION CONTROLLERS (MANDATORY AND DEEP SIZED ACCORDING TO SPECS) */}
                  <div className="mt-6 space-y-4">
                    
                    {/* BUTTON 1: THE DIRECT "PANGGIL BERIKUTNYA" BUTTON THAT EVERYONE HAS ACCORDING TO SEQUENTIAL RUN SYSTEM */}
                    <button
                      id="btn_panggil_next_sequential"
                      onClick={handleCallNext}
                      className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] text-white font-display font-extrabold text-base rounded-2xl shadow-lg transition-all flex flex-col items-center justify-center space-y-0.5 cursor-pointer border border-blue-500/10"
                    >
                      <span className="text-[10px] font-normal uppercase tracking-widest text-blue-100 font-sans">1. Panggilan Berurutan (Biasa)</span>
                      <span className="flex items-center space-x-2">
                        <span>PANGGIL ANTRIAN No. {currentQueue.nomor_sekarang + 1}</span>
                        <ChevronRight className="w-5 h-5 text-amber-300 animate-pulse" />
                      </span>
                    </button>

                    {/* DYNAMIC SPLIT BUTTONS FOR PROGRESS RECORDING WITH LIVE PROGRESSION */}
                    <div className="grid grid-cols-2 gap-3">
                      
                      {/* BUTTON 2: SELESAI & PANGGIL BERIKUTNYA */}
                      <button
                        id="btn_selesai_salurkan"
                        onClick={handleCompleteCurrent}
                        disabled={currentQueue.nomor_sekarang === 0}
                        className={`py-4 px-2 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98] text-white font-display font-bold text-xs rounded-xl shadow transition-all flex flex-col items-center justify-center space-y-1 ${
                          currentQueue.nomor_sekarang === 0 ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'
                        }`}
                      >
                        <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-100 font-sans">2. Flow Selesai</span>
                        <span className="flex items-center space-x-1 font-bold">
                          <FileCheck2 className="w-4 h-4 text-amber-300 animate-pulse" />
                          <span>SELESAI & PANGGIL No. {currentQueue.nomor_sekarang + 1}</span>
                        </span>
                        <span className="text-[7.5px] font-mono opacity-85 uppercase font-sans text-center">No. {currentQueue.nomor_sekarang} Sukses</span>
                      </button>

                      {/* BUTTON 3: TIDAK DATANG / LEWATI & PANGGIL BERIKUTNYA */}
                      <button
                        id="btn_lewati"
                        onClick={handleSkipCurrent}
                        disabled={currentQueue.nomor_sekarang === 0}
                        className={`py-4 px-2 bg-gradient-to-br from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 active:scale-[0.98] text-white font-display font-bold text-xs rounded-xl shadow transition-all flex flex-col items-center justify-center space-y-1 ${
                          currentQueue.nomor_sekarang === 0 ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'
                        }`}
                      >
                        <span className="text-[8px] font-bold uppercase tracking-widest text-rose-100 font-sans">3. Flow Terlewat</span>
                        <span className="flex items-center space-x-1 font-bold">
                          <SkipForward className="w-4 h-4 text-amber-200" />
                          <span>ABSEN & PANGGIL No. {currentQueue.nomor_sekarang + 1}</span>
                        </span>
                        <span className="text-[7.5px] font-mono opacity-85 uppercase font-sans text-center">No. {currentQueue.nomor_sekarang} Lewat</span>
                      </button>

                    </div>

                    {/* BUTTON 4: SUARA ULANG FOR CURRENT ACTIVE NUMBER */}
                    <button
                      id="btn_panggil_ulang"
                      onClick={handleRecall}
                      disabled={currentQueue.nomor_sekarang === 0}
                      className={`w-full py-3.5 bg-amber-400 hover:bg-amber-500 active:scale-[0.98] text-slate-950 font-display font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center space-x-1.5 ${
                        currentQueue.nomor_sekarang === 0 ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'
                      }`}
                    >
                      <Volume2 className="w-4 h-4 animate-bounce" />
                      <span>SUARA ULANG PANGGILAN (No. {currentQueue.nomor_sekarang})</span>
                    </button>

                    {/* MANUAL INPUT FORM */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Loncat Ke Nomor Tertentu (Input Manual):</label>
                      <div className="flex space-x-2">
                        <input
                          id="num_manual_input"
                          type="number"
                          min="1"
                          max={currentQueue.total_antrian}
                          placeholder={`Contoh: 250`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = parseInt((e.target as HTMLInputElement).value);
                              if (val) {
                                handleCustomInputCall(val);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-850 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                        />
                        <button
                          id="btn_panggil_manual"
                          onClick={() => {
                            const inputEl = document.getElementById('num_manual_input') as HTMLInputElement;
                            if (inputEl && inputEl.value) {
                              handleCustomInputCall(parseInt(inputEl.value));
                              inputEl.value = '';
                            } else {
                              alert('Silakan ketik nomor antrian terlebih dahulu pada kotak!');
                            }
                          }}
                          className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1"
                        >
                          <span>Panggil</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 italic mt-1.5">
                        *Gunakan tombol ini jika ada warga yang terlewat dan ingin dilayani kembali.
                      </p>
                    </div>

                    {/* RESET & UPDATE MAX ANTRIAN SECTION */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4 space-y-4">
                      
                      <div className="flex items-center justify-between text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">
                        <span>Konfigurasi Tambahan Desa</span>
                      </div>

                      {/* Adjust total queue size */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-150/40 dark:border-slate-800">
                        <div className="text-xs">
                          <span className="block font-bold">Ubah Total Target KPM:</span>
                          <span className="text-slate-400 font-normal">Target awal: 1138</span>
                        </div>
                        <input
                          id="total_target_input"
                          type="number"
                          defaultValue={currentQueue.total_antrian}
                          onChange={(e) => handleUpdateTotalAntrian(parseInt(e.target.value) || DEFAULT_TOTAL_ANTRIAN)}
                          className="w-24 text-center px-1.5 py-1 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded font-bold font-mono text-slate-900 dark:text-white"
                        />
                      </div>

                      {/* Large red delete reset button */}
                      <button
                        id="btn_reset_antrian"
                        onClick={handleResetQueue}
                        className="w-full py-3 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/45 dark:hover:bg-red-950 dark:text-red-400 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-2"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>RESET ULANG ANTRIAN MULAI DARI AWAL (0)</span>
                      </button>

                    </div>

                  </div>
                </div>

                {/* 🎙️ PENYIARAN PENGUMUMAN SUARA (AUDIO ANNOUNCEMENTS) */}
                <div className={`p-6 rounded-3xl shadow-lg border relative overflow-hidden ${themeMode === 'dark' ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-150'}`}>
                  
                  {/* Decorative glowing wave or broadcasting header */}
                  <div className="flex items-center justify-between border-b pb-3 mb-4 border-slate-100 dark:border-slate-800 select-none">
                    <div className="flex items-center space-x-2">
                      <Megaphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-bounce" />
                      <span className="text-xs font-display font-black text-slate-850 dark:text-slate-100 tracking-tight uppercase">Penyiaran Pengumuman Suara</span>
                    </div>
                    {/* Tiny animated soundwave bars to look professional */}
                    <div className="flex items-end space-x-0.5 h-3">
                      <div className="w-0.5 bg-emerald-500 rounded-full animate-pulse h-1 bg-gradient-to-t from-emerald-400 to-green-500"></div>
                      <div className="w-0.5 bg-emerald-500 rounded-full animate-pulse h-2 bg-gradient-to-t from-emerald-400 to-green-500" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-0.5 bg-emerald-500 rounded-full animate-pulse h-3 bg-gradient-to-t from-emerald-400 to-green-500" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-0.5 bg-emerald-500 rounded-full animate-pulse h-1.5 bg-gradient-to-t from-emerald-400 to-green-500" style={{ animationDelay: '0.3s' }}></div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-4 font-sans">
                    Fasilitas pengeras suara pengumuman atau peraturan tertib antrian di sela-sela kegiatan penyaluran bantuan beras pangan. Suara pengumuman akan otomatis terdengar di <b>Layar TV Aula</b> maupun laptop secara sinkron!
                  </p>

                  {/* CUSTOM ANNOUNCEMENT TEXT WRITER */}
                  <div className="space-y-3.5">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-sans">Teks Pengumuman Kustom / Diedit:</span>
                      <textarea
                        value={customAnnouncementText}
                        onChange={(e) => setCustomAnnouncementText(e.target.value)}
                        placeholder="Contoh: Bapak Ibu penerima beras Bulog, mohon duduk tenang di area luar, siapkan KTP dan KK asli Anda... "
                        className="w-full min-h-[90px] p-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none text-black dark:text-white placeholder-slate-400 dark:placeholder-slate-500 leading-relaxed font-sans font-medium"
                      />
                    </div>

                    {/* Action buttons (Play, Stop, Clear) */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePlayAnnouncement(customAnnouncementText)}
                        disabled={!customAnnouncementText.trim()}
                        className={`flex-1 py-3 px-4 rounded-xl text-white font-semibold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-md ${
                          customAnnouncementText.trim() 
                            ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white' 
                            : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Megaphone className="w-4 h-4" />
                        <span>PUTAR PENGUMUMAN SEKARANG</span>
                      </button>

                      <button
                        onClick={handleStopAnnouncement}
                        className="py-3 px-3.5 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/60 dark:text-red-450 dark:hover:bg-red-900 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 active:scale-95 transition-all shadow-xs cursor-pointer"
                        title="Hentikan / Senapkan Semua Pengumuman Sedang Berjalan"
                      >
                        <VolumeX className="w-4 h-4" />
                        <span className="hidden sm:inline">OFF</span>
                      </button>
                    </div>

                    {/* QUICK ACCESSIBLE PRESETS */}
                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-3">
                      <div className="flex justify-between items-center mb-2.5">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Template Pengumuman Cepat:</span>
                        {customAnnouncementText.trim() && (
                          <button 
                            onClick={() => setCustomAnnouncementText('')}
                            className="text-[10px] text-zinc-500 hover:text-red-500 font-semibold cursor-pointer"
                          >
                            × Kosongkan Teks
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {ANNOUNCEMENT_PRESETS.map((preset) => (
                          <div 
                            key={preset.id} 
                            className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/65 bg-slate-50/50 dark:bg-slate-855/40 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-start justify-between space-x-2.5 transition-colors group"
                          >
                            <div className="flex items-start space-x-2 pt-0.5">
                              <span className="text-base select-none shrink-0">{preset.icon}</span>
                              <div>
                                <span className="block text-[11px] font-bold text-slate-850 dark:text-slate-200">{preset.title}</span>
                                <span className="block text-[9.5px] text-slate-400 font-normal leading-tight mt-0.5">{preset.desc}</span>
                              </div>
                            </div>
                            
                            <div className="flex space-x-1 shrink-0">
                              {/* Load button */}
                              <button
                                onClick={() => setCustomAnnouncementText(preset.text)}
                                className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-200 text-black dark:text-black border border-slate-300 dark:border-slate-400 rounded-lg text-[10px] font-black transition-all active:scale-[0.96] cursor-pointer shadow-xs"
                                title="Klik untuk edit teks di atas terlebih dahulu"
                              >
                                Edit Teks
                              </button>

                              {/* Instantly play button */}
                              <button
                                onClick={() => {
                                  // Speak + edit visual sync
                                  setCustomAnnouncementText(preset.text);
                                  handlePlayAnnouncement(preset.text);
                                }}
                                className="p-1 px-[7.5px] bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[9.5px] font-bold transition-all active:scale-[0.96] flex items-center space-x-1 cursor-pointer"
                                title="Putar langsung lewat speaker"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>

                {/* PENGATURAN SUARA PANGGILAN (VOICE SETTINGS CARD) */}
                <div className={`p-5 rounded-3xl shadow border ${themeMode === 'dark' ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-150'}`}>
                  <h3 className="text-xs font-display font-bold text-blue-500 uppercase tracking-widest border-b pb-2.5 mb-3 flex items-center justify-between select-none">
                    <span>📢 PENGATURAN SUARA PEREMPUAN (TTS)</span>
                    <span className="text-[9px] bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 px-2 py-0.5 rounded font-bold">SUARA PEREMPUAN</span>
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Voice Selection Dropdown */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pilih Mesin Suara (TTS Voice):</label>
                      <select
                        value={selectedVoiceName}
                        onChange={(e) => {
                          setSelectedVoiceName(e.target.value);
                          localStorage.setItem('bulog_selected_voice', e.target.value);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100 font-sans cursor-pointer"
                      >
                        {availableVoices.length === 0 ? (
                          <option value="">Browser Loading Voices (Default System)...</option>
                        ) : (
                          // Separate Indonesian voices and others
                          <>
                            <optgroup label="Suara Bahasa Indonesia (Sangat Direkomendasikan)">
                              {availableVoices
                                .filter(v => v.lang.toLowerCase().includes('id-') || v.lang.toLowerCase().includes('id_'))
                                .map((voice) => (
                                  <option key={`lang_id_${voice.name}`} value={voice.name}>
                                    🇮🇩 {voice.name} {voice.name.toLowerCase().includes('andika') ? '(Laki-laki)' : '(Perempuan / Default)'}
                                  </option>
                                ))}
                            </optgroup>
                            <optgroup label="Suara Negara Lain (Pilih Pitch Tinggi untuk Suara Perempuan)">
                              {availableVoices
                                .filter(v => !(v.lang.toLowerCase().includes('id-') || v.lang.toLowerCase().includes('id_')))
                                .map((voice) => (
                                  <option key={`lang_other_${voice.name}`} value={voice.name}>
                                    🌐 {voice.name} ({voice.lang})
                                  </option>
                                ))}
                            </optgroup>
                          </>
                        )}
                      </select>
                      <p className="text-[9px] text-slate-400 mt-1">
                        *Jika suara terdengar laki-laki, pilih suara yang berlabel <b>Perempuan / Default</b> atau sesuaikan Pitch di bawah.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pb-1">
                      {/* Pitch adjustment */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pitch (Tinggi Suara):</label>
                          <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">{voicePitch}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.05"
                          value={voicePitch}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setVoicePitch(val);
                            localStorage.setItem('bulog_voice_pitch', String(val));
                          }}
                          className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                          <span>Ngebass (0.5)</span>
                          <span>Perempuan (1.35)</span>
                        </div>
                      </div>

                      {/* Speed adjustment */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Speed (Kecepatan):</label>
                          <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">{voiceRate}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="1.5"
                          step="0.05"
                          value={voiceRate}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setVoiceRate(val);
                            localStorage.setItem('bulog_voice_rate', String(val));
                          }}
                          className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                          <span>Lambat (0.5)</span>
                          <span>Spontan (1.5)</span>
                        </div>
                      </div>
                    </div>

                    {/* Test Button */}
                    <button
                      type="button"
                      onClick={handleTestVoice}
                      className="w-full py-2 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>🔊 COBA TES SUARA SEKARANG</span>
                    </button>
                  </div>
                </div>

                {/* ANTRIAN TERLEWATI / BELUM SELESAI */}
                <div className={`p-5 rounded-3xl shadow border ${themeMode === 'dark' ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-150'}`}>
                  <h3 className="text-xs font-display font-bold text-amber-500 uppercase tracking-widest border-b pb-2.5 mb-3 flex items-center justify-between select-none">
                    <span>⚠️ ANTRIAN TERLEWATI ({skippedNumbers.length})</span>
                    <span className="text-[10px] text-slate-400 font-sans font-normal uppercase leading-none">Bisa Dipanggil Ulang</span>
                  </h3>

                  {skippedNumbers.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                      {skippedNumbers.map((num) => (
                        <div 
                          key={`admin_skipped_${num}`} 
                          className="flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 shadow-xs"
                        >
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">No. {num}</span>
                          <button
                            onClick={() => handleCallSkipped(num)}
                            className="px-2.5 py-1 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-lg text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition-all active:scale-95"
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>Panggil</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs text-slate-400 italic">
                      Tidak ada antrian yang terlewati / semua sukses disalurkan.
                    </div>
                  )}
                </div>

                {/* HISTORIC LOG OF OPERATIVE CONTROLLER ACTIONS */}
                <div className={`p-5 rounded-3xl shadow border ${themeMode === 'dark' ? 'bg-slate-900 border-slate-850' : 'bg-white border-slate-150'}`}>
                  <h3 className="text-xs font-display font-bold text-slate-400 uppercase tracking-widest border-b pb-2 mb-3">
                    LOG OPERASI RECENT PETUGAS
                  </h3>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {logs.length > 0 ? (
                      logs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between p-2 text-xs border-b border-slate-100 dark:border-slate-800/40 font-mono">
                          <div className="flex items-center space-x-2">
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                              log.action === 'PANGGIL' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : log.action === 'ULANG' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : log.action === 'LEWAT' 
                                    ? 'bg-purple-100 text-purple-800' 
                                    : 'bg-blue-100 text-blue-800'
                            }`}>
                              {log.action}
                            </span>
                            <span className="text-slate-700 dark:text-slate-350 font-bold">No. {log.nomor}</span>
                          </div>
                          <span className="text-slate-400 text-[10px]">
                            {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-[11px] text-slate-400 italic">
                        Belum ada aktivitas terekam.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* FOOTER DESA */}
      <footer className={`border-t py-6 mt-12 text-center text-xs text-slate-400 ${themeMode === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-semibold text-slate-500 dark:text-slate-400">
            Sistem Antrian Penyaluran Beras Kantor Bulog - Pemerintah Desa Wargaluyu
          </p>
          <p className="text-[11px]">
            Kecamatan Arjasari, Kabupaten Bandung, Provinsi Jawa Barat • Realtime Supabase Sync v2.4
          </p>
          <div className="pt-2 flex justify-center items-center space-x-4">
            <span className="flex items-center text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1"></span>
              Audio Engine (Speech ID) Aktif
            </span>
            <span>•</span>
            <span className="text-[10px]">
              Host Port: Standard Container Cloud Run
            </span>
          </div>
        </div>
      </footer>

      {/* ==================== CONFIGURATION MODAL (SUPABASE SETTINGS) ==================== */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 max-w-md w-full rounded-2xl p-6 shadow-2xl border dark:border-slate-800"
            >
              <div className="flex items-center justify-between border-b pb-3 mb-4 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <Database className="text-blue-700 dark:text-blue-400 w-5 h-5" />
                  <h3 className="font-display font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-white">
                    Konfigurasi Kunci Supabase
                  </h3>
                </div>
                <button
                  id="btn_close_config"
                  onClick={() => setShowConfigModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/50 rounded-xl p-3 border border-blue-100 dark:border-blue-900/30 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 mb-4 space-y-1.5">
                <p className="font-bold">🖥️ Bagaimana cara kerjanya?</p>
                <p>Secara default, jika berkas <code className="font-mono bg-slate-200 dark:bg-slate-800 py-0.5 px-1 rounded">.env</code> tidak diatur, aplikasi berjalan dalam <strong>Mode Offline Backup Lokal</strong> menggunakan Penyimpanan Browser Anda (localStorage).</p>
                <p>Jika Anda ingin melakukan sinkronisasi real-time penuh pada TV besar dan HP Android terpisah, isikan URL instansi Supabase dan Anon Key Anda di bawah ini:</p>
              </div>

              <form onSubmit={handleManualCredentialsSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">SUPABASE_URL:</label>
                  <input
                    id="supa_url_input"
                    type="text"
                    required
                    value={tempSupaUrl}
                    onChange={(e) => setTempSupaUrl(e.target.value)}
                    placeholder="Contoh: https://id-proyek.supabase.co"
                    className="w-full text-slate-900 dark:text-white dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">SUPABASE_ANON_KEY:</label>
                  <input
                    id="supa_key_input"
                    type="password"
                    required
                    value={tempSupaKey}
                    onChange={(e) => setTempSupaKey(e.target.value)}
                    placeholder="Contoh: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full text-slate-900 dark:text-white dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    id="btn_save_config"
                    type="submit"
                    className="bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-xl text-xs shadow-md"
                  >
                    Simpan & Hubungkan
                  </button>
                  
                  <button
                    id="btn_clear_config"
                    type="button"
                    onClick={clearManualCredentials}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 font-semibold py-2.5 rounded-xl text-xs border"
                  >
                    Reset ke Default / Local
                  </button>
                </div>
              </form>

              {/* DYNAMIC QR CODE & LINK SHARING FOR REALTIME WORKFLOW SYNC */}
              {(() => {
                const activeSupaCreds = getSupabaseCredentials();
                if (!activeSupaCreds.url || !activeSupaCreds.key) return null;
                let baseOrigin = typeof window !== 'undefined' ? window.location.origin : '';
                if (baseOrigin.includes('ais-dev-')) {
                  baseOrigin = baseOrigin.replace('ais-dev-', 'ais-pre-');
                }
                const shareLink = baseOrigin
                  ? `${baseOrigin}/admin?supa_url=${encodeURIComponent(activeSupaCreds.url)}&supa_key=${encodeURIComponent(activeSupaCreds.key)}`
                  : '';
                const qrCodeUrl = shareLink
                  ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(shareLink)}`
                  : '';

                return (
                  <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-1.5 flex items-center justify-center space-x-1.5">
                      <span>📱 SINKRONISASI KE HP SANGAT MUDAH</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 mb-4 leading-normal px-2">
                      Pindai kode QR di bawah menggunakan kamera HP operator Anda atau salin link untuk otomatis menghubungkan HP Anda ke database yang sama!
                    </p>
                    
                    <div className="inline-block bg-white p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-4">
                      <img
                        src={qrCodeUrl}
                        alt="QR Code Sinkronisasi"
                        className="w-36 h-36 object-contain mx-auto"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="px-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(shareLink);
                          alert('✅ Link Sinkronisasi Berhasil Tersalin!\nKirimkan link ini ke WhatsApp HP Operator / buka di HP Anda untuk auto-sync.');
                        }}
                        className="w-full flex items-center justify-center space-x-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border border-emerald-150 dark:border-emerald-900/30 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Link Sinkronisasi</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="mt-4 pt-3 border-t text-center dark:border-slate-800 text-[10px] text-slate-400 select-none uppercase tracking-wide">
                Desa Wargaluyu • Pangan Bulog Mandiri
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Voice Announcer Presenter Overlay - Rendered globally over all screens (Normal TV, Fullscreen TV, and Operator panel) */}
      <AiPresenterVideoFeed text={currentAnnouncementText} isPlaying={isPlayingAnnouncement} />

    </div>
  );
}
