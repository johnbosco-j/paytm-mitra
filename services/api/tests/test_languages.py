"""All 22 scheduled languages: registry, detection and API validation."""

from conftest import signup

from app import ai, langs


def test_registry_has_the_22_scheduled_languages():
    sched = [lang for lang in langs.LANGUAGES if lang.scheduled]
    assert len(sched) == 22
    assert {
        "as",
        "bn",
        "brx",
        "doi",
        "gu",
        "hi",
        "kn",
        "ks",
        "kok",
        "mai",
        "ml",
        "mni",
        "mr",
        "ne",
        "or",
        "pa",
        "sa",
        "sat",
        "sd",
        "ta",
        "te",
        "ur",
    } == {lang.code for lang in sched}


def test_detects_language_by_script_and_code_mix():
    cases = {
        "இன்னைக்கு எட்டு பேர் மாம்பழ லஸ்ஸி கேட்டாங்க": "ta",
        "आज आठ लोगों ने मैंगो लस्सी माँगी": "hi",
        "আজ আটজন ম্যাঙ্গো লস্যি চাইল": "bn",
        "ఈరోజు ఎనిమిది మంది మ్యాంగో లస్సీ అడిగారు": "te",
        "ഇന്ന് എട്ട് പേർ മാംഗോ ലസ്സി ചോദിച്ചു": "ml",
        "ಇಂದು ಎಂಟು ಜನ ಮ್ಯಾಂಗೋ ಲಸ್ಸಿ ಕೇಳಿದರು": "kn",
        "આજે આઠ લોકોએ મેંગો લસ્સી માંગી": "gu",
        "ਅੱਜ ਅੱਠ ਲੋਕਾਂ ਨੇ ਮੈਂਗੋ ਲੱਸੀ ਮੰਗੀ": "pa",
        "ଆଜି ଆଠ ଜଣ ମାଙ୍ଗୋ ଲସି ମାଗିଲେ": "or",
        "আজি আঠজনে মেংগো লাচ্চি বিচাৰিলে": "as",
        "آج آٹھ لوگوں نے مینگو لسی مانگی": "ur",
        "ᱛᱮᱦᱮᱧ ᱤᱨᱟᱞ ᱦᱚᱲ": "sat",
        "ꯉꯁꯤ ꯃꯤ ꯅꯤꯄꯥꯟ": "mni",
        "आज आठ जणांनी मँगो लस्सी मागितली, संपले आहे": "mr",
        "innaiku ettu per mango lassi ketanga, illa nu sonnen": "ta-Latn",
        "aaj aath log mango lassi maang rahe the, khatam ho gaya hai": "hi-Latn",
        "eight customers asked for mango lassi today": "en",
    }
    for text, want in cases.items():
        assert langs.detect(text) == want, (text, langs.detect(text))


def test_language_aliases_and_support_flags():
    assert langs.get("ta-en").code == "ta-Latn"
    assert langs.get("hi-IN").code == "hi"
    assert langs.get("xx") is None
    bodo = langs.REGISTRY["brx"].support()
    assert bodo["cloud"] and not bodo["offline_stt"] and not bodo["offline_llm"]
    assert langs.REGISTRY["bn"].support()["offline_stt"]


def test_store_accepts_any_scheduled_language_and_rejects_unknown(client):
    c = client
    signup(c, "lang.owner@mitra.test")
    r = c.post("/api/stores", json={"name": "Kolkata Stores", "language": "bn"})
    assert r.status_code == 201, r.text
    sid = r.json()["id"]
    c.headers["X-Store-Id"] = sid
    assert c.patch("/api/store", json={"language": "mni"}).json()["language"] == "mni"
    assert c.patch("/api/store", json={"language": "klingon"}).status_code == 422
    body = c.get("/api/languages").json()
    assert body["scheduled"] == 22 and len([x for x in body["languages"] if x["scheduled"]]) == 22


def test_rules_fallback_labels_language_from_the_note(monkeypatch):
    monkeypatch.setattr(ai, "ai_available", lambda: False)
    monkeypatch.setattr(ai, "local_status", lambda: {"available": False})
    res = ai.extract_requests(text="आज आठ लोगों ने लस्सी माँगी", catalog_names=[], language_hint="ta")
    assert res.language == "hi"
