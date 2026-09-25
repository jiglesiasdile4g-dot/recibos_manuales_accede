import HomeClient from "./home-client";
import { getAppVersion, type AppVersion } from "@/lib/version";

export default function HomePage() {
  const v = getAppVersion();
  const version: {
    version: string;
    buildDate: string;
    buildCommit: string;
    appName: string;
  } = {
    version: v.version,
    buildDate: v.buildDate,
    buildCommit: v.buildCommit,
    appName: v.appName,
  };
  return <HomeClient version={version} />;
}

export type { AppVersion };
