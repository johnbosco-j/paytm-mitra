"""Generate the 3D story's voice lines with Gemini text-to-speech (run once; outputs apps/web/public/audio/*.m4a)."""
import base64, os, struct, subprocess, sys, httpx

KEY = os.environ["GEMINI_API_KEY"]
OUT = sys.argv[1] if len(sys.argv) > 1 else "apps/web/public/audio"
LINES = {  # step id: (voice, direction, line)
    "ask": ("Aoede", "Say it hopefully, like a young woman at a small Chennai shop counter, in natural spoken Tamil", "அண்ணா, மாம்பழ லஸ்ஸி இருக்கா?"),
    "illa": ("Charon", "Say it gently and a little apologetically, like a kind middle-aged Tamil shopkeeper", "இல்லம்மா… நம்ம கடையில அது இல்ல."),
    "blind": ("Kore", "Say it softly, like a thoughtful documentary narrator", "No payment. No record. The QR never knew she asked."),
    "listen": ("Charon", "Say it casually into a phone, like a Tamil shopkeeper making a quick note", "இன்னைக்கு எட்டு பேர் மாம்பழ லஸ்ஸி கேட்டாங்க."),
    "evaluate": ("Sulafat", "Say it warmly and reassuringly, like a trusted business friend, in Tamil", "இந்த வாரம் இருபத்தி நாலு பேர் கேட்டாங்க. முதல்ல பதினாறு பாட்டில் வாங்கிப் பாருங்க."),
    "prove": ("Sulafat", "Say it with a happy, proud smile, in Tamil", "பதினாறுல பதினாலு வித்துச்சு. நூற்றி எண்பத்தி இரண்டு ரூபாய் லாபம்!"),
    "cta": ("Kore", "Say it confidently and warmly, like the closing line of a film", "Every QR knows what sold. MITRA hears what didn't."),
}
MODELS = ["gemini-2.5-flash-preview-tts", "gemini-3.1-flash-tts-preview", "gemini-3.8-flash-tts"]

for step, (voice, direction, line) in LINES.items():
    body = {"contents": [{"parts": [{"text": f"{direction}: {line}"}]}],
            "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
    if os.path.exists(f"{OUT}/{step}.m4a"):
        print("skip", step)
        continue
    for m in MODELS * 2:
        r = httpx.post(f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent", json=body, headers={"x-goog-api-key": KEY}, timeout=60)
        try:
            part = r.json()["candidates"][0]["content"]["parts"][0]["inlineData"] if r.status_code == 200 else None
        except (KeyError, IndexError, ValueError):
            part = None
        if part:
            pcm = base64.b64decode(part["data"])
            wav = f"{OUT}/{step}.wav"
            with open(wav, "wb") as f:
                f.write(b"RIFF" + struct.pack("<I", 36 + len(pcm)) + b"WAVEfmt " + struct.pack("<IHHIIHH", 16, 1, 1, 24000, 48000, 2, 16) + b"data" + struct.pack("<I", len(pcm)) + pcm)
            subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "64000", wav, f"{OUT}/{step}.m4a"], check=True)
            os.remove(wav)
            print("ok", step, m, voice)
            break
    else:
        print("FAILED", step, r.status_code, r.text[:120])
