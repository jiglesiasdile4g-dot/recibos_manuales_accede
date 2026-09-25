import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export type AppVersion = {
  version: string;
  buildDate: string;
  buildCommit: string;
  appName: string;
  buildTime: string;
};

let cached: AppVersion | null = null;

function loadFromDisk(): AppVersion {
  const pkgPath = resolve(process.cwd(), "package.json");
  const verFile = resolve(process.cwd(), "APP_VERSION");
  let version = "0.0.0";
  let buildDate = new Date().toISOString().slice(0, 10);
  let buildCommit = "local";
  let appName = "Recibos Manuales";
  try {
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (pkg.version) version = pkg.version;
      if (pkg.name) appName = pkg.name;
    }
    if (existsSync(verFile)) {
      const raw = readFileSync(verFile, "utf-8");
      for (const ln of raw.split(/\r?\n/)) {
        const idx = ln.indexOf("=");
        if (idx < 1) continue;
        const k = ln.slice(0, idx).trim();
        const v = ln.slice(idx + 1).trim();
        if (!v) continue;
        switch (k) {
          case "APP_VERSION":
            version = v;
            break;
          case "APP_BUILD_DATE":
            buildDate = v;
            break;
          case "APP_BUILD_COMMIT":
            buildCommit = v;
            break;
          case "APP_NAME":
            appName = v;
            break;
        }
      }
    }
  } catch {}
  if (buildCommit === "HEAD" || buildCommit === "local") {
    try {
      const gitHead = resolve(process.cwd(), ".git", "HEAD");
      if (existsSync(gitHead)) {
        let head = readFileSync(gitHead, "utf-8").trim();
        if (head.startsWith("ref: ")) {
          const ref = head.slice(5);
          const gitRef = resolve(process.cwd(), ".git", ref);
          if (existsSync(gitRef)) {
            head = readFileSync(gitRef, "utf-8").trim();
          }
        }
        if (/^[0-9a-f]{7,}$/i.test(head)) buildCommit = head.slice(0, 8);
      }
    } catch {}
  }
  return {
    version,
    buildDate,
    buildCommit,
    appName,
    buildTime: new Date().toISOString(),
  };
}

export function getAppVersion(): AppVersion {
  if (cached) return cached;
  cached = loadFromDisk();
  return cached;
}
