#!/usr/bin/env python3
"""Build src/data/faction-reference.json from the ti4-reference sources.

Source: https://github.com/scottmk/ti4-reference (CC-BY-4.0, by scottmk),
published at https://scottmk.github.io/ti4-reference/.

Usage:
    git clone --depth 1 https://github.com/scottmk/ti4-reference.git /tmp/ti4-reference
    python3 scripts/build-faction-reference.py /tmp/ti4-reference

Only the "Unmodded" text is kept (Absol's Mod tabs are dropped); when a card has
several printed versions (Base / Codex / Thunder's Edge) the newest one is kept.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src' / 'data' / 'faction-reference.json'

# local faction id -> page in docs/factions/
PAGES = {
    'sol': 'base/sol', 'mentak': 'base/mentak', 'yin': 'base/yin', 'muaat': 'base/muaat',
    'arborec': 'base/arborec', 'l1z1x': 'base/l1z1x', 'winnu': 'base/winnu', 'nekro': 'base/nekro',
    'naalu': 'base/naalu', 'barony': 'base/letnev', 'saar': 'base/saar', 'jolnar': 'base/jolnar',
    'norr': 'base/norr', 'xxcha': 'base/xxcha', 'yssaril': 'base/yssaril', 'hacan': 'base/hacan',
    'creuss': 'base/creuss',
    'mahact': 'pok/mahact', 'nomad': 'pok/nomad', 'vuilraith': 'pok/cabal', 'ul': 'pok/titans',
    'empyrean': 'pok/empyrean', 'naazrokha': 'pok/naaz', 'argent': 'pok/argent',
    'bastion': 'te/bastion', 'ralnel': 'te/ralnel', 'deepwrought': 'te/deepwrought',
    'firmament': 'te/firmament', 'crimson': 'te/rebellion',
}

SECTION_PT = {
    'Home System': 'Sistema natal',
    'Starting Space Units': 'Unidades espaciais iniciais',
    'Starting Ground Units': 'Unidades terrestres iniciais',
    'Starting Technologies': 'Tecnologias iniciais',
    'Starting Technologies/Components': 'Tecnologias/componentes iniciais',
    'Faction Abilities': 'Habilidades da facção',
    'Flagship': 'Nau capitânia',
    'Mech': 'Mech',
    'Special Units': 'Unidades especiais',
    'Faction Technologies': 'Tecnologias da facção',
    'Leaders': 'Líderes',
    'Breakthrough': 'Breakthrough',
    'Faction Promissory Note': 'Nota promissória',
    'Plots': 'Plots',
}

UNIT_NAMES = {
    'infantry': 'Infantry', 'mech': 'Mech', 'fighter': 'Fighter', 'flagship': 'Flagship',
    'carrier': 'Carrier', 'spacedock': 'Space Dock', 'cruiser': 'Cruiser', 'destroyer': 'Destroyer',
    'dreadnought': 'Dreadnought', 'pds': 'PDS', 'warsun': 'War Sun',
}
TECH_ICONS = {'warfare': '🔴', 'biotic': '🟢', 'propulsion': '🔵', 'cybernetic': '🟡', 'unit-upgrade': '⬆'}


def icon(code: str) -> str:
    """Turn a :ti4-...: shortcode into plain text."""
    if m := re.fullmatch(r'unit-dice-x(\d)', code):
        return f'(×{m[1]})'
    if code in ('unit-inf-cost', 'unit-fighter-cost'):
        return '(×2)'
    if m := re.fullmatch(r'unit-(.+)', code):
        return UNIT_NAMES.get(m[1], m[1])
    if m := re.fullmatch(r'tech-(.+)', code):
        return TECH_ICONS.get(m[1], '')
    if m := re.fullmatch(r'planets-resources-(\d)', code):
        return f'{m[1]}R'
    if m := re.fullmatch(r'planets-influence-(\d)', code):
        return f'{m[1]}I'
    if m := re.fullmatch(r'planets-(hazardous|industrial|cultural)', code):
        return f'({m[1].capitalize()})'
    # expansion / faction / mod marks carry no rules text
    return ''


def indent_of(line: str) -> int:
    return len(line) - len(line.lstrip(' '))


def resolve_includes(text: str, src: Path) -> str:
    out = []
    for line in text.split('\n'):
        m = re.match(r'^(\s*)--8<-- "([^"]+)"\s*$', line)
        if m:
            inc = (src / m[2]).read_text()
            inc = resolve_includes(inc, src)
            out.extend((m[1] + l) if l.strip() else '' for l in inc.split('\n'))
        else:
            out.append(line)
    return '\n'.join(out)


VERSION_TAB = re.compile(r'^(_?Base|Codex|_?Thunder)')


def resolve_tabs(lines: list[str]) -> list[str]:
    """Flatten `=== "Label"` content tabs, keeping the unmodded / newest text."""
    out: list[str] = []
    i = 0
    while i < len(lines):
        m = re.match(r'^(\s*)=== "([^"]*)"\s*$', lines[i])
        if not m:
            out.append(lines[i])
            i += 1
            continue
        base = len(m[1])
        tabs: list[tuple[str, list[str]]] = []
        while i < len(lines):
            m = re.match(r'^(\s*)=== "([^"]*)"\s*$', lines[i])
            if not m or len(m[1]) != base:
                break
            label, body = m[2], []
            i += 1
            while i < len(lines) and (not lines[i].strip() or indent_of(lines[i]) > base):
                body.append(lines[i][base + 4:] if lines[i].strip() else '')
                i += 1
            tabs.append((label, body))
            # blank lines between tabs belong to the group
        tabs = [t for t in tabs if 'Absol' not in t[0]]
        if not tabs:
            continue
        if len(tabs) > 1 and all(VERSION_TAB.match(t[0]) or t[0] == 'Unmodded' for t in tabs):
            tabs = tabs[-1:]
        for label, body in tabs:
            if len(tabs) > 1:
                clean = re.sub(r':ti4-[a-z0-9-]+:', '', label).strip(' _')
                out.append(' ' * base + f'#### ▸ {clean}')
                out.append('')
            out.extend(' ' * base + l if l else '' for l in resolve_tabs(body))
    return out


def clean_text(md: str) -> str:
    # collapse repeated unit icons: ":ti4-unit-x::ti4-unit-x:" -> "2× X"
    def units(m):
        codes = re.findall(r':ti4-unit-([a-z]+):', m[0])
        return f'{len(codes)}× {UNIT_NAMES.get(codes[0], codes[0])}' if len(codes) > 1 else UNIT_NAMES.get(codes[0], codes[0])
    md = re.sub(r'(Unit Type: [^:\n]+?) *:ti4-unit-[a-z]+:', r'\1', md)  # icon repeats the type
    md = re.sub(r'(?:\:ti4-unit-([a-z]+):)(?:\:ti4-unit-\1:)+', units, md)
    md = re.sub(r':ti4-([a-z0-9-]+):', lambda m: icon(m[1]), md)
    md = re.sub(r'<sup>.*?</sup>', '', md)
    md = re.sub(r'<span[^>]*>(.*?)</span>', r'\1', md)
    md = re.sub(r'</?[a-z][^>]*>', '', md)
    md = re.sub(r'^\s*\{ *\.[^}]*\}\s*$', '', md, flags=re.M)
    md = md.replace('__|__', '|')
    # planet stat rows are tables: "2R 0I | (Hazardous) |" -> "2R 0I · (Hazardous)"
    md = re.sub(r'^\d+R \d+I.*$', lambda m: ' · '.join(p.strip() for p in m[0].split('|') if p.strip()),
                md, flags=re.M)
    md = re.sub(r'[ \t]+$', '', md, flags=re.M)
    md = re.sub(r'[ \t]{2,}', ' ', md)
    md = re.sub(r'\n{3,}', '\n\n', md)
    md = re.sub(r'^---\n\n(?:---\n\n)+', '---\n\n', md, flags=re.M)  # back-to-back rules
    md = re.sub(r'\n+---\s*$', '', md)  # trailing rule
    return md.strip()


def build_faction(path: Path, src: Path) -> dict:
    text = resolve_includes(path.read_text(), src)
    text = re.sub(r'^---\n.*?\n---\n', '', text, flags=re.S)  # front matter
    lines = resolve_tabs(text.split('\n'))
    sections = []
    cur = None
    for line in lines:
        m = re.match(r'^-\s+## __(.+?)__', line)
        if m:
            cur = {'title': SECTION_PT.get(m[1], m[1]), 'lines': []}
            sections.append(cur)
            continue
        if cur is None:
            continue
        if line.strip().startswith('</div>') or line.strip().startswith('<div'):
            cur = None if line.strip().startswith('</div>') else cur
            continue
        cur['lines'].append(line[4:] if line.startswith('    ') else line.lstrip())
    result = []
    for s in sections:
        body = clean_text('\n'.join(s['lines']))
        body = re.sub(r'^-{3,}\n+', '', body)  # the card's leading rule
        if body:
            result.append({'title': s['title'], 'body': body})
    return result


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1])
    commit = subprocess.run(['git', '-C', str(src), 'rev-parse', '--short', 'HEAD'],
                            capture_output=True, text=True).stdout.strip()
    data = {
        'source': 'https://scottmk.github.io/ti4-reference/',
        'license': 'CC-BY-4.0 — TI4 Reference by scottmk',
        'commit': commit,
        'factions': {},
    }
    for fid, page in PAGES.items():
        data['factions'][fid] = {
            'url': f'https://scottmk.github.io/ti4-reference/factions/{page}/',
            'sections': build_faction(src / 'docs' / 'factions' / f'{page}.md', src),
        }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n')
    print(f'wrote {OUT} ({len(data["factions"])} factions)')


if __name__ == '__main__':
    main()
