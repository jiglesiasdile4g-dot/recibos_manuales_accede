import HomeClient from "./home-client";
import { getAppVersion } from "@/lib/version";

export default function HomePage() {
  const v = getAppVersion();
  const version = {
    version: String(v.version || "0.0.0"),
    buildDate: String(v.buildDate || new Date().toISOString().slice(0, 10)),
    buildCommit: String(v.buildCommit || "local"),
    appName: String(v.appName || "Generador de Recibos"),
  };
  return <HomeClient version={version} />;
}
