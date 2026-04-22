import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyCors from "@fastify/cors";
import { z } from "zod";
import { registerUser, loginUser, AppError } from "./auth.ts";
import { getTranslatorFromRequest } from "./i18n/useI18n.ts";
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
      reply
        .status(400)
        .send({
          error: t("errors.validation.required_field", "Validation failed"),
        });
    } else {
      reply
        .status(400)
        .send({
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
      reply
        .status(400)
        .send({
          error: t("errors.validation.required_field", "Validation failed"),
        });
    } else {
      reply
        .status(401)
        .send({
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
