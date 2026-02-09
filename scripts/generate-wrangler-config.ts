#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import { env, argv } from "node:process";

interface Args {
  env?: string;
  remote?: boolean;
}

function parseArgs(): Args {
  const args: Args = { remote: false };
  const argsV = argv.slice(2);

  for (let i = 0; i < argsV.length; i++) {
    const arg = argsV[i];

    if (arg === "--env") {
      args.env = argsV[i + 1];
      i++;
    } else if (["dev", "staging", "production", "prod"].includes(arg)) {
      args.env = arg;
    }
  }

  return args;
}

function validateEnvironment(targetEnv: string): void {
  const validEnvs = ["dev", "staging", "production", "prod"];
  if (!validEnvs.includes(targetEnv)) {
    console.error(`Error: Unknown environment '${targetEnv}'. Use dev, staging, production, or prod.`);
    process.exit(1);
  }
}

function workerNameFromEnv(envValue: string): string {
  switch (envValue) {
    case "dev":
      return "workout-dev";
    case "staging":
      return "workout-staging";
    case "production":
    case "prod":
      return "workout-prod";
    default:
      return `workout-${envValue}`;
  }
}

function generateConfig(
  environmentValue: string,
  useRemote: boolean,
  dbId: string
): string {

  const workerName = workerNameFromEnv(environmentValue);

  const dbName = (() => {
    switch (environmentValue) {
      case "dev":
        return "workout-dev-db";
      case "staging":
        return "workout-staging-db";
      case "production":
      case "prod":
        return "workout-prod-db";
      default:
        return `workout-${environmentValue}-db`;
    }
  })();

  const remoteStr = useRemote ? "true" : "false";

  const envVars: Record<string, string> = {
    ENVIRONMENT: env.ENVIRONMENT ?? environmentValue,
    POSTHOG_API_KEY: env.POSTHOG_API_KEY ?? "",
    POSTHOG_PROJECT_URL: env.POSTHOG_PROJECT_URL ?? "",
    SESSION_JWT_SECRET: env.SESSION_JWT_SECRET ?? "",
    TEST_PASSWORD: env.TEST_PASSWORD ?? "",
    TEST_USERNAME: env.TEST_USERNAME ?? "",
    WORKOS_API_KEY: env.WORKOS_API_KEY ?? "",
    WORKOS_CLIENT_ID: env.WORKOS_CLIENT_ID ?? "",
    WHOOP_CLIENT_ID: env.WHOOP_CLIENT_ID ?? "",
    WHOOP_CLIENT_SECRET: env.WHOOP_CLIENT_SECRET ?? "",
    WHOOP_API_URL: env.WHOOP_API_URL ?? "https://api.prod.whoop.com",
    WHOOP_WEBHOOK_SECRET: env.WHOOP_WEBHOOK_SECRET ?? "",
    WHOOP_TOKEN_ENCRYPTION_KEY: env.WHOOP_TOKEN_ENCRYPTION_KEY ?? "",
  };

  const sortedKeys = Object.keys(envVars).sort();
  const varsLines: string[] = [];

  for (const key of sortedKeys) {
    if (key === "ENVIRONMENT") continue;
    const value = envVars[key];
    if (value) {
      varsLines.push(`${key} = "${value}"`);
    }
  }

  const varsContent = varsLines.length > 0 ? `${varsLines.join("\n")}\n` : "";

  const content = `name = "${workerName}"
main = "@tanstack/react-start/server-entry"
compatibility_date = "2025-09-02"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "${dbName}"
database_id = "${dbId}"
remote = ${remoteStr}

[observability]
enabled = true

[vars]
${varsContent}`;

  return content;
}

function main(): void {
  const args = parseArgs();
  let targetEnv = args.env ?? "dev";

  if (targetEnv === "prod") {
    targetEnv = "production";
  }

  validateEnvironment(targetEnv);

  const environmentValue = env.ENVIRONMENT ?? targetEnv;
  const useRemote = env.REMOTE === "true" || args.remote === true;

  let dbId: string;

  if (environmentValue === "dev") {
    if (useRemote) {
      dbId = env.CLOUDFLARE_D1_DATABASE_ID ?? "";
    } else {
      dbId = "00000000-0000-0000-0000-000000000000";
    }
  } else {
    dbId = env.CLOUDFLARE_D1_DATABASE_ID ?? "";
  }

  if (environmentValue === "dev" && useRemote && !dbId) {
    console.error("Error: Could not retrieve CLOUDFLARE_D1_DATABASE_ID for remote dev");
    process.exit(1);
  }

  if (environmentValue !== "dev" && !dbId) {
    console.error(`Error: Could not retrieve CLOUDFLARE_D1_DATABASE_ID for '${targetEnv}'`);
    process.exit(1);
  }

  const configFile = "wrangler.toml";
  console.log(`Generating ${configFile} for env '${targetEnv}'...`);

  const content = generateConfig(environmentValue, useRemote, dbId);
  writeFileSync(configFile, content);

  console.log(`Generated ${configFile} with name='${workerNameFromEnv(environmentValue)}' and ENVIRONMENT='${environmentValue}'`);
  console.log("Done");
}

main();
