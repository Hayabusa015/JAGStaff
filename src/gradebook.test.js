import { describe, it, expect } from "vitest";
import {
  letterGrade,
  gradeTier,
  dropLowest,
  gradePct,
  calcPeriodGrade,
  calcSemesterGrade,
  DEFAULT_SCALE,
  DEFAULT_PERIOD_WEIGHTS,
} from "./gradebook.js";

describe("letterGrade", () => {
  it("maps percentages to the right letter on the default scale", () => {
    expect(letterGrade(100)).toBe("A+");
    expect(letterGrade(97)).toBe("A+");
    expect(letterGrade(93)).toBe("A");
    expect(letterGrade(90)).toBe("A-");
    expect(letterGrade(72)).toBe("C-");
    expect(letterGrade(60)).toBe("D-");
    expect(letterGrade(59.9)).toBe("F");
    expect(letterGrade(0)).toBe("F");
  });

  it("returns an em dash for null/NaN", () => {
    expect(letterGrade(null)).toBe("—");
    expect(letterGrade(undefined)).toBe("—");
    expect(letterGrade(NaN)).toBe("—");
  });
});

describe("gradeTier", () => {
  it("buckets by tier and handles ungraded", () => {
    expect(gradeTier(95)).toBe("a");
    expect(gradeTier(85)).toBe("b");
    expect(gradeTier(75)).toBe("c");
    expect(gradeTier(65)).toBe("d");
    expect(gradeTier(40)).toBe("f");
    expect(gradeTier(null)).toBe("ungraded");
  });
});

describe("dropLowest", () => {
  it("removes the n lowest scores", () => {
    expect(dropLowest([90, 50, 70, 100], 1)).toEqual([70, 90, 100]);
    expect(dropLowest([90, 50, 70, 100], 2)).toEqual([90, 100]);
  });
  it("is a no-op for n <= 0", () => {
    expect(dropLowest([90, 50], 0)).toEqual([90, 50]);
  });
});

describe("gradePct", () => {
  const asgn = { max_points: 50 };
  it("computes a percentage from points earned", () => {
    expect(gradePct({ points_earned: 45 }, asgn)).toBe(90);
  });
  it("returns null when there is no score", () => {
    expect(gradePct({ points_earned: null }, asgn)).toBeNull();
    expect(gradePct(null, asgn)).toBeNull();
  });
  it("returns null when the assignment has no max_points (no divide-by-zero)", () => {
    expect(gradePct({ points_earned: 10 }, { max_points: 0 })).toBeNull();
  });
});

describe("calcPeriodGrade", () => {
  const categories = [
    { name: "Tests", weight: 70, drop_lowest: 0 },
    { name: "Quizzes", weight: 20, drop_lowest: 0 },
    { name: "Homework", weight: 10, drop_lowest: 0 },
  ];
  const assignments = [
    { id: "t1", category: "Tests", max_points: 100 },
    { id: "q1", category: "Quizzes", max_points: 100 },
    { id: "h1", category: "Homework", max_points: 100 },
  ];

  it("computes a weighted average across categories", () => {
    const gradeMap = {
      t1: { points_earned: 90 },
      q1: { points_earned: 80 },
      h1: { points_earned: 100 },
    };
    const { pct } = calcPeriodGrade(assignments, gradeMap, categories);
    // 90*0.7 + 80*0.2 + 100*0.1 = 63 + 16 + 10 = 89
    expect(pct).toBeCloseTo(89, 5);
  });

  it("renormalizes weights when a category has no graded work", () => {
    const gradeMap = { t1: { points_earned: 90 } }; // only Tests
    const { pct } = calcPeriodGrade(assignments, gradeMap, categories);
    expect(pct).toBeCloseTo(90, 5); // Tests alone = 90
  });

  it("returns null pct for a student with no grades (no divide-by-zero)", () => {
    const { pct } = calcPeriodGrade(assignments, {}, categories);
    expect(pct).toBeNull();
  });

  it("excludes excused grades and counts missing as zero", () => {
    const gradeMap = {
      t1: { excused: true },
      q1: { points_earned: 80 },
      h1: { missing: true },
    };
    const { pct } = calcPeriodGrade(assignments, gradeMap, categories);
    // Tests excused → dropped; Quizzes 80 (w20), Homework 0 (w10) → (80*20+0*10)/30
    expect(pct).toBeCloseTo((80 * 20 + 0 * 10) / 30, 5);
  });

  it("treats a zero-weight category as invisible without breaking the math", () => {
    const cats = [...categories, { name: "Labs", weight: 0, drop_lowest: 0 }];
    const asgns = [...assignments, { id: "l1", category: "Labs", max_points: 100 }];
    const gradeMap = {
      t1: { points_earned: 90 },
      q1: { points_earned: 80 },
      h1: { points_earned: 100 },
      l1: { points_earned: 0 },
    };
    const { pct } = calcPeriodGrade(asgns, gradeMap, cats);
    // Labs weight 0 contributes nothing → still 89
    expect(pct).toBeCloseTo(89, 5);
  });
});

describe("calcSemesterGrade", () => {
  it("weights periods + midterm + final", () => {
    const grades = { 1: 90, 2: 80, 3: 100, 4: 70, midterm: 85, final: 95 };
    const sem = calcSemesterGrade(grades, DEFAULT_PERIOD_WEIGHTS);
    // (90+80+100+70)*20 + 85*10 + 95*10 all over 100
    const expected = (90 * 20 + 80 * 20 + 100 * 20 + 70 * 20 + 85 * 10 + 95 * 10) / 100;
    expect(sem).toBeCloseTo(expected, 5);
  });

  it("renormalizes over only the periods that have data", () => {
    const grades = { 1: 90 };
    const sem = calcSemesterGrade(grades, DEFAULT_PERIOD_WEIGHTS);
    expect(sem).toBeCloseTo(90, 5);
  });

  it("returns null when nothing is graded", () => {
    expect(calcSemesterGrade({}, DEFAULT_PERIOD_WEIGHTS)).toBeNull();
  });
});

describe("DEFAULT_SCALE", () => {
  it("is ordered and covers 0", () => {
    expect(DEFAULT_SCALE[0].letter).toBe("A+");
    expect(DEFAULT_SCALE[DEFAULT_SCALE.length - 1]).toEqual({ letter: "F", min: 0 });
  });
});
