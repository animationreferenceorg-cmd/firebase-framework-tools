#!/usr/bin/env python3
"""
AnimationReference.org — Automated 10-Second 9:16 Social Reel Generator (Instagram / TikTok / YouTube Shorts)

Takes any local MP4 clip (or a folder of clips via --batch) and renders a ready-to-post
1080x1920 vertical video featuring:
  1. Normal 1x speed playback (first pass)
  2. Smooth 0.25x slow-motion frame-study replay (second pass)
  3. Live burned-in 24 FPS frame counter (F 001, F 002, ...)
  4. Optional frame-timing beat callout bar (e.g. "Anticipation: 5f | Hit: 2f | Follow-through: 11f")
  5. Clean AnimationReference.org obsidian-violet studio branding + Maya & Blender Plugin CTA

Requirements:
  - ffmpeg on PATH (or set FFMPEG_BIN env var)

Examples:
  Single clip:
    python scripts/generate-social-reel.py clip.mp4 --title "Heavy Walk Cycle" --beats "Contact: f1 | Down: f4 | Passing: f7 | Up: f10" --out reel_walk.mp4

  Batch a whole week of clips (7 clips in a folder):
    python scripts/generate-social-reel.py --batch ./raw_clips --out-dir ./ready_reels
"""

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path


def find_ffmpeg() -> str:
    env_bin = os.environ.get("FFMPEG_BIN")
    if env_bin and os.path.isfile(env_bin):
        return env_bin
    found = shutil.which("ffmpeg")
    if found:
        return found
    # Common Windows Scoop/Winget/Blender/imageio-ffmpeg locations
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        pass
    raise RuntimeError("ffmpeg not found. Install ffmpeg or pip install imageio-ffmpeg.")


def esc_drawtext(text: str) -> str:
    """Escape characters for ffmpeg drawtext filter."""
    return (
        text.replace("\\", "\\\\")
        .replace(":", "\\:")
        .replace("'", "\\'")
        .replace("%", "\\%")
    )


def find_fontfile() -> str:
    """Locate a bold sans-serif TTF font so ffmpeg drawtext works on Windows without fontconfig."""
    candidates = [
        r"C:\Windows\Fonts\segoeuib.ttf",
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\calibrib.ttf",
        r"C:\Windows\Fonts\segoeui.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for path in candidates:
        if os.path.isfile(path):
            # Escape drive colon for ffmpeg drawtext filter syntax (C\:/Windows/...)
            return path.replace("\\", "/").replace(":", "\\:")
    return ""


def build_reel(
    ffmpeg: str,
    input_path: Path,
    output_path: Path,
    title: str,
    beats: str,
    normal_sec: float = 3.0,
    slow_sec: float = 7.0,
    fps: int = 24,
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    safe_title = esc_drawtext(title.strip() or input_path.stem.replace("_", " ").replace("-", " ").title())
    safe_beats = esc_drawtext(beats.strip() or "Study timing, arcs & spacing at 24 FPS")
    brand_top = esc_drawtext("ANIMATIONREFERENCE.ORG  |  24 FPS FRAME STUDY")
    cta_bottom = esc_drawtext("Free Maya & Blender Plugins  ->  AnimationReference.org")
    font_path = find_fontfile()
    font_opt = f"fontfile='{font_path}':" if font_path else ""

    # Build a clean 1080x1920 obsidian-violet vertical canvas:
    # - Segment 1: 1x normal speed (normal_sec) with "1x REAL TIME" badge
    # - Segment 2: 0.25x slow-motion study (slow_sec) with "0.25x FRAME STUDY" badge + live 24fps frame counter
    filter_complex = (
        f"[0:v]fps={fps},scale=1080:1080:force_original_aspect_ratio=decrease,"
        f"pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=#0b0916,setsar=1,split=2[v_norm_in][v_slow_in];"
        # Normal 1x pass
        f"[v_norm_in]trim=0:{normal_sec},setpts=PTS-STARTPTS,"
        f"drawbox=x=0:y=0:w=1080:h=250:color=#0b0916@0.92:t=fill,"
        f"drawbox=x=0:y=1620:w=1080:h=300:color=#0b0916@0.94:t=fill,"
        f"drawtext={font_opt}text='{brand_top}':fontcolor=#c4b5fd:fontsize=28:x=(w-text_w)/2:y=95,"
        f"drawtext={font_opt}text='{safe_title}':fontcolor=white:fontsize=54:x=(w-text_w)/2:y=155,"
        f"drawbox=x=60:y=295:w=270:h=58:color=#7c3aed@0.9:t=fill,"
        f"drawtext={font_opt}text='1x  REAL TIME':fontcolor=white:fontsize=28:x=88:y=311,"
        f"drawtext={font_opt}text='{safe_beats}':fontcolor=#e4e4e7:fontsize=30:x=(w-text_w)/2:y=1675,"
        f"drawtext={font_opt}text='{cta_bottom}':fontcolor=#a78bfa:fontsize=30:x=(w-text_w)/2:y=1760[v1];"
        # 0.25x slow-motion pass with live frame counter
        f"[v_slow_in]trim=0:{slow_sec / 4.0:.3f},setpts=4.0*(PTS-STARTPTS),fps={fps},"
        f"drawbox=x=0:y=0:w=1080:h=250:color=#0b0916@0.92:t=fill,"
        f"drawbox=x=0:y=1620:w=1080:h=300:color=#0b0916@0.94:t=fill,"
        f"drawtext={font_opt}text='{brand_top}':fontcolor=#c4b5fd:fontsize=28:x=(w-text_w)/2:y=95,"
        f"drawtext={font_opt}text='{safe_title}':fontcolor=white:fontsize=54:x=(w-text_w)/2:y=155,"
        f"drawbox=x=60:y=295:w=355:h=58:color=#db2777@0.92:t=fill,"
        f"drawtext={font_opt}text='0.25x  FRAME STUDY':fontcolor=white:fontsize=28:x=84:y=311,"
        f"drawbox=x=760:y=295:w=260:h=58:color=#11101d@0.9:t=fill,"
        f"drawtext={font_opt}text='F %{{eif\\:n/4+1\\:d\\:3}} / 24FPS':fontcolor=#38bdf8:fontsize=28:x=786:y=311,"
        f"drawtext={font_opt}text='{safe_beats}':fontcolor=#e4e4e7:fontsize=30:x=(w-text_w)/2:y=1675,"
        f"drawtext={font_opt}text='{cta_bottom}':fontcolor=#a78bfa:fontsize=30:x=(w-text_w)/2:y=1760[v2];"
        f"[v1][v2]concat=n=2:v=1:a=0[vout]"
    )

    cmd = [
        ffmpeg,
        "-y",
        "-i",
        str(input_path),
        "-filter_complex",
        filter_complex,
        "-map",
        "[vout]",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(output_path),
    ]
    print(f"[ReelGen] Rendering {output_path.name} from {input_path.name}...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"ffmpeg failed for {input_path.name}:\n{res.stderr[-800:]}")
    print(f"[ReelGen] Done -> {output_path} ({output_path.stat().st_size // 1024} KB)")


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate 10-second 9:16 AnimationReference.org Reels/TikToks.")
    parser.add_argument("input", nargs="?", help="Path to a single input MP4/WEBM/MOV clip")
    parser.add_argument("--title", default="", help="Title overlay (defaults to filename)")
    parser.add_argument("--beats", default="Anticipation: 5f | Peak: 2f | Follow-through: 11f", help="Frame-timing callout text")
    parser.add_argument("--out", default="", help="Output MP4 path (single mode)")
    parser.add_argument("--batch", default="", help="Folder of input clips to batch-render")
    parser.add_argument("--out-dir", default="marketing/reels", help="Output folder (batch mode)")
    parser.add_argument("--normal-sec", type=float, default=3.0, help="Duration of 1x pass (seconds)")
    parser.add_argument("--slow-sec", type=float, default=7.0, help="Duration of 0.25x slow-mo pass (seconds)")
    args = parser.parse_args()

    ffmpeg = find_ffmpeg()

    if args.batch:
        src_dir = Path(args.batch)
        out_dir = Path(args.out_dir)
        clips = sorted(
            p for p in src_dir.iterdir()
            if p.is_file() and p.suffix.lower() in {".mp4", ".mov", ".webm", ".mkv"}
        )
        if not clips:
            print(f"No video files found in {src_dir}")
            return 1
        for clip in clips:
            out_file = out_dir / f"{clip.stem}_reel_9x16.mp4"
            build_reel(ffmpeg, clip, out_file, args.title or clip.stem.replace("_", " ").replace("-", " ").title(), args.beats, args.normal_sec, args.slow_sec)
        print(f"\nBatch complete! {len(clips)} ready-to-post 9:16 Reels saved to {out_dir}")
        return 0

    if not args.input:
        parser.print_help()
        return 1

    inp = Path(args.input)
    if not inp.is_file():
        print(f"Input file not found: {inp}")
        return 1
    out = Path(args.out) if args.out else Path(args.out_dir) / f"{inp.stem}_reel_9x16.mp4"
    build_reel(ffmpeg, inp, out, args.title, args.beats, args.normal_sec, args.slow_sec)
    return 0


if __name__ == "__main__":
    sys.exit(main())
