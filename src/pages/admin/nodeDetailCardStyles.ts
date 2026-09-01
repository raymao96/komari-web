import { getAppAssetUrl } from "@/utils/assetUrl";

const metricCardBackgroundLight = getAppAssetUrl(
  "assets/lite-card-background-v4-light.svg?v=20260825-3",
);
const metricCardBackgroundDark = getAppAssetUrl(
  "assets/lite-card-background-v4-dark.svg?v=20260825-3",
);

export const metricCardSurfaceSx = {
  backgroundColor: "#FBFCFD",
  "html.dark &": {
    backgroundColor: "#26313C",
  },
} as const;

export const metricCardSx = {
  "--metric-label-color": "#919EAB",
  "--metric-value-color": "#1C252E",
  "--metric-empty-color": "#B6C0C9",
  overflow: "hidden",
  ...metricCardSurfaceSx,
  backgroundImage: `url("${metricCardBackgroundLight}")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right center",
  backgroundSize: "auto 100%",
  "html.dark &": {
    ...metricCardSurfaceSx["html.dark &"],
    "--metric-label-color": "#AEB9C4",
    "--metric-value-color": "#F4F6F8",
    "--metric-empty-color": "#7C8996",
    backgroundImage: `url("${metricCardBackgroundDark}")`,
  },
} as const;

export const usageMetricCardSx = {
  ...metricCardSx,
  backgroundColor: "#FFFFFF",
  "html.dark &": {
    ...metricCardSx["html.dark &"],
    backgroundColor: "#212B36",
  },
} as const;
