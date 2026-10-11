"""Extract every user-facing string from the frontend and dump to .docx + .xlsx."""
import os, re, glob
from docx import Document
from openpyxl import Workbook

SRC = "/app/frontend/src"
OUT_DIR = "/app/frontend/public"
DOCX_OUT = os.path.join(OUT_DIR, "only-elite-escorts-copy.docx")
XLSX_OUT = os.path.join(OUT_DIR, "only-elite-escorts-copy.xlsx")

TEXT_LIKE_ATTRS = {
    "placeholder", "title", "aria-label", "alt", "label", "value"
}

# ---------------------------------------------------------------- collect
# key = (file, text). Value = extra info (attr name / "jsx" for jsx text).
records = []  # list of dicts

def add(file_rel, kind, text):
    text = (text or "").strip()
    if not text:
        return
    if len(text) < 2:
        return
    # skip if it's only symbols or looks like code
    if re.fullmatch(r"[\W_]+", text):
        return
    if text.startswith("http"):
        return
    if text in {"true", "false", "null", "undefined"}:
        return
    records.append({"file": file_rel, "kind": kind, "text": text})

# JSX text between tags: >TEXT<
JSX_TEXT_RE = re.compile(r">([^<>{}\n][^<>{}]{0,400})<")
# Attributes with string literals: attrName="value" or attrName='value'
ATTR_RE = re.compile(r'\b(' + '|'.join(TEXT_LIKE_ATTRS) + r')\s*=\s*["\']([^"\']{2,300})["\']')
# JSX braces-with-string: attrName={"value"} or ={'value'}
ATTR_BRACE_RE = re.compile(r'\b(' + '|'.join(TEXT_LIKE_ATTRS) + r')\s*=\s*\{\s*["\']([^"\']{2,300})["\']\s*\}')
# JSX braces with simple string content: {"literal"} or {'literal'}
BRACE_STR_RE = re.compile(r'\{\s*["\']([^"\']{2,300})["\']\s*\}')

CODE_TOKEN_RE = re.compile(
    r"^(?:className|onClick|onChange|import|export|const|let|var|return|useState|useEffect|"
    r"function|async|await|=>|props|children|ref|key|style|type|name|to|href|src|role|"
    r"data-testid|as|weight|size|placeholder|maxLength|required|disabled|checked|value|"
    r"placeholder-)"
)

def looks_like_code(s):
    if CODE_TOKEN_RE.match(s):
        return True
    # numeric only
    if re.fullmatch(r"[\d.,+\-\s]+", s):
        return True
    # single lowercase identifier (variable-like)
    if re.fullmatch(r"[a-z][a-zA-Z0-9_]{0,40}", s) and " " not in s:
        return True
    # hex color / classname-ish tokens
    if re.fullmatch(r"#[0-9A-Fa-f]{3,8}", s):
        return True
    if re.fullmatch(r"[a-z][a-z0-9-]+", s):
        return True
    if s in {"..."}:
        return True
    return False

def scan_file(path):
    rel = os.path.relpath(path, SRC)
    try:
        with open(path, "r", encoding="utf-8") as fh:
            content = fh.read()
    except Exception:
        return

    # Strip block comments to reduce noise (keep JSX comments-ish)
    content = re.sub(r"/\*.*?\*/", "", content, flags=re.S)
    # Strip single-line comments
    content = re.sub(r"^\s*//.*$", "", content, flags=re.M)

    # JSX-visible text
    for m in JSX_TEXT_RE.finditer(content):
        t = m.group(1).strip()
        if not looks_like_code(t):
            add(rel, "jsx", t)

    # Attribute strings that reach the user
    for m in ATTR_RE.finditer(content):
        attr, val = m.group(1), m.group(2)
        add(rel, attr, val)
    for m in ATTR_BRACE_RE.finditer(content):
        attr, val = m.group(1), m.group(2)
        add(rel, attr, val)

    # Toast messages / string literals inside t()-like calls (fallback)
    for m in re.finditer(r"toast\.\w+\(\s*['\"]([^'\"]{2,300})['\"]", content):
        add(rel, "toast", m.group(1))

def main():
    for path in glob.glob(f"{SRC}/**/*.js*", recursive=True):
        if "/node_modules/" in path:
            continue
        if path.endswith((".test.js", ".test.jsx")):
            continue
        scan_file(path)

    # Deduplicate but keep order of first occurrence
    seen = set()
    unique = []
    for r in records:
        key = (r["file"], r["kind"], r["text"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(r)

    unique.sort(key=lambda r: (r["file"], r["kind"], r["text"].lower()))

    # ----- Word document ----------------------------------------------
    doc = Document()
    doc.add_heading("Elite Escorts Europe — Website Copy Audit", level=0)
    doc.add_paragraph(
        f"Extracted {len(unique)} distinct user-facing text strings from the "
        "frontend source (JSX, attributes, toasts). Grouped by source file."
    )
    current_file = None
    for r in unique:
        if r["file"] != current_file:
            doc.add_heading(r["file"], level=1)
            current_file = r["file"]
        p = doc.add_paragraph()
        run = p.add_run(r["text"])
        if r["kind"] != "jsx":
            small = p.add_run(f"   [{r['kind']}]")
            small.italic = True
    doc.save(DOCX_OUT)

    # ----- Excel spreadsheet ------------------------------------------
    wb = Workbook()
    ws = wb.active
    ws.title = "Website copy"
    ws.append(["File", "Type", "Text"])
    for r in unique:
        ws.append([r["file"], r["kind"], r["text"]])
    # column widths
    ws.column_dimensions["A"].width = 42
    ws.column_dimensions["B"].width = 14
    ws.column_dimensions["C"].width = 100
    wb.save(XLSX_OUT)

    print(f"Wrote {DOCX_OUT}")
    print(f"Wrote {XLSX_OUT}")
    print(f"Total unique strings: {len(unique)}")

if __name__ == "__main__":
    main()
