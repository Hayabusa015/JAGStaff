import { useRef, useState } from 'react';
import { UploadCloud, FileCheck2, X } from 'lucide-react';

// Drag-and-drop + click file picker. Calls onFile(file|null).
export default function FileDropzone({ file, onFile, accept }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const pick = (f) => onFile?.(f || null);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (e.dataTransfer.files?.[0]) pick(e.dataTransfer.files[0]);
      }}
      onClick={() => inputRef.current?.click()}
      className={[
        'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all',
        drag
          ? 'border-gold-400 bg-gold-500/10'
          : 'border-white/15 bg-ink-950/40 hover:border-gold-500/40 hover:bg-gold-500/5',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {file ? (
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-5 w-5 text-gold-400" />
          <span className="max-w-[14rem] truncate text-sm font-semibold text-zinc-100">
            {file.name}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              pick(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="rounded p-0.5 text-zinc-400 hover:text-red-300"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <UploadCloud className="h-6 w-6 text-gold-400" />
          <p className="text-sm font-semibold text-zinc-200">Drop a file or click to upload</p>
          <p className="text-[11px] text-zinc-500">PDF, slides, docs, images — PDFs auto-read for study tools</p>
        </>
      )}
    </div>
  );
}
