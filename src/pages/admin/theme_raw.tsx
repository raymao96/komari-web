import { useEffect, useRef, useState } from "react";
import { Callout, Box } from "@/components/admin/ui";
import Loading from "@/components/loading";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import {
  getRawThemeHtml,
  type ThemeConfiguration,
} from "@/utils/themeConfiguration";
import { fetchThemeManifest } from "@/utils/themeManifest";
import {
  THEME_RAW_MESSAGE_TYPE,
  THEME_RAW_SANDBOX,
  themeRawLoaderSrcDoc,
} from "@/utils/themeRawFrame";

interface ThemeConfigResponse {
  configuration?: ThemeConfiguration;
}

const ThemeRaw = () => {
  const { publicInfo } = usePublicInfo();
  const theme = publicInfo?.theme;
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const loaderSrcDoc = themeRawLoaderSrcDoc(window.location.origin);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!theme) {
        setHtml("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const resp = await fetchThemeManifest(theme, {
          cache: "no-cache",
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const data: ThemeConfigResponse = await resp.json();
        const rawHtml = getRawThemeHtml(data.configuration);
        if (!rawHtml.trim()) {
          throw new Error("Raw theme content is empty");
        }

        if (!cancelled) setHtml(rawHtml);
      } catch (e) {
        if (!cancelled) {
          setHtml("");
          setError(e instanceof Error ? e.message : "Failed to load raw theme");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [theme]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !html) return;

    const send = () => {
      frame.contentWindow?.postMessage(
        { type: THEME_RAW_MESSAGE_TYPE, html },
        "*",
      );
    };

    frame.addEventListener("load", send);
    send();
    return () => {
      frame.removeEventListener("load", send);
    };
  }, [html, loaderSrcDoc]);

  if (loading) return <Loading />;

  if (error) {
    return (
      <Callout.Root color="red">
        <Callout.Text>{error}</Callout.Text>
      </Callout.Root>
    );
  }

  return (
    <Box className="h-full min-h-[calc(100vh-96px)]">
      <iframe
        ref={frameRef}
        title="Theme raw sandbox"
        srcDoc={loaderSrcDoc}
        sandbox={THEME_RAW_SANDBOX}
        className="h-full min-h-[calc(100vh-96px)] w-full border-0"
      />
    </Box>
  );
};

export default ThemeRaw;
