#!/usr/bin/env python3
"""a11y_lint - small static accessibility checker for HTML files.

It automates a subset of WCAG 2.2 checks that can be decided from markup alone.
It does NOT replace manual keyboard / screen-reader testing or tools like axe.

Usage:
  python3 tools/a11y_lint.py page.html [more.html ...]
  python3 tools/a11y_lint.py --palette palette.json
  python3 tools/a11y_lint.py --contrast "#777777" "#ffffff"
Exit code: 0 = no errors, 1 = errors found, 2 = usage problem.
"""
import json
import re
import sys
from html.parser import HTMLParser

VOID = {"img", "input", "br", "hr", "meta", "link", "area", "base", "col",
        "embed", "source", "track", "wbr"}
NON_INTERACTIVE = {"div", "span", "li", "p", "img", "td", "section", "article"}
NO_LABEL_INPUT_TYPES = {"hidden", "submit", "button", "reset", "image"}


# ---------- contrast (WCAG 2.x relative luminance) ----------
def _lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def luminance(hex_color):
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(ch * 2 for ch in h)
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)


def contrast_ratio(fg, bg):
    a, b = luminance(fg), luminance(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


# ---------- HTML checks ----------
class Linter(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.issues = []          # (severity, rule, message, wcag, line)
        self.stack = []           # open elements: dict(tag, attrs, text, line)
        self.ids = {}
        self.label_for = set()
        self.inputs = []          # (attrs, inside_label, line)
        self.last_heading = 0
        self.has_h1 = self.has_main = False
        self.title = None
        self.in_title = False
        self.in_style = False
        self.css = ""
        self.html_lang = None
        self.seen_html = False

    def add(self, sev, rule, msg, wcag):
        self.issues.append((sev, rule, msg, wcag, self.getpos()[0]))

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        line = self.getpos()[0]
        if tag == "html":
            self.seen_html = True
            self.html_lang = (a.get("lang") or "").strip()
        if tag == "title":
            self.in_title = True
            self.title = ""
        if tag == "style":
            self.in_style = True
        if tag == "main" or a.get("role") == "main":
            self.has_main = True
        if "id" in a:
            if a["id"] in self.ids:
                self.add("error", "duplicate-id", f'id "{a["id"]}" is used more than once', "1.3.1 (4.1.1 was removed in WCAG 2.2; still invalid HTML)")
            self.ids[a["id"]] = line
        if tag == "label" and a.get("for"):
            self.label_for.add(a["for"])
        if re.fullmatch(r"h[1-6]", tag):
            lvl = int(tag[1])
            if lvl == 1:
                self.has_h1 = True
            if self.last_heading and lvl > self.last_heading + 1:
                self.add("warning", "heading-skip", f"heading jumps from h{self.last_heading} to h{lvl}", "1.3.1 / 2.4.6")
            self.last_heading = lvl
        if "tabindex" in a:
            try:
                if int(a["tabindex"]) > 0:
                    self.add("error", "positive-tabindex", f'tabindex="{a["tabindex"]}" overrides natural focus order', "2.4.3")
            except ValueError:
                pass
        if "onclick" in a and tag in NON_INTERACTIVE and not a.get("role") and "tabindex" not in a:
            self.add("error", "click-no-keyboard", f"<{tag}> has a click handler but no role and is not keyboard focusable", "2.1.1 / 4.1.2")
        if tag == "img":
            if "alt" not in a:
                self.add("error", "img-alt", "<img> has no alt attribute", "1.1.1")
            elif self.stack and a.get("alt", "").strip():
                self.stack[-1]["text"] += " " + a["alt"]
            if "aria-label" in a and self.stack:
                self.stack[-1]["text"] += " " + a["aria-label"]
        if tag == "input":
            t = (a.get("type") or "text").lower()
            if t not in NO_LABEL_INPUT_TYPES:
                inside = any(e["tag"] == "label" for e in self.stack)
                self.inputs.append((a, inside, line))
        if tag in VOID:
            return
        self.stack.append({"tag": tag, "attrs": a, "text": "", "line": line})

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        if self.in_style:
            self.css += data
        if self.stack:
            self.stack[-1]["text"] += data

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        if tag == "style":
            self.in_style = False
        if tag in VOID:
            return
        # pop to matching open element
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i]["tag"] == tag:
                el = self.stack[i]
                del self.stack[i:]
                self._check_closed(el)
                if self.stack:
                    self.stack[-1]["text"] += el["text"]
                return

    def _check_closed(self, el):
        tag, a = el["tag"], el["attrs"]
        name = (el["text"].strip() or a.get("aria-label", "").strip()
                or a.get("aria-labelledby", "").strip() or a.get("title", "").strip())
        role = a.get("role")
        if tag == "button" or role == "button" or (tag == "a" and "href" in a):
            if not name:
                self.issues.append(("error", "control-name",
                                    f"<{tag}> has no accessible name", "4.1.2 / 2.4.4", el["line"]))

    def finish(self):
        if self.seen_html and not self.html_lang:
            self.issues.append(("error", "html-lang", "<html> has no lang attribute", "3.1.1", 1))
        if self.title is None or not self.title.strip():
            self.issues.append(("error", "page-title", "page has no (or an empty) <title>", "2.4.2", 1))
        if not self.has_h1:
            self.issues.append(("warning", "no-h1", "page has no <h1>", "1.3.1 / 2.4.6", 1))
        if not self.has_main:
            self.issues.append(("warning", "no-main", "page has no <main> landmark", "1.3.1 / 2.4.1", 1))
        for a, inside, line in self.inputs:
            labelled = (inside or a.get("aria-label") or a.get("aria-labelledby")
                        or (a.get("id") and a["id"] in self.label_for))
            if not labelled:
                self.issues.append(("error", "input-label", "form field has no programmatic label", "1.3.1 / 3.3.2 / 4.1.2", line))
        if re.search(r"outline\s*:\s*(none|0)\b", self.css) and ":focus-visible" not in self.css:
            self.issues.append(("error", "focus-hidden", "CSS removes the focus outline with no :focus-visible replacement", "2.4.7", 1))


def lint_file(path):
    with open(path, encoding="utf-8") as fh:
        p = Linter()
        p.feed(fh.read())
        p.close()
        p.finish()
    return sorted(p.issues, key=lambda i: i[4])


def check_palette(path):
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    bad = 0
    for group, sc in (("text", "1.4.3"), ("ui", "1.4.11")):
        for item in data.get(group, []):
            r = contrast_ratio(item["fg"], item["bg"])
            ok = r >= item["min"]
            bad += not ok
            print(f'{"PASS" if ok else "FAIL"}  {r:5.2f}:1 (need {item["min"]}:1, WCAG {sc})  {item["name"]}  {item["fg"]} on {item["bg"]}')
    return 1 if bad else 0


def main(argv):
    if len(argv) >= 3 and argv[1] == "--contrast":
        r = contrast_ratio(argv[2], argv[3] if len(argv) > 3 else "#ffffff")
        print(f"{r:.2f}:1")
        return 0
    if len(argv) == 3 and argv[1] == "--palette":
        return check_palette(argv[2])
    files = [f for f in argv[1:] if not f.startswith("--")]
    if not files:
        print(__doc__)
        return 2
    errors = warnings = 0
    for f in files:
        issues = lint_file(f)
        print(f"== {f}")
        for sev, rule, msg, wcag, line in issues:
            print(f"  {sev.upper():7} line {line:<3} [{rule}] {msg}  (WCAG {wcag})")
            errors += sev == "error"
            warnings += sev == "warning"
        if not issues:
            print("  no issues found")
    print(f"\n{errors} error(s), {warnings} warning(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
