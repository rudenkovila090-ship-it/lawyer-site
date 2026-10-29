#!/usr/bin/env python3
"""Проверка сайта: python3 tools/check.py [--launch]

Ошибки (код выхода 1): битые ссылки, шапка/подвал отличаются между страницами.
Напоминания: незаполненные заглушки и режим черновика (noindex). С флагом --launch
они тоже считаются ошибками — для проверки перед запуском на домене.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LAUNCH = "--launch" in sys.argv
pages = sorted(ROOT.rglob("*.html"))

errors, reminders = [], []
PLACEHOLDER = re.compile(r"\[[A-ZА-ЯЁ][^\]]*\]")
LEFTOVERS = ("XXXXXXXXXX", "example.com", "t.me/USERNAME")


def block(html, tag):
    m = re.search(rf"<{tag}\b.*?</{tag}>", html, re.S)
    if not m:
        return ""
    text = m.group(0).replace(' aria-current="page"', "")
    return re.sub(r'(href|src)="\.\./', r'\1="', text)


reference = None
for page in pages:
    rel = page.relative_to(ROOT)
    html = page.read_text(encoding="utf-8")

    for path, frag in re.findall(r'(?:href|src)="([^"#:?]*)(#[^"]*)?"', html):
        if not path:
            if frag and f'id="{frag[1:]}"' not in html:
                errors.append(f"{rel}: нет якоря {frag}")
            continue
        target = (page.parent / path).resolve()
        if not target.exists():
            errors.append(f"{rel}: битая ссылка {path}")
        elif frag and target.suffix == ".html" and f'id="{frag[1:]}"' not in target.read_text(encoding="utf-8"):
            errors.append(f"{rel}: в {path} нет якоря {frag}")

    chrome = (block(html, "header"), block(html, "footer"))
    if reference is None:
        reference = chrome
    elif chrome != reference:
        errors.append(f"{rel}: шапка или подвал отличаются от остальных страниц")

    found = PLACEHOLDER.findall(re.sub(r"<!--.*?-->", "", html, flags=re.S))
    found += [s for s in LEFTOVERS if s in html]
    if found:
        reminders.append(f"{rel}: незаполненных заглушек — {len(found)}")
    if 'content="noindex' in html:
        reminders.append(f"{rel}: включён noindex (режим черновика)")

robots = (ROOT / "robots.txt").read_text(encoding="utf-8") if (ROOT / "robots.txt").exists() else ""
if re.search(r"^Disallow:\s*/\s*$", robots, re.M):
    reminders.append("robots.txt: сайт закрыт от поисковиков (режим черновика)")

for line in errors:
    print("ОШИБКА:", line)
for line in reminders:
    print("Напоминание:", line)

failed = bool(errors) or (LAUNCH and bool(reminders))
print(f"\nСтраниц проверено: {len(pages)}. Ошибок: {len(errors)}. Напоминаний: {len(reminders)}.")
sys.exit(1 if failed else 0)
