import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyCors from "@fastify/cors";
import { z } from "zod";
import { registerUser, loginUser, AppError } from "./auth.ts";
import { getTranslatorFromRequest } from "./i18n/useI18n.ts";
import { generateTask, Module } from "./tasks.ts";
import { startSession, endSession, getModuleProgress } from "./sessions.ts";
import { saveAnswer, getSessionStats } from "./answers.ts";
import prisma from "./db.ts";

const port = parseInt(process.env.PORT || "3000");
const jwtSecret = process.env.JWT_SECRET || "dev-secret-change-me";
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

const app = Fastify({ logger: true });

// Register plugins
await app.register(fastifyJwt, { secret: jwtSecret });
await app.register(fastifyCors, {
  origin: frontendOrigin,
  credentials: true,
});

// Health check
app.get("/health", async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok", database: "connected" };
  } catch (e) {
    return { status: "ok", database: "disconnected" };
  }
});

// Auth Routes
app.post("/auth/register", async (request, reply) => {
  try {
    const user = await registerUser(request.body);
    const token = app.jwt.sign({ id: user.id, email: user.email });

    reply.send({
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    const t = getTranslatorFromRequest(request);
    if (error instanceof AppError) {
      reply.status(400).send({ error: t(error.errorKey, error.message) });
    } else if (error instanceof z.ZodError) {
      reply.status(400).send({
        error: t("errors.validation.required_field", "Validation failed"),
      });
    } else {
      reply.status(400).send({
        error: t("errors.general.internal_error", (error as Error).message),
      });
    }
  }
});

app.post("/auth/login", async (request, reply) => {
  try {
    const user = await loginUser(request.body);
    const token = app.jwt.sign({ id: user.id, email: user.email });

    reply.send({
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    const t = getTranslatorFromRequest(request);
    if (error instanceof AppError) {
      reply.status(401).send({ error: t(error.errorKey, error.message) });
    } else if (error instanceof z.ZodError) {
      reply.status(400).send({
        error: t("errors.validation.required_field", "Validation failed"),
      });
    } else {
      reply.status(401).send({
        error: t("errors.general.internal_error", (error as Error).message),
      });
    }
  }
});

// Protected route example
app.get<{ Reply: { message: string; userId: string } }>(
  "/auth/me",
  { onRequest: [app.authenticate] },
  async (request) => {
    return {
      message: "Authenticated",
      userId: request.user.id,
    };
  },
);

// ==================== Training Routes ====================

// Start a new training session
app.post(
  "/sessions/start",
  { onRequest: [app.authenticate] },
  async (request, reply) => {
    try {
      const body = z
        .object({
          module: z.enum(["mental-math", "fractions", "algebra"]),
          level: z.number().int().min(1).max(5).default(1),
        })
        .parse(request.body);

      const session = await startSession(
        request.user.id,
        body.module as Module,
        body.level,
      );

      reply.send(session);
    } catch (error) {
      const t = getTranslatorFromRequest(request);
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          error: t("errors.validation.required_field", "Validation failed"),
        });
      } else {
        reply.status(500).send({
          error: t("errors.general.internal_error", (error as Error).message),
        });
      }
    }
  },
);

// Get next task
app.post(
  "/tasks/next",
  { onRequest: [app.authenticate] },
  async (request, reply) => {
    try {
      const body = z
        .object({
          module: z.enum(["mental-math", "fractions", "algebra"]),
          level: z.number().int().min(1).max(5).default(1),
        })
        .parse(request.body);

      const task = generateTask(body.module as Module, body.level);

      reply.send(task);
    } catch (error) {
      const t = getTranslatorFromRequest(request);
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          error: t("errors.validation.required_field", "Validation failed"),
        });
      } else {
        reply.status(500).send({
          error: t("errors.general.internal_error", (error as Error).message),
        });
      }
    }
  },
);

// Submit an answer
app.post(
  "/answers/submit",
  { onRequest: [app.authenticate] },
  async (request, reply) => {
    try {
      const body = z
        .object({
          sessionId: z.string(),
          taskId: z.string(),
          userAnswer: z.string(),
          correctAnswer: z.string(),
          timeTakenMs: z.number().min(0),
          module: z.enum(["mental-math", "fractions", "algebra"]),
        })
        .parse(request.body);

      const result = await saveAnswer(
        request.user.id,
        body.sessionId,
        body.taskId,
        body.userAnswer,
        body.correctAnswer,
        body.timeTakenMs,
        body.module as Module,
      );

      reply.send(result);
    } catch (error) {
      const t = getTranslatorFromRequest(request);
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          error: t("errors.validation.required_field", "Validation failed"),
        });
      } else {
        reply.status(500).send({
          error: t("errors.general.internal_error", (error as Error).message),
        });
      }
    }
  },
);

// End a training session
app.post(
  "/sessions/end",
  { onRequest: [app.authenticate] },
  async (request, reply) => {
    try {
      const body = z
        .object({
          sessionId: z.string(),
          correctAnswers: z.number().int().min(0),
          totalTasks: z.number().int().min(1),
          avgTimeMs: z.number().min(0),
        })
        .parse(request.body);

      const stats = await endSession(
        request.user.id,
        body.sessionId,
        body.correctAnswers,
        body.totalTasks,
        body.avgTimeMs,
      );

      reply.send(stats);
    } catch (error) {
      const t = getTranslatorFromRequest(request);
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          error: t("errors.validation.required_field", "Validation failed"),
        });
      } else {
        reply.status(500).send({
          error: t("errors.general.internal_error", (error as Error).message),
        });
      }
    }
  },
);

// Get module progress
app.get(
  "/modules/progress/:module",
  { onRequest: [app.authenticate] },
  async (request, reply) => {
    try {
      const params = z
        .object({
          module: z.enum(["mental-math", "fractions", "algebra"]),
        })
        .parse(request.params);

      const progress = await getModuleProgress(
        request.user.id,
        params.module as Module,
      );

      reply.send(progress);
    } catch (error) {
      const t = getTranslatorFromRequest(request);
      reply.status(500).send({
        error: t("errors.general.internal_error", (error as Error).message),
      });
    }
  },
);

// Get session statistics
app.get(
  "/sessions/:sessionId/stats",
  { onRequest: [app.authenticate] },
  async (request, reply) => {
    try {
      const params = z
        .object({
          sessionId: z.string(),
        })
        .parse(request.params);

      const stats = await getSessionStats(params.sessionId);

      reply.send(stats);
    } catch (error) {
      const t = getTranslatorFromRequest(request);
      reply.status(500).send({
        error: t("errors.general.internal_error", (error as Error).message),
      });
    }
  },
);

// ==================== Algebra Validation Routes ====================

// Validate an algebra expression
app.post(
  "/validate/expression",
  { onRequest: [app.authenticate] },
  async (request, reply) => {
    try {
      const body = z
        .object({
          expression: z.string(),
          variables: z.array(z.string()).default(["x"]),
        })
        .parse(request.body);

      const { validateExpression } = await import("./validator.ts");
      const result = await validateExpression(body.expression, body.variables);

      reply.send(result);
    } catch (error) {
      const t = getTranslatorFromRequest(request);
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          error: t("errors.validation.required_field", "Validation failed"),
        });
      } else {
        reply.status(500).send({
          error: t("errors.general.internal_error", (error as Error).message),
        });
      }
    }
  },
);

// Validate an algebra equation
app.post(
  "/validate/equation",
  { onRequest: [app.authenticate] },
  async (request, reply) => {
    try {
      const body = z
        .object({
          left: z.string(),
          right: z.string(),
          variables: z.array(z.string()).default(["x"]),
        })
        .parse(request.body);

      const { validateEquation } = await import("./validator.ts");
      const result = await validateEquation(
        body.left,
        body.right,
        body.variables,
      );

      reply.send(result);
    } catch (error) {
      const t = getTranslatorFromRequest(request);
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          error: t("errors.validation.required_field", "Validation failed"),
        });
      } else {
        reply.status(500).send({
          error: t("errors.general.internal_error", (error as Error).message),
        });
      }
    }
  },
);

// ==================== End Training Routes ====================

// Graceful shutdown
const gracefulShutdown = async () => {
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// Start server
try {
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`Server running at http://0.0.0.0:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
