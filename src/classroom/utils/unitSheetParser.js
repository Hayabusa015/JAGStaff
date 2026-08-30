// Parses a teacher's "unit breakdown" sheet (an .xlsx/.xls/.csv spreadsheet, or a
// plain-text/.txt outline) into a tree of { title, description, materials, sections }
// so Materials → Import can bulk-create Units, Sections, and assignment placeholders
// in one drop instead of the teacher typing every row by hand.
//
// Two source shapes are supported:
//  - Columnar (xlsx/xls/csv, or any pasted text with tab/comma-separated columns):
//    a Unit column, an optional Section column, and an Item column, with blank
//    cells inheriting the unit/section from the row above — the normal way Excel
//    breakdown sheets look once merged cells export to rows.
//  - Outline text (plain paste or a one-column sheet): lines like "Unit 1: ...",
//    "Section 1.1: ..." / "Lesson 2" / "Topic 3", and everything else is an item
//    under whichever container is currently open.
//
// Deliberately dependency-free: the npm `xlsx` (SheetJS) package carries two
// unpatched vulnerabilities (prototype pollution + ReDoS, no fix available) and
// this parses files a teacher drops in on a production app, so it's not worth
// pulling in just to read spreadsheets. CSV is parsed by hand below (RFC 4180 —
// quoted fields, embedded commas/newlines, doubled-quote escaping); a true binary
// .xlsx/.xls needs "Save As → CSV" first, which parseUnitSheetFile reports as a
// warning rather than silently failing.

const TYPE_RULES = [
  { type: 'study_guide', re: /study\s*guide|review\s*guide|unit\s*review|exam\s*review/i },
  { type: 'guided_notes', re: /guided\s*notes?/i },
  { type: 'presentation', re: /power\s*point|slide\s*deck|slides?\b|presentation/i },
  { type: 'assessment', re: /\bquiz\b|\btest\b|\bexam\b/i },
  { type: 'lab', re: /\blab\b|\bexperiment\b/i },
  { type: 'homework', re: /\bhomework\b|\bhw\b/i },
  { type: 'worksheet', re: /worksheet|practice\s*(problems|set)?/i },
  { type: 'notes', re: /\bnotes?\b/i },
];

export function classifyMaterialType(text) {
  const t = (text || '').trim();
  for (const { type, re } of TYPE_RULES) {
    if (re.test(t)) return type;
  }
  return 'other';
}

function makeUnit(title, description = '') {
  return { title: title.trim(), description: description.trim(), materials: [], sections: [] };
}
function makeSection(title, description = '') {
  return { title: title.trim(), description: description.trim(), materials: [] };
}
function makeItem(title, type) {
  const trimmed = title.trim();
  return { title: trimmed, type: type || classifyMaterialType(trimmed) };
}

// ---------------------------------------------------------------------------
//  Outline text: "Unit 1: Stoichiometry" / "Section 1.2: Moles" / "Lesson 3" /
//  "Topic 4" / bare "1.2 Moles", everything else is an item under whatever
//  container (section, else unit) is currently open.
// ---------------------------------------------------------------------------
const BULLET_RE = /^[\s]*[-*•–]\s*/;
const UNIT_RE = /^unit\s*#?\s*(\d+)\b\s*[:\-–.]?\s*(.*)$/i;
const KEYWORD_SECTION_RE = /^(section|lesson|topic)\s*#?\s*(\d+(?:\.\d+)?)\b\s*[:\-–.]?\s*(.*)$/i;
const BARE_SECTION_RE = /^(\d+\.\d+)\b\s*[:\-–.]?\s*(.*)$/;

export function parseOutlineText(text) {
  const units = [];
  const warnings = [];
  let currentUnit = null;
  let currentSection = null;

  const lines = (text || '').split(/\r?\n/);
  for (const raw of lines) {
    const stripped = raw.replace(BULLET_RE, '').trim();
    if (!stripped) continue;

    const unitMatch = stripped.match(UNIT_RE);
    if (unitMatch) {
      const [, num, rest] = unitMatch;
      currentUnit = makeUnit(rest ? `Unit ${num}: ${rest}` : `Unit ${num}`);
      currentSection = null;
      units.push(currentUnit);
      continue;
    }

    const kwMatch = stripped.match(KEYWORD_SECTION_RE);
    const bareMatch = !kwMatch && stripped.match(BARE_SECTION_RE);
    if (kwMatch || bareMatch) {
      if (!currentUnit) {
        warnings.push(`Skipped "${stripped}" — no unit has started yet.`);
        continue;
      }
      const label = kwMatch ? kwMatch[1][0].toUpperCase() + kwMatch[1].slice(1).toLowerCase() : 'Section';
      const num = kwMatch ? kwMatch[2] : bareMatch[1];
      const rest = kwMatch ? kwMatch[3] : bareMatch[2];
      currentSection = makeSection(rest ? `${label} ${num}: ${rest}` : `${label} ${num}`);
      currentUnit.sections.push(currentSection);
      continue;
    }

    // Plain item line — belongs to the most specific open container.
    if (!currentUnit) {
      warnings.push(`Skipped "${stripped}" — no unit has started yet.`);
      continue;
    }
    const item = makeItem(stripped);
    (currentSection || currentUnit).materials.push(item);
  }

  return { units, warnings, sourceType: 'outline' };
}

// ---------------------------------------------------------------------------
//  Columnar rows: [[cell, cell, ...], ...]. Detects an optional header row to
//  find the Unit/Section/Item/Type columns, then forward-fills Unit and
//  Section down through blank cells (how a merged-cell Excel export flattens).
// ---------------------------------------------------------------------------
function findCol(header, keywords) {
  return header.findIndex((h) => keywords.some((k) => (h || '').toLowerCase().includes(k)));
}

export function parseColumnarRows(rows) {
  const clean = rows
    .map((r) => (r || []).map((c) => (c == null ? '' : String(c).trim())))
    .filter((r) => r.some((c) => c !== ''));
  if (!clean.length) return { units: [], warnings: ['Sheet is empty.'], sourceType: 'columnar' };

  let unitCol = 0, sectionCol = 1, itemCol = 2, typeCol = -1;
  const headerRow = clean[0];
  const looksLikeHeader = headerRow.some((c) =>
    /^(unit|section|lesson|topic|item|assignment|material|title|name|type|category)$/i.test(c)
  );
  let dataRows = clean;
  if (looksLikeHeader) {
    const lower = headerRow.map((c) => c.toLowerCase());
    const u = findCol(lower, ['unit']);
    const s = findCol(lower, ['section', 'lesson', 'topic']);
    const i = findCol(lower, ['item', 'assignment', 'material', 'title', 'name']);
    const t = findCol(lower, ['type', 'category']);
    if (u >= 0) unitCol = u;
    if (s >= 0) sectionCol = s;
    if (i >= 0) itemCol = i;
    typeCol = t;
    dataRows = clean.slice(1);
  }

  const units = [];
  const warnings = [];
  let currentUnit = null;
  let currentSection = null;

  for (const row of dataRows) {
    const unitCell = row[unitCol] || '';
    const sectionCell = row[sectionCol] || '';
    const itemCell = row[itemCol] || '';
    const typeCell = typeCol >= 0 ? row[typeCol] || '' : '';

    if (unitCell) {
      currentUnit = makeUnit(unitCell);
      currentSection = null;
      units.push(currentUnit);
    }
    if (sectionCell) {
      if (!currentUnit) {
        warnings.push(`Skipped section "${sectionCell}" — no unit given for its row.`);
      } else {
        currentSection = makeSection(sectionCell);
        currentUnit.sections.push(currentSection);
      }
    }
    if (itemCell) {
      if (!currentUnit) {
        warnings.push(`Skipped "${itemCell}" — no unit given for its row.`);
        continue;
      }
      const type = typeCell ? classifyMaterialType(typeCell) : classifyMaterialType(itemCell);
      const item = makeItem(itemCell, type);
      (currentSection || currentUnit).materials.push(item);
    }
  }

  return { units, warnings, sourceType: 'columnar' };
}

// ---------------------------------------------------------------------------
//  Hand-rolled RFC 4180 CSV: quoted fields, embedded commas/newlines, and
//  doubled-quote ("") escaping. Small enough to read in one pass — no need for
//  a dependency just to split rows.
// ---------------------------------------------------------------------------
export function parseCsvText(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/\r\n/g, '\n');

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ---------------------------------------------------------------------------
//  Entry point: reads the dropped File and routes it to the right parser.
// ---------------------------------------------------------------------------
export async function parseUnitSheetFile(file) {
  const name = (file?.name || '').toLowerCase();

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return {
      units: [],
      warnings: [
        'Excel (.xlsx/.xls) files aren\'t read directly yet — in Excel or Google Sheets, use ' +
          '"File → Save As / Download → CSV" and drop that file instead, or paste the outline as text.',
      ],
      sourceType: 'unsupported',
    };
  }

  const text = await file.text();

  if (name.endsWith('.csv')) {
    return parseColumnarRows(parseCsvText(text));
  }

  // .txt / .tsv / pasted text: tab-separated lines are still columnar; otherwise
  // treat it as a plain outline.
  const nonEmptyLines = text.split(/\r?\n/).filter((l) => l.trim());
  const tabbed = nonEmptyLines.filter((l) => l.includes('\t'));
  if (nonEmptyLines.length && tabbed.length / nonEmptyLines.length > 0.6) {
    const rows = nonEmptyLines.map((l) => l.split('\t'));
    return parseColumnarRows(rows);
  }

  return parseOutlineText(text);
}
