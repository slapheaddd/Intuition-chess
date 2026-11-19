// STUB — stands in for Part 2's sessions + getWheelFor (Spec §0, §11.3 rule 2).
// Replace this whole file with imports from Part 2 when the chess game is merged into Bumphead.
// It never sees or stores a Vault ID: it only yields a prize_tag.
import "server-only";
import { cookies } from "next/headers";
import { createHash, randomUUID } from "node:crypto";

export interface Session { id: string }

const COOKIE = "bh_dev_session";

/** STUB: a per-browser dev session held in a cookie. Part 2 supplies the real one. */
export async function getSession(): Promise<Session> {
  const jar = await cookies();
  let id = jar.get(COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    id = randomUUID();
    jar.set(COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/" });
  }
  return { id };
}

/** STUB: Part 2's getWheelFor(session). Returns the keychain's prize_tag. */
export async function getWheelFor(session: Session): Promise<{ prize_tag: string }> {
  const tag = createHash("sha256").update(session.id).digest("hex").slice(0, 16);
  return { prize_tag: `dev-${tag}` };
}
