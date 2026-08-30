import { useState } from 'react';
import { MATERIAL_TYPES } from '../data/mockData.js';
import { useApp } from '../ClassroomContext.jsx';
import MaterialRow from './MaterialRow.jsx';

// One drag-and-drop category column: a fixed material type "bucket" that's
// always rendered — even with nothing in it — so there's somewhere to drop a
// card. Dropping a MaterialRow here recategorizes it to `type`, and relocates
// it into `sectionId` (null = the unit's own top-level materials) if it came
// from somewhere else. Cross-unit drops are ignored — organizing stays scoped
// to one unit's own materials + sections at a time.
export default function CategoryBucket({ unitId, sectionId = null, type, materials, canManage, compact = false }) {
  const { moveMaterial } = useApp();
  const [dragOver, setDragOver] = useState(false);
  const meta = MATERIAL_TYPES[type] || MATERIAL_TYPES.other;

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (!canManage) return;
    let data;
    try {
      data = JSON.parse(e.dataTransfer.getData('application/json'));
    } catch {
      return;
    }
    if (!data?.materialId || data.unitId !== unitId) return;
    if ((data.sectionId || null) === sectionId && data.type === type) return; // dropped back on itself
    moveMaterial(unitId, data.materialId, { toSectionId: sectionId, toType: type });
  };

  return (
    <div
      onDragOver={canManage ? (e) => { e.preventDefault(); setDragOver(true); } : undefined}
      onDragLeave={canManage ? () => setDragOver(false) : undefined}
      onDrop={canManage ? handleDrop : undefined}
      className={[
        'rounded-lg border transition-colors',
        compact ? 'p-2' : 'p-2.5',
        dragOver ? 'border-gold-400 bg-gold-500/10' : 'border-white/8 bg-white/[0.02]',
      ].join(' ')}
    >
      <p
        className={[
          'mb-1.5 flex items-center gap-1.5 font-bold uppercase tracking-widest text-zinc-500',
          compact ? 'text-[10px]' : 'text-[11px]',
        ].join(' ')}
      >
        {meta.label}
        <span className="text-zinc-600">· {materials.length}</span>
      </p>
      {materials.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/10 px-2 py-3 text-center text-[10px] text-zinc-600">
          {canManage ? 'Drag an item here' : 'Nothing here yet'}
        </p>
      ) : (
        <div className="space-y-1.5">
          {materials.map((m) => (
            <MaterialRow key={m.id} material={m} unitId={unitId} sectionId={sectionId} canManage={canManage} />
          ))}
        </div>
      )}
    </div>
  );
}
