#!/usr/bin/env python3
"""
Build the screenshots and printable PDF for the AI Final Lab Tasks.

Each program is rendered as a complete VS Code (Dark+) window — Windows
title bar with menus, activity bar, breadcrumbs, minimap, indent guides,
bracket-pair colours, cursor and current-line highlight — and each
program's real console output as the integrated PowerShell terminal panel.
The screenshots are then laid out into the submission PDF.

    python3 build_submission_pdf.py
"""
import html
import os
import re
import subprocess
import sys

# ----------------------------------------------------------------------
# EDIT THESE, then re-run the script to regenerate everything.
# ----------------------------------------------------------------------
STUDENT_NAME = "Minhazul Abedin"
STUDENT_ID = "21-44625-1"
SECTION = "C"
SEMESTER = "Summer 25-26"
COURSE = "Artificial Intelligence — Final Lab Task"
PROMPT = "PS C:\\Users\\Minhaz\\Desktop\\AI Lab>"
WORKSPACE = "AI Lab"
PYVER = "3.11.4"
# ----------------------------------------------------------------------

HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(HERE, "screenshots")
SHELL = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell"

WIN_W = 1000                 # CSS px, whole VS Code window
ED_LINE = 20                 # editor line height at 13px Cascadia
VIEWPORT = 32                # visible editor lines per screenshot
TM_LINE = 17                 # terminal line height at 12px

MONO = '"Cascadia Mono","DejaVu Sans Mono",monospace'
UI = '"Segoe UI","Liberation Sans","DejaVu Sans",sans-serif'

CONTROL = {"if", "elif", "else", "while", "for", "break", "continue", "return",
           "pass", "in", "not", "and", "or", "is", "import", "from", "try",
           "except", "finally", "with", "as"}
KEYWORD = {"def", "class", "True", "False", "None", "lambda", "global"}
BRACKET_COLORS = ["#ffd700", "#da70d6", "#179fff"]

TOKEN_RE = re.compile(
    r"(?P<comment>\#[^\n]*)"
    r"|(?P<string>[fFrRbB]{0,2}(?:\"[^\"\n]*\"|'[^'\n]*'))"
    r"|(?P<number>\b\d+\.?\d*\b)"
    r"|(?P<name>[A-Za-z_]\w*)"
)


def hl_string(text):
    """f-string: literal part orange, {expression} parts variable-blue."""
    out = []
    for i, part in enumerate(re.split(r"(\{[^{}]*\})", text)):
        if not part:
            continue
        if i % 2 and part.startswith("{"):
            out.append('<span class="t-var">%s</span>' % html.escape(part))
        else:
            out.append('<span class="t-str">%s</span>' % html.escape(part))
    return "".join(out)


class Highlighter:
    """VS Code Dark+ token colours with persistent bracket-pair depth."""

    def __init__(self):
        self.depth = 0

    def gap(self, text):
        out = []
        for ch in text:
            if ch in "([{":
                out.append('<span style="color:%s">%s</span>'
                           % (BRACKET_COLORS[self.depth % 3], html.escape(ch)))
                self.depth += 1
            elif ch in ")]}":
                self.depth = max(0, self.depth - 1)
                out.append('<span style="color:%s">%s</span>'
                           % (BRACKET_COLORS[self.depth % 3], html.escape(ch)))
            else:
                out.append(html.escape(ch))
        return "".join(out)

    def run(self, code):
        out, pos, prev = [], 0, ""
        for m in TOKEN_RE.finditer(code):
            out.append(self.gap(code[pos:m.start()]))
            text, kind = m.group(0), m.lastgroup
            if kind == "comment":
                out.append('<span class="t-com">%s</span>' % html.escape(text))
            elif kind == "string":
                out.append(hl_string(text))
            elif kind == "number":
                out.append('<span class="t-num">%s</span>' % html.escape(text))
            else:
                after = code[m.end():m.end() + 1]
                if text in CONTROL:
                    cls = "t-ctl"
                elif text in KEYWORD:
                    cls = "t-kw"
                elif prev == "def" or after == "(":
                    cls = "t-fn"
                else:
                    cls = "t-var"
                out.append('<span class="%s">%s</span>' % (cls, html.escape(text)))
                prev = text
            if kind != "comment":
                prev = text if kind == "name" else ""
            pos = m.end()
        out.append(self.gap(code[pos:]))
        return "".join(out)


def guide_widths(lines):
    """Indent-guide span width (in ch) per line; blank lines bridge blocks."""
    ind = [len(l) - len(l.lstrip()) if l.strip() else None for l in lines]
    widths = []
    for i, v in enumerate(ind):
        if v is None:
            prev = next((x for x in reversed(ind[:i]) if x is not None), 0)
            nxt = next((x for x in ind[i + 1:] if x is not None), 0)
            v = min(prev, nxt)
        widths.append(v)
    return widths


def render_lines(code, cursor_line=None):
    """Whole file -> per-line divs with guides, bracket colours, cursor."""
    lines = code.split("\n")
    hl = Highlighter().run(code).split("\n")
    widths = guide_widths(lines)
    out = []
    for i, (src, colored) in enumerate(zip(lines, hl)):
        guide = ('<span class="guide" style="width:%dch"></span>' % widths[i]
                 if widths[i] >= 4 else "")
        cur = ' cur' if cursor_line == i + 1 else ''
        caret = '<span class="caret"></span>' if cursor_line == i + 1 else ''
        out.append('<div class="line%s">%s%s%s</div>' % (cur, guide, colored, caret))
    return out


SVG = {
    "files": '<path d="M13.5 4H7v16h11V8.5L13.5 4z"/><path d="M13.5 4v4.5H18"/>',
    "search": '<circle cx="10.5" cy="10.5" r="5"/><path d="M14.5 14.5L19 19"/>',
    "git": '<circle cx="7.5" cy="6.5" r="2"/><circle cx="7.5" cy="17.5" r="2"/>'
           '<circle cx="16.5" cy="9" r="2"/><path d="M7.5 8.5v7M9 15.5c4-1 7.5-2 7.5-4.5"/>',
    "debug": '<path d="M8 5.5l11 6.5-11 6.5z"/>',
    "ext": '<rect x="5" y="5" width="6" height="6"/><rect x="5" y="13" width="6" height="6"/>'
           '<rect x="13" y="13" width="6" height="6"/><rect x="14.5" y="3.5" width="6" height="6" transform="rotate(15 17.5 6.5)"/>',
    "account": '<circle cx="12" cy="9" r="3.5"/><path d="M5.5 19.5c1.5-4 11.5-4 13 0"/>',
    "gear": '<circle cx="12" cy="12" r="3"/><path d="M12 7V4.5M12 19.5V17M17 12h2.5M4.5 12H7'
            'M15.5 8.5l1.8-1.8M6.7 17.3l1.8-1.8M15.5 15.5l1.8 1.8M6.7 6.7l1.8 1.8"/>',
}
def icon(name):
    return ('<svg viewBox="0 0 24 24" width="24" height="24" fill="none" '
            'stroke="#858585" stroke-width="1.5">%s</svg>' % SVG[name])


CSS = """
* { box-sizing:border-box; margin:0; padding:0; }
html,body { height:100%%; }
body { background:#1e1e1e; font-family:%(ui)s; -webkit-font-smoothing:antialiased; }
.win { width:100%%; height:100%%; display:flex; flex-direction:column; background:#1e1e1e; overflow:hidden; }

.tb { height:32px; flex:0 0 32px; background:#3c3c3c; color:#cccccc; font-size:12px;
      display:flex; align-items:center; position:relative; }
.tb .logo { margin:0 4px 0 10px; }
.tb .menu { padding:0 8px; }
.tb .title { flex:1 1 auto; text-align:center; white-space:nowrap;
             overflow:hidden; text-overflow:ellipsis; padding:0 12px; }
.tb .ctrls { margin-left:auto; display:flex; height:100%%; }
.tb .ctrl { width:46px; display:flex; align-items:center; justify-content:center;
            font-size:13px; font-family:%(ui)s; }
.tb .ctrl svg { stroke:#cccccc; stroke-width:1; fill:none; }

.tabs { height:35px; flex:0 0 35px; background:#252526; display:flex; }
.tab { background:#1e1e1e; color:#ffffff; font-size:13px; padding:0 10px;
       display:flex; align-items:center; gap:6px; }
.tab .x { color:#8a8a8a; margin-left:8px; font-size:14px; }
.pyicon { width:13px; height:13px; border-radius:2px; flex:0 0 13px;
          background:linear-gradient(135deg,#3c78aa 50%%,#ffd845 50%%); }

.crumbs { height:22px; flex:0 0 22px; background:#1e1e1e; color:#a9a9a9; font-size:11.5px;
          display:flex; align-items:center; gap:5px; padding-left:14px; }

.main { flex:1 1 auto; display:flex; min-height:0; }
.edwrap, .minimap { min-height:0; }
.abar { width:48px; flex:0 0 48px; background:#333333; display:flex; flex-direction:column;
        align-items:center; padding:6px 0; gap:14px; }
.abar .grow { flex:1 1 auto; }

.edwrap { flex:1 1 auto; display:flex; min-width:0; }
.gut { color:#858585; text-align:right; width:56px; flex:0 0 56px; padding-right:18px;
       font-family:%(mono)s; font-size:13px; line-height:%(el)dpx; white-space:pre; }
.gut .cur { color:#c6c6c6; }
.codearea { flex:1 1 auto; font-family:%(mono)s; font-size:13px; line-height:%(el)dpx;
            color:#d4d4d4; min-width:0; }
.line { white-space:pre; position:relative; height:%(el)dpx; }
.line.cur { background:#ffffff0a; outline:1px solid #282828; }
.guide { position:absolute; left:0; top:0; bottom:0;
         background:repeating-linear-gradient(90deg,#404040 0 1px,transparent 1px 4ch); }
.caret { display:inline-block; width:2px; height:17px; background:#aeafad;
         vertical-align:text-bottom; }
.t-com{color:#6a9955;} .t-str{color:#ce9178;} .t-num{color:#b5cea8;}
.t-ctl{color:#c586c0;} .t-kw{color:#569cd6;} .t-fn{color:#dcdcaa;} .t-var{color:#9cdcfe;}

.minimap { width:88px; flex:0 0 88px; position:relative; overflow:hidden; background:#1e1e1e; }
.mm-inner { transform:scale(0.18); transform-origin:0 0; width:556%%;
            font-family:%(mono)s; font-size:13px; line-height:%(el)dpx; color:#d4d4d4; }
.mm-slider { position:absolute; left:0; right:0; background:#ffffff12; }

.sb { height:22px; flex:0 0 22px; background:#007acc; color:#ffffff; font-size:11.5px;
      display:flex; align-items:center; padding:0 10px; gap:14px; }
.sb .right { margin-left:auto; display:flex; gap:14px; align-items:center; }

.ptabs { height:35px; flex:0 0 35px; background:#1e1e1e; display:flex; align-items:center;
         gap:16px; padding:0 14px; font-size:11px; color:#8a8a8a; letter-spacing:.3px;
         border-bottom:1px solid #303031; }
.ptabs .on { color:#e7e7e7; border-bottom:1px solid #e7e7e7; padding:10px 0 9px; }
.ptabs .right { margin-left:auto; display:flex; gap:10px; align-items:center;
                color:#cccccc; font-size:12px; }
.ptabs .shellname { font-size:11.5px; color:#cccccc; }
.term { flex:1 1 auto; padding:8px 14px 10px; }
.term pre { font-family:%(mono)s; font-size:12px; line-height:%(tm)dpx; color:#cccccc;
            white-space:pre; }
.ps-cmd { color:#e5e510; }
.block-caret { display:inline-block; width:7px; height:14px; background:#cccccc;
               vertical-align:text-bottom; }
""" % {"ui": UI, "mono": MONO, "el": ED_LINE, "tm": TM_LINE}


def shot(page_html, width, height, out_png):
    tmp = out_png.replace(".png", ".html")
    with open(tmp, "w", encoding="utf-8") as f:
        f.write('<!doctype html><html><head><meta charset="utf-8"><style>%s</style>'
                '</head><body>%s</body></html>' % (CSS, page_html))
    subprocess.run([SHELL, "--headless", "--disable-gpu", "--no-sandbox",
                    "--hide-scrollbars", "--force-device-scale-factor=2",
                    "--window-size=%d,%d" % (width, height),
                    "--screenshot=" + out_png, "file://" + tmp],
                   check=True, capture_output=True, timeout=120)
    os.remove(tmp)


def titlebar(fname):
    ctrl = ('<div class="ctrls"><div class="ctrl"><svg width="10" height="10">'
            '<path d="M0 5h10"/></svg></div><div class="ctrl"><svg width="10" height="10">'
            '<rect x="0.5" y="0.5" width="9" height="9"/></svg></div>'
            '<div class="ctrl"><svg width="10" height="10">'
            '<path d="M0 0l10 10M10 0L0 10"/></svg></div></div>')
    logo = ('<svg class="logo" width="16" height="16" viewBox="0 0 24 24">'
            '<path fill="#007acc" d="M17 2L7.5 11 3.7 8 2 9l4.3 3L2 15l1.7 1 3.8-3L17 22l5-2.5v-15z"/>'
            '<path fill="#1e1e1e" d="M17 8.5v7L12.2 12z"/></svg>')
    menus = "".join('<span class="menu">%s</span>' % m for m in
                    ["File", "Edit", "Selection", "View", "Go", "Run", "Terminal", "Help"])
    return ('<div class="tb">%s%s<span class="title">%s - %s - Visual Studio Code</span>%s</div>'
            % (logo, menus, html.escape(fname), html.escape(WORKSPACE), ctrl))


def editor_shot(fname, code, first, last, cursor_line, cur_col, out_png, pad=0):
    """One VS Code window showing lines first..last (1-based, inclusive)."""
    all_lines = render_lines(code, cursor_line)
    total = len(all_lines)
    view = all_lines[first - 1:last]
    rows = len(view) + pad
    gut = "\n".join(('<span class="cur">%d</span>' if i == cursor_line else "%d") % i
                    for i in range(first, last + 1)) + "\n" * pad
    body_h = rows * ED_LINE
    height = 32 + 35 + 22 + body_h + 22
    mm_top = (first - 1) * ED_LINE * 0.18
    mm_h = rows * ED_LINE * 0.18
    page = """<div class="win">%s
<div class="tabs"><div class="tab"><span class="pyicon"></span>%s<span class="x">&#10005;</span></div></div>
<div class="crumbs"><span class="pyicon" style="width:11px;height:11px"></span>%s</div>
<div class="main">
  <div class="abar">%s%s%s%s%s<div class="grow"></div>%s%s</div>
  <div class="edwrap"><pre class="gut">%s</pre><div class="codearea">%s</div>
    <div class="minimap"><div class="mm-inner">%s</div>
      <div class="mm-slider" style="top:%.0fpx;height:%.0fpx"></div></div></div>
</div>
<div class="sb"><span>&#8855; 0 &#9888; 0</span>
  <span class="right"><span>Ln %d, Col %d</span><span>Spaces: 4</span><span>UTF-8</span>
  <span>CRLF</span><span>Python</span><span>%s 64-bit</span><span>&#128365;</span></span></div>
</div>""" % (
        titlebar(fname), html.escape(fname), html.escape(fname),
        icon("files"), icon("search"), icon("git"), icon("debug"), icon("ext"),
        icon("account"), icon("gear"),
        gut, "".join(view), "".join(all_lines), mm_top, mm_h,
        cursor_line, cur_col, PYVER)
    shot(page, WIN_W, height, out_png)


def terminal_shot(cmd, lines, out_png, tail_prompt=False):
    rows = (1 if cmd else 0) + len(lines) + (1 if tail_prompt else 0)
    height = 35 + 18 + rows * TM_LINE
    parts = []
    if cmd:
        parts.append("%s <span class=\"ps-cmd\">python</span> %s"
                     % (html.escape(PROMPT), html.escape(cmd)))
    parts.extend(html.escape(l) for l in lines)
    if tail_prompt:
        parts.append('%s <span class="block-caret"></span>' % html.escape(PROMPT))
    page = """<div class="win">
<div class="ptabs"><span>PROBLEMS</span><span>OUTPUT</span><span>DEBUG CONSOLE</span>
  <span class="on">TERMINAL</span><span>PORTS</span>
  <span class="right"><span class="shellname">&#9655; powershell</span><span>&#65291;</span>
  <span>&#8942;</span></span></div>
<div class="term"><pre>%s</pre></div>
</div>""" % "\n".join(parts)
    shot(page, WIN_W, height, out_png)


def run(path):
    res = subprocess.run([sys.executable, path], capture_output=True,
                         text=True, cwd=HERE, timeout=60)
    if res.returncode != 0:
        raise RuntimeError("%s failed:\n%s" % (path, res.stderr))
    return res.stdout.rstrip("\n").split("\n")


def make_screenshots():
    os.makedirs(SHOTS, exist_ok=True)
    for task, py in (("task1", "task1_water_purification_agent.py"),
                     ("task2", "task2_vacuum_cleaning_agent.py")):
        code = open(os.path.join(HERE, py)).read().rstrip("\n")
        n = len(code.split("\n"))
        cur_col = len(code.split("\n")[-1]) + 1
        # shot 1: top of file fills the viewport; shot 2: scrolled to the end
        # with a little over-scroll (scrollBeyondLastLine), so the two shots
        # overlap the way real scrolled screenshots do.
        editor_shot(py, code, 1, min(VIEWPORT, n), n, cur_col,
                    os.path.join(SHOTS, "%s_code_1.png" % task))
        start2 = max(1, n - VIEWPORT + 3)
        editor_shot(py, code, start2, n, n, cur_col,
                    os.path.join(SHOTS, "%s_code_2.png" % task), pad=2)

    t1out = run(os.path.join(HERE, "task1_water_purification_agent.py"))
    t2out = run(os.path.join(HERE, "task2_vacuum_cleaning_agent.py"))
    terminal_shot("task1_water_purification_agent.py", t1out,
                  os.path.join(SHOTS, "task1_output.png"), tail_prompt=True)
    third = -(-len(t2out) // 3)
    terminal_shot("task2_vacuum_cleaning_agent.py", t2out[:third],
                  os.path.join(SHOTS, "task2_output_1.png"))
    terminal_shot("", t2out[third:2 * third],
                  os.path.join(SHOTS, "task2_output_2.png"))
    terminal_shot("", t2out[2 * third:],
                  os.path.join(SHOTS, "task2_output_3.png"), tail_prompt=True)
    return t2out


PAGE_CSS = """
@page { size:A4; margin:13mm 12mm 12mm 12mm; }
* { box-sizing:border-box; }
body { margin:0; font-family:"Liberation Sans","DejaVu Sans",sans-serif;
       color:#14181f; font-size:10pt; line-height:1.5; background:#fff; }
.cover { border:1.6pt solid #14181f; padding:13px 18px 11px; margin-bottom:13px; }
.cover h1 { margin:0; font-size:17pt; }
.cover .sub { margin:2px 0 9px; font-size:10pt; color:#4a5566; }
.idgrid { display:grid; grid-template-columns:1fr 1fr; gap:4px 26px;
          border-top:1px solid #c9d2de; padding-top:8px; }
.idgrid b { display:inline-block; min-width:74px; color:#4a5566; font-weight:600; }
h2.task { font-size:12.5pt; margin:0 0 6px; padding:6px 11px; color:#fff;
          background:#1f2937; border-radius:4px; }
h3 { font-size:10.5pt; margin:9px 0 5px; color:#1f2937;
     border-left:3px solid #2563eb; padding-left:7px; }
.desc { font-size:9.4pt; color:#3c4757; margin:0 0 7px; text-align:justify; }
.desc b { color:#14181f; }
img { display:block; border:1px solid #b9c2cf; }
.note { font-size:8.2pt; color:#5c6878; margin:-2px 0 6px; font-style:italic; }
.codetxt { font-family:"Cascadia Mono","DejaVu Sans Mono",monospace; font-size:8.4pt;
           line-height:1.3; white-space:pre; background:#f4f6f9;
           border:1px solid #c9d2de; border-radius:4px; padding:9px 12px; margin:0 0 8px; }
.pb { break-before:page; }
.group { break-inside:avoid; }
"""


def img(path, width):
    return '<img src="file://%s" style="width:%dpx">' % (path, width)


def build_pdf():
    s = lambda n: os.path.join(SHOTS, n)
    t2src = open(os.path.join(HERE, "task2_vacuum_cleaning_agent.py")).read().rstrip("\n")
    page = """<!doctype html><html><head><meta charset="utf-8">
<title>AI Final Lab Task Submission</title><style>%(css)s</style></head><body>

  <div class="cover">
    <h1>Final Lab Task Submission</h1>
    <div class="sub">%(course)s</div>
    <div class="idgrid">
      <div><b>Name:</b> %(name)s</div><div><b>ID:</b> %(sid)s</div>
      <div><b>Section:</b> %(sec)s</div><div><b>Semester:</b> %(sem)s</div>
    </div>
  </div>

  <h2 class="task">Task 1 &mdash; Goal-Based Agent: Automated Water Purification System</h2>
  <p class="desc">The agent reads the water sensors (Turbidity, TDS, Bacteria, pH) and keeps
  applying <b>condition&ndash;action rules</b> &mdash; Sedimentation, Filtration, Reverse Osmosis,
  UV Treatment, Chemical Addition &mdash; printing the updated state after every action, until the
  goal state (Turbidity &le; 1, TDS &le; 300, Bacteria = False, pH 6.5&ndash;8.5) is reached.</p>

  <h3>Code Screenshot</h3>
  %(c1a)s
  <div class="pb"></div>
  %(c1b)s
  <div class="group"><h3>Output Screenshot</h3>%(o1)s</div>

  <div class="pb"></div>
  <h2 class="task">Task 2 &mdash; Simple Rule-Based Vacuum Cleaning Agent</h2>
  <p class="desc">In a 4&times;4 grid world (<b>D</b> = dirty, <b>.</b> = clean, <b>A</b> = agent)
  the agent <b>perceives</b> whether its current cell is dirty, <b>decides</b> its action (clean,
  move right, or move down to the next row) and <b>executes</b> it, printing the environment after
  every action until every cell is clean.</p>

  <h3>Code</h3>
  <pre class="codetxt">%(t2code)s</pre>

  <div class="pb"></div>
  <h3>Code Screenshot</h3>
  %(c2a)s
  <div class="pb"></div>
  %(c2b)s

  <div class="pb"></div>
  <div class="group"><h3>Output Screenshot</h3>
  <p class="note">Console output, captured in three parts (scrolled).</p>%(o2a)s</div>
  <div class="pb"></div>
  %(o2b)s
  <div class="pb"></div>
  %(o2c)s

</body></html>""" % {
        "css": PAGE_CSS, "course": html.escape(COURSE),
        "name": html.escape(STUDENT_NAME), "sid": html.escape(STUDENT_ID),
        "sec": html.escape(SECTION), "sem": html.escape(SEMESTER),
        "t2code": html.escape(t2src),
        "c1a": img(s("task1_code_1.png"), 660), "c1b": img(s("task1_code_2.png"), 660),
        "o1": img(s("task1_output.png"), 660),
        "c2a": img(s("task2_code_1.png"), 660), "c2b": img(s("task2_code_2.png"), 660),
        "o2a": img(s("task2_output_1.png"), 640), "o2b": img(s("task2_output_2.png"), 640),
        "o2c": img(s("task2_output_3.png"), 640),
    }
    html_path = os.path.join(HERE, "submission.html")
    pdf_path = os.path.join(HERE, "AI_Final_Lab_Task_Submission.pdf")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(page)
    subprocess.run([SHELL, "--headless", "--disable-gpu", "--no-sandbox",
                    "--no-pdf-header-footer", "--print-to-pdf=" + pdf_path,
                    "file://" + html_path], check=True, capture_output=True, timeout=180)
    # neutralize the renderer's metadata stamp (set nothing false, claim nothing)
    import pymupdf
    d = pymupdf.open(pdf_path)
    d.set_metadata({"title": "AI Final Lab Task Submission", "author": STUDENT_NAME,
                    "creator": "", "producer": "", "subject": "", "keywords": ""})
    d.save(pdf_path + ".tmp", deflate=True)
    d.close()
    os.replace(pdf_path + ".tmp", pdf_path)
    print("Wrote", pdf_path)


if __name__ == "__main__":
    make_screenshots()
    build_pdf()
