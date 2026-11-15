"""Builds pitch/MITRA_Demo.mp4 from pitch/video/frames/*.png + pitch/video/script.json.

Narration: Sarvam bulbul (English, en-IN), one clip per scene, cached in pitch/video/audio/.
Run from services/api so the Sarvam adapter and key are available:
  cd services/api && .venv/bin/python ../../pitch/video/build.py
Needs ffmpeg and the caption PNGs (pitch/video/captions.cjs). Each scene = its frame with a slow push-in, a caption bar, and its narration (+0.5 s).
"""

import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
FRAMES, AUDIO, PARTS = HERE / "frames", HERE / "audio", HERE / "parts"
OUT = HERE.parent / "MITRA_Demo.mp4"
FPS = 30
for d in (AUDIO, PARTS):
    d.mkdir(exist_ok=True)
scenes = json.loads((HERE / "script.json").read_text())


def dur(path: Path) -> float:
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)]).strip())


t, timeline = 0.0, []
for s in scenes:
    wav = AUDIO / f"{s['id']}.wav"
    if not wav.exists():
        sys.path.insert(0, str(Path.cwd()))
        from app import sarvam

        wav.write_bytes(sarvam.tts(s["say"], "en"))
        print("voiced", s["id"])
    d = dur(wav) + 0.5
    frames = int(d * FPS)
    fc = (
        "[0:v]scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160,"
        f"zoompan=z='min(1+0.00035*on,1.07)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s=1920x1080:fps={FPS}[bg];"
        "[bg][1:v]overlay=0:H-h,format=yuv420p[v]"
    )
    part = PARTS / f"{s['id']}.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", str(FRAMES / f"{s['id']}.png"), "-i", str(HERE / "captions" / f"{s['id']}.png"),
                    "-i", str(wav), "-filter_complex", fc, "-map", "[v]", "-map", "2:a", "-af", "apad", "-t", f"{d:.2f}", "-r", str(FPS),
                    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2", str(part)], check=True)
    timeline.append((t, t + d, s))
    t += d
(HERE / "concat.txt").write_text("".join(f"file '{PARTS / (s['id'] + '.mp4')}'\n" for s in scenes))
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(HERE / "concat.txt"), "-c", "copy", "-movflags", "+faststart", str(OUT)], check=True)
fmt = lambda x: f"{int(x // 60)}:{int(x % 60):02d}"
lines = ["# MITRA demo video: narration with timeline", "", f"Total length: {fmt(t)} (limit 3:00). Voice: Sarvam bulbul, English.", "",
         "| Time | On screen | Narration |", "|---|---|---|"]
lines += [f"| {fmt(a)}–{fmt(b)} | {s['caption']} | {s['say']} |" for a, b, s in timeline]
(HERE / "SCRIPT.md").write_text("\n".join(lines) + "\n")
print("built", OUT, fmt(t), f"{OUT.stat().st_size / 1e6:.1f} MB")
