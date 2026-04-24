import {
  generateAlgebraTask as generateAlgebraTaskImpl,
  generateUniqueAlgebraTask,
} from "./algebra-generator.js";

export type Module = "mental-math" | "fractions" | "algebra";

export interface Task {
  taskId: string;
  taskHash?: string; // For deduplication
  module: Module;
  level: number;
  taskData: Record<string, any>;
  correctAnswer: string;
  expectedFirstStep?: string; // For step-by-step tasks (algebra)
  prompt?: string; // For step-by-step tasks (algebra)
  metadata?: Record<string, any>; // Additional task metadata
}

interface RationalNumber {
  numerator: bigint;
  denominator: bigint;
}

type FractionsTaskKind =
  | "fraction-operation"
  | "fraction-to-percent"
  | "percent-of-quantity"
  | "percentage-ratio";

interface FractionsTaskData {
  kind: FractionsTaskKind;
  question: string;
  operation?: "+" | "-" | "*" | "/";
  answerFormat: "fraction" | "number" | "percent";
  numerator1?: number;
  denominator1?: number;
  numerator2?: number;
  denominator2?: number;
  percent?: number;
  baseValue?: number;
  partValue?: number;
}

function pickRandom<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

function greatestCommonDivisor(a: bigint, b: bigint): bigint {
  let left = a < 0n ? -a : a;
  let right = b < 0n ? -b : b;

  while (right !== 0n) {
    const remainder = left % right;
    left = right;
    right = remainder;
  }

  return left;
}

function parseRationalNumber(value: string): RationalNumber | null {
  const normalized = value.trim().replace(/\s/g, "");

  if (!normalized) {
    return null;
  }

  if (/^-?\d+$/.test(normalized)) {
    return {
      numerator: BigInt(normalized),
      denominator: 1n,
    };
  }

  const match = normalized.match(/^(-?\d+)\/(-?\d+)$/);

  if (!match) {
    return null;
  }

  const numerator = BigInt(match[1]);
  const denominator = BigInt(match[2]);

  if (denominator === 0n) {
    return null;
  }

  const sign = denominator < 0n ? -1n : 1n;
  const normalizedNumerator = numerator * sign;
  const normalizedDenominator = denominator * sign;
  const divisor = greatestCommonDivisor(
    normalizedNumerator,
    normalizedDenominator,
  );

  return {
    numerator: normalizedNumerator / divisor,
    denominator: normalizedDenominator / divisor,
  };
}

function areEquivalentRationals(left: string, right: string): boolean {
  const leftRational = parseRationalNumber(left);
  const rightRational = parseRationalNumber(right);

  if (!leftRational || !rightRational) {
    return false;
  }

  return (
    leftRational.numerator === rightRational.numerator &&
    leftRational.denominator === rightRational.denominator
  );
}

function createFractionOperationTask(level: number, taskId: string): Task {
  let numerator1: number, denominator1: number;
  let numerator2: number, denominator2: number;
  let operation: "+" | "-" | "*" | "/";

  if (level <= 2) {
    numerator1 = Math.floor(Math.random() * 8) + 1;
    denominator1 = Math.floor(Math.random() * 8) + 2;
    numerator2 = Math.floor(Math.random() * 8) + 1;
    denominator2 = denominator1;
    operation = pickRandom(["+", "-"] as const);
  } else if (level <= 4) {
    numerator1 = Math.floor(Math.random() * 10) + 1;
    denominator1 = Math.floor(Math.random() * 10) + 2;
    numerator2 = Math.floor(Math.random() * 10) + 1;
    denominator2 = Math.floor(Math.random() * 10) + 2;
    operation = pickRandom(["+", "-", "*"] as const);
  } else {
    numerator1 = Math.floor(Math.random() * 15) + 1;
    denominator1 = Math.floor(Math.random() * 15) + 2;
    numerator2 = Math.floor(Math.random() * 15) + 1;
    denominator2 = Math.floor(Math.random() * 15) + 2;
    operation = pickRandom(["+", "-", "*", "/"] as const);
  }

  let correctAnswer: string;
  if (operation === "+") {
    const resultNum = numerator1 * denominator2 + numerator2 * denominator1;
    const resultDenom = denominator1 * denominator2;
    correctAnswer = `${resultNum}/${resultDenom}`;
  } else if (operation === "-") {
    const resultNum = numerator1 * denominator2 - numerator2 * denominator1;
    const resultDenom = denominator1 * denominator2;
    correctAnswer = `${resultNum}/${resultDenom}`;
  } else if (operation === "*") {
    const resultNum = numerator1 * numerator2;
    const resultDenom = denominator1 * denominator2;
    correctAnswer = `${resultNum}/${resultDenom}`;
  } else {
    const resultNum = numerator1 * denominator2;
    const resultDenom = denominator1 * numerator2;
    correctAnswer = `${resultNum}/${resultDenom}`;
  }

  const taskData: FractionsTaskData = {
    kind: "fraction-operation",
    question: `${numerator1}/${denominator1} ${operation} ${numerator2}/${denominator2} = ?`,
    operation,
    answerFormat: "fraction",
    numerator1,
    denominator1,
    numerator2,
    denominator2,
  };

  return {
    taskId,
    module: "fractions",
    level,
    taskData,
    correctAnswer,
  };
}

function createFractionToPercentTask(level: number, taskId: string): Task {
  const denominator = pickRandom([2, 4, 5, 10, 20, 25, 50] as const);
  const numerator = Math.floor(Math.random() * (denominator - 1)) + 1;
  const percent = (numerator * 100) / denominator;
  const taskData: FractionsTaskData = {
    kind: "fraction-to-percent",
    question: `${numerator}/${denominator} = ? %`,
    answerFormat: "percent",
    numerator1: numerator,
    denominator1: denominator,
    percent,
  };

  return {
    taskId,
    module: "fractions",
    level,
    taskData,
    correctAnswer: `${percent}%`,
  };
}

function createPercentOfQuantityTask(level: number, taskId: string): Task {
  const percent = pickRandom([10, 20, 25, 50, 75] as const);
  const answerFactor = Math.floor(Math.random() * 10) + 2;
  const partValue = percent === 75 ? answerFactor * 3 : answerFactor;
  const baseValue = (partValue * 100) / percent;
  const taskData: FractionsTaskData = {
    kind: "percent-of-quantity",
    question: `${percent}% von ${baseValue} = ?`,
    answerFormat: "number",
    percent,
    baseValue,
    partValue,
  };

  return {
    taskId,
    module: "fractions",
    level,
    taskData,
    correctAnswer: `${partValue}`,
  };
}

function createPercentageRatioTask(level: number, taskId: string): Task {
  const percent = pickRandom([10, 20, 25, 40, 50, 75] as const);
  const baseFactor = Math.floor(Math.random() * 8) + 2;
  const baseValue = percent === 75 ? baseFactor * 4 : baseFactor * 20;
  const partValue = (baseValue * percent) / 100;
  const taskData: FractionsTaskData = {
    kind: "percentage-ratio",
    question: `${partValue} ist wie viel % von ${baseValue}?`,
    answerFormat: "percent",
    percent,
    baseValue,
    partValue,
  };

  return {
    taskId,
    module: "fractions",
    level,
    taskData,
    correctAnswer: `${percent}%`,
  };
}

/**
 * Generate a mental math task
 * Level 1-2: Single digit operations
 * Level 3-4: Double digit operations
 * Level 5: Complex multi-step
 */
function generateMentalMathTask(level: number): Task {
  const taskId = `mental-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  let a: number, b: number, operation: "+" | "-" | "*" | "/";

  if (level <= 2) {
    a = Math.floor(Math.random() * 10) + 1;
    b = Math.floor(Math.random() * 10) + 1;
    operation = ["+", "-", "*"][Math.floor(Math.random() * 3)] as any;
  } else if (level <= 4) {
    a = Math.floor(Math.random() * 90) + 10;
    b = Math.floor(Math.random() * 90) + 10;
    operation = ["+", "-", "*"][Math.floor(Math.random() * 3)] as any;
  } else {
    a = Math.floor(Math.random() * 999) + 100;
    b = Math.floor(Math.random() * 99) + 10;
    operation = ["+", "-", "*", "/"][Math.floor(Math.random() * 4)] as any;
  }

  let correctAnswer: string;
  if (operation === "+") correctAnswer = (a + b).toString();
  else if (operation === "-") correctAnswer = (a - b).toString();
  else if (operation === "*") correctAnswer = (a * b).toString();
  else correctAnswer = (a / b).toFixed(2);

  return {
    taskId,
    module: "mental-math",
    level,
    taskData: {
      question: `${a} ${operation} ${b} = ?`,
      a,
      b,
      operation,
    },
    correctAnswer,
  };
}

/**
 * Generate a fractions task
 * Level 1-2: Simple addition/subtraction (same denominator)
 * Level 3-4: Mixed operations
 * Level 5: Complex fractions
 */
function generateFractionsTask(level: number): Task {
  const taskId = `fractions-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  if (level <= 2) {
    return pickRandom([
      createFractionOperationTask(level, taskId),
      createFractionToPercentTask(level, taskId),
    ]);
  }

  if (level <= 4) {
    return pickRandom([
      createFractionOperationTask(level, taskId),
      createFractionToPercentTask(level, taskId),
      createPercentOfQuantityTask(level, taskId),
    ]);
  }

  return pickRandom([
    createFractionOperationTask(level, taskId),
    createFractionToPercentTask(level, taskId),
    createPercentOfQuantityTask(level, taskId),
    createPercentageRatioTask(level, taskId),
  ]);
}

/**
 * Generate an algebra task using the robust algebra-generator
 * Level 1-5: Linear equations with increasing complexity
 * Returns step-by-step format with expectedFirstStep for validation
 */
function generateAlgebraTask(level: number, sessionHashes?: Set<string>): Task {
  const algebraTask = sessionHashes
    ? generateUniqueAlgebraTask(level, sessionHashes)
    : generateAlgebraTaskImpl(level);

  return {
    taskId: algebraTask.taskId,
    taskHash: algebraTask.taskHash,
    module: "algebra",
    level: algebraTask.level,
    prompt: algebraTask.prompt,
    expectedFirstStep: algebraTask.expectedFirstStep,
    taskData: {
      type: "step_by_step",
      pattern: algebraTask.pattern,
      equation: algebraTask.prompt,
      ...algebraTask.metadata.coefficients,
    },
    correctAnswer: `x = ${algebraTask.metadata.solution}`,
    metadata: algebraTask.metadata,
  };
}

/**
 * Generate a task based on module and level
 * For algebra tasks, optionally pass sessionHashes to prevent duplicates within session
 */
export function generateTask(
  module: Module,
  level: number,
  sessionHashes?: Set<string>,
): Task {
  // Validate level
  if (level < 1 || level > 5) {
    level = Math.max(1, Math.min(5, level));
  }

  switch (module) {
    case "mental-math":
      return generateMentalMathTask(level);
    case "fractions":
      return generateFractionsTask(level);
    case "algebra":
      return generateAlgebraTask(level, sessionHashes);
    default:
      return generateMentalMathTask(level);
  }
}

/**
 * Validate an answer (simple string comparison for now)
 * More complex validation will be handled by validator service
 */
export function validateAnswer(
  userAnswer: string,
  correctAnswer: string,
): boolean {
  const normalized = userAnswer.trim().replace(/\s/g, "").toLowerCase();
  const correct = correctAnswer.trim().replace(/\s/g, "").toLowerCase();

  const normalizedPercent = normalized.endsWith("%")
    ? normalized.slice(0, -1)
    : normalized;
  const correctPercent = correct.endsWith("%") ? correct.slice(0, -1) : correct;

  if (
    correct.endsWith("%") &&
    normalizedPercent.length > 0 &&
    normalizedPercent === correctPercent
  ) {
    return true;
  }

  if (areEquivalentRationals(userAnswer, correctAnswer)) {
    return true;
  }

  return normalized === correct;
}
