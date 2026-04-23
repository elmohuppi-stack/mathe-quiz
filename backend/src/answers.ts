import prisma from "./db.js";
import { validateAnswer } from "./tasks.js";
import { validateEquation, validateExpression } from "./validator.js";
import type { Module } from "./tasks.js";

export interface AnswerSubmission {
  sessionId: string;
  taskId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeTakenMs: number;
}

export interface ModuleHistoryStep {
  id: string;
  sessionId: string;
  taskId: string;
  createdAt: string;
  sessionStartedAt: string;
  currentEquation: string;
  proposedStep: string;
  expectedFirstStep: string;
  transformationType: string | null;
  userAnswer: string;
  isCorrect: boolean;
  errorType: string | null;
  timeTakenMs: number;
}

export interface ModuleHistorySummary {
  module: Module;
  totalSubmissions: number;
  correctSubmissions: number;
  accuracy: number;
  avgTimeMs: number;
  recentSteps: ModuleHistoryStep[];
}

function extractAlgebraTaskData(taskData: unknown): {
  currentEquation: string;
  proposedStep: string;
  expectedFirstStep: string;
  transformationType: string | null;
} {
  if (!taskData || typeof taskData !== "object" || Array.isArray(taskData)) {
    return {
      currentEquation: "",
      proposedStep: "",
      expectedFirstStep: "",
      transformationType: null,
    };
  }

  const data = taskData as Record<string, unknown>;

  return {
    currentEquation:
      typeof data.currentEquation === "string" ? data.currentEquation : "",
    proposedStep:
      typeof data.proposedStep === "string" ? data.proposedStep : "",
    expectedFirstStep:
      typeof data.expectedFirstStep === "string" ? data.expectedFirstStep : "",
    transformationType:
      typeof data.transformationType === "string"
        ? data.transformationType
        : null,
  };
}

/**
 * Save an answer to database
 */
export async function saveAnswer(
  userId: string,
  sessionId: string,
  taskId: string,
  userAnswer: string,
  correctAnswer: string,
  timeTakenMs: number,
  module: Module = "mental-math",
): Promise<AnswerSubmission> {
  let isCorrect = false;

  // Use validator service for algebra module
  if (module === "algebra") {
    try {
      // For algebra, we expect answers in format "x = value"
      // Parse and validate using SymPy
      const result = await validateEquation(userAnswer, correctAnswer, ["x"]);
      isCorrect = result.are_equivalent;
    } catch (error) {
      // Fallback to simple string comparison
      isCorrect = validateAnswer(userAnswer, correctAnswer);
    }
  } else {
    isCorrect = validateAnswer(userAnswer, correctAnswer);
  }

  // Save to database
  await prisma.answer.create({
    data: {
      userId,
      sessionId,
      taskId,
      taskData: {}, // Can store task details here if needed
      userAnswer,
      isCorrect,
      timeTaken: timeTakenMs,
      errorType: isCorrect ? null : categorizeError(userAnswer, correctAnswer),
    },
  });

  return {
    sessionId,
    taskId,
    userAnswer,
    correctAnswer,
    isCorrect,
    timeTakenMs,
  };
}

/**
 * Categorize the type of error
 */
function categorizeError(userAnswer: string, correctAnswer: string): string {
  const normalized = userAnswer.trim().replace(/\s/g, "").toLowerCase();
  const correct = correctAnswer.trim().replace(/\s/g, "").toLowerCase();

  // Check if it's a calculation error
  if (normalized.match(/^-?\d+\.?\d*$/) && correct.match(/^-?\d+\.?\d*$/)) {
    const userNum = parseFloat(normalized);
    const correctNum = parseFloat(correct);
    if (userNum === correctNum * 2) return "off-by-factor-2";
    if (userNum === correctNum * -1) return "sign-error";
    if (Math.abs(userNum - correctNum) <= 1) return "rounding-error";
    return "calculation-error";
  }

  // Check if it's a format error
  if (
    normalized.replace(/[\/\-\+\*]/g, "") === correct.replace(/[\/\-\+\*]/g, "")
  ) {
    return "format-error";
  }

  return "unknown-error";
}

/**
 * Get answer statistics for a session
 */
export async function getSessionStats(sessionId: string) {
  const answers: Array<{
    isCorrect: boolean;
    timeTaken: number;
    errorType: string | null;
  }> = await prisma.answer.findMany({
    where: { sessionId },
  });

  const correctCount = answers.filter((answer) => answer.isCorrect).length;
  const avgTime =
    answers.length > 0
      ? answers.reduce((sum, answer) => sum + answer.timeTaken, 0) /
        answers.length
      : 0;

  return {
    totalAnswers: answers.length,
    correctAnswers: correctCount,
    accuracy: answers.length > 0 ? (correctCount / answers.length) * 100 : 0,
    avgTimeMs: avgTime,
    errors: groupErrors(answers),
  };
}

/**
 * Group errors by type
 */
function groupErrors(
  answers: Array<{ isCorrect: boolean; errorType: string | null }>,
) {
  const errorGroups: Record<string, number> = {};

  answers
    .filter((a) => !a.isCorrect && a.errorType)
    .forEach((a) => {
      const type = a.errorType || "unknown";
      errorGroups[type] = (errorGroups[type] || 0) + 1;
    });

  return errorGroups;
}

/**
 * Get user's answer history for a module
 */
export async function getUserAnswerHistory(
  userId: string,
  module: Module,
  limit = 50,
) {
  const answers = await prisma.answer.findMany({
    where: {
      userId,
      session: {
        module: module as any,
      },
    },
    include: {
      session: true,
    },
    orderBy: { session: { startedAt: "desc" } },
    take: limit,
  });

  return answers;
}

export async function getUserModuleHistory(
  userId: string,
  module: Module,
  limit = 24,
): Promise<ModuleHistorySummary> {
  const where = {
    userId,
    session: {
      module,
    },
  };

  const [recentAnswers, totalSubmissions, correctSubmissions, aggregates]: [
    Array<{
      id: string;
      sessionId: string;
      taskId: string;
      taskData: unknown;
      userAnswer: string;
      isCorrect: boolean;
      errorType: string | null;
      timeTaken: number;
      createdAt: Date;
      session: {
        startedAt: Date;
      };
    }>,
    number,
    number,
    { _avg: { timeTaken: number | null } },
  ] = await Promise.all([
    prisma.answer.findMany({
      where,
      include: {
        session: {
          select: {
            startedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    }),
    prisma.answer.count({ where }),
    prisma.answer.count({
      where: {
        ...where,
        isCorrect: true,
      },
    }),
    prisma.answer.aggregate({
      where,
      _avg: {
        timeTaken: true,
      },
    }),
  ]);

  const recentSteps = recentAnswers.map(
    (answer: (typeof recentAnswers)[number]) => {
      const taskData = extractAlgebraTaskData(answer.taskData);

      return {
        id: answer.id,
        sessionId: answer.sessionId,
        taskId: answer.taskId,
        createdAt: answer.createdAt.toISOString(),
        sessionStartedAt: answer.session.startedAt.toISOString(),
        currentEquation: taskData.currentEquation,
        proposedStep: taskData.proposedStep || answer.userAnswer,
        expectedFirstStep: taskData.expectedFirstStep,
        transformationType: taskData.transformationType,
        userAnswer: answer.userAnswer,
        isCorrect: answer.isCorrect,
        errorType: answer.errorType,
        timeTakenMs: answer.timeTaken,
      };
    },
  );

  return {
    module,
    totalSubmissions,
    correctSubmissions,
    accuracy:
      totalSubmissions > 0 ? (correctSubmissions / totalSubmissions) * 100 : 0,
    avgTimeMs: Math.round(aggregates._avg.timeTaken ?? 0),
    recentSteps,
  };
}
