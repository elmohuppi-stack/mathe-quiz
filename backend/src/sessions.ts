import prisma from "./db.js";
import { Module } from "./tasks.js";
import {
  aggregateAlgebraTaskEntries,
  summarizeAlgebraTaskEntries,
  type RawAlgebraHistoryRow,
} from "./algebra-history.js";

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

export async function setModuleLevel(
  userId: string,
  module: Module,
  level: number,
) {
  return prisma.moduleProgress.upsert({
    where: {
      userId_module: {
        userId,
        module,
      },
    },
    create: {
      userId,
      module,
      level,
    },
    update: {
      level,
    },
  });
}

/**
 * Start a new training session
 */
export async function startSession(
  userId: string,
  module: Module,
  level: number,
) {
  await setModuleLevel(userId, module, level);

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
  avgTimeMs: number,
) {
  const session = await prisma.session.update({
    where: { id: sessionId },
    data: {
      endedAt: new Date(),
      accuracy: totalTasks > 0 ? (correctAnswers / totalTasks) * 100 : 0,
      avgTime: avgTimeMs,
    },
  });

  await syncModuleProgress(userId, session.module as Module);

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
 * Recalculate module progress directly from persisted answers.
 * This keeps dashboard stats up to date even if a session is not explicitly ended.
 */
export async function syncModuleProgress(userId: string, module: Module) {
  if (module === "algebra") {
    const [algebraAnswers, existingProgress] = await Promise.all([
      prisma.answer.findMany({
        where: {
          userId,
          session: {
            module,
          },
        },
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
      }) as Promise<RawAlgebraHistoryRow[]>,
      prisma.moduleProgress.findUnique({
        where: {
          userId_module: {
            userId,
            module,
          },
        },
      }),
    ]);

    const summary = summarizeAlgebraTaskEntries(
      aggregateAlgebraTaskEntries(algebraAnswers, Number.MAX_SAFE_INTEGER),
    );

    return prisma.moduleProgress.upsert({
      where: {
        userId_module: {
          userId,
          module,
        },
      },
      create: {
        userId,
        module,
        level: existingProgress?.level ?? 1,
        accuracy: summary.accuracy,
        totalAnswers: summary.totalSubmissions,
      },
      update: {
        level: existingProgress?.level ?? 1,
        accuracy: summary.accuracy,
        totalAnswers: summary.totalSubmissions,
      },
    });
  }

  const [totalAnswers, correctAnswers, existingProgress] = await Promise.all([
    prisma.answer.count({
      where: {
        userId,
        session: {
          module,
        },
      },
    }),
    prisma.answer.count({
      where: {
        userId,
        isCorrect: true,
        session: {
          module,
        },
      },
    }),
    prisma.moduleProgress.findUnique({
      where: {
        userId_module: {
          userId,
          module,
        },
      },
    }),
  ]);

  const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

  return prisma.moduleProgress.upsert({
    where: {
      userId_module: {
        userId,
        module,
      },
    },
    create: {
      userId,
      module,
      level: existingProgress?.level ?? 1,
      accuracy,
      totalAnswers,
    },
    update: {
      level: existingProgress?.level ?? 1,
      accuracy,
      totalAnswers,
    },
  });
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
  accuracy: number,
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
