import prisma from "./db.ts";
import { validateAnswer } from "./tasks.ts";

export interface AnswerSubmission {
  sessionId: string;
  taskId: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeTakenMs: number;
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
  timeTakenMs: number
): Promise<AnswerSubmission> {
  const isCorrect = validateAnswer(userAnswer, correctAnswer);

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
  if (normalized.replace(/[\/\-\+\*]/g, "") === 
      correct.replace(/[\/\-\+\*]/g, "")) {
    return "format-error";
  }

  return "unknown-error";
}

/**
 * Get answer statistics for a session
 */
export async function getSessionStats(sessionId: string) {
  const answers = await prisma.answer.findMany({
    where: { sessionId },
  });

  const correctCount = answers.filter((a) => a.isCorrect).length;
  const avgTime = answers.length > 0 
    ? answers.reduce((sum, a) => sum + a.timeTaken, 0) / answers.length 
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
  answers: Array<{ isCorrect: boolean; errorType: string | null }>
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
  module: string,
  limit = 50
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
