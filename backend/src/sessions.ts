import prisma from "./db.ts";
import { Module } from "./tasks.ts";

export interface SessionData {
  id?: string;
  userId: string;
  module: Module;
  level: number;
  startedAt: Date;
  endedAt?: Date;
  totalTasks: number;
  correctAnswers: number;
  avgTime?: number;
  accuracy?: number;
}

/**
 * Start a new training session
 */
export async function startSession(
  userId: string,
  module: Module,
  level: number
) {
  const session = await prisma.session.create({
    data: {
      userId,
      module,
      startedAt: new Date(),
      endedAt: null,
      accuracy: 0,
      avgTime: 0,
    },
  });

  return {
    sessionId: session.id,
    userId: session.userId,
    module: session.module,
    startedAt: session.startedAt,
  };
}

/**
 * End a training session and calculate stats
 */
export async function endSession(
  userId: string,
  sessionId: string,
  correctAnswers: number,
  totalTasks: number,
  avgTimeMs: number
) {
  const session = await prisma.session.update({
    where: { id: sessionId },
    data: {
      endedAt: new Date(),
      accuracy: totalTasks > 0 ? (correctAnswers / totalTasks) * 100 : 0,
      avgTime: avgTimeMs,
    },
  });

  // Update ModuleProgress
  const moduleProgress = await prisma.moduleProgress.upsert({
    where: {
      userId_module: {
        userId,
        module: session.module,
      },
    },
    create: {
      userId,
      module: session.module,
      level: 1,
      accuracy: session.accuracy || 0,
      totalAnswers: totalTasks,
    },
    update: {
      accuracy: (session.accuracy || 0) > (this as any).accuracy 
        ? (session.accuracy || 0) 
        : (this as any).accuracy,
      totalAnswers: { increment: totalTasks },
    },
  });

  return {
    sessionId: session.id,
    accuracy: session.accuracy,
    avgTime: session.avgTime,
    endedAt: session.endedAt,
  };
}

/**
 * Get user's current progress for a module
 */
export async function getModuleProgress(userId: string, module: Module) {
  const progress = await prisma.moduleProgress.findUnique({
    where: {
      userId_module: {
        userId,
        module,
      },
    },
  });

  if (!progress) {
    return {
      module,
      level: 1,
      accuracy: 0,
      totalAnswers: 0,
    };
  }

  return progress;
}

/**
 * Get user's all sessions
 */
export async function getUserSessions(userId: string, limit = 10) {
  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take: limit,
  });

  return sessions;
}

/**
 * Update level based on performance
 */
export async function updateLevelIfNeeded(
  userId: string,
  module: Module,
  currentLevel: number,
  accuracy: number
) {
  // If accuracy > 80%, suggest next level
  if (accuracy > 80 && currentLevel < 5) {
    return currentLevel + 1;
  }
  // If accuracy < 50%, suggest previous level
  else if (accuracy < 50 && currentLevel > 1) {
    return currentLevel - 1;
  }
  
  return currentLevel;
}
