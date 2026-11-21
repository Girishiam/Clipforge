# ClipForge: Editorial Video Clipping Studio

**ClipForge** is a modern, design-led video clipping web studio built for precision timeframe extraction, instant URL clipping, multi-range sequencing, and 1-click MP4 downloads.

---

## 1. Quick Start (Local Development)

### Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **Python**: v3.10+ (for direct URL video clipping via `yt-dlp` and `ffmpeg`)

### Installation & Run
```bash
# 1. Clone the repository
git clone https://github.com/Girishiam/Clipforge.git
cd Clipforge

# 2. Install Node dependencies
npm install

# 3. Install Python video processing dependencies (yt-dlp & static-ffmpeg)
pip install -r requirements.txt

# 4. Start the ClipForge studio
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 2. Core Features & Architecture

### A. 1-Click URL Video Clipping & Download
- **Instant Media Ingest**: Paste any YouTube, Vimeo, or web video URL. The video loads and previews automatically without extra confirmation buttons.
- **Direct 1-Click Cut**: Set your start and end times (e.g. `57:58` to `1:01:58`) and click **"Download Clip"**.
- **High-Speed Background Engine**: `scripts/clip_engine.py` cuts the exact section directly from the stream using `yt-dlp` and `static-ffmpeg`, re-muxes to universal H.264 / AAC MP4, and streams it straight to your browser `Downloads` folder.
- **Zero Terminal Commands**: Built entirely for creators—no command line knowledge or manual video downloads required.

### B. Frame-Accurate Precision Controls
- **Human-Friendly Fields**: Clearly labeled **Start Time** and **End Time** with flexible time format parsing (`57:58`, `1:01:58`, `1.02.56`, `90s`, `1h 2m`).
- **Live Friendly Duration Preview**: Typing timestamps gives an instant human-readable preview (e.g. `(57m 58s)` or `(1h 1m 58s)`).
- **Steppers & Playhead Snapping**: Fine-tune with `±0.1s` and `±1s` stepper buttons or tap **"Set to Playhead"** while watching.
- **Interactive Timeline**: Visual draggable trim handles with hover scrub tags and selection highlights.
- **Duration Presets**: 1-click standard cuts (5s, 10s, 15s, 30s, 45s, 60s, 90s, 3m, 5m) with customizable anchor modes (Start, Center, End at playhead).

### C. Multi-Clip Workspace & Batch Library
- **Unlimited Non-Destructive Ranges**: Save multiple highlights from a single video to your clips shelf.
- **1-Click Shelf Downloads**: Download individual clips directly from the table or click **"Download Selected"** to batch-download all clips.
- **CSV Import / Export**: Import bulk timeframe lists or export your clip plan with formula injection protection.

### D. Private In-Browser Fallback Engine
- For local video files (MP4, WebM, MOV) or environments without a backend:
- Uses client-side HTML5 Canvas + Web Audio API (`AudioContext`) + `MediaRecorder`.
- 100% private, client-side, zero cloud upload.

---

## 3. Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Space` | Play / Pause video playback |
| `[` | Set Start Time to current playhead |
| `]` | Set End Time to current playhead |
| `←` / `→` | Seek backward / forward 5 seconds |
| `,` / `.` | Step back 1 frame / forward 1 frame (30fps) |
| `P` | Preview selected timeframe range |
| `L` | Toggle timeframe loop playback |
| `A` | Save current range to Multi-Clip shelf |
| `E` | Download current clip |

---

## 4. Production Deployment Considerations

### Personal / Team Use
Run locally via `npm run dev` or a local Node service. This provides the fastest download speeds because clips download and render directly through your machine's connection.

### Cloud Deployment (Render, Railway, Fly.io, or VPS)
To host the full-stack app with the direct URL clipper API:
1. Use a Node.js + Python Docker container or environment where `ffmpeg` and `yt-dlp` are present.
2. The `/api/clip` endpoint handles video clipping requests and streams MP4 attachments back to the client.

### Static Hosting (Vercel, Netlify, GitHub Pages)
If deployed purely as a static frontend (without a backend server):
- The app automatically falls back to **In-Browser Capture** and **Local File Clipping** (Canvas + MediaRecorder).
- Full source video download shortcuts and timestamp links remain available in the **Export Options** menu.
