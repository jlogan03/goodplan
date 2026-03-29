#!/usr/bin/env bash
set -e

# Generate a realistic TypeScript project fixture for testing /onboard-repo.
# Usage: scripts/generate-onboard-fixture.sh [output-dir]

OUT="${1:-/tmp/onboard-fixture}"

# Capture current user's git identity for primary author (I4: expertise profiling match)
REAL_NAME=$(git config user.name 2>/dev/null || echo "Alice Dev")
REAL_EMAIL=$(git config user.email 2>/dev/null || echo "alice@example.com")

# Clean previous
if [ -d "$OUT" ]; then
  rm -rf "$OUT"
fi

mkdir -p "$OUT"
cd "$OUT"

# ── README ──────────────────────────────────────────────────

cat > README.md << 'EOF'
# TaskFlow

A task management API built with TypeScript, Express, and PostgreSQL.

## Features

- RESTful API for task CRUD operations
- JWT-based authentication
- PostgreSQL with connection pooling
- Role-based access control

## Getting Started

```bash
bun install
bun run dev
```

## Testing

```bash
bun run test
```

## Architecture

- `src/api/` — Express route handlers and middleware
- `src/db/` — Database connection, queries, and migrations
- `src/auth/` — JWT tokens, middleware, RBAC
- `src/shared/` — Shared types and utility functions
EOF

# ── package.json ────────────────────────────────────────────

cat > package.json << 'EOF'
{
  "name": "taskflow",
  "version": "0.1.0",
  "type": "module",
  "description": "Task management API with Express and PostgreSQL",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "biome check .",
    "format": "biome format --write ."
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.22.4",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.5.0",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/pg": "^8.10.9",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "vitest": "^1.2.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
EOF

# ── tsconfig.json ───────────────────────────────────────────

cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
EOF

# ── vitest.config.ts ────────────────────────────────────────

cat > vitest.config.ts << 'EOF'
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
    },
  },
});
EOF

# ── biome.json ──────────────────────────────────────────────

cat > biome.json << 'EOF'
{
  "$schema": "https://biomejs.dev/schemas/1.5.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "formatter": {
    "indentStyle": "tab",
    "lineWidth": 120
  }
}
EOF

# ── .env.example ─────────────────────────────────────────────

cat > .env.example << 'EOF'
DATABASE_URL=
JWT_SECRET=
PORT=3000
EOF

# ── CI ──────────────────────────────────────────────────────

mkdir -p .github/workflows

cat > .github/workflows/ci.yml << 'EOF'
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run lint
      - run: bun run test
EOF

# ── Source files ────────────────────────────────────────────

mkdir -p src/api src/db src/auth src/shared tests

# src/api/
cat > src/api/routes.ts << 'TSEOF'
import type { Router } from "express";
import { createTask, deleteTask, getTask, listTasks, updateTask } from "./handlers.js";

export function registerRoutes(router: Router): void {
  router.get("/tasks", listTasks);
  router.get("/tasks/:id", getTask);
  router.post("/tasks", createTask);
  router.put("/tasks/:id", updateTask);
  router.delete("/tasks/:id", deleteTask);
}
TSEOF

cat > src/api/handlers.ts << 'TSEOF'
import type { Request, Response } from "express";
import { findAllTasks, findTaskById, insertTask, removeTask, patchTask } from "../db/queries.js";
import { taskSchema } from "../shared/types.js";

export async function listTasks(_req: Request, res: Response): Promise<void> {
  const tasks = await findAllTasks();
  res.json(tasks);
}

export async function getTask(req: Request, res: Response): Promise<void> {
  const task = await findTaskById(req.params.id ?? "");
  if (!task) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(task);
}

export async function createTask(req: Request, res: Response): Promise<void> {
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const task = await insertTask(parsed.data);
  res.status(201).json(task);
}

export async function updateTask(req: Request, res: Response): Promise<void> {
  const parsed = taskSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const task = await patchTask(req.params.id ?? "", parsed.data);
  res.json(task);
}

export async function deleteTask(req: Request, res: Response): Promise<void> {
  await removeTask(req.params.id ?? "");
  res.status(204).send();
}
TSEOF

cat > src/api/index.ts << 'TSEOF'
export { registerRoutes } from "./routes.js";
export { listTasks, getTask, createTask, updateTask, deleteTask } from "./handlers.js";
TSEOF

# src/db/
cat > src/db/connection.ts << 'TSEOF'
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

export function getPool(): pg.Pool {
  return pool;
}

export async function query<T extends pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}
TSEOF

cat > src/db/queries.ts << 'TSEOF'
import { query } from "./connection.js";
import type { Task, TaskInput } from "../shared/types.js";

export async function findAllTasks(): Promise<Task[]> {
  const result = await query<Task>("SELECT * FROM tasks ORDER BY created_at DESC");
  return result.rows;
}

export async function findTaskById(id: string): Promise<Task | undefined> {
  const result = await query<Task>("SELECT * FROM tasks WHERE id = $1", [id]);
  return result.rows[0];
}

export async function insertTask(input: TaskInput): Promise<Task> {
  const result = await query<Task>(
    "INSERT INTO tasks (title, description, status) VALUES ($1, $2, $3) RETURNING *",
    [input.title, input.description, input.status ?? "pending"],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Insert returned no rows");
  return row;
}

export async function patchTask(id: string, input: Partial<TaskInput>): Promise<Task> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  for (const [key, value] of Object.entries(input)) {
    fields.push(`${key} = $${idx}`);
    values.push(value);
    idx++;
  }
  values.push(id);
  const result = await query<Task>(
    `UPDATE tasks SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values,
  );
  const row = result.rows[0];
  if (!row) throw new Error("Update returned no rows");
  return row;
}

export async function removeTask(id: string): Promise<void> {
  await query("DELETE FROM tasks WHERE id = $1", [id]);
}
TSEOF

cat > src/db/index.ts << 'TSEOF'
export { getPool, query } from "./connection.js";
export { findAllTasks, findTaskById, insertTask, patchTask, removeTask } from "./queries.js";
TSEOF

# src/auth/
cat > src/auth/middleware.ts << 'TSEOF'
import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "./tokens.js";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing token" });
    return;
  }
  const payload = verifyToken(header.slice(7));
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  (req as Request & { userId: string }).userId = payload.sub;
  next();
}
TSEOF

cat > src/auth/tokens.ts << 'TSEOF'
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET ?? "dev-secret";

export interface TokenPayload {
  sub: string;
  role: string;
}

export function createToken(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role }, SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
TSEOF

cat > src/auth/index.ts << 'TSEOF'
export { requireAuth } from "./middleware.js";
export { createToken, verifyToken } from "./tokens.js";
export type { TokenPayload } from "./tokens.js";
TSEOF

# src/shared/
cat > src/shared/types.ts << 'TSEOF'
import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.enum(["pending", "in-progress", "done"]).optional(),
});

export type TaskInput = z.infer<typeof taskSchema>;

export interface Task extends TaskInput {
  id: string;
  created_at: string;
  updated_at: string;
}
TSEOF

cat > src/shared/utils.ts << 'TSEOF'
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}
TSEOF

# tests/
cat > tests/api.test.ts << 'TSEOF'
import { describe, it, expect } from "vitest";

describe("API handlers", () => {
  it("should validate task input", () => {
    expect(true).toBe(true);
  });

  it("should return 404 for missing task", () => {
    expect(true).toBe(true);
  });
});
TSEOF

cat > tests/db.test.ts << 'TSEOF'
import { describe, it, expect } from "vitest";

describe("Database queries", () => {
  it("should build insert query", () => {
    expect(true).toBe(true);
  });
});
TSEOF

cat > tests/auth.test.ts << 'TSEOF'
import { describe, it, expect } from "vitest";
import { createToken, verifyToken } from "../src/auth/tokens.js";

describe("Auth tokens", () => {
  it("should create and verify a token", () => {
    const token = createToken("user-1", "admin");
    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe("user-1");
  });
});
TSEOF

# ── Git init + commits ─────────────────────────────────────

AUTHOR_A="$REAL_NAME <$REAL_EMAIL>"
AUTHOR_B="Bob Eng <bob@example.com>"

git init -q
git checkout -b main

# Helper: commit with specific author and date offset
commit() {
  local msg="$1"
  local author="$2"
  local days_ago="$3"
  local date
  date=$(date -v-"${days_ago}"d +"%Y-%m-%dT12:00:00" 2>/dev/null || date -d "${days_ago} days ago" +"%Y-%m-%dT12:00:00")
  GIT_AUTHOR_DATE="$date" GIT_COMMITTER_DATE="$date" \
    git commit --author "$author" -m "$msg" -q --allow-empty-message
}

# Initial setup commits
git add README.md package.json tsconfig.json vitest.config.ts biome.json .env.example
commit "Initial project setup" "$AUTHOR_A" 60

git add .github/
commit "Add CI workflow" "$AUTHOR_A" 55

# Shared types and utils
git add src/shared/types.ts src/shared/utils.ts
commit "Add shared types and utilities" "$AUTHOR_A" 50

# Database layer
git add src/db/connection.ts
commit "Add database connection pool" "$AUTHOR_B" 48

git add src/db/queries.ts
commit "Add task CRUD queries" "$AUTHOR_B" 45

git add src/db/index.ts
commit "Add db barrel export" "$AUTHOR_B" 44

# Auth layer
git add src/auth/tokens.ts
commit "Add JWT token utilities" "$AUTHOR_A" 40

git add src/auth/middleware.ts
commit "Add auth middleware" "$AUTHOR_A" 38

git add src/auth/index.ts
commit "Add auth barrel export" "$AUTHOR_A" 37

# API layer — most commits for maturity testing
git add src/api/routes.ts
commit "Add API route definitions" "$AUTHOR_A" 35

git add src/api/handlers.ts
commit "Add task handlers" "$AUTHOR_A" 33

git add src/api/index.ts
commit "Add API barrel export" "$AUTHOR_A" 32

# Iterate on API (more commits = higher maturity signal)
echo "" >> src/api/handlers.ts
git add src/api/handlers.ts
commit "Add input validation to handlers" "$AUTHOR_A" 28

echo "// Error handling improvements" >> src/api/handlers.ts
git add src/api/handlers.ts
commit "Improve error handling in API" "$AUTHOR_B" 25

echo "// Pagination support" >> src/api/routes.ts
git add src/api/routes.ts
commit "Add pagination to list endpoint" "$AUTHOR_B" 20

echo "// Rate limiting" >> src/api/handlers.ts
git add src/api/handlers.ts
commit "Add rate limiting to API handlers" "$AUTHOR_A" 15

# Tests
git add tests/api.test.ts
commit "Add API handler tests" "$AUTHOR_A" 12

git add tests/db.test.ts
commit "Add database query tests" "$AUTHOR_B" 10

git add tests/auth.test.ts
commit "Add auth token tests" "$AUTHOR_A" 8

# Recent API changes
echo "// OpenAPI spec generation" >> src/api/routes.ts
git add src/api/routes.ts
commit "Add OpenAPI spec generation" "$AUTHOR_B" 5

echo "// Request logging" >> src/api/handlers.ts
git add src/api/handlers.ts
commit "Add request logging middleware" "$AUTHOR_A" 3

echo "// Health check endpoint" >> src/api/routes.ts
git add src/api/routes.ts
commit "Add health check endpoint" "$AUTHOR_A" 1

echo "$OUT"
