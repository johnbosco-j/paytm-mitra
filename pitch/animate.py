"""Add PowerPoint animations to a pptxgenjs deck.

- Slide transitions: Morph (PowerPoint 2019+/365), with a Fade fallback for older viewers.
- Entrance effects: every shape named "A:<effect>:<order>" animates automatically when the slide starts
  (no clicks needed), staggered by <order>. Effects: fade, rise (float up), left (slide in), zoom (grow), wipe (wipe up).
- Backgrounds named "!!bg" get a slow 12 s zoom (Ken Burns) emphasis.
Usage: python pitch/animate.py in.pptx out.pptx
"""

from __future__ import annotations

import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

STEP_MS = 280  # stagger between order groups
DUR = {"fade": 700, "rise": 800, "left": 700, "zoom": 650, "wipe": 900}

NS_MC = 'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"'
NS_P14 = 'xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main"'

TRANSITION = (
    '<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">'
    '<mc:Choice xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main" Requires="p159">'
    '<p:transition spd="slow" p14:dur="1600"><p159:morph option="byObject"/></p:transition>'
    "</mc:Choice>"
    '<mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback>'
    "</mc:AlternateContent>"
)


class Ids:
    def __init__(self) -> None:
        self.n = 2

    def __call__(self) -> int:
        self.n += 1
        return self.n


def tgt(spid: str) -> str:
    return f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl>'


def visible(ids: Ids, spid: str) -> str:
    return (f'<p:set><p:cBhvr><p:cTn id="{ids()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>'
            f'{tgt(spid)}<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>'
            '<p:to><p:strVal val="visible"/></p:to></p:set>')


def fade(ids: Ids, spid: str, dur: int, flt: str = "fade") -> str:
    return (f'<p:animEffect transition="in" filter="{flt}"><p:cBhvr><p:cTn id="{ids()}" dur="{dur}"/>{tgt(spid)}</p:cBhvr></p:animEffect>')


def move(ids: Ids, spid: str, dur: int, attr: str, frm: str) -> str:
    return (f'<p:anim calcmode="lin" valueType="num"><p:cBhvr additive="base"><p:cTn id="{ids()}" dur="{dur}" fill="hold">'
            f'<p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>{tgt(spid)}<p:attrNameLst><p:attrName>{attr}</p:attrName></p:attrNameLst></p:cBhvr>'
            f'<p:tavLst><p:tav tm="0"><p:val><p:strVal val="{frm}"/></p:val></p:tav>'
            f'<p:tav tm="100000"><p:val><p:strVal val="#{attr}"/></p:val></p:tav></p:tavLst></p:anim>')


def effect(ids: Ids, spid: str, kind: str, delay: int) -> str:
    dur = DUR.get(kind, 700)
    body = visible(ids, spid)
    preset = {"fade": 10, "rise": 42, "left": 2, "zoom": 53, "wipe": 22}.get(kind, 10)
    sub = {"left": 8, "wipe": 4}.get(kind, 0)
    if kind == "wipe":
        body += fade(ids, spid, dur, "wipe(up)")
    else:
        body += fade(ids, spid, dur)
    if kind == "rise":
        body += move(ids, spid, dur, "ppt_y", "#ppt_y+0.06")
    elif kind == "left":
        body += move(ids, spid, dur, "ppt_x", "#ppt_x-0.08")
    elif kind == "zoom":
        body += move(ids, spid, dur, "ppt_w", "#ppt_w*0.8") + move(ids, spid, dur, "ppt_h", "#ppt_h*0.8")
    return (f'<p:par><p:cTn id="{ids()}" presetID="{preset}" presetClass="entr" presetSubtype="{sub}" fill="hold" grpId="0" nodeType="withEffect">'
            f'<p:stCondLst><p:cond delay="{delay}"/></p:stCondLst><p:childTnLst>{body}</p:childTnLst></p:cTn></p:par>')


def kenburns(ids: Ids, spid: str) -> str:
    return (f'<p:par><p:cTn id="{ids()}" presetID="6" presetClass="emph" presetSubtype="0" fill="hold" grpId="1" nodeType="withEffect">'
            '<p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
            f'<p:animScale><p:cBhvr><p:cTn id="{ids()}" dur="12000" fill="hold"/>{tgt(spid)}</p:cBhvr><p:by x="108000" y="108000"/></p:animScale>'
            "</p:childTnLst></p:cTn></p:par>")


def timing(effects: list[tuple[str, str, int]], bg: str | None) -> str:
    ids = Ids()
    items = [kenburns(ids, bg)] if bg else []
    for spid, kind, order in effects:
        items.append(effect(ids, spid, kind, order * STEP_MS))
    if not items:
        return ""
    group = (f'<p:par><p:cTn id="{ids()}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/>'
             '<p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst><p:childTnLst>'
             f'<p:par><p:cTn id="{ids()}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
             + "".join(items) + "</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>")
    bld = "".join(f'<p:bldP spid="{s}" grpId="0"/>' for s, _, _ in effects if s in TEXT_SHAPES)
    return ('<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
            '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
            + group + "</p:childTnLst></p:cTn>"
            '<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
            '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>'
            "</p:childTnLst></p:cTn></p:par></p:tnLst>" + (f"<p:bldLst>{bld}</p:bldLst>" if bld else "") + "</p:timing>")


TEXT_SHAPES: set[str] = set()


def process_slide(xml: str) -> str:
    TEXT_SHAPES.clear()
    effects: list[tuple[str, str, int]] = []
    bg = None
    # each shape element: find its cNvPr id + name, and whether it's a text shape (p:sp with txBody)
    for m in re.finditer(r"<(p:sp|p:pic|p:graphicFrame)\b.*?</\1>", xml, re.S):
        el = m.group(0)
        c = re.search(r'<p:cNvPr id="(\d+)" name="([^"]*)"', el)
        if not c:
            continue
        spid, name = c.group(1), c.group(2)
        if name.startswith("A:"):
            _, kind, order = (name.split(":") + ["0"])[:3]
            effects.append((spid, kind, int(order or 0)))
            if m.group(1) == "p:sp" and "<p:txBody>" in el and "<a:t>" in el:
                TEXT_SHAPES.add(spid)
        elif name == "!!bg" and bg is None:
            bg = spid
    effects.sort(key=lambda e: e[2])
    root = re.match(r"(<\?xml[^>]*>\s*)?<p:sld\b[^>]*>", xml)
    head = root.group(0)
    new_head = head
    for ns in (NS_MC, NS_P14):
        if ns.split("=")[0] not in new_head:
            new_head = new_head[:-1] + " " + ns + ">"
    xml = xml.replace(head, new_head, 1)
    xml = re.sub(r"<mc:AlternateContent[^>]*>.*?</mc:AlternateContent>|<p:transition\b.*?</p:transition>|<p:transition\b[^>]*/>|<p:timing>.*?</p:timing>", "", xml, flags=re.S)
    insert = TRANSITION + timing(effects, bg)
    if "<p:extLst>" in xml.split("</p:clrMapOvr>")[-1]:
        idx = xml.rfind("<p:extLst>")
        return xml[:idx] + insert + xml[idx:]
    return xml.replace("</p:sld>", insert + "</p:sld>")


def main(src: str, dst: str) -> None:
    tmp = Path(tempfile.mkdtemp())
    with zipfile.ZipFile(src) as z:
        z.extractall(tmp)
    slides = sorted((tmp / "ppt" / "slides").glob("slide*.xml"), key=lambda p: int(re.findall(r"\d+", p.name)[0]))
    for p in slides:
        p.write_text(process_slide(p.read_text(encoding="utf-8")), encoding="utf-8")
    out = Path(dst)
    if out.exists():
        out.unlink()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        # [Content_Types].xml first, as Office expects
        z.write(tmp / "[Content_Types].xml", "[Content_Types].xml")
        for f in sorted(tmp.rglob("*")):
            if f.is_file() and f.name != "[Content_Types].xml":
                z.write(f, f.relative_to(tmp).as_posix())
    shutil.rmtree(tmp)
    print(f"animated {len(slides)} slides -> {dst}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
