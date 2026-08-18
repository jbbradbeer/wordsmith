#!/usr/bin/env node
/**
 * Weekly SEO loop — consume the top N words from seo/keyword-backlog.json into
 * SEED_WORDS (src/lib/seed-words.ts) and SYNONYM_VOLUMES
 * (src/lib/synonym-volumes.ts). Each consumed word publishes one page on the
 * next deploy (/synonyms-for/[word]).
 *
 * Deterministic by design: the weekly cloud agent runs this, verifies
 * (tests + build), and pushes. Judgment stays with the agent; the file
 * surgery lives here.
 *
 * Usage: node seo/weekly-seo-loop.mjs [count]   (default 25)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BACKLOG = join(root, "seo/keyword-backlog.json");
const SEEDS = join(root, "src/lib/seed-words.ts");
const VOLUMES = join(root, "src/lib/synonym-volumes.ts");

const count = Math.max(1, Math.min(100, parseInt(process.argv[2] || "25", 10) || 25));

const backlog = JSON.parse(readFileSync(BACKLOG, "utf8"));
let seedSrc = readFileSync(SEEDS, "utf8");
let volSrc = readFileSync(VOLUMES, "utf8");

const seedBlock = seedSrc.split("SEED_WORDS = [")[1].split("] as const")[0];
const existing = new Set([...seedBlock.matchAll(/"([a-z]+)"/g)].map((m) => m[1]));

// Defensive: skip anything already seeded or malformed
const eligible = backlog.words.filter(
  (e) => /^[a-z]{3,14}$/.test(e.word) && !existing.has(e.word)
);
const batch = eligible.slice(0, count);

if (batch.length === 0) {
  console.log("BACKLOG_EMPTY: no eligible words left. Refill seo/keyword-backlog.json.");
  process.exit(2);
}

const today = new Date().toISOString().slice(0, 10);

// 1) seed-words.ts — append before "] as const"
const seedLines = [`  // Weekly SEO loop ${today} (${batch.length} words from backlog)`];
for (let i = 0; i < batch.length; i += 8) {
  seedLines.push(
    "  " + batch.slice(i, i + 8).map((e) => `"${e.word}"`).join(", ") + ","
  );
}
seedSrc = seedSrc.replace("] as const", seedLines.join("\n") + "\n] as const");
writeFileSync(SEEDS, seedSrc);

// 2) synonym-volumes.ts — append before the closing "};"
const volLines = [];
for (let i = 0; i < batch.length; i += 5) {
  volLines.push(
    "  " + batch.slice(i, i + 5).map((e) => `${e.word}: ${e.volume}`).join(", ") + ","
  );
}
volSrc = volSrc.replace("};", volLines.join("\n") + "};");
// keep the closing brace on its own line
volSrc = volSrc.replace(/,};/, ",\n};");
writeFileSync(VOLUMES, volSrc);

// 3) backlog — remove consumed words
const consumed = new Set(batch.map((e) => e.word));
backlog.words = backlog.words.filter((e) => !consumed.has(e.word));
backlog.last_consumed_at = today;
writeFileSync(BACKLOG, JSON.stringify(backlog, null, 2) + "\n");

console.log(`CONSUMED ${batch.length} words (${backlog.words.length} left in backlog):`);
console.log(batch.map((e) => `${e.word}:${e.volume}`).join(" "));
if (backlog.words.length < 50) {
  console.log("BACKLOG_LOW: fewer than 50 words remain — refill soon.");
}
