export type Module = "mental-math" | "fractions" | "algebra";

export interface Task {
  taskId: string;
  module: Module;
  level: number;
  taskData: Record<string, any>;
  correctAnswer: string;
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

  let numerator1: number, denominator1: number;
  let numerator2: number, denominator2: number;
  let operation: "+" | "-" | "*" | "/";

  if (level <= 2) {
    numerator1 = Math.floor(Math.random() * 8) + 1;
    denominator1 = Math.floor(Math.random() * 8) + 2;
    numerator2 = Math.floor(Math.random() * 8) + 1;
    denominator2 = denominator1;
    operation = ["+", "-"][Math.floor(Math.random() * 2)] as any;
  } else if (level <= 4) {
    numerator1 = Math.floor(Math.random() * 10) + 1;
    denominator1 = Math.floor(Math.random() * 10) + 2;
    numerator2 = Math.floor(Math.random() * 10) + 1;
    denominator2 = Math.floor(Math.random() * 10) + 2;
    operation = ["+", "-", "*"][Math.floor(Math.random() * 3)] as any;
  } else {
    numerator1 = Math.floor(Math.random() * 15) + 1;
    denominator1 = Math.floor(Math.random() * 15) + 2;
    numerator2 = Math.floor(Math.random() * 15) + 1;
    denominator2 = Math.floor(Math.random() * 15) + 2;
    operation = ["+", "-", "*", "/"][Math.floor(Math.random() * 4)] as any;
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

  return {
    taskId,
    module: "fractions",
    level,
    taskData: {
      question: `${numerator1}/${denominator1} ${operation} ${numerator2}/${denominator2} = ?`,
      numerator1,
      denominator1,
      numerator2,
      denominator2,
      operation,
    },
    correctAnswer,
  };
}

/**
 * Generate an algebra task
 * Level 1-2: Simple linear equations
 * Level 3-4: Quadratic or multi-variable
 * Level 5: Complex expressions
 */
function generateAlgebraTask(level: number): Task {
  const taskId = `algebra-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  let question: string;
  let correctAnswer: string;
  let taskData: Record<string, any>;

  if (level <= 2) {
    // x + a = b
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 30) + 20;
    question = `x + ${a} = ${b}`;
    correctAnswer = `x = ${b - a}`;
    taskData = {
      type: "linear_equation",
      equation: question,
      a,
      b,
    };
  } else if (level <= 4) {
    // ax + b = c
    const a = Math.floor(Math.random() * 5) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    const c = Math.floor(Math.random() * 50) + 30;
    question = `${a}x + ${b} = ${c}`;
    correctAnswer = `x = ${(c - b) / a}`;
    taskData = {
      type: "linear_equation_complex",
      equation: question,
      a,
      b,
      c,
    };
  } else {
    // x^2 + a = b
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 50) + 20;
    question = `x² + ${a} = ${b}`;
    const x = Math.sqrt(b - a);
    correctAnswer = `x = ±${x}`;
    taskData = {
      type: "quadratic_equation",
      equation: question,
      a,
      b,
    };
  }

  return {
    taskId,
    module: "algebra",
    level,
    taskData,
    correctAnswer,
  };
}

/**
 * Generate a task based on module and level
 */
export function generateTask(module: Module, level: number): Task {
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
      return generateAlgebraTask(level);
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
  // Normalize answers: trim whitespace, remove spaces
  const normalized = userAnswer.trim().replace(/\s/g, "").toLowerCase();
  const correct = correctAnswer.trim().replace(/\s/g, "").toLowerCase();

  return normalized === correct;
}
