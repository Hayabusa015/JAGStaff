// =============================================================================
//  STUDY TOOL GENERATOR  (smart offline engine)
//  Turns a set of materials into flashcards + multiple-choice questions from
//  their key terms and any extracted/typed text. No API keys required.
//
//  This is the single swap-point for a future AI engine: replace generateStudyTool
//  with a call to a serverless `/api/generate-study-tool` (Claude) returning the
//  same { flashcards, mcqs, ... } shape and the UI keeps working unchanged.
// =============================================================================

// Parse "Term: definition" / "Term - definition" / "Term — definition" /
// "Term = definition" lines out of free text (e.g. extracted PDF / typed notes).
function parseTermsFromText(text) {
  if (!text) return [];
  const out = [];
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.length > 240) continue;
    const m = line.match(/^([^:\-–—=]{2,60})\s*[:\-–—=]\s+(.{3,})$/);
    if (m) {
      const term = m[1].replace(/^\d+[.)]\s*/, '').replace(/\*\*/g, '').trim();
      const definition = m[2].replace(/\*\*/g, '').trim();
      if (term && definition) out.push({ term, definition });
    }
  }
  return out;
}

// Gather a de-duplicated term bank from the selected materials.
export function collectTerms(materials = []) {
  const seen = new Set();
  const terms = [];
  const sources = new Set();
  for (const m of materials) {
    const fromKeyTerms = Array.isArray(m.keyTerms) ? m.keyTerms : [];
    const fromText = [
      ...parseTermsFromText(m.extractedText),
      ...parseTermsFromText(m.studyContent),
    ];
    for (const t of [...fromKeyTerms, ...fromText]) {
      if (!t?.term || !t?.definition) continue;
      const key = t.term.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      terms.push({ term: t.term.trim(), definition: t.definition.trim(), source: m.title });
      sources.add(m.title);
    }
  }
  return { terms, sources: [...sources] };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildFlashcards(terms) {
  return shuffle(terms).map((t, i) => ({
    id: `fc-${i}`,
    front: t.term,
    back: t.definition,
    source: t.source,
  }));
}

// Each question shows a definition; the learner picks the matching term.
function buildMcqs(terms, max = 10) {
  if (terms.length < 2) return [];
  const pool = shuffle(terms).slice(0, max);
  return pool.map((correct, qi) => {
    const distractors = shuffle(terms.filter((t) => t.term !== correct.term))
      .slice(0, 3)
      .map((t) => t.term);
    const options = shuffle([correct.term, ...distractors]);
    return {
      id: `q-${qi}`,
      prompt: `Which term is defined as: “${correct.definition}”`,
      options,
      answer: correct.term,
      source: correct.source,
    };
  });
}

export function generateStudyTool(materials = [], opts = {}) {
  const { flashcards: wantCards = true, mcq: wantMcq = true } = opts;
  const { terms, sources } = collectTerms(materials);
  return {
    flashcards: wantCards ? buildFlashcards(terms) : [],
    mcqs: wantMcq ? buildMcqs(terms) : [],
    termCount: terms.length,
    sources,
  };
}

// Does a material carry anything the generator can use? Drives default-checked
// selection in the UI.
export function hasStudyContent(material) {
  return (
    (Array.isArray(material.keyTerms) && material.keyTerms.length > 0) ||
    !!(material.extractedText && material.extractedText.trim()) ||
    !!(material.studyContent && material.studyContent.trim())
  );
}
