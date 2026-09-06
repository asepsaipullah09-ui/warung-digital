import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.warungku.app",
  appName: "WarungKu",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
};

export default config;