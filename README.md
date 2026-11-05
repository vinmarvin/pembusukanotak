# 🧠 Pembusukan Otak (Brainrot Match-3)

**Pembusukan Otak** adalah game web *match-3 combat* bertema Brainrot yang dibangun menggunakan **Phaser 3** dan **Vite**. Pemain bertarung melawan monster Brainrot populer dengan mencocokkan permen untuk melancarkan serangan, menyelesaikan 5 area peta otak dalam Mode Cerita, mengejar skor tertinggi di mode Time Kill, serta membuka ensiklopedia Jurnal Meme lengkap dengan sulih suara dan cerita aslinya.

Game ini sepenuhnya **client-side** (tanpa backend, tanpa database, tanpa analitik eksternal, dan tanpa iklan), mendukung Bahasa Indonesia & Bahasa Inggris secara *live*, responsif di ponsel, tablet, maupun desktop, serta memiliki integrasi audio WebAudio yang lengkap.

---

## 🛠️ Tech Stack

| Layer                          | Teknologi                                         | Keterangan                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Game Engine**          | [Phaser 3](https://phaser.io/) (v3.87+)            | Rendering WebGL & Canvas 2D, state scene management, animasi tween, audio manager, dan pointer input.                                                               |
| **Bundler & Build Tool** | [Vite](https://vitejs.dev/) (v6)                   | Hot Module Replacement (HMR) super cepat untuk pengembangan dan *tree-shaking* rollup untuk produksi.                                                             |
| **Bahasa Pemrograman**   | JavaScript (ES2022+ Modules)                      | Kode modular terpisah antara pure logic (`src/core/`), UI (`src/ui/`), dan scene visual (`src/scenes/`).                                                      |
| **Testing Framework**    | [Vitest](https://vitest.dev/)                      | Unit test cepat untuk pure game logic: engine match-3, probabilitas RNG, combat sim, unlocks, layout math, dan integritas aset.                                     |
| **Asset Pipeline**       | Node.js Script (`pngjs`, `crypto`)            | Pipeline otomatis (`scripts/sync-assets.mjs`) yang memangkas margin transparan gambar, *downscaling*, mengklasifikasikan audio, dan menghasilkan manifest aset. |
| **Tipografi**            | `@fontsource` (Titan One, Russo One, Quicksand) | Font di-bundle secara offline lokal, tidak memerlukan koneksi ke Google Fonts.                                                                                      |
| **Audio Engine**         | Phaser WebAudio + Synth Fallback                  | Dukungan BGM crossfade, ducking efek suara saat bos menyerang, dan fallback procedural synth audio.                                                                 |
| **Penyimpanan (Save)**   | Web Storage (`localStorage`)                    | Penyimpanan progres lokal otomatis dengan skema terversi (`po_save_v1`).                                                                                          |

---

## 🚀 Panduan Menjalankan Game (Local Development)

### 1. Prasyarat

- **Node.js** versi 18.0.0 atau lebih tinggi.
- **npm** (biasanya sudah terinstal bersama Node.js).

### 2. Instalasi Dependensi

Buka terminal pada direktori proyek, lalu jalankan:

```bash
npm install
```

### 3. Menjalankan Server Pengembangan

Jalankan perintah berikut:

```bash
npm run dev
```

Setelah server aktif, buka URL yang ditampilkan di terminal (biasanya `http://localhost:5173/` atau `http://localhost:5173/?debug=1` untuk mode uji coba serangan cepat).

---

## 📦 Panduan Build & Deploy ke Produksi

Game ini menghasilkan berkas statis murni (*HTML, CSS, JS, audio, & gambar*), sehingga dapat di-hosting di layanan web statis mana pun tanpa konfigurasi server khusus.

### 1. Membuat Berkas Produksi

Jalankan perintah kompilasi produksi:

```bash
npm run build
```

Perintah ini akan secara otomatis:

1. Menjalankan pipeline sinkronisasi aset (`sync-assets.mjs`).
2. Melakukan optimasi dan bundling kode ke dalam folder `dist/`.

### 2. Uji Coba Hasil Build secara Lokal

Untuk memastikan hasil produksi berjalan sempurna sebelum diunggah:

```bash
npm run preview
```

### 3. Pilihan Deployment

#### A. Vercel / Netlify / Cloudflare Pages (Rekomendasi)

- **Framework Preset**: `Vite` (atau `Other`)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node.js Version**: 18+

#### B. GitHub Pages

1. Jalankan `npm run build`.
2. Push isi folder `dist/` ke branch `gh-pages`, atau gunakan GitHub Actions workflow untuk otomatis menjalankan `npm ci && npm run build` dan mendistribusikan folder `dist/`.

#### C. Itch.io / Game Jolt (Web Game HTML5)

1. Jalankan `npm run build`.
2. Kompres semua isi di dalam folder `dist/` ke dalam format `.zip` (pastikan `index.html` berada di root berkas zip).
3. Unggah file zip ke dashboard proyek game Anda di Itch.io dengan opsi *"This file will be played in the browser"*.

#### D. Server Tradisional (Nginx / Apache / Firebase / AWS S3)

Salin seluruh isi folder `dist/` langsung ke folder root web server Anda (`/var/www/html` atau *public root*).

---

## 📋 Daftar Perintah NPM

| Command                 | Fungsi                                                               |
| ----------------------- | -------------------------------------------------------------------- |
| `npm run dev`         | Menjalankan pipeline sinkronisasi aset dan membuka dev server Vite   |
| `npm run build`       | Mengoptimasi aset dan membundel seluruh aplikasi ke folder `dist/` |
| `npm run preview`     | Menjalankan web server lokal untuk melihat hasil folder `dist/`    |
| `npm test`            | Menjalankan seluruh rangkaian tes Vitest (13 file tes, 71 unit tes)  |
| `npm run sync-assets` | Menjalankan pemrosesan gambar dan manifest aset secara independen    |

---

## 🎮 Fitur & Mode Permainan

1. **Mode Cerita (Story Mode)**:

   - Menjelajahi 5 area otak: *Dopamine Drip*, *Endless Scroll*, *Subway Surfer*, *Brainrot Wasteland*, dan *Brainrot Meltdown*.
   - Setiap area memiliki 5 kroco (minion) dan 1 bos utama.
   - Bos memiliki kemampuan khusus: *Shuffle* (mengacak papan), *Devour/Remove 10* (memakan permen), dan *Freeze* (membekukan input selama 5 detik).
   - Naikkan HP dan stat ATK karakter Anda (*Nirodha*) di setiap stage!
2. **Time Kill (Score Attack 2 Menit)**:

   - Papan 8x8 dengan batas waktu 120 detik.
   - **Kombo**: Cascade memberikan tambahan waktu +5 detik.
   - **Match 4+**: Mencocokkan 4 permen atau lebih memunculkan power-up acak (*Bomb*, *Line Break*, *Freeze 15s*, atau *5x Score Multiplier*).
   - **Penalti**: Swap yang tidak menghasilkan match mengurangi waktu sebesar -10 detik!
3. **Jurnal Meme (Meme Book)**:

   - Ensiklopedia 11 entri meme Brainrot (5 Bos + 6 Anomali Permen).
   - Dilengkapi cerita orisinal, tombol putar efek suara resmi (`🔊 SFX`), dan status terkunci/terbuka.
4. **Pencapaian (Achievements)**:

   - 5 pencapaian tantangan: *Fresh New Brain*, *Score Hunter (65.000 skor)*, *Meme Curator*, *Support Creator*, dan achievement rahasia *You are fully brain rot*.
5. **Pengaturan & Audio**:

   - Slider volume live untuk Musik & SFX, tombol Mute cepat di bilah atas, dan pergantian instan Bahasa Indonesia / English.

---

## 📁 Struktur Direktori Proyek

```
ProjectPermen/
├── Agents/              # Dokumen spesifikasi lengkap, acuan desain, dan instruksi AI
│   ├── AGENTS.md        # Aturan protokol kerja agen AI
│   ├── GAME_SPEC.md     # Sumber kebenaran aturan gameplay, angka, dan formula
│   ├── PROGRESS.md      # Catatan fase penyelesaian dan riwayat keputusan
│   ├── UI_SPEC.md       # Spesifikasi tata letak, warna, dan responsivitas UI
│   ├── DESIGN_REFERENCE.md # Referensi visual mockup dan perbaikan desain
│   ├── ASSETS_SPEC.md   # Aturan pemrosesan gambar, audio, dan ukuran aset
│   ├── CONTENT_LORE.md  # Teks cerita orisinal 11 entri Jurnal Meme
│   └── assets.report.md # Laporan hasil pemrosesan dan dimensi aset
├── visual/              # Berkas mentah asli gambar (read-only source of truth)
├── audio/               # Berkas mentah asli audio & musik (read-only source of truth)
├── design/              # Berkas gambar referensi mockup UI dari desainer
├── public/              # Aset game yang dihasilkan dan dioptimalkan oleh sync-assets
├── scripts/             # Script build otomatis (sync-assets.mjs)
├── src/
│   ├── config/          # Konfigurasi konstanta game, tema, audio, dan bos
│   ├── core/            # Logika murni independen tanpa Phaser (board, combat, timekill, dll.)
│   ├── i18n/            # Kamus terjemahan Bahasa Indonesia dan English
│   ├── scenes/          # Scene-scene Phaser (MainMenu, Battle, TimeKill, MemeBook, dll.)
│   ├── systems/         # Manager sistem (Audio, Save, Layout, Input, AssetResolver)
│   └── ui/              # Komponen visual UI (TopBar, Button, Panel, Popup, Slider, dll.)
├── tests/               # 71 unit tes Vitest
├── AGENTS.md            # Entri panduan agen utama
└── README.md            # Dokumentasi proyek
```
