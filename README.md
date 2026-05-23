# 🌾 Sistem Antrian Penyaluran Beras Bulog Desa Wargaluyu
> **Pemerintah Desa Wargaluyu, Kecamatan Arjasari, Kabupaten Bandung**
> Aplikasi Antrian Penyaluran Bantuan Cadangan Pangan Pemerintah (Bulog RI) Berbasis Realtime, Ringan, Responsif, dan Andal.

Aplikasi ini dikembangkan khusus untuk mempermudah perangkat Desa Wargaluyu saat melakukan penyaluran pangan kepada **1138 Keluarga Penerima Manfaat (KPM)** di aula kantor desa. Dirancang khusus untuk **Display TV Besar di Aula** dan dioperasikan dari jauh oleh petugas menggunakan **HP Android**.

---

## 🚀 Fitur Utama & Keunggulan

1. **Layar Display TV Aula Modern**
   - Menampilkan nomor antrian aktif saat ini dengan ukuran raksasa (responsif untuk Smart TV / TV LED besar).
   - Indikator status panggilan yang interaktif ("Menuju Meja Verifikasi").
   - Riwayat 5 nomor antrian yang telah dipanggil sebelumnya.
   - Bilah *Progress Bar* interaktif: Menampilkan persentase pencapaian (misal: "Antrian ke 250 dari 1138 KPM").
   - Waktu lokal ter-sinkronisasi realtime (*Hari, Tanggal, Jam, dan Menit WIB*).
   - Dilengkapi lambang logo resmi Bulog RI dan lambang desa.

2. **Panggilan Suara Otomatis (Narrator Voice)**
   - Saat petugas menekan panggil kontol dari HP Android, layar TV secara otomatis melantunkan bunyi **Chime Ding-Dong digital** (menggunakan Web Audio API tanpa load file mp3 eksternal).
   - Diikuti dengan suara narator membacakan nomor antrian secara otomatis dalam **Bahasa Indonesia** jernih: *"Nomor antrian 250, silakan menuju meja verifikasi."*

3. **Panel Petugas Mobile Friendly (HP Android)**
   - Antarmuka mobile-first dengan tombol ukuran ekstra besar yang sangat taktil dan ramah layar sentuh HP.
   - Dilindungi login kata sandi administrasi sederhana demi pengamanan dari warga jahil.
   - Panggilan satu ketukan tombol (*Next Call, Recall/Panggil Ulang, Skip/Lewati Nomor*).
   - Input manual nomor untuk mengakomodasi warga yang tiket antriannya terlewat atau tertinggal.
   - Panel monitoring sisa antrian di luar aula, total KPM terdaftar, dan status konektivitas jaringan.

4. **Sistem Twin-Mode (Real-time Supabase + Local Storage Offline Backup)**
   - **Mode Supabase Realtime**: Menyinkronkan pemanggilan secara instan (<0.1s) antar multi-perangkat (HP Petugas ke Layar TV Aula) tanpa menyegarkan halaman (*zero refresh*).
   - **Mode Backup Lokal (localStorage)**: Jika koneksi internet di desa tidak stabil atau putus sengaja, sistem akan secara otomatis meluncurkan local storage backup agar antrian tetap bisa berjalan lancar melalui satu perangkat tanpa lag.

---

## 🛠️ Panduan Integrasi Supabase (Real-time Database)

Untuk mengaktifkan realtime multi-perangkat (TV terpisah dengan HP Petugas), jalankan konfigurasi basis data berikut:

1. Buat akun gratis/berbayar di [Supabase.com](https://supabase.com).
2. Buat proyek baru (*misal: "Antrian-Bulog-Wargaluyu"*).
3. Salin seluruh konten SQL di berkas **`supabase_setup.sql`** yang ada di folder ini.
4. Buka menu **SQL Editor** di dasbor Supabase Anda, tempelkan kodenya, kemudian klik **Run**.
5. Script tersebut akan otomatis mengonfigurasi:
   - Tabel `current_queue` (melacak baris antrian aktif ID = 1).
   - Tabel `logs` (mencatat aktivitas log panggilan).
   - Kebijakan keamanan Row-Level Security (RLS) untuk membolehkan akses tanpa batas jaringan lokal desa.
   - Pendaftaran ke saluran publikasi Realtime Supabase untuk sinkronisasi seketika.

---

## 📋 Langkah Deploy ke Netlify

Aplikasi ini menyertakan berkas konfigurasi **`netlify.toml`** dan siap di-deploy secara instan ke Netlify melalui CLI atau unggahan folder `dist/`.

### Cara 1: Menggunakan Git & Netlify Console
1. Hubungkan proyek ini ke repositori Github Anda.
2. Di dasbor Netlify, pilih **Import from Git** lalu hubungkan repositori Anda.
3. Gunakan konfigurasi berikut saat setup:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
4. Di bagian **Environment Variables** (Netlify Site Settings), tambahkan variabel berikut agar Supabase Anda otomatis terhubung:
   - `VITE_SUPABASE_URL` = *(Salin URL Supabase Anda)*
   - `VITE_SUPABASE_ANON_KEY` = *(Salin Kunci Anon Supabase Anda)*
   - `VITE_ADMIN_PASSWORD` = `wargaluyubisa` *(Kata sandi untuk masuk HP petugas, default jika kosong: `wargaluyubisa`)*
5. Klik **Deploy Site**.

### Cara 2: Deploy Manual / Konfigurasi Langsung di UI Aplikasi
Aplikasi ini dilengkapi fitur **Pengaturan Supabase langsung di layar browser**!
1. Buka aplikasi web yang sudah di-deploy.
2. Ketuk ikon roda gerigi **Settings** (Konfigurasi Supabase) di pojok samping atas.
3. Masukkan `SUPABASE_URL` dan `SUPABASE_ANON_KEY` Anda pada form yang disediakan.
4. Klik **Simpan & Hubungkan**. Pengaturan akan disimpan langsung pada browser perangkat Anda. Sangat praktis tanpa perlu deploy ulang kode!

---

## 🧑‍💻 Detail Teknis Pengembangan

- **Teknologi Utama**: React 18, Vite, TypeScript 5.
- **Pendekatan Desain**: TailwindCSS modern, font display futuristik *Space Grotesk*, paduan font sans-serif *Inter* untuk berkas fungsional, dan *JetBrains Mono* untuk data angka real-time.
- **Keamanan**: Panel admin dilindungi melalui validasi string respons lokal hibrida.
- **Interaksi Istimewa**: Fitur **Interactive Audio Unlock Shield** menyaring izin eksplisit peramban (browser) di awal halaman, untuk menepis pemblokiran audio otomatis dari browser modern saat suara TV pertama kali menyala.

---

*Dikembangkan dengan penuh dedikasi untuk memperlancar ketahanan pangan Desa Wargaluyu, Kecamatan Arjasari, Kabupaten Bandung.*
