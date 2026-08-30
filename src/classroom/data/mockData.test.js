import { describe, it, expect } from 'vitest';
import { bucketTypesFor, UNIT_MATERIAL_TYPES, SECTION_MATERIAL_TYPES } from './mockData.js';

describe('bucketTypesFor', () => {
  it('always includes the fixed category list, even with no materials', () => {
    expect(bucketTypesFor(UNIT_MATERIAL_TYPES, [])).toEqual(UNIT_MATERIAL_TYPES);
    expect(bucketTypesFor(SECTION_MATERIAL_TYPES, [])).toEqual(SECTION_MATERIAL_TYPES);
  });

  it('does not duplicate a type already in the fixed list', () => {
    const materials = [{ type: 'project' }, { type: 'lab' }];
    expect(bucketTypesFor(SECTION_MATERIAL_TYPES, materials)).toEqual(SECTION_MATERIAL_TYPES);
  });

  it('appends a type present in the data but outside the fixed list, so nothing goes missing', () => {
    const materials = [{ type: 'homework' }, { type: 'legacy_flashcards' }];
    expect(bucketTypesFor(['homework', 'lab'], materials)).toEqual(['homework', 'lab', 'legacy_flashcards']);
  });
});
