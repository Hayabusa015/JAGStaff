import { describe, it, expect } from 'vitest';
import {
  classifyMaterialType,
  parseOutlineText,
  parseColumnarRows,
  parseCsvText,
} from './unitSheetParser.js';

describe('classifyMaterialType', () => {
  it('recognizes the common unit-level types', () => {
    expect(classifyMaterialType('Overall PowerPoint for unit')).toBe('presentation');
    expect(classifyMaterialType('Guided Notes')).toBe('guided_notes');
    expect(classifyMaterialType('Unit Study Guide')).toBe('study_guide');
  });

  it('recognizes section-level assignment types', () => {
    expect(classifyMaterialType('Section 1.1 Homework')).toBe('homework');
    expect(classifyMaterialType('Density Lab')).toBe('lab');
    expect(classifyMaterialType('Practice Worksheet')).toBe('worksheet');
    expect(classifyMaterialType('Unit 3 Test')).toBe('assessment');
  });

  it('prefers study guide over the bare "guide" not matching notes', () => {
    expect(classifyMaterialType('Exam Review')).toBe('study_guide');
  });

  it('falls back to other for unrecognized text', () => {
    expect(classifyMaterialType('Random field trip form')).toBe('other');
  });
});

describe('parseOutlineText', () => {
  it('builds units, sections, and items from a plain-text outline', () => {
    const text = `
      Unit 1: Stoichiometry
      Overall Powerpoint for unit
      Guided notes for unit
      Study guide for unit
      Section 1.1: Mole Conversions
      Homework — mole conversions practice
      Density Lab
      Section 1.2: Limiting Reactants
      Limiting Reactant Worksheet

      Unit 2: Gas Laws
      Gas Laws Slides
    `;
    const { units, warnings } = parseOutlineText(text);
    expect(warnings).toHaveLength(0);
    expect(units).toHaveLength(2);

    const [u1, u2] = units;
    expect(u1.title).toBe('Unit 1: Stoichiometry');
    expect(u1.materials.map((m) => m.title)).toEqual([
      'Overall Powerpoint for unit',
      'Guided notes for unit',
      'Study guide for unit',
    ]);
    expect(u1.materials[0].type).toBe('presentation');
    expect(u1.materials[1].type).toBe('guided_notes');
    expect(u1.materials[2].type).toBe('study_guide');

    expect(u1.sections).toHaveLength(2);
    expect(u1.sections[0].title).toBe('Section 1.1: Mole Conversions');
    expect(u1.sections[0].materials.map((m) => m.type)).toEqual(['homework', 'lab']);
    expect(u1.sections[1].materials[0].type).toBe('worksheet');

    expect(u2.title).toBe('Unit 2: Gas Laws');
    expect(u2.materials).toHaveLength(1);
  });

  it('supports bare Lesson/Topic and numeric x.y section headers', () => {
    const text = `
      Unit 1
      Lesson 1: Intro
      Reading homework
      Topic 2: Deep Dive
      Lab report
      1.3 Wrap-up
      Review worksheet
    `;
    const { units } = parseOutlineText(text);
    expect(units[0].sections.map((s) => s.title)).toEqual([
      'Lesson 1: Intro',
      'Topic 2: Deep Dive',
      'Section 1.3: Wrap-up',
    ]);
  });

  it('reads a bare "0 Title" / "0.1 Title" curriculum-map style with no "Unit"/"Section" words', () => {
    // Mirrors Shull Science's printed Chemistry Unit + Section Organizer.
    const text = `
      0 Foundations of Chemistry
      0.1 Laboratory Equipment
      0.2 Laboratory Safety
      1 Matter & Atomic Structure
      1.1 Matter & Changes
      7 The Mole & Chemical Quantities
      7.4 Mole Conversions
    `;
    const { units, warnings } = parseOutlineText(text);
    expect(warnings).toHaveLength(0);
    expect(units.map((u) => u.title)).toEqual([
      'Unit 0: Foundations of Chemistry',
      'Unit 1: Matter & Atomic Structure',
      'Unit 7: The Mole & Chemical Quantities',
    ]);
    expect(units[0].sections.map((s) => s.title)).toEqual([
      'Section 0.1: Laboratory Equipment',
      'Section 0.2: Laboratory Safety',
    ]);
    expect(units[2].sections[0].title).toBe('Section 7.4: Mole Conversions');
  });

  it('does not mistake a plain numbered list for bare unit headers', () => {
    const text = `
      Unit 1: Intro
      Section 1.1: Getting Started
      1 Read chapter 3
      2 Answer the review questions
      3 Bring goggles tomorrow
    `;
    const { units } = parseOutlineText(text);
    expect(units).toHaveLength(1);
    expect(units[0].sections).toHaveLength(1);
    expect(units[0].sections[0].materials.map((m) => m.title)).toEqual([
      '1 Read chapter 3',
      '2 Answer the review questions',
      '3 Bring goggles tomorrow',
    ]);
  });

  it('strips bullet markers and warns about content before the first unit', () => {
    const text = '- Some stray note\nUnit 1\n* Guided Notes';
    const { units, warnings } = parseOutlineText(text);
    expect(warnings).toHaveLength(1);
    expect(units[0].materials[0].title).toBe('Guided Notes');
  });
});

describe('parseCsvText', () => {
  it('splits quoted fields with embedded commas', () => {
    const rows = parseCsvText('Unit,Section,Item\nUnit 1,"Section 1, Intro",Guided Notes');
    expect(rows).toEqual([
      ['Unit', 'Section', 'Item'],
      ['Unit 1', 'Section 1, Intro', 'Guided Notes'],
    ]);
  });

  it('handles doubled-quote escaping and embedded newlines', () => {
    const rows = parseCsvText('A,B\n"She said ""hi""","line1\nline2"');
    expect(rows[1]).toEqual(['She said "hi"', 'line1\nline2']);
  });
});

describe('parseColumnarRows', () => {
  it('forward-fills unit/section across blank cells with a header row', () => {
    const rows = [
      ['Unit', 'Section', 'Assignment'],
      ['Unit 1: Stoichiometry', '', 'Overall Powerpoint for unit'],
      ['', '', 'Guided notes for unit'],
      ['', 'Section 1.1: Moles', 'Mole Conversions Homework'],
      ['', '', 'Density Lab'],
      ['', 'Section 1.2: Limiting Reactants', 'Practice Worksheet'],
      ['Unit 2: Gas Laws', '', 'Gas Laws Slides'],
    ];
    const { units, warnings } = parseColumnarRows(rows);
    expect(warnings).toHaveLength(0);
    expect(units).toHaveLength(2);
    expect(units[0].materials.map((m) => m.title)).toEqual([
      'Overall Powerpoint for unit',
      'Guided notes for unit',
    ]);
    expect(units[0].sections).toHaveLength(2);
    expect(units[0].sections[0].materials.map((m) => m.type)).toEqual(['homework', 'lab']);
    expect(units[1].title).toBe('Unit 2: Gas Laws');
  });

  it('assumes Unit/Section/Item column order with no header row', () => {
    const rows = [
      ['Unit 1', 'Intro', 'Warm-up Worksheet'],
      ['', '', 'Homework 1'],
    ];
    const { units } = parseColumnarRows(rows);
    expect(units[0].sections[0].materials).toHaveLength(2);
  });

  it('warns when an item has no unit context', () => {
    const rows = [['', '', 'Orphan Item']];
    const { units, warnings } = parseColumnarRows(rows);
    expect(units).toHaveLength(0);
    expect(warnings[0]).toMatch(/Orphan Item/);
  });

  it('respects an explicit Type column over guessed classification', () => {
    const rows = [
      ['Unit', 'Section', 'Item', 'Type'],
      ['Unit 1', '', 'Mystery Packet', 'lab'],
    ];
    const { units } = parseColumnarRows(rows);
    expect(units[0].materials[0].type).toBe('lab');
  });
});
