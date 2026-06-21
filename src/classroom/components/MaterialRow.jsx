import React, { useState } from 'react';
import {
  NotebookPen,
  FileText,
  Presentation,
  ClipboardList,
  FlaskConical,
  Paperclip,
  Download,
  Eye,
  Trash2,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { MATERIAL_TYPES } from '../data/mockData.js';
import { useApp } from '../ClassroomContext.jsx';
import Badge from './Badge.jsx';
import { hasStudyContent } from '../utils/studyGenerator.js';

const ICONS = {
  NotebookPen,
  FileText,
  Presentation,
  ClipboardList,
  FlaskConical,
  Paperclip,
};

function prettySize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MaterialRow({ material, unitId, canManage }) {
  const { openMaterialFile, deleteMaterial } = useApp();
  const [showPreview, setShowPreview] = useState(false);
  const meta = MATERIAL_TYPES[material.type] || MATERIAL_TYPES.other;
  const Icon = ICONS[meta.icon] || Paperclip;
  const previewText = material.studyContent || material.extractedText;
  const studyReady = hasStudyContent(material);

  const open = () => {
    if (material.hasFile) openMaterialFile(material.id);
    else if (previewText) setShowPreview((s) => !s);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-ink-950/40 transition-all hover:border-white/20">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold-500/10 text-gold-400 ring-1 ring-gold-500/25">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-zinc-100">{material.title}</p>
            <Badge tone="neutral">{meta.label}</Badge>
            {material.sample && <Badge tone="gold">Sample</Badge>}
            {studyReady && (
              <span title="Feeds the study-tool generator">
                <Sparkles className="h-3.5 w-3.5 text-gold-400" />
              </span>
            )}
          </div>
          {material.description && (
            <p className="truncate text-[11px] text-zinc-500">{material.description}</p>
          )}
          {material.hasFile && (
            <p className="text-[10px] text-zinc-600">
              {material.fileName} · {prettySize(material.fileSize)}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {material.hasFile ? (
            <button
              onClick={open}
              className="flex items-center gap-1 rounded-lg bg-ink-750 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-200 transition-colors hover:bg-gold-500 hover:text-ink-950"
            >
              <Download className="h-3.5 w-3.5" /> Open
            </button>
          ) : previewText ? (
            <button
              onClick={open}
              className="flex items-center gap-1 rounded-lg bg-ink-750 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-200 transition-colors hover:bg-gold-500 hover:text-ink-950"
            >
              <Eye className="h-3.5 w-3.5" /> View
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${showPreview ? 'rotate-180' : ''}`}
              />
            </button>
          ) : (
            <span className="px-2 text-[10px] italic text-zinc-600">no file</span>
          )}
          {canManage && (
            <button
              onClick={() => deleteMaterial(unitId, material.id)}
              className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-red-500/15 hover:text-red-300"
              aria-label="Delete material"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {showPreview && previewText && (
        <div className="border-t border-white/10 px-4 py-3">
          {Array.isArray(material.keyTerms) && material.keyTerms.length > 0 ? (
            <dl className="grid gap-1.5 sm:grid-cols-2">
              {material.keyTerms.map((t) => (
                <div key={t.term} className="rounded-lg bg-ink-900/60 px-3 py-1.5">
                  <dt className="text-xs font-bold text-gold-300">{t.term}</dt>
                  <dd className="text-[11px] text-zinc-400">{t.definition}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-300">
              {previewText}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
