// awardSlaps(prize_tag, amount_hundredths, reason) STUB. Spec §8.
// ============================== STUB ==============================
// Hand-off point to the Slaps part. Until it exists, this adds to a local
// balance table (data/slaps/balances.json) and an add-only ledger
// (data/slaps/ledger.jsonl). Replace the body with the Slaps part's call.
// =================================================================
import "server-only";
import { appendLine, dataPath, readJson, withLock, writeJson } from "@/server/platform/storage";

const BALANCES = () => dataPath("slaps", "balances.json");
const LEDGER = () => dataPath("slaps", "ledger.jsonl");

/** STUB. `reason` must be unique per award; repeating a reason awards nothing (safe retries). */
export async function awardSlaps(prize_tag: string, amount_hundredths: number, reason: string): Promise<void> {
  if (!Number.isInteger(amount_hundredths) || amount_hundredths < 0) throw new Error("amount_hundredths must be a whole number ≥ 0");
  await withLock("slaps", async () => {
    const table = (await readJson<{ balances: Record<string, number>; reasons: string[] }>(BALANCES())) ?? { balances: {}, reasons: [] };
    if (table.reasons.includes(reason)) return;
    table.balances[prize_tag] = (table.balances[prize_tag] ?? 0) + amount_hundredths;
    table.reasons.push(reason);
    await appendLine(LEDGER(), { at: new Date().toISOString(), prize_tag, amount_hundredths, reason, stub: true });
    await writeJson(BALANCES(), table);
  });
}
