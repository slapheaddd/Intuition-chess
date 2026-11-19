// Local-first file storage (Spec §0: database + files on an external drive, AWS later).
// Set CHESS_DATA_DIR to a folder on the external drive; defaults to ./data.
import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const DATA_DIR = path.resolve(process.env.CHESS_DATA_DIR || path.join(process.cwd(), "data"));

export function dataPath(...parts: string[]): string {
  return path.join(DATA_DIR, ...parts);
}

export async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

/** Write via temp file + rename so a crash never leaves half a file. */
export async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2));
  await fs.rename(tmp, file);
}

export async function appendLine(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.appendFile(file, JSON.stringify(value) + "\n");
}

/** Serialise work per key inside this server process (stops double-submitted moves racing). */
const g = globalThis as unknown as { __chessLocks?: Map<string, Promise<unknown>> };
const locks = (g.__chessLocks ??= new Map());

export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const run = prev.catch(() => undefined).then(fn);
  const tail = run.catch(() => undefined);
  locks.set(key, tail);
  try {
    return await run;
  } finally {
    if (locks.get(key) === tail) locks.delete(key);
  }
}
