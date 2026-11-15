"""Builds pitch/MITRA_Demo.mp4: deck slides + live screen recordings of the app, narrated by Sarvam bulbul.

Inputs: script.json (scene order, captions, narration), slides/s-NN.png (deck pages, `pdftoppm -r 192`),
clips/<name>.webm (record.cjs), captions/<id>.png (captions.cjs).
Run from services/api (needs the Sarvam key only for narration clips not yet cached in audio/):
  cd services/api && .venv/bin/python ../../pitch/video/build.py
Each scene lasts as long as its narration + 0.5 s. Slides get a slow push-in; clips are re-timed (0.6x-1.7x) to fit,
then held on their last frame if still short.
"""

import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AUDIO, PARTS, TMP = HERE / "audio", HERE / "parts", HERE / "parts" / "src"
OUT = HERE.parent / "MITRA_Demo.mp4"
FPS = 30
for d in (AUDIO, PARTS, TMP):
    d.mkdir(exist_ok=True)
scenes = json.loads((HERE / "script.json").read_text())
ENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-ac", "2"]


def run(*a):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *map(str, a)], check=True)


def dur(path: Path) -> float:
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)]).strip())


t, timeline = 0.0, []
for s in scenes:
    wav = AUDIO / f"{s['id']}.wav"
    if not wav.exists() or (AUDIO / f"{s['id']}.txt").read_text() != s["say"] if (AUDIO / f"{s['id']}.txt").exists() else not wav.exists():
        sys.path.insert(0, str(Path.cwd()))
        from app import sarvam

        wav.write_bytes(sarvam.tts(s["say"], "en"))
        print("voiced", s["id"])
    (AUDIO / f"{s['id']}.txt").write_text(s["say"])
    d = dur(wav) + 0.5
    cap = HERE / "captions" / f"{s['id']}.png"
    part = PARTS / f"{s['id']}.mp4"
    if s["kind"] == "slide":
        fc = ("[0:v]scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160,"
              f"zoompan=z='min(1+0.0003*on,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={int(d * FPS)}:s=1920x1080:fps={FPS}[bg];"
              "[bg][1:v]overlay=0:H-h,format=yuv420p[v]")
        run("-loop", "1", "-i", HERE / "slides" / f"{s['src']}.png", "-i", cap, "-i", wav, "-filter_complex", fc, "-map", "[v]", "-map", "2:a",
            "-af", "apad", "-t", f"{d:.2f}", "-r", FPS, *ENC, part)
    else:
        src = TMP / f"{s['src']}.mp4"  # webm from the screencast has no duration header: normalise first
        run("-i", HERE / "clips" / f"{s['src']}.webm", "-vf", f"fps={FPS},scale=1920:1080", "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "18", src)
        speed = min(1.7, max(0.6, dur(src) / d))  # >1 = play faster
        fc = (f"[0:v]setpts=PTS/{speed:.4f},tpad=stop_mode=clone:stop_duration=60[bg];[bg][1:v]overlay=0:H-h,format=yuv420p[v]")
        run("-i", src, "-i", cap, "-i", wav, "-filter_complex", fc, "-map", "[v]", "-map", "2:a", "-af", "apad", "-t", f"{d:.2f}", "-r", FPS, *ENC, part)
        print(f"clip {s['src']}: {dur(src):.1f}s fitted to {d:.1f}s at {speed:.2f}x")
    timeline.append((t, t + d, s))
    t += d
(HERE / "concat.txt").write_text("".join(f"file '{PARTS / (s['id'] + '.mp4')}'\n" for s in scenes))
run("-f", "concat", "-safe", "0", "-i", HERE / "concat.txt", "-c", "copy", "-movflags", "+faststart", OUT)
fmt = lambda x: f"{int(x // 60)}:{int(x % 60):02d}"  # noqa: E731
lines = ["# MITRA demo film: voice script with timeline", "", f"Total length: {fmt(t)} (limit 3:00). Voice: Sarvam bulbul, English.", "",
         "| Time | Picture | Caption on screen | Voice |", "|---|---|---|---|"]
lines += [f"| {fmt(a)}–{fmt(b)} | {'deck slide' if s['kind'] == 'slide' else 'live app recording'} | {s['caption']} | {s['say']} |" for a, b, s in timeline]
(HERE / "SCRIPT.md").write_text("\n".join(lines) + "\n")
print("built", OUT.name, fmt(t), f"{OUT.stat().st_size / 1e6:.1f} MB")
