import sys
import os
import argparse
import subprocess
import static_ffmpeg

# Ensure static ffmpeg & ffprobe are in PATH
static_ffmpeg.add_paths()

def to_time_str(val):
    try:
        s = float(val)
        hours = int(s // 3600)
        minutes = int((s % 3600) // 60)
        secs = s % 60
        return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"
    except ValueError:
        return str(val)

def main():
    parser = argparse.ArgumentParser(description="ClipForge High-Speed Video Clipper Engine")
    parser.add_argument("--url", required=True, help="Video URL")
    parser.add_argument("--start", required=True, help="Start time in seconds or timecode")
    parser.add_argument("--end", required=True, help="End time in seconds or timecode")
    parser.add_argument("--output", required=True, help="Output MP4 file path")
    parser.add_argument("--quality", default="4k", help="Target resolution quality: '4k', '1080p', or 'best'")

    args = parser.parse_args()

    start_str = to_time_str(args.start)
    end_str = to_time_str(args.end)
    section_spec = f"*{start_str}-{end_str}"

    # Determine format spec (4K vs 1080p)
    if args.quality in ("4k", "2160p", "best"):
        format_spec = "bestvideo[height<=2160]+bestaudio/best[height<=2160]/bestvideo+bestaudio/best"
    else:
        format_spec = "bestvideo[height<=1080]+bestaudio/best[height<=1080]/bestvideo+bestaudio/best"

    print(f"[clip_engine] Clipping section {section_spec} ({args.quality}) from '{args.url}' -> '{args.output}'", flush=True)

    cmd = [
        sys.executable, "-m", "yt_dlp",
        "--download-sections", section_spec,
        "--force-keyframes-at-cuts",
        "-f", format_spec,
        "--merge-output-format", "mp4",
        args.url,
        "-o", args.output,
        "--force-overwrites",
        "--no-playlist"
    ]

    result = subprocess.run(cmd)
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
