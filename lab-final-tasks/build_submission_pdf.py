#!/usr/bin/env python3
"""
Build the printable PDF submission for the AI Final Lab Tasks.

Renders each program as a syntax-highlighted "editor" panel and its real
console output as a "terminal" panel, then prints the page to PDF with
headless Chromium.

    python3 build_submission_pdf.py
"""
import html
import os
import re
import subprocess
import sys

# ----------------------------------------------------------------------
# EDIT THESE THREE LINES, then re-run the script to regenerate the PDF.
# ----------------------------------------------------------------------
STUDENT_NAME = "Minhazul Abedin"
STUDENT_ID = "________________"
SECTION = "________"
SEMESTER = "Summer 25-26"
COURSE = "Artificial Intelligence — Final Lab Task"
# ----------------------------------------------------------------------

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"

KEYWORDS = {
    "def", "return", "if", "elif", "else", "while", "for", "in", "is", "not",
    "and", "or", "break", "continue", "import", "from", "class", "pass",
    "None", "True", "False", "with", "as", "try", "except", "finally",
}
BUILTINS = {
    "print", "range", "round", "len", "str", "int", "float", "min", "max",
    "bool", "list", "dict", "abs", "enumerate",
}

TOKEN_RE = re.compile(
    r"(?P<comment>\#[^\n]*)"
    r"|(?P<string>\"\"\"(?:.|\n)*?\"\"\"|'''(?:.|\n)*?'''|\"[^\"\n]*\"|'[^'\n]*')"
    r"|(?P<number>\b\d+\.?\d*\b)"
    r"|(?P<name>[A-Za-z_]\w*)"
)


def highlight(code):
    """Return Python source as HTML with <span> colour classes."""
    out, pos, prev = [], 0, ""
    for m in TOKEN_RE.finditer(code):
        out.append(html.escape(code[pos:m.start()]))
        text, kind = m.group(0), m.lastgroup
        if kind == "name":
            if text in KEYWORDS:
                kind = "kw"
            elif prev == "def":
                kind = "fn"
            elif text in BUILTINS:
                kind = "bi"
            elif text.isupper() and len(text) > 2:
                kind = "const"
            else:
                kind = None
            prev = text
        elif kind != "comment":
            prev = ""
        esc = html.escape(text)
        out.append('<span class="%s">%s</span>' % (kind, esc) if kind else esc)
        pos = m.end()
    out.append(html.escape(code[pos:]))
    return "".join(out)


def numbered(code, start=1):
    """Two-column table: gutter line numbers + highlighted source."""
    lines = code.rstrip("\n").split("\n")
    gutter = "\n".join(str(i) for i in range(start, start + len(lines)))
    return ('<div class="editor-body"><pre class="gutter">%s</pre>'
            '<pre class="code">%s</pre></div>'
            % (gutter, highlight("\n".join(lines))))


def split_code(code, target):
    """Split source near `target` lines, preferring a blank line boundary."""
    lines = code.rstrip("\n").split("\n")
    if len(lines) <= target:
        return [lines]
    cut = target
    for off in range(0, 9):
        for cand in (target - off, target + off):
            if 0 < cand < len(lines) and lines[cand - 1].strip() == "":
                cut = cand
                break
        else:
            continue
        break
    return [lines[:cut], lines[cut:]]


def code_panels(filename, code, target):
    """Render source as one or more page-sized editor panels."""
    chunks = split_code(code, target)
    out, start = [], 1
    for i, chunk in enumerate(chunks):
        title = filename if i == 0 else "%s   (continued)" % filename
        out.append(window(title, numbered("\n".join(chunk), start), "editor"))
        start += len(chunk)
    return out


def window(title, body_html, kind, extra=""):
    """Wrap content in a titled window frame (mac-style traffic lights)."""
    return (
        '<div class="win %s %s">'
        '  <div class="titlebar"><span class="dot r"></span><span class="dot y">'
        '</span><span class="dot g"></span><span class="wtitle">%s</span></div>'
        '  %s'
        '</div>' % (kind, extra, html.escape(title), body_html)
    )


def run(path):
    """Execute a task script and capture exactly what it prints."""
    res = subprocess.run([sys.executable, path], capture_output=True,
                         text=True, cwd=HERE, timeout=60)
    if res.returncode != 0:
        raise RuntimeError("%s failed:\n%s" % (path, res.stderr))
    return res.stdout.rstrip("\n")


CSS = """
@page { size: A4; margin: 13mm 12mm 12mm 12mm; }
* { box-sizing: border-box; }
body { margin:0; font-family:"Liberation Sans","DejaVu Sans",sans-serif;
       color:#14181f; font-size:10pt; line-height:1.5; background:#fff; }
.sheet { padding:0; }

.cover { border:1.6pt solid #14181f; padding:14px 18px 12px; margin-bottom:14px; }
.cover h1 { margin:0; font-size:17pt; letter-spacing:.2px; }
.cover .sub { margin:2px 0 10px; font-size:10pt; color:#4a5566; }
.idgrid { display:grid; grid-template-columns:1fr 1fr; gap:4px 26px;
          border-top:1px solid #c9d2de; padding-top:9px; }
.idgrid div { font-size:10.5pt; }
.idgrid b { display:inline-block; min-width:74px; color:#4a5566; font-weight:600; }

h2.task { font-size:12.5pt; margin:0 0 7px; padding:6px 11px; color:#fff;
          background:#1f2937; border-radius:4px; }
h3 { font-size:10.5pt; margin:10px 0 5px; color:#1f2937;
     border-left:3px solid #2563eb; padding-left:7px; }
.desc { font-size:9.4pt; color:#3c4757; margin:0 0 8px; text-align:justify; }
.desc b { color:#14181f; }

.win { border:1px solid #2a3342; border-radius:6px; overflow:hidden;
       margin:0 0 9px; break-inside:avoid; }
.titlebar { background:#2a3342; padding:4px 9px; display:flex; align-items:center; gap:5px; }
.dot { width:8px; height:8px; border-radius:50%; display:inline-block; }
.dot.r{background:#ff5f57;} .dot.y{background:#febc2e;} .dot.g{background:#28c840;}
.wtitle { color:#c7d2e0; font-size:8pt; margin-left:7px;
          font-family:"DejaVu Sans Mono",monospace; }

.editor-body { display:flex; background:#1e242e; }
pre { margin:0; font-family:"DejaVu Sans Mono",monospace; font-size:8pt;
      line-height:1.34; white-space:pre; }
.gutter { color:#5b6675; text-align:right; padding:7px 7px 7px 9px;
          background:#1a1f28; border-right:1px solid #2f3947; user-select:none; }
.code { color:#e4e9f0; padding:7px 10px; flex:1; overflow:hidden; }
.kw{color:#ff79c6;} .string{color:#a5e075;} .comment{color:#7d8899;font-style:italic;}
.number{color:#f0a35e;} .fn{color:#61c8f5;} .bi{color:#c792ea;} .const{color:#ffd479;}

.term-body { background:#0f1319; color:#dbe3ec; padding:9px 11px; }
.term-body pre { font-size:8pt; color:#dbe3ec; white-space:pre-wrap; }
.term-body .prompt { color:#4ade80; }
.two-col .term-body pre { column-count:2; column-gap:18px;
                          column-rule:1px dashed #2f3947; font-size:7pt;
                          line-height:1.34; }
.note { font-size:8.2pt; color:#5c6878; margin:-5px 0 11px; font-style:italic; }
.pb { break-before:page; }
.group { break-inside:avoid; }
"""


def build_html(t1_code, t1_out, t2_code, t2_out):
    prompt = '<span class="prompt">$ python3 %s</span>\n'
    t1_term = ('<div class="term-body"><pre>' + prompt % "task1_water_purification_agent.py"
               + html.escape(t1_out) + "</pre></div>")
    t2_term = ('<div class="term-body"><pre>' + prompt % "task2_vacuum_cleaning_agent.py"
               + html.escape(t2_out) + "</pre></div>")

    t1p = code_panels("task1_water_purification_agent.py", t1_code, 48)
    t2p = code_panels("task2_vacuum_cleaning_agent.py", t2_code, 48)

    return """<!doctype html><html><head><meta charset="utf-8">
<title>AI Final Lab Task Submission</title><style>%(css)s</style></head><body>
<div class="sheet">

  <div class="cover">
    <h1>Final Lab Task Submission</h1>
    <div class="sub">%(course)s</div>
    <div class="idgrid">
      <div><b>Name:</b> %(name)s</div><div><b>ID:</b> %(sid)s</div>
      <div><b>Section:</b> %(sec)s</div><div><b>Semester:</b> %(sem)s</div>
    </div>
  </div>

  <h2 class="task">Task 1 &mdash; Goal-Based Agent: Automated Water Purification System</h2>
  <p class="desc">A <b>goal-based agent</b> reads the sensor state of incoming water
  (Turbidity in NTU, TDS in ppm, Bacterial contamination, pH) and repeatedly applies
  <b>condition&ndash;action rules</b> until every safety threshold is met:
  Turbidity &le; 1 NTU, TDS &le; 300 ppm, Bacteria = False and pH between 6.5 and 8.5.
  Available actions are Sedimentation, Filtration, Reverse Osmosis, UV Treatment and
  Chemical Addition. The updated state is printed after every action.</p>

  <h3>Code Screenshot</h3>
  %(t1a)s
  <div class="pb"></div>
  %(t1b)s

  <div class="group">
  <h3>Output Screenshot</h3>
  %(t1out)s
  </div>

  <div class="pb"></div>

  <h2 class="task">Task 2 &mdash; Simple Rule-Based Vacuum Cleaning Agent</h2>
  <p class="desc">A <b>simple reflex (rule-based) agent</b> works in a 4&times;4 grid world
  where every cell is either Dirty (<b>D</b>) or Clean (<b>.</b>) and the agent is drawn as
  <b>A</b>. At each step the agent <b>perceives</b> whether its current cell is dirty,
  <b>decides</b> its action (clean, move right, or move down to the next row) and
  <b>executes</b> it, printing the environment after every action until the whole grid
  is clean.</p>

  <h3>Code Screenshot</h3>
  %(t2a)s
  <div class="pb"></div>
  %(t2b)s

  <div class="group">
  <h3>Output Screenshot</h3>
  <p class="note">Full console output, shown in two columns to fit one page &mdash;
  read the left column top-to-bottom first, then the right column.</p>
  %(t2out)s
  </div>

</div></body></html>""" % {
        "css": CSS, "course": html.escape(COURSE),
        "name": html.escape(STUDENT_NAME), "sid": html.escape(STUDENT_ID),
        "sec": html.escape(SECTION), "sem": html.escape(SEMESTER),
        "t1a": t1p[0], "t1b": t1p[1] if len(t1p) > 1 else "",
        "t2a": t2p[0], "t2b": t2p[1] if len(t2p) > 1 else "",
        "t1out": window("Terminal \u2014 Output", t1_term, "term"),
        "t2out": window("Terminal \u2014 Output", t2_term, "term", extra="two-col"),
    }


def main():
    t1 = os.path.join(HERE, "task1_water_purification_agent.py")
    t2 = os.path.join(HERE, "task2_vacuum_cleaning_agent.py")
    page = build_html(open(t1).read(), run(t1), open(t2).read(), run(t2))

    html_path = os.path.join(HERE, "submission.html")
    pdf_path = os.path.join(HERE, "AI_Final_Lab_Task_Submission.pdf")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(page)

    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-sandbox",
                    "--no-pdf-header-footer", "--virtual-time-budget=4000",
                    "--print-to-pdf=" + pdf_path, "file://" + html_path],
                   check=True, capture_output=True, timeout=120)
    print("Wrote", pdf_path)


if __name__ == "__main__":
    main()
