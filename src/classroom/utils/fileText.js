// Best-effort client-side text extraction so the study-tool generator can read
// uploaded files. PDF via lazily-loaded pdf.js; .txt/.md read directly; other
// types return '' and rely on teacher-provided key terms / study content.
//
// IMPORTANT: pdf.js is imported *dynamically inside the function* only — never at
// module top level — so this module stays safe to import during SSR / the smoke
// test (the browser-only code never evaluates unless extractText() is called).

export async function extractText(file) {
  if (!file || typeof file.name !== 'string') return '';
  const name = file.name.toLowerCase();

  try {
    if (name.endsWith('.txt') || name.endsWith('.md') || file.type?.startsWith('text/')) {
      return await file.text();
    }

    if (name.endsWith('.pdf') || file.type === 'application/pdf') {
      const pdfjs = await import('pdfjs-dist');
      // Run the worker from CDN (matches the installed version) — no bundler
      // asset wiring required, works in dev/prod alike.
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      const data = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data }).promise;
      const pages = [];
      const max = Math.min(pdf.numPages, 40); // cap for very large docs
      for (let i = 1; i <= max; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        pages.push(content.items.map((it) => it.str).join(' '));
      }
      return pages.join('\n');
    }
  } catch {
    // Extraction is a bonus — fall back to key terms / study content.
    return '';
  }

  return '';
}
