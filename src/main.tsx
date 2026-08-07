import React, { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import "./global.css";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import {
  ThemeContext,
  THEME_DEFAULTS,
  type Appearance,
  type Colors,
} from "./contexts/ThemeContext";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useSystemTheme } from "./hooks/useSystemTheme";
import { BrowserRouter } from "react-router-dom";
// Ensure i18n is initialized before any component renders
import "./i18n/config";
import ErrorBoundary from "./components/ErrorBoundary";
import { Suspense } from "react";
import { useRoutes } from "react-router-dom";
import { preloadAdminEntry, routes } from "./routes";
import Loading from "./components/loading";
import { PublicInfoProvider } from "./contexts/PublicInfoContext";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { PWAUpdatePrompt } from "./components/PWAUpdatePrompt";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { Toaster } from "./components/ui/sonner";
import { RPC2Provider } from "./contexts/RPC2Context";
import { NodeListProvider } from "./contexts/NodeListContext";
import { AccountProvider } from "./contexts/AccountContext";
import { useAccount } from "./contexts/AccountContext";
import FullPageLoading from "./components/FullPageLoading";
import DocumentTitle from "./components/DocumentTitle";
import AccountPreferenceSync from "./components/AccountPreferenceSync";

const AdminRoutePreloader = () => {
  const { account } = useAccount();

  React.useEffect(() => {
    if (!account?.logged_in) return;

    let idleHandle: number | undefined;
    let fallbackHandle: number | undefined;
    const preloadWhenIdle = () => {
      if ("requestIdleCallback" in window) {
        idleHandle = window.requestIdleCallback(() => preloadAdminEntry(), {
          timeout: 2000,
        });
        return;
      }
      fallbackHandle = Number(globalThis.setTimeout(preloadAdminEntry, 800));
    };

    if (document.readyState === "complete") {
      preloadWhenIdle();
    } else {
      window.addEventListener("load", preloadWhenIdle, { once: true });
    }

    return () => {
      window.removeEventListener("load", preloadWhenIdle);
      if (idleHandle !== undefined) window.cancelIdleCallback(idleHandle);
      if (fallbackHandle !== undefined) globalThis.clearTimeout(fallbackHandle);
    };
  }, [account?.logged_in]);

  return null;
};

const App = () => {
	const currentPath = window.location.pathname.replace(/\/$/, "");
	const isAdminRoute = currentPath === "/admin" || currentPath.startsWith("/admin/");
	const isUpgradeRoute =
		currentPath === "/admin/update/1.2.7" ||
		currentPath === "/admin/update/storage-v4";
	const isRestrictedGuideRoute =
		isUpgradeRoute ||
		currentPath === "/install" ||
		currentPath === "/database-recovery";
	if (isAdminRoute) {
		preloadAdminEntry();
	}
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tempKey = params.get("temp_key");

    if (tempKey) {
      document.cookie = `temp_key=${tempKey}; path=/; max-age=${60 * 60 * 24 * 365 * 100}`;
      params.delete("temp_key");
      window.history.replaceState(
        {},
        document.title,
        `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`,
      );
    }
  }, []);
  const [appearance, setAppearance] = useLocalStorage<Appearance>(
    "appearance",
    THEME_DEFAULTS.appearance,
  );
  const [color, setColor] = useLocalStorage<Colors>(
    "color",
    THEME_DEFAULTS.color,
  );

  // Use the system theme hook to resolve "system" to actual theme
  const resolvedAppearance = useSystemTheme(appearance);

  React.useEffect(() => {
    const isDark = resolvedAppearance === "dark";
    document.documentElement.classList.toggle("dark", isDark);
  }, [resolvedAppearance]);

  const themeContextValue = useMemo(
    () => ({
      appearance,
      setAppearance,
      color,
      setColor,
    }),
    [appearance, setAppearance, color, setColor],
  );
  const routing = useRoutes(routes);
  return (
    <ThemeContext.Provider value={themeContextValue}>
      <Theme
          appearance={resolvedAppearance}
          accentColor={color}
          scaling="110%"
          className="theme-root"
          style={{
            backgroundColor: "transparent",
            minHeight: "100vh",
          }}
        >
		{isRestrictedGuideRoute ? (
		  <PublicInfoProvider>
			<DocumentTitle />
			<Toaster />
			<Suspense fallback={<Loading />}>{routing}</Suspense>
		  </PublicInfoProvider>
		) : (
		  <AccountProvider>
			<AccountPreferenceSync />
			<AdminRoutePreloader />
			<RPC2Provider>
			  <PublicInfoProvider>
				<DocumentTitle />
				<NodeListProvider>
				  <Toaster />
				  <OfflineIndicator />
				  <Suspense
					fallback={isAdminRoute ? <FullPageLoading /> : <Loading />}
				  >
					{routing}
				  </Suspense>
				  <PWAInstallPrompt />
				  <PWAUpdatePrompt />
				</NodeListProvider>
			  </PublicInfoProvider>
			</RPC2Provider>
		  </AccountProvider>
		)}
      </Theme>
    </ThemeContext.Provider>
  );
};

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  </ErrorBoundary>,
);
