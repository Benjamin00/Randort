#!/usr/bin/env node
/**
 * First-run env check.
 *
 * Runs as the `predev` hook. If `.env.local` is missing or
 * `GOOGLE_PLACES_API_KEY` is empty, this script prompts the user
 * interactively and writes the key to `.env.local`. If stdin is not a TTY
 * (CI, piped input), it fails fast with a clear message instead of hanging.
 *
 * Zero dependencies. Uses Node stdlib only.
 */
import { existsSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { stdin as input, stdout as output, exit } from "node:process";
import readline from "node:readline/promises";

const ENV_FILE = ".env.local";
const KEY = "GOOGLE_PLACES_API_KEY";
const CONSOLE_URL =
  "https://console.cloud.google.com/google/maps-apis/credentials";

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
  return env;
}

function writeKey(value) {
  const line = `${KEY}=${value}`;
  if (!existsSync(ENV_FILE)) {
    writeFileSync(ENV_FILE, line + "\n", { mode: 0o600 });
    return;
  }
  const current = readFileSync(ENV_FILE, "utf8");
  if (new RegExp(`^${KEY}=`, "m").test(current)) {
    const replaced = current.replace(new RegExp(`^${KEY}=.*$`, "m"), line);
    writeFileSync(
      ENV_FILE,
      replaced.endsWith("\n") ? replaced : replaced + "\n"
    );
  } else {
    appendFileSync(
      ENV_FILE,
      (current.endsWith("\n") ? "" : "\n") + line + "\n"
    );
  }
}

async function main() {
  const env = readEnvFile(ENV_FILE);
  if (env[KEY] && env[KEY].length > 0) return; // already configured

  if (!input.isTTY) {
    console.error(`\n✗ Missing ${KEY} in ${ENV_FILE}.`);
    console.error(`  Add it manually:  echo "${KEY}=YOUR_KEY" >> ${ENV_FILE}`);
    console.error(`  Or get a key at:  ${CONSOLE_URL}\n`);
    exit(1);
  }

  console.log("");
  console.log("┌─────────────────────────────────────────────────────────────┐");
  console.log("│  Randort first-run setup                                    │");
  console.log("└─────────────────────────────────────────────────────────────┘");
  console.log("");
  console.log("Randort needs a Google Places API key to fetch places.");
  console.log("");
  console.log(`  1. Open    ${CONSOLE_URL}`);
  console.log("  2. Enable  Places API (New)  +  Geocoding API");
  console.log("  3. Create  an API key, restrict it to those two services");
  console.log("");
  console.log("Paste the key below. It will be saved to .env.local (gitignored).");
  console.log("Press Ctrl-C to abort.");
  console.log("");

  const rl = readline.createInterface({ input, output });
  let answer = "";
  try {
    answer = (await rl.question(`${KEY}= `)).trim();
  } finally {
    rl.close();
  }

  if (!answer) {
    console.error(`\n✗ No key entered. Aborting.\n`);
    exit(1);
  }

  // Loose sanity check: Google API keys start with "AIza" and are ~39 chars.
  // We don't reject; just warn so a clear typo gets caught.
  if (!/^AIza[0-9A-Za-z_-]{20,}$/.test(answer)) {
    console.warn(
      "⚠  That doesn't look like a typical Google API key (expected to start with 'AIza')."
    );
    console.warn("   Saving it anyway — you can edit .env.local manually if needed.");
  }

  writeKey(answer);
  console.log(`\n✓ Saved ${KEY} to ${ENV_FILE}.\n`);
}

main().catch((err) => {
  console.error("\n✗ Setup failed:", err.message, "\n");
  exit(1);
});
