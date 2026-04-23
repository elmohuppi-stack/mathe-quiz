import crypto from "crypto";

/**
 * Algebra Task Generator
 *
 * Generates linear algebra tasks for step-by-step training.
 * According to anforderungen section 5.4 (Algebra levels L1-L5).
 *
 * Constraints (from anforderungen 7.2):
 * - no zero coefficient for main variable
 * - no division by zero
 * - unique solution (linear equations)
 * - solution must be simple integer or simple fraction
 * - no unnecessarily large numbers
 */

export interface AlgebraTask {
  taskId: string;
  taskHash: string;
  level: number;
  pattern: string;
  prompt: string; // The initial equation
  expectedFirstStep: string; // The mathematically correct next step
  metadata: {
    rule: string; // The rule to apply
    coefficients: Record<string, number>;
    solution: string;
  };
}

/**
 * Generate a task hash to prevent duplicates in a session
 */
function generateTaskHash(
  pattern: string,
  coefficients: Record<string, number>,
): string {
  const key = `${pattern}:${Object.keys(coefficients)
    .sort()
    .map((k) => `${k}=${coefficients[k]}`)
    .join(",")}`;
  return crypto.createHash("sha256").update(key).digest("hex").substring(0, 16);
}

/**
 * GCD helper for simplifying fractions
 */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Format a fraction or integer as string
 */
function formatNumber(num: number): string {
  if (Number.isInteger(num)) {
    return num.toString();
  }

  // Try to express as simple fraction
  const denominator = 10000;
  const numerator = Math.round(num * denominator);
  const g = gcd(numerator, denominator);

  if (denominator / g <= 10) {
    return `${numerator / g}/${denominator / g}`;
  }

  return num.toFixed(2);
}

/**
 * Level 1: ax + b = c with positive coefficients only
 * Pattern: 2x + 3 = 11 → 2x = 8
 * Constraints: a, b, c all positive, solution is positive integer
 */
export function generateL1Task(): AlgebraTask {
  let a: number, b: number, c: number, solution: number;

  do {
    a = Math.floor(Math.random() * 4) + 2; // 2-5
    b = Math.floor(Math.random() * 10) + 1; // 1-10
    solution = Math.floor(Math.random() * 10) + 1; // 1-10
    c = a * solution + b; // Ensure integer solution
  } while (c > 50 || a === 0); // Constraint: reasonable numbers

  const prompt = `${a}x + ${b} = ${c}`;
  const expectedFirstStep = `${a}x = ${c - b}`;
  const coefficients = { a, b, c, solution };
  const taskHash = generateTaskHash("L1_ax_plus_b_equals_c", coefficients);

  return {
    taskId: `algebra-l1-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    taskHash,
    level: 1,
    pattern: "ax + b = c (positive)",
    prompt,
    expectedFirstStep,
    metadata: {
      rule: "subtract_both_sides",
      coefficients,
      solution: formatNumber(solution),
    },
  };
}

/**
 * Level 2: ax + b = c with negative coefficients allowed
 * Pattern: -3x + 5 = -4 → -3x = -9
 * Constraints: allows negative coefficients, solution can be negative or positive
 */
export function generateL2Task(): AlgebraTask {
  let a: number, b: number, c: number, solution: number;

  do {
    // a can be negative
    const aSign = Math.random() > 0.5 ? 1 : -1;
    a = (Math.floor(Math.random() * 4) + 2) * aSign; // -5 to 5, excluding 0
    b = (Math.floor(Math.random() * 10) - 5) * (Math.random() > 0.5 ? 1 : -1); // -5 to 5
    solution =
      (Math.floor(Math.random() * 10) - 5) * (Math.random() > 0.5 ? 1 : -1); // -5 to 5
    c = a * solution + b;
  } while (a === 0 || Math.abs(c) > 50);

  const prompt = `${a}x + ${b >= 0 ? "+" : ""}${b} = ${c}`;
  const rightSide = c - b;
  const expectedFirstStep = `${a}x = ${rightSide >= 0 ? rightSide : rightSide}`;
  const coefficients = { a, b, c, solution };
  const taskHash = generateTaskHash("L2_ax_plus_b_equals_c", coefficients);

  return {
    taskId: `algebra-l2-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    taskHash,
    level: 2,
    pattern: "ax + b = c (negative allowed)",
    prompt,
    expectedFirstStep,
    metadata: {
      rule: "subtract_both_sides",
      coefficients,
      solution: formatNumber(solution),
    },
  };
}

/**
 * Level 3: ax + bx + c = d (multiple terms on one side)
 * Pattern: 2x + 3x + 5 = 20 → 5x + 5 = 20
 * First step: combine like terms
 */
export function generateL3Task(): AlgebraTask {
  let a: number, b: number, c: number, d: number, solution: number;

  do {
    a = Math.floor(Math.random() * 4) + 1; // 1-4
    b = Math.floor(Math.random() * 4) + 1; // 1-4
    c = Math.floor(Math.random() * 10) + 1; // 1-10
    solution = Math.floor(Math.random() * 8) + 1; // 1-8
    d = (a + b) * solution + c; // Ensure integer solution
  } while (d > 50 || a === 0 || b === 0);

  const combined = a + b;
  const prompt = `${a}x + ${b}x + ${c} = ${d}`;
  // First correct step is to combine like terms
  const expectedFirstStep = `${combined}x + ${c} = ${d}`;
  const coefficients = { a, b, c, d, solution, combined };
  const taskHash = generateTaskHash(
    "L3_ax_plus_bx_plus_c_equals_d",
    coefficients,
  );

  return {
    taskId: `algebra-l3-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    taskHash,
    level: 3,
    pattern: "ax + bx + c = d (combine terms)",
    prompt,
    expectedFirstStep,
    metadata: {
      rule: "combine_like_terms",
      coefficients,
      solution: formatNumber(solution),
    },
  };
}

/**
 * Level 4: a(x + b) = c (simple bracket, distributive law)
 * Pattern: 2(x + 3) = 14 → 2x + 6 = 14
 * First step: apply distributive law
 */
export function generateL4Task(): AlgebraTask {
  let a: number, b: number, c: number, solution: number;

  do {
    a = Math.floor(Math.random() * 4) + 2; // 2-5
    b = Math.floor(Math.random() * 8) + 1; // 1-8
    solution = Math.floor(Math.random() * 8) + 1; // 1-8
    c = a * (solution + b); // Ensure integer solution
  } while (c > 50 || a === 0);

  const prompt = `${a}(x + ${b}) = ${c}`;
  // First step: distribute
  const distributed_a = a;
  const distributed_b = a * b;
  const expectedFirstStep = `${distributed_a}x + ${distributed_b} = ${c}`;
  const coefficients = { a, b, c, solution };
  const taskHash = generateTaskHash(
    "L4_a_times_x_plus_b_equals_c",
    coefficients,
  );

  return {
    taskId: `algebra-l4-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    taskHash,
    level: 4,
    pattern: "a(x + b) = c (distributive)",
    prompt,
    expectedFirstStep,
    metadata: {
      rule: "distributive_law",
      coefficients,
      solution: formatNumber(solution),
    },
  };
}

/**
 * Level 5: a(x + b) = cx + d (terms on both sides, with brackets)
 * Pattern: 2(x + 3) = x + 8 → 2x + 6 = x + 8
 * First step: apply distributive law
 */
export function generateL5Task(): AlgebraTask {
  let a: number, b: number, c: number, d: number, solution: number;

  do {
    a = Math.floor(Math.random() * 3) + 2; // 2-4
    b = Math.floor(Math.random() * 6) + 1; // 1-6
    c = Math.floor(Math.random() * 2) + 1; // 1-2 (usually smaller than left side coefficient)
    solution = Math.floor(Math.random() * 8) + 1; // 1-8
    // a(x + b) = cx + d
    // ax + ab = cx + d
    // Solve: (a - c)x + ab = d => x = (d - ab) / (a - c)
    d = c * solution + a * (solution + b) - a * solution; // Simplify to ensure integer
    d = a * solution + a * b - c * solution; // a(x+b) = cx + d
  } while (a === c || Math.abs(d) > 50 || solution < 1);

  const prompt = `${a}(x + ${b}) = ${c}x + ${d}`;
  // First step: distribute left side
  const distributed_a = a;
  const distributed_ab = a * b;
  const expectedFirstStep = `${distributed_a}x + ${distributed_ab} = ${c}x + ${d}`;
  const coefficients = { a, b, c, d, solution };
  const taskHash = generateTaskHash(
    "L5_a_times_x_plus_b_equals_cx_plus_d",
    coefficients,
  );

  return {
    taskId: `algebra-l5-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    taskHash,
    level: 5,
    pattern: "a(x + b) = cx + d (distributive, both sides)",
    prompt,
    expectedFirstStep,
    metadata: {
      rule: "distributive_law",
      coefficients,
      solution: formatNumber(solution),
    },
  };
}

/**
 * Generate an algebra task for a given level
 * Returns a proper step-by-step task with first correct step provided
 */
export function generateAlgebraTask(level: number): AlgebraTask {
  // Ensure level is 1-5
  const validLevel = Math.max(1, Math.min(5, level));

  switch (validLevel) {
    case 1:
      return generateL1Task();
    case 2:
      return generateL2Task();
    case 3:
      return generateL3Task();
    case 4:
      return generateL4Task();
    case 5:
      return generateL5Task();
    default:
      return generateL1Task();
  }
}

/**
 * Check if a task hash has already been used in session
 * Used to prevent duplicate tasks
 */
export function isTaskHashUsed(
  hash: string,
  sessionHashes: Set<string>,
): boolean {
  return sessionHashes.has(hash);
}

/**
 * Generate a unique task for a session
 * Retries up to 10 times to find a task not already in the session
 */
export function generateUniqueAlgebraTask(
  level: number,
  sessionHashes: Set<string>,
): AlgebraTask {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const task = generateAlgebraTask(level);
    if (!isTaskHashUsed(task.taskHash, sessionHashes)) {
      return task;
    }
    attempts++;
  }

  // If we can't find a unique one after max attempts, return anyway
  // (better to repeat than to hang)
  return generateAlgebraTask(level);
}
