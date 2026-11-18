# ClipForge: Editorial Video Clipping Studio

**ClipForge** is a specialized, design-led video clipping web application built for precision timeframe extraction, multi-range sequencing, and private in-browser rendering.

## 1. Design Philosophy

ClipForge rejects generic dark-theme SaaS dashboards, purple/blue gradients, and decorative AI sparkles. It implements an intentional, editorial creative-tool aesthetic inspired by independent publishing and professional media suites.

### Color System
- Primary Page Background: `#FAF8F2` (Warm Ivory)
- Primary Action Accent: `#FE5936` (Vivid Coral)
- Secondary Highlight Accent: `#C9E865` (Electric Lime)
- Primary Typography: `#202822` (Deep Botanical Ink)
- Card Background: `#FFFFFF` (Clean White)
- Borders and Dividers: `#E8E3D8` (Subtle Warm Stone)
- Secondary Typography: `#6B7169` (Muted Olive-Gray)
- Muted Surfaces: `#F1EFE8` (Soft Warm Neutral)
- Success Indicators: `#3C7458` (Refined Forest Green)
- Error Indicators: `#C4493F` (Warm Muted Red)

### Typographic Hierarchy
- Headings: Manrope and Plus Jakarta Sans
- Interface Text: Inter
- Timecodes, Metrics and Rulers: IBM Plex Mono (Tabular numerals enabled with `font-feature-settings: "tnum" 1`)

## 2. Core Workflows

### A. Universal Source Resolution
- YouTube: Resolves standard video URLs (`/watch?v=`), Shorts (`/shorts/`), embeds, live streams, and timestamp parameters (`?t=`).
- Instagram: Recognizes Reels and post links.
- Facebook: Recognizes Reels and video posts.
- Direct Streams and Local Files: Supports direct HTTP/HTTPS media endpoints as well as local MP4, WebM, and MOV files via drag-and-drop or file browsing.
- Embedded Planning vs Direct Export: Embedded platforms (YouTube, IG, FB) protect raw byte streams via DRM and CORS; ClipForge accurately presents embed preview and timestamp planning with shareable editor instructions, while offering local file ingest for direct export.

### B. Manual Timeframe Clipping
- Two Prominent Fields: `START TIME (IN)` and `END TIME (OUT)` with millisecond precision (`HH:MM:SS.mmm`).
- Interactive Fine Steppers: Increment/decrement controls (`±1s`, `±100ms`).
- Playhead Alignment: "Set to Playhead" (`[In]` and `[Out]`).
- Dynamic Duration Badge: Real-time display of selected duration.
- Input Validation: Strict rejection of negative timestamps, start >= end, end beyond duration, or selections under 100ms with human-readable error banners.
- Interactive Timeline:
  - High-contrast playhead needle with hover timecode tags.
  - Coral trim handles (draggable start and end handles, with full touch screen support for mobile and tablet).
  - Lime-colored selected timeframe region.
  - Neutral ruler marks and tick scales.
  - Multi-clip background overlays displaying other clips in relation.
- Quick Duration Presets: 5s, 10s, 15s, 30s, 45s, 60s, 90s, 3m, 5m, Custom with anchor modes (Start @ Playhead, Center @ Playhead, End @ Playhead).
- Timeframe Playback: Preview selection, loop playback within range, frame stepping (`-1f` / `+1f`), fast seek (`±5s`).

### C. Multi-Clip Workspace and Bulk Timeframe Parser
- Unlimited Non-Destructive Ranges: References to the source video without duplicating media memory.
- Clip Collection Table: Number, custom editable name, start, end, duration, preview, duplicate, remove, and export.
- Mobile Responsive Switcher: Toggle seamlessly between Video Player and Clips Table on mobile and tablet screens.
- Sorting and Filtering: Sort by timestamp, duration, or name; filter with search bar.
- Bulk Timeframe Parser:
  - Paste newline-separated or CSV ranges: e.g. `00:01:20 - 00:01:55, Key Takeaway`.
  - Row-by-row validation report, duplicate detection, overlap alerts.
  - Append to collection or replace existing.
  - CSV import and CSV export.

### D. Private In-Browser Clipping Engine
- 100% Client-Side: No cloud upload, no server dependencies.
- Synchronized Audio and Video: Uses HTML5 Canvas + Web Audio API (`AudioContext` / `MediaStreamDestination`) + `MediaRecorder`.
- Framing and Aspect Presets:
  - Original Aspect Ratio
  - 9:16 (YouTube Shorts, Instagram Reels, TikTok)
  - 16:9 (Horizontal Widescreen)
  - 1:1 (Square Feed)
  - 4:5 (Portrait Feed)
  - Crop-to-fill vs Fit-with-padding
- Metadata Sanitization: Automatically strips GPS coordinates, camera serial numbers, author tags, and creation dates.
- Background Render Queue: Real-time progress percentage, terminal logs, pause/cancel, retry, single download, and one-click ZIP packaging via JSZip.

### E. Persistent Local Projects and Storage
- IndexedDB: Persistent storage for projects, clips, and exported media.
- Storage Indicator: Live byte quota estimator.
- Project Manifests: Export and import portable `.clipforge.json` manifests.

## 3. Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Space` | Play / Pause video playback |
| `[` | Set Start Time (IN Point) to current playhead |
| `]` | Set End Time (OUT Point) to current playhead |
| `←` / `→` | Seek backward / forward 5 seconds |
| `,` / `.` | Step back 1 frame / forward 1 frame (30fps) |
| `P` | Preview selected timeframe range |
| `L` | Toggle timeframe loop playback |
| `A` | Add current range to Multi-Clip collection |
| `E` | Quick export current clip |

## 4. Deploying to Vercel

```bash
# Push to GitHub, then run on Vercel or deploy via CLI:
npx vercel
```
A configured `vercel.json` with SPA rewrites and modern COOP/COEP headers is included in the root directory.
