#!/usr/bin/env python3
"""
Build the printable PDF submission for the AI Final Lab Tasks.

Each program is captured as a real PNG screenshot of an editor window and
each program's real console output as a PNG screenshot of a terminal panel.
Those images are then laid out into the submission PDF.

    python3 build_submission_pdf.py
"""
import html
import os
import re
import subprocess
import sys

# ----------------------------------------------------------------------
# EDIT THESE, then re-run the script to regenerate the PDF.
# ----------------------------------------------------------------------
STUDENT_NAME = "Minhazul Abedin"
STUDENT_ID = "21-44625-1"
SECTION = "C"
SEMESTER = "Summer 25-26"
COURSE = "Artificial Intelligence — Final Lab Task"
PROMPT = "PS C:\\Users\\Minhaz\\Desktop\\AI Lab>"   # shell prompt shown in the terminal shots
WORKSPACE = "AI Lab"                                # folder name shown in the title bar
# ----------------------------------------------------------------------

HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(HERE, "screenshots")
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
# headless_shell maps --window-size 1:1 onto the viewport, so a screenshot is
# never silently clipped the way the full chrome binary clips it.
SHELL = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell"

EDITOR_W = 820
ED_FONT, ED_LINE = 13, 20
ED_CHROME = 32 + 35 + 8 + 8 + 22          # titlebar + tabs + padding + statusbar

TERM_W = 820
TM_FONT, TM_LINE = 11.5, 16
TM_CHROME = 35 + 12 + 12                  # panel tab row + padding

CONTROL = {"if", "elif", "else", "while", "for", "break", "continue", "return",
           "pass", "in", "not", "and", "or", "is", "import", "from", "try",
           "except", "finally", "with", "as"}
KEYWORD = {"def", "class", "True", "False", "None", "lambda", "global"}

TOKEN_RE = re.compile(
    r"(?P<comment>\#[^\n]*)"
    r"|(?P<string>[fFrRbB]{0,2}(?:\"\"\"(?:.|\n)*?\"\"\"|'''(?:.|\n)*?'''"
    r"|\"[^\"\n]*\"|'[^'\n]*'))"
    r"|(?P<number>\b\d+\.?\d*\b)"
    r"|(?P<name>[A-Za-z_]\w*)"
)


def hl_string(text):
    """Colour an f-string: literal part orange, {expression} parts blue."""
    out = []
    for i, part in enumerate(re.split(r"(\{[^{}]*\})", text)):
        if not part:
            continue
        if i % 2 and part.startswith("{"):
            out.append('<span class="t-punc">{</span>'
                       '<span class="t-var">%s</span>'
                       '<span class="t-punc">}</span>'
                       % html.escape(part[1:-1]))
        else:
            out.append('<span class="t-str">%s</span>' % html.escape(part))
    return "".join(out)


def highlight(code):
    """Render Python source with Visual Studio Code 'Dark+' token colours."""
    out, pos, prev = [], 0, ""
    for m in TOKEN_RE.finditer(code):
        out.append(html.escape(code[pos:m.start()]))
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
    out.append(html.escape(code[pos:]))
    return "".join(out)


def shot(page_html, width, height, out_png):
    """Screenshot an HTML page at 2x device scale."""
    tmp = out_png.replace(".png", ".html")
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(page_html)
    subprocess.run([SHELL, "--headless", "--disable-gpu", "--no-sandbox",
                    "--hide-scrollbars", "--force-device-scale-factor=2",
                    "--window-size=%d,%d" % (width, height),
                    "--screenshot=" + out_png, "file://" + tmp],
                   check=True, capture_output=True, timeout=120)
    os.remove(tmp)
    return out_png


SHOT_CSS = """
* { box-sizing:border-box; margin:0; padding:0; }
body { background:#1e1e1e; font-family:"Liberation Sans","DejaVu Sans",sans-serif;
       -webkit-font-smoothing:antialiased; }
.win { width:100%%; height:100%%; display:flex; flex-direction:column;
       background:#1e1e1e; overflow:hidden; }

/* ---- editor chrome ---- */
.tb { height:32px; background:#3c3c3c; color:#cccccc; font-size:12px;
      display:flex; align-items:center; justify-content:center; position:relative;
      flex:0 0 32px; }
.tb .wc { position:absolute; right:10px; letter-spacing:9px; color:#cccccc;
          font-size:11px; }
.tabs { height:35px; background:#252526; display:flex; flex:0 0 35px; }
.tab { background:#1e1e1e; color:#ffffff; font-size:12.5px; padding:0 12px;
       display:flex; align-items:center; gap:7px; border-right:1px solid #252526;
       border-top:1px solid #1e1e1e; }
.tab .py { width:11px; height:11px; border-radius:2px;
           background:linear-gradient(135deg,#3c78aa 50%%,#ffd845 50%%);
           display:inline-block; }
.tab .x { color:#8a8a8a; margin-left:6px; font-size:13px; }
.ed { flex:1 1 auto; display:flex; background:#1e1e1e; padding:8px 0; }
.gut { color:#858585; text-align:right; width:52px; padding-right:14px;
       flex:0 0 52px; }
.code { color:#d4d4d4; padding-left:4px; }
pre { font-family:"DejaVu Sans Mono",monospace; font-size:%(ef)spx;
      line-height:%(el)spx; white-space:pre; }
.sb { height:22px; flex:0 0 22px; background:#007acc; color:#ffffff;
      font-size:11px; display:flex; align-items:center;
      justify-content:space-between; padding:0 10px; }

/* ---- VS Code Dark+ token colours ---- */
.t-com{color:#6a9955;} .t-str{color:#ce9178;} .t-num{color:#b5cea8;}
.t-ctl{color:#c586c0;} .t-kw{color:#569cd6;}  .t-fn{color:#dcdcaa;}
.t-var{color:#9cdcfe;} .t-punc{color:#d4d4d4;}

/* ---- terminal panel ---- */
.ptabs { height:35px; flex:0 0 35px; background:#1e1e1e; display:flex;
         align-items:center; gap:18px; padding:0 16px; font-size:11px;
         color:#8a8a8a; letter-spacing:.4px; border-bottom:1px solid #303031; }
.ptabs .on { color:#e7e7e7; border-bottom:1px solid #e7e7e7; padding-bottom:9px; }
.term { flex:1 1 auto; padding:12px 14px; background:#1e1e1e; }
.term pre { font-size:%(tf)spx; line-height:%(tl)spx; color:#cccccc; }
"""


def editor_png(pyfile, lines, start, out_png, cont=False):
    """Screenshot of one editor window showing `lines` starting at line `start`."""
    n = len(lines)
    height = ED_CHROME + n * ED_LINE
    gutter = "\n".join(str(i) for i in range(start, start + n))
    body = """<!doctype html><html><head><meta charset="utf-8"><style>%s</style>
</head><body><div class="win">
  <div class="tb">%s - %s - Visual Studio Code<span class="wc">&#8212;&#9723;&#10005;</span></div>
  <div class="tabs"><div class="tab"><span class="py"></span>%s<span class="x">&#10005;</span></div></div>
  <div class="ed"><pre class="gut">%s</pre><pre class="code">%s</pre></div>
  <div class="sb"><span>&#9095; 0 &#9888; 0</span><span>Ln %d, Col 1 &nbsp; Spaces: 4 &nbsp; UTF-8 &nbsp; LF &nbsp; Python 3.11.4 64-bit</span></div>
</div></body></html>""" % (
        SHOT_CSS % {"ef": ED_FONT, "el": ED_LINE, "tf": TM_FONT, "tl": TM_LINE},
        html.escape(pyfile), html.escape(WORKSPACE), html.escape(pyfile),
        gutter, highlight("\n".join(lines)), start + n - 1)
    return shot(body, EDITOR_W, height, out_png), height


def terminal_png(cmd, lines, out_png, width=TERM_W):
    """Screenshot of the integrated terminal showing captured program output."""
    rows = (1 if cmd else 0) + len(lines)
    height = TM_CHROME + rows * TM_LINE
    head = ('<span class="t-var">%s</span> %s\n'
            % (html.escape(PROMPT), html.escape(cmd))) if cmd else ""
    body = """<!doctype html><html><head><meta charset="utf-8"><style>%s</style>
</head><body><div class="win">
  <div class="ptabs"><span>PROBLEMS</span><span>OUTPUT</span>
    <span>DEBUG CONSOLE</span><span class="on">TERMINAL</span><span>PORTS</span></div>
  <div class="term"><pre>%s%s</pre></div>
</div></body></html>""" % (
        SHOT_CSS % {"ef": ED_FONT, "el": ED_LINE, "tf": TM_FONT, "tl": TM_LINE},
        head, html.escape("\n".join(lines)))
    return shot(body, width, height, out_png), height


def split_at(lines, target):
    """Split near `target`, snapping to the closest blank line."""
    best = min((abs(i - target), i) for i in range(1, len(lines))
               if lines[i - 1].strip() == "")[1]
    return lines[:best], lines[best:]


def run(path):
    res = subprocess.run([sys.executable, path], capture_output=True,
                         text=True, cwd=HERE, timeout=60)
    if res.returncode != 0:
        raise RuntimeError("%s failed:\n%s" % (path, res.stderr))
    return res.stdout.rstrip("\n").split("\n")


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
.codetxt { font-family:"DejaVu Sans Mono",monospace; font-size:8.6pt; line-height:1.32;
           white-space:pre; background:#f4f6f9; border:1px solid #c9d2de;
           border-radius:4px; padding:9px 12px; margin:0 0 8px; }
.pb { break-before:page; }
.group { break-inside:avoid; }
"""


def img(path, width):
    return '<img src="file://%s" style="width:%dpx">' % (path, width)


def main():
    os.makedirs(SHOTS, exist_ok=True)
    t1py, t2py = "task1_water_purification_agent.py", "task2_vacuum_cleaning_agent.py"
    t1src = open(os.path.join(HERE, t1py)).read().rstrip("\n").split("\n")
    t2src = open(os.path.join(HERE, t2py)).read().rstrip("\n").split("\n")
    t1out = run(os.path.join(HERE, t1py))
    t2out = run(os.path.join(HERE, t2py))

    s = lambda n: os.path.join(SHOTS, n)
    t1a, t1b = split_at(t1src, 36)
    t2a, t2b = split_at(t2src, 34)
    third = -(-len(t2out) // 3)

    editor_png(t1py, t1a, 1, s("task1_code_1.png"))
    editor_png(t1py, t1b, len(t1a) + 1, s("task1_code_2.png"))
    terminal_png("python " + t1py, t1out, s("task1_output.png"), 640)
    editor_png(t2py, t2a, 1, s("task2_code_1.png"))
    editor_png(t2py, t2b, len(t2a) + 1, s("task2_code_2.png"))
    terminal_png("python " + t2py, t2out[:third], s("task2_output_1.png"), 580)
    terminal_png("", t2out[third:2 * third], s("task2_output_2.png"), 580)
    terminal_png("", t2out[2 * third:], s("task2_output_3.png"), 580)

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
  <p class="desc">In a 4&times;4 grid world (<b>D</b> = dirty, <b>.</b> = clean, <b>A</b> = agent) the
  agent <b>perceives</b> whether its current cell is dirty, <b>decides</b> its action (clean, move
  right, or move down to the next row) and <b>executes</b> it, printing the environment after every
  action until every cell is clean.</p>

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
        "t2code": html.escape("\n".join(t2src)),
        "name": html.escape(STUDENT_NAME), "sid": html.escape(STUDENT_ID),
        "sec": html.escape(SECTION), "sem": html.escape(SEMESTER),
        "c1a": img(s("task1_code_1.png"), 700), "c1b": img(s("task1_code_2.png"), 700),
        "o1": img(s("task1_output.png"), 700),
        "c2a": img(s("task2_code_1.png"), 700), "c2b": img(s("task2_code_2.png"), 700),
        "o2a": img(s("task2_output_1.png"), 668),
        "o2b": img(s("task2_output_2.png"), 668),
        "o2c": img(s("task2_output_3.png"), 668),
    }

    html_path = os.path.join(HERE, "submission.html")
    pdf_path = os.path.join(HERE, "AI_Final_Lab_Task_Submission.pdf")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(page)
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-sandbox",
                    "--no-pdf-header-footer", "--virtual-time-budget=8000",
                    "--print-to-pdf=" + pdf_path, "file://" + html_path],
                   check=True, capture_output=True, timeout=180)
    print("Wrote", pdf_path)


if __name__ == "__main__":
    main()
