import { isLocallyAcceptedAlgebraStep } from "./algebra-rules.js";

export interface RawAlgebraHistoryRow {
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
}

export interface AlgebraHistoryTaskStep {
  id: string;
  createdAt: string;
  currentEquation: string;
  response: string;
  expectedAnswer: string;
  expectedFirstStep: string;
  transformationType: string | null;
  isCorrect: boolean;
  errorType: string | null;
  timeTakenMs: number;
}

export interface AggregatedAlgebraTaskEntry {
  id: string;
  sessionId: string;
  taskId: string;
  createdAt: string;
  sessionStartedAt: string;
  prompt: string;
  response: string;
  expectedAnswer: string;
  currentEquation: string;
  proposedStep: string;
  expectedFirstStep: string;
  transformationType: string | null;
  userAnswer: string;
  isCorrect: boolean;
  errorType: string | null;
  timeTakenMs: number;
  steps: AlgebraHistoryTaskStep[];
  stepCount: number;
  correctStepCount: number;
  taskAccuracy: number;
  totalTimeMs: number;
  isTaskComplete: boolean;
}

interface AlgebraTaskDataSnapshot {
  currentEquation: string;
  proposedStep: string;
  expectedFirstStep: string;
  transformationType: string | null;
  correctAnswer: string;
  isTaskComplete: boolean;
}

function normalizeAlgebraStep(step: string): string {
  return step.trim().replace(/\s/g, "");
}

function isLikelyFinalSolution(step: string): boolean {
  return /^x=/.test(normalizeAlgebraStep(step));
}

function extractAlgebraTaskData(taskData: unknown): AlgebraTaskDataSnapshot {
  if (!taskData || typeof taskData !== "object" || Array.isArray(taskData)) {
    return {
      currentEquation: "",
      proposedStep: "",
      expectedFirstStep: "",
      transformationType: null,
      correctAnswer: "",
      isTaskComplete: false,
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
    correctAnswer:
      typeof data.correctAnswer === "string" ? data.correctAnswer : "",
    isTaskComplete: data.isTaskComplete === true,
  };
}

export function aggregateAlgebraTaskEntries(
  rows: RawAlgebraHistoryRow[],
  limit = 24,
): AggregatedAlgebraTaskEntry[] {
  const groupedTasks = new Map<string, AggregatedAlgebraTaskEntry>();
  const sortedRows = [...rows].sort(
    (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
  );

  for (const row of sortedRows) {
    const taskData = extractAlgebraTaskData(row.taskData);
    const groupKey = `${row.sessionId}:${row.taskId}`;
    const response = taskData.proposedStep || row.userAnswer;
    const effectiveStepCorrect =
      row.isCorrect ||
      isLocallyAcceptedAlgebraStep(
        response,
        taskData.currentEquation,
        taskData.expectedFirstStep,
      );
    const isCompletedStep =
      taskData.isTaskComplete ||
      (effectiveStepCorrect &&
        taskData.correctAnswer.length > 0 &&
        normalizeAlgebraStep(row.userAnswer) ===
          normalizeAlgebraStep(taskData.correctAnswer)) ||
      (effectiveStepCorrect &&
        taskData.correctAnswer.length === 0 &&
        isLikelyFinalSolution(response));

    if (!groupedTasks.has(groupKey)) {
      groupedTasks.set(groupKey, {
        id: groupKey,
        sessionId: row.sessionId,
        taskId: row.taskId,
        createdAt: row.createdAt.toISOString(),
        sessionStartedAt: row.session.startedAt.toISOString(),
        prompt: taskData.currentEquation || row.taskId,
        response,
        expectedAnswer: taskData.correctAnswer,
        currentEquation: taskData.currentEquation,
        proposedStep: response,
        expectedFirstStep: taskData.expectedFirstStep,
        transformationType: taskData.transformationType,
        userAnswer: row.userAnswer,
        isCorrect: false,
        errorType: row.isCorrect ? null : row.errorType,
        timeTakenMs: row.timeTaken,
        steps: [],
        stepCount: 0,
        correctStepCount: 0,
        taskAccuracy: 0,
        totalTimeMs: 0,
        isTaskComplete: false,
      });
    }

    const taskEntry = groupedTasks.get(groupKey)!;
    taskEntry.createdAt = row.createdAt.toISOString();
    taskEntry.response = response;
    taskEntry.proposedStep = response;
    taskEntry.userAnswer = row.userAnswer;
    taskEntry.transformationType = taskData.transformationType;
    taskEntry.errorType = effectiveStepCorrect ? null : row.errorType;
    taskEntry.timeTakenMs += 0;
    taskEntry.totalTimeMs += row.timeTaken;
    taskEntry.expectedAnswer =
      taskData.correctAnswer || taskEntry.expectedAnswer;
    taskEntry.expectedFirstStep =
      taskData.expectedFirstStep || taskEntry.expectedFirstStep;
    taskEntry.currentEquation =
      taskEntry.currentEquation || taskData.currentEquation;
    taskEntry.prompt =
      taskEntry.prompt || taskData.currentEquation || row.taskId;
    taskEntry.isTaskComplete = taskEntry.isTaskComplete || isCompletedStep;
    taskEntry.steps.push({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      currentEquation: taskData.currentEquation,
      response,
      expectedAnswer: taskData.correctAnswer,
      expectedFirstStep: taskData.expectedFirstStep,
      transformationType: taskData.transformationType,
      isCorrect: effectiveStepCorrect,
      errorType: effectiveStepCorrect ? null : row.errorType,
      timeTakenMs: row.timeTaken,
    });
    taskEntry.stepCount = taskEntry.steps.length;
    taskEntry.correctStepCount += effectiveStepCorrect ? 1 : 0;
  }

  const aggregatedTasks = [...groupedTasks.values()]
    .map((taskEntry) => {
      const taskAccuracy =
        taskEntry.stepCount > 0
          ? (taskEntry.correctStepCount / taskEntry.stepCount) * 100
          : 0;

      return {
        ...taskEntry,
        isCorrect: taskEntry.isTaskComplete,
        timeTakenMs: taskEntry.totalTimeMs,
        taskAccuracy,
      };
    })
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );

  return aggregatedTasks.slice(0, limit);
}

export function summarizeAlgebraTaskEntries(
  taskEntries: AggregatedAlgebraTaskEntry[],
) {
  const totalSubmissions = taskEntries.length;
  const correctSubmissions = taskEntries.filter(
    (taskEntry) => taskEntry.isTaskComplete,
  ).length;
  const accuracy =
    totalSubmissions > 0
      ? taskEntries.reduce(
          (sum, taskEntry) => sum + taskEntry.taskAccuracy,
          0,
        ) / totalSubmissions
      : 0;
  const avgTimeMs =
    totalSubmissions > 0
      ? Math.round(
          taskEntries.reduce(
            (sum, taskEntry) => sum + taskEntry.totalTimeMs,
            0,
          ) / totalSubmissions,
        )
      : 0;

  return {
    totalSubmissions,
    correctSubmissions,
    accuracy,
    avgTimeMs,
  };
}
