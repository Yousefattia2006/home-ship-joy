import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Lock to portrait on native platforms
(async () => {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { ScreenOrientation } = await import("@capacitor/screen-orientation");
      await ScreenOrientation.lock({ orientation: "portrait" });
    }
  } catch (e) {
    // No-op on web
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
