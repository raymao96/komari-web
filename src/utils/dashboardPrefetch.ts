import { fetchDashboardSettings } from "@/hooks/useDashboardSettings";
import {
  requestDashboard,
  requestDashboardCharts,
} from "@/utils/dashboardApi";
import {
  billingQuery,
  readStoredBillingCurrency,
  requestBillingCached,
} from "@/utils/billing";
import {
  dashboardChartSections,
  dashboardCostCenterEnabled,
  dashboardSummarySections,
} from "@/utils/dashboardSettings";

export async function prefetchAdminDashboard(accountKey: string): Promise<void> {
  const billingPrefetch = requestBillingCached(
    billingQuery("/api/admin/billing/overview", {
      currency: readStoredBillingCurrency(),
      revision: 0,
    }),
  ).catch(() => undefined);
  const settings = await fetchDashboardSettings({ accountKey });
  await Promise.all([
    requestDashboard(
      dashboardSummarySections(settings),
      settings.ranking_limit,
      accountKey,
    ),
    requestDashboardCharts(
      dashboardChartSections(settings),
      settings.ranking_limit,
      accountKey,
    ),
    dashboardCostCenterEnabled(settings) ? billingPrefetch : Promise.resolve(),
  ]);
}
