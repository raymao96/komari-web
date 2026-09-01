import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { nodeOnlineState } from "../src/utils/adminNodeOnlineState.ts";

const hookSource = readFileSync("src/hooks/use-admin-node-live-data.ts", "utf8");
const layoutSource = readFileSync("src/pages/admin/_layout.tsx", "utf8");
const pageSource = readFileSync("src/pages/admin/index.tsx", "utf8");
const pingPageSource = readFileSync("src/pages/admin/pingTask.tsx", "utf8");
const pingTaskSource = readFileSync("src/pages/admin/pingTask_Task.tsx", "utf8");
const pingServerSource = readFileSync("src/pages/admin/pingTask_Server.tsx", "utf8");
const offlineSource = readFileSync("src/pages/admin/notification/offline.tsx", "utf8");
const trafficReportSource = readFileSync("src/pages/admin/notification/traffic_report.tsx", "utf8");
const loadSource = readFileSync("src/pages/admin/notification/load.tsx", "utf8");
const pingLossSource = readFileSync("src/pages/admin/notification/ping_loss.tsx", "utf8");
const globalCssSource = readFileSync("src/global.css", "utf8");
const tableSource = readFileSync("src/components/ui/table.tsx", "utf8");
const paginationSource = readFileSync("src/components/admin/AdminPagination.tsx", "utf8");
const paginationUtilitySource = readFileSync("src/utils/adminPagination.ts", "utf8");
const paginationHookSource = readFileSync("src/hooks/useAdminDefaultPageSize.ts", "utf8");
const statusSummarySource = readFileSync("src/components/admin/AdminNodeStatusSummary.tsx", "utf8");
const selectionCountSource = readFileSync("src/components/admin/AdminSelectionCount.tsx", "utf8");
const returnRouteSource = readFileSync("src/pages/admin/returnRoute.tsx", "utf8");
const sessionsSource = readFileSync("src/pages/admin/sessions.tsx", "utf8");
const metricsSource = readFileSync("src/pages/admin/settings/metrics.tsx", "utf8");
const logSource = readFileSync("src/pages/admin/log.tsx", "utf8");
const execSource = readFileSync("src/pages/admin/exec.tsx", "utf8");
const marketSource = readFileSync("src/pages/admin/market/themes.tsx", "utf8");
const settingCardSource = readFileSync("src/components/admin/SettingCard.tsx", "utf8");
const mobileCardSource = readFileSync("src/components/admin/AdminMobileListCard.tsx", "utf8");
const remoteExecSource = readFileSync("src/components/remote/RemoteExecNodeSelector.tsx", "utf8");

test("unknown live status is not treated as offline", () => {
  const onlineSet = new Set(["node-a"]);
  assert.equal(nodeOnlineState(false, onlineSet, "node-a"), null);
  assert.equal(nodeOnlineState(true, onlineSet, "node-a"), true);
  assert.equal(nodeOnlineState(true, onlineSet, "node-b"), false);
});

test("admin node status uses one guarded compact poll", () => {
  assert.match(hookSource, /ADMIN_NODE_LIVE_INTERVAL_MS = 5000/);
  assert.match(hookSource, /common:getNodesLatestStatus"\s*,\s*\{ compact: true \}/);
  assert.match(hookSource, /if \(running \|\| stopped \|\| document\.hidden\) return/);
  assert.match(hookSource, /visibilitychange/);
  assert.match(hookSource, /export function AdminNodeLiveDataProvider/);
  assert.match(hookSource, /export \{ nodeOnlineState \}/);
  assert.match(hookSource, /cachedLiveData/);
  assert.doesNotMatch(hookSource, /lastUpdatedAt/);
  assert.match(layoutSource, /<AdminNodeLiveDataProvider>/);
  assert.match(pageSource, /<AdminNodeLiveDataProvider>/);
  assert.match(hookSource, /if \(existing\) return children/);
  assert.match(pageSource, /nodeOnlineState\(available, onlineSet, node\.uuid\)/);
  assert.match(pageSource, /online === null \? "pending"/);
  assert.match(pageSource, /visibility: "hidden"/);
});

test("admin node table keeps persisted ordering and prioritizes identity and billing", () => {
  assert.match(pageSource, /\/api\/admin\/client\/order/);
  assert.doesNotMatch(pageSource, /ResourceStatus|TrafficQuota|ResourceUsage/);
  assert.match(pageSource, /t\("common\.group", "分组"\)/);
  assert.match(pageSource, /t\("common\.remark", "备注"\)/);
  assert.match(pageSource, /admin\.nodeEdit\.remarkPlaceholder/);
  assert.match(pageSource, /admin\.nodeEdit\.publicRemarkPlaceholder/);
  assert.doesNotMatch(pageSource, /km-node-edit-remark/);
  assert.match(pageSource, /w-\[80px\].*admin\.nodeTable\.billing/);
  assert.match(pageSource, /nodeTable\.agent[\s\S]*publicVersion\(node\.version\)/);
  assert.match(pageSource, /admin-node-country-flag/);
  assert.match(pageSource, /reorderEnabled=\{/);
  assert.match(pageSource, /!searchTerm\.trim\(\)/);
  assert.match(pageSource, /statusFilters\.length === 0/);
  assert.match(pageSource, /regionFilters\.length === 0/);
  assert.match(pageSource, /groupFilters\.length === 0/);
  assert.match(pageSource, /!routeNode/);
  assert.doesNotMatch(pageSource, /routeAlert/);
  assert.doesNotMatch(pageSource, /selectedNodes|handleSelectAll|handleSelectNode/);
});

test("admin node table uses the global page size and saves the complete cross-page order", () => {
  assert.match(paginationUtilitySource, /ADMIN_LIST_PAGE_SIZE = 20/);
  assert.match(paginationUtilitySource, /return \[10, 20, 50, 100\]/);
  assert.match(paginationHookSource, /settings\.admin_default_page_size/);
  assert.match(paginationSource, /adminPageSizeOptions\(\)/);
  assert.match(pageSource, /visibleNodes = localNodes\.slice/);
  assert.match(pageSource, /PREVIOUS_PAGE_DROP_ID/);
  assert.match(pageSource, /NEXT_PAGE_DROP_ID/);
  assert.match(pageSource, /destinationPage = visiblePage - 1/);
  assert.match(pageSource, /destinationPage = visiblePage \+ 1/);
  assert.match(pageSource, /const orderData = reorderedNodes\.reduce/);
  assert.match(pageSource, /pageSize=\{pageSize\}/);
  assert.match(pageSource, /onPageSizeChange=/);
  assert.match(pageSource, /destinationPage \* pageSize - 1/);
  assert.match(pageSource, /overflow-x-auto overflow-y-hidden/);
});

test("mobile dialogs and settings cards stay within the viewport", () => {
  assert.match(pageSource, /className="admin-install-dialog"/);
  assert.match(pageSource, /admin-install-platforms/);
  assert.match(pageSource, /admin-install-options-grid grid grid-cols-2/);
  assert.match(globalCssSource, /\.admin-install-options-grid \{[\s\S]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(globalCssSource, /font-size: 16px !important/);
  assert.match(settingCardSource, /setting-card-header w-full min-w-0 max-w-full/);
});

test("all admin information lists share configurable pagination", () => {
  for (const source of [
    pingTaskSource,
    pingServerSource,
    offlineSource,
    trafficReportSource,
    loadSource,
    pingLossSource,
    sessionsSource,
    metricsSource,
    logSource,
    execSource,
    marketSource,
  ]) {
    assert.match(source, /AdminPagination/);
    assert.match(source, /onPageSizeChange/);
  }
  assert.match(pingTaskSource, /PREVIOUS_PAGE_DROP_ID/);
  assert.match(pingTaskSource, /NEXT_PAGE_DROP_ID/);
  assert.match(pingTaskSource, /destinationPage = page - 1/);
  assert.match(pingTaskSource, /destinationPage = page \+ 1/);
});

test("theme deletion lets the backend choose an installed fallback", () => {
  assert.match(marketSource, /request\("\/api\/admin\/theme\/delete"/);
  assert.doesNotMatch(marketSource, /theme\/set\?theme=default/);
});

test("admin node toolbar aligns status left and search actions right", () => {
  assert.match(pageSource, /<AdminNodeListFilters/);
  assert.match(pageSource, /className="km-admin-node-list"/);
  assert.match(pageSource, /onSearchTermChange=\{setSearchTerm\}/);
  assert.match(pageSource, /onStatusFiltersChange=\{setStatusFilters\}/);
  assert.match(pageSource, /onRegionFiltersChange=\{setRegionFilters\}/);
  assert.match(pageSource, /onGroupFiltersChange=\{setGroupFilters\}/);
  assert.match(statusSummarySource, /aria-pressed=\{value === filter\}/);
  assert.match(statusSummarySource, /useReduceMotionPreference\(\)/);
  assert.doesNotMatch(statusSummarySource, /useSettings\(\)/);
  assert.match(statusSummarySource, /layoutId=\{reduceMotion \? undefined : "admin-node-status-highlight"\}/);
  assert.match(statusSummarySource, /whileTap=\{reduceMotion \? undefined/);
  assert.match(statusSummarySource, /onClick=\{\(\) => onValueChange\(filter\)\}/);
  assert.doesNotMatch(pageSource, /style=\{\{ height: "48px" \}\}/);
  assert.doesNotMatch(pageSource, /lastReportRecent|liveRefreshInterval/);
  assert.doesNotMatch(pageSource, /resourceFromLatestReport/);
  assert.match(pageSource, /networkAddresses\.length > 0 \? networkAddresses\.map/);
  assert.match(pageSource, /type === "IPv6" \? compactIPv6\(address\) : address/);
  assert.match(pageSource, /flex min-w-0 flex-col justify-center text-sm leading-\[1\.125rem\] text-muted-foreground/);
  assert.match(statusSummarySource, /bottom-\[-1px\]/);
  assert.doesNotMatch(pageSource, /md:inline-flex md:w-fit/);
});

test("server details open an overview billing metrics page", () => {
  const detailSource = readFileSync("src/pages/admin/NodeDetailPage.tsx", "utf8");
  assert.match(pageSource, /to=\{`\/admin\/servers\/\$\{node\.uuid\}`\}/);
  assert.match(pageSource, /function NodeNameLink/);
  assert.doesNotMatch(pageSource, /function DetailView/);
  assert.doesNotMatch(pageSource, /function ReadOnlyDetailField/);
  assert.match(detailSource, /data-testid="admin-node-detail"/);
  assert.match(detailSource, /admin\.nodeDetail\.overview/);
  assert.match(detailSource, /admin\.nodeDetail\.billing/);
  assert.match(detailSource, /admin\.nodeDetail\.metrics/);
  assert.match(detailSource, /admin\.nodeDetail\.config/);
  assert.match(detailSource, /NodeUsageStats/);
  assert.match(detailSource, /用量统计/);
  assert.match(detailSource, /terminal\.title/);
  assert.doesNotMatch(detailSource, /服务器管理/);
  assert.match(detailSource, /km-admin-detail-card/);
  assert.doesNotMatch(detailSource, /traffic-calibration/);
  assert.match(detailSource, /admin-node-detail-country-flag/);
  assert.match(detailSource, /admin-node-network-row/);
  assert.match(detailSource, /width: 104/);
  assert.match(detailSource, /whiteSpace: "nowrap"/);
  assert.doesNotMatch(detailSource, /width: 56, flexShrink: 0/);
  assert.match(detailSource, /admin\.nodeDetail\.transfer/);
  assert.match(detailSource, /admin\.nodeDetail\.recordTrafficReset/);
  assert.match(detailSource, /billing\/ip-change/);
  assert.match(detailSource, /billing\/one-time/);
  assert.match(detailSource, /useAdminTabParam\(DETAIL_TABS, "overview"\)/);
  assert.match(detailSource, /currencyForStorage\(currency\)/);
  assert.match(detailSource, /BILLING_CURRENCY_OPTIONS/);
  assert.match(detailSource, /rgba\(34, 197, 94, 0\.16\)/);
  assert.doesNotMatch(detailSource, /followBillingCurrency/);
  assert.doesNotMatch(detailSource, /trafficResetNotePlaceholder/);
  assert.match(detailSource, /common\.remark/);
  assert.match(detailSource, /admin\.nodeDetail\.oneTimeFee/);
  assert.match(detailSource, /AdminTextField\.Root/);
  assert.match(detailSource, /km-node-dialog-fields/);
  assert.doesNotMatch(detailSource, /admin-stop-billing-button/);
  assert.doesNotMatch(detailSource, /stopBilling/);
  assert.doesNotMatch(detailSource, /actionSx\("rgba\(145, 158, 171, 0\.08\)", "#1C252E"\)/);
  assert.match(detailSource, /<Flag /);
  assert.match(detailSource, /\$\{locationName\} \(\$\{locationCode\}\)/);
  assert.match(detailSource, /<AdminNodeLiveDataProvider>/);
  const usageSource = readFileSync("src/pages/admin/NodeUsageStats.tsx", "utf8");
  assert.match(usageSource, /data-testid="admin-node-usage-stats"/);
  assert.match(usageSource, /formatTrafficResetRangeLabel\(node\.traffic_reset_day\)/);
  assert.match(usageSource, /data-testid="admin-node-network-range"/);
  assert.doesNotMatch(usageSource, /points\[0\]\.time/);
  assert.match(usageSource, /\/api\/records\/load/);
  assert.match(usageSource, /\/api\/admin\/client\/\$\{encodeURIComponent\(node\.uuid\)\}\/traffic-daily/);
  assert.match(usageSource, /nodeTrafficType\(node\)/);
  assert.match(usageSource, /trafficUsed\(trafficType/);
  assert.doesNotMatch(usageSource, /Math\.max\(inbound/);
  assert.doesNotMatch(usageSource, /mockLoadRecords/);
  assert.doesNotMatch(usageSource, /isHkPreviewNode/);
  assert.match(usageSource, /live\?\.network\.down/);
  assert.match(usageSource, /live\?\.network\.up/);
  assert.match(usageSource, /formatSpeed\(inboundSpeed\)/);
  assert.match(usageSource, /formatSpeed\(outboundSpeed\)/);
  assert.match(detailSource, /CustomTags/);
  assert.match(detailSource, /gap: "4px"/);
  assert.doesNotMatch(detailSource, /isHkPreviewNode/);
  assert.doesNotMatch(detailSource, /previewLive/);
  assert.doesNotMatch(detailSource, /PREVIEW\.bandwidth/);
  assert.match(detailSource, /alignItems: "stretch"/);
  assert.match(paginationSource, /px-3 py-1\.5/);
  assert.match(paginationSource, /admin-pagination-size/);
  assert.match(paginationSource, /admin-pagination-btn/);
  assert.match(globalCssSource, /\.admin-pagination-text,[\s\S]*height: 22px[\s\S]*line-height: 22px/);
  assert.match(globalCssSource, /\.km-admin-menu,[\s\S]*padding: 4px/);
  assert.match(globalCssSource, /\.km-admin-menu,[\s\S]*overflow-y: auto/);
  assert.match(globalCssSource, /\.km-admin-menu \.MuiList-root,[\s\S]*gap: 2px/);
  assert.match(globalCssSource, /\.admin-table-header \{[\s\S]*user-select: none/);
  assert.match(tableSource, /admin-table-header select-none/);
  assert.match(paginationSource, /adminMenuProps/);
  assert.match(readFileSync("src/components/admin/AdminNodeListFilters.tsx", "utf8"), /AdminMultiSelect/);
  assert.match(globalCssSource, /\.admin-node-detail-country-flag > span \{[\s\S]*width: 16px[\s\S]*height: 12px/);
  assert.match(globalCssSource, /\.admin-node-detail-meta-icon \{[\s\S]*width: 16px[\s\S]*justify-content: flex-start/);
  assert.match(detailSource, /direction=\{\{ xs: "column", sm: "row" \}\}/);
  assert.match(detailSource, /alignItems: \{ xs: "flex-start", sm: "center" \}/);
});

test("delete confirmation names the server before the question", () => {
  assert.match(pageSource, /<Dialog\.Description>[\s\S]*<Text as="span" weight="bold">\{node\.name\}<\/Text>[\s\S]*confirmDeleteQuestion/);
});

test("admin tables share one header color and mobile actions stay compact", () => {
  assert.match(tableSource, /admin-table-header/);
  assert.match(globalCssSource, /\.admin-table-header/);
  assert.match(globalCssSource, /\.admin-card-actions \{[\s\S]*justify-content: flex-start/);
  assert.match(globalCssSource, /\.admin-card-actions button \{[\s\S]*background-color: transparent !important/);
  assert.match(globalCssSource, /\.admin-card-actions button:hover \{[\s\S]*background-color: var\(--accent-a3\)/);
  assert.match(globalCssSource, /\.admin-node-table tbody td:first-child[\s\S]*position: absolute/);
  assert.match(globalCssSource, /\.admin-node-actions[\s\S]*grid-template-columns: repeat\(6/);
  assert.match(globalCssSource, /\.admin-node-country-flag > span \{[\s\S]*width: 28px[\s\S]*height: 21px/);
  assert.match(globalCssSource, /\.admin-node-actions > button \{[\s\S]*min-width: 2rem[\s\S]*min-height: 2rem/);
  assert.match(globalCssSource, /\.admin-sortable-table tbody td:first-child[\s\S]*position: absolute/);
  assert.match(globalCssSource, /\.admin-card-actions[\s\S]*grid-template-columns: repeat\(auto-fit, minmax\(2\.25rem, 2\.75rem\)\)/);
  assert.match(globalCssSource, /\.admin-responsive-table tbody td:last-child > \.admin-card-actions[\s\S]*justify-content: start/);
  assert.match(globalCssSource, /\.admin-card-actions\.admin-single-text-action[\s\S]*display: flex/);
  assert.match(globalCssSource, /\.admin-card-actions\.admin-single-icon-action[\s\S]*justify-content: center/);
  assert.match(globalCssSource, /\.admin-single-action-label \{[\s\S]*display: none/);
  assert.match(globalCssSource, /\.admin-card-actions svg[\s\S]*display: block !important/);
  const mobileCardStackCss = globalCssSource.match(/\.admin-mobile-card-stack \{[^}]+\}/)?.[0] ?? "";
  assert.match(mobileCardStackCss, /gap: 10px;/);
  assert.match(mobileCardStackCss, /padding: 10px;/);
  assert.match(mobileCardStackCss, /background: #fff;/);
  assert.doesNotMatch(mobileCardStackCss, /#f4f6f8/);
  assert.match(globalCssSource, /@media \(max-width: 1023px\)[\s\S]*\.admin-single-action-button \{[\s\S]*width: 2\.25rem !important/);
  assert.match(globalCssSource, /\.admin-card-actions\.admin-dual-actions \{[\s\S]*margin-left: -0\.625rem/);
});

test("wide admin tables turn into labelled row cards on mobile", () => {
  assert.match(pageSource, /admin-responsive-table admin-node-table/);
  assert.match(pageSource, /SortableMobileCard/);
  assert.match(pageSource, /AdminMobileListCard/);
  assert.match(mobileCardSource, /gridTemplateColumns: "1fr 1fr"/);
  assert.doesNotMatch(pageSource, /join\(" \/ "\)/);
  assert.match(pageSource, /<Flex gap="1" wrap="wrap">\s*<CustomTags tags=\{node\.tags \|\| ""\} \/>/);
  assert.match(pingTaskSource, /admin-responsive-table/);
  assert.match(pingServerSource, /admin-responsive-table/);
  assert.match(offlineSource, /admin-responsive-table admin-selection-table/);
  assert.match(offlineSource, /common\.deselect_all[\s\S]*common\.select_all/);
  assert.doesNotMatch(offlineSource, /variant="soft"\s+color="gray"\s+className="md:hidden"/);
  assert.doesNotMatch(trafficReportSource, /variant="soft"\s+color="gray"\s+className="md:hidden"/);
  assert.match(offlineSource, /<IconButton[\s\S]*<Pencil size=\{16\} \/>/);
  assert.equal((offlineSource.match(/import \{ Pencil/g) || []).length, 1);
  assert.doesNotMatch(offlineSource, /admin-single-action-label/);
  assert.match(trafficReportSource, /<IconButton[\s\S]*<Pencil size=\{16\} \/>/);
  assert.doesNotMatch(trafficReportSource, /admin-single-action-label/);
  assert.match(mobileCardSource, /return <div className="admin-mobile-card-stack">/);
  assert.match(loadSource, /admin-responsive-table admin-primary-first-table/);
  assert.match(offlineSource, /admin-card-actions admin-single-icon-action/);
  assert.match(trafficReportSource, /admin-card-actions admin-single-icon-action/);
  assert.match(pingLossSource, /admin-responsive-table admin-selection-table/);
  assert.match(pingLossSource, /TableHead className="text-center">\{t\("common\.action"\)\}/);
  assert.match(pingLossSource, /admin-card-actions admin-ping-loss-actions/);
  assert.match(pingLossSource, /onClick=\{toggleSelectAll\}[\s\S]*common\.deselect_all[\s\S]*common\.select_all/);
  assert.match(pingLossSource, /ConfigurationDialog targets=\{\[target\]\}[\s\S]*<Pencil size=\{16\} \/>/);
  assert.match(globalCssSource, /@media \(max-width: 1023px\)/);
  assert.match(globalCssSource, /\.admin-responsive-table tbody tr/);
  assert.match(globalCssSource, /\.admin-responsive-table tbody tr \{[\s\S]*border-radius: calc\(var\(--radius\) - 2px\)/);
  assert.doesNotMatch(globalCssSource, /\.admin-selection-table tbody tr:first-child[\s\S]*border-top-left-radius: 0/);
  assert.match(globalCssSource, /content: attr\(data-label\)/);
});

test("mobile lists reuse the server-list card instead of CSS table cards", () => {
  for (const source of [
    pingTaskSource,
    pingServerSource,
    offlineSource,
    trafficReportSource,
    loadSource,
    pingLossSource,
    returnRouteSource,
    remoteExecSource,
  ]) {
    assert.match(source, /AdminMobileListCard/);
    assert.match(source, /AdminMobileCardStack/);
    assert.match(source, /useIsMobile/);
  }
});

test("desktop node table keeps readable name and network columns while resizing", () => {
  assert.match(
    pageSource,
    /admin-responsive-table admin-node-table min-w-\[1136px\] table-fixed/,
  );
  assert.match(pageSource, /TableCell className="w-\[44px\] px-2 !align-middle"/);
  assert.match(pageSource, /TableHead className="w-\[44px\]"/);
  assert.match(pageSource, /TableHead className="w-\[170px\]"/);
  assert.equal(pageSource.match(/TableHead className="w-\[170px\]"/g)?.length, 2);
  assert.match(pageSource, /TableHead className="w-\[64px\] text-center"/);
  assert.equal(pageSource.match(/TableHead className="w-\[64px\]/g)?.length, 3);
  assert.match(pageSource, /TableHead className="w-\[80px\]"/);
  assert.match(pageSource, /TableHead className="w-\[272px\]"/);
  assert.match(pageSource, /<BillingButton node=\{node\} \/>/);
  assert.match(pageSource, /<TrafficCalibrationButton node=\{node\} \/>/);
  assert.match(pageSource, /text-sm hover:bg-\[var\(--accent-a2\)\][^\n]*\[&>td\]:py-2\.5/);
  assert.match(pageSource, /text-sm leading-\[1\.125rem\]/);
  assert.match(pageSource, /data-label=\{t\("admin\.nodeTable\.name"\)\}[\s\S]{0,80}title=\{node\.name\}/);
  assert.match(pageSource, /\["IPv4", node\.ipv4\?\.trim\(\)\][\s\S]{0,80}\["IPv6", node\.ipv6\?\.trim\(\)\]/);
  assert.match(pageSource, /networkAddresses\.length > 0 \? networkAddresses\.map/);
  assert.doesNotMatch(pageSource, /IPv[46] \{node\.ipv[46] \|\| "--"\}/);
});

test("admin tables align selection controls and use available text width", () => {
  assert.match(pingLossSource, /TableHead className="w-12 px-3 text-center"/);
  assert.match(pingLossSource, /TableCell className="w-12 px-3" data-label=\{t\("common\.select"\)\}/);
  assert.doesNotMatch(loadSource, /slice\(0,\s*40\)/);
  assert.doesNotMatch(pingTaskSource, /slice\(0,\s*40\)/);
  assert.doesNotMatch(pingServerSource, /slice\(0,\s*40\)/);
  assert.match(loadSource, /min-w-0 flex-1/);
  assert.match(loadSource, /truncate whitespace-nowrap/);
  assert.doesNotMatch(loadSource, /whitespace-normal break-words/);
  assert.match(pingTaskSource, /admin-responsive-table admin-sortable-table table-fixed/);
  assert.match(pingTaskSource, /truncate whitespace-nowrap/);
  assert.doesNotMatch(pingTaskSource, /whitespace-normal break-words/);
  assert.match(pingTaskSource, /admin-card-actions admin-dual-actions flex items-center gap-3/);
  assert.match(loadSource, /admin-card-actions admin-dual-actions flex items-center gap-3/);
});

test("admin tables clip group, remark, and tag overflow instead of wrapping", () => {
  assert.match(pageSource, /admin-cell-clip/);
  assert.match(pageSource, /admin-cell-clip-row/);
  assert.doesNotMatch(pageSource, /whitespace-normal break-words/);
  assert.doesNotMatch(pageSource, /flex flex-wrap items-center gap-1/);
  const execSelectorSource = readFileSync(
    "src/components/remote/RemoteExecNodeSelector.tsx",
    "utf8",
  );
  assert.match(execSelectorSource, /admin-cell-clip/);
  assert.doesNotMatch(execSelectorSource, /whitespace-normal break-words/);
});

test("load notifications persist the active tab and keep server names on one line", () => {
  assert.match(loadSource, /useAdminTabParam\(LOAD_VIEWS, "configuration", \{[\s\S]*param: "view"/);
  assert.match(loadSource, /table-fixed min-w-\[840px\]/);
  assert.match(loadSource, /TableCell className="max-w-0"/);
});

test("load notifications support default-on in add and edit flows", () => {
  assert.match(
    loadSource,
    /import \{ Checkbox \} from "@\/components\/ui\/checkbox"/,
  );
  assert.match(loadSource, /default_on: alert\.default_on \?\? false/);
  assert.match(loadSource, /default_on: newForm\.default_on/);
  assert.match(
    loadSource,
    /if \(!newForm\.default_on && newForm\.clients\.length === 0\)/,
  );
  assert.match(loadSource, /const \[defaultOn, setDefaultOn\] = React\.useState\(false\)/);
  assert.match(loadSource, /default_on: defaultOn/);
  assert.match(loadSource, /checked=\{form\.default_on\}/);
  assert.match(loadSource, /checked=\{defaultOn\}/);
  assert.match(loadSource, /ping\.default_on_description/);
});

test("batch selection uses one responsive toolbar instead of header checkboxes", () => {
  for (const source of [offlineSource, trafficReportSource, pingLossSource]) {
    assert.match(source, /AdminSelectionCount/);
    assert.match(source, /md:hidden/);
    assert.match(source, /summary=\{paginationSummary\}/);
    assert.doesNotMatch(source, /aria-label=\{t\("common\.select_all"/);
  }
  assert.match(selectionCountSource, /common\.selected_total/);
  assert.match(selectionCountSource, /split\(\/\(\\d\+\)\//);
});

test("mobile card action rows share the compact node-list layout", () => {
  assert.match(
    globalCssSource,
    /\.admin-responsive-table tbody td:last-child \{[\s\S]*grid-column: 1 \/ -1/,
  );
  assert.match(
    globalCssSource,
    /\.admin-card-actions button \{[\s\S]*margin: 0 !important/,
  );
  assert.doesNotMatch(
    globalCssSource,
    /\.admin-node-table tbody td:last-child \{/,
  );
});

test("ping task search filters task and server views by task, target, or server", () => {
  assert.match(pingPageSource, /const \[search, setSearch\] = React\.useState\(""\)/);
  assert.match(pingPageSource, /task\.name[\s\S]*task\.target[\s\S]*serverNamesByUuid\.get\(uuid\)/);
  assert.match(pingPageSource, /<TaskView[\s\S]*pingTasks=\{filteredTasks\}[\s\S]*reorderEnabled=\{!search\.trim\(\)\}/);
  assert.match(pingPageSource, /<ServerView pingTasks=\{taskList\} search=\{search\} \/>/);
  assert.match(pingServerSource, /const filteredNodes = React\.useMemo/);
  assert.match(pingServerSource, /task\.name[\s\S]*task\.target/);
  assert.match(pingServerSource, /useAdminPagination\(filteredNodes\)/);
});

test("list toolbars and pagination follow the compact layout", () => {
  assert.match(paginationSource, /adminMenuProps/);
  assert.match(pageSource, /nodeSearchHaystack\(node\)/);
  assert.doesNotMatch(pageSource, /onRefresh=\{refresh\}/);
  assert.match(pageSource, /showSummary=\{false\}/);
  assert.match(loadSource, /<Tabs\.Content value="configuration"[\s\S]*<AdminListShell[\s\S]*<LoadListToolbar[\s\S]*showAdd[\s\S]*<LoadConfigurationTable/);
  assert.match(loadSource, /<Tabs\.Content value="current"[\s\S]*<AdminListShell[\s\S]*<LoadListToolbar[\s\S]*<CurrentLoadAlertsTable/);
  assert.match(loadSource, /<AdminListSearch/);
  assert.match(loadSource, /showSummary=\{false\}/);
  assert.match(offlineSource, /<AdminListShell[\s\S]*<AdminListSearch[\s\S]*common\.select_all[\s\S]*batch_edit/);
  assert.match(trafficReportSource, /<AdminListShell[\s\S]*<AdminListSearch[\s\S]*common\.select_all[\s\S]*batch_edit/);
  assert.equal(
    (trafficReportSource.match(/placeholder=\{t\("common\.search"\)\}/g) ?? []).length,
    1,
  );
  assert.match(pingLossSource, /<AdminListShell[\s\S]*<AdminListSearch[\s\S]*common\.select_all[\s\S]*batch_edit[\s\S]*common\.add/);
  assert.doesNotMatch(pingLossSource, /md:ml-auto md:w-fit md:self-end/);
  assert.match(pingPageSource, /<AdminListShell[\s\S]*<AdminListSearch[\s\S]*<AddButton/);
  assert.doesNotMatch(returnRouteSource, /<span>共 \{total\} 条<\/span>/);
});

test("node list search ignores billing and uses a plain billing-cycle select", () => {
  const filtersSource = readFileSync("src/components/admin/AdminNodeListFilters.tsx", "utf8");
  assert.match(pageSource, /nodeSearchHaystack\(node\)/);
  assert.match(pageSource, /node\.tags/);
  assert.doesNotMatch(pageSource, /billingCycleSearchWords/);
  assert.match(pageSource, /<Select\.Root\s+name="billingCycle"/);
  assert.match(pageSource, /<Select\.Item value="30">\{t\("common.monthly"\)\}<\/Select\.Item>/);
  assert.doesNotMatch(pageSource, /trafficResetDay[\s\S]{0,80}type="number"/);
  assert.doesNotMatch(filtersSource, /账单、分组/);
  assert.match(filtersSource, /标签、分组/);
});

test("multiline inputs stay at their empty height until resized", () => {
  const controlsSource = readFileSync("src/components/admin/ui/controls.tsx", "utf8");
  assert.match(controlsSource, /autosize = false/);
  assert.match(controlsSource, /resize = "vertical"/);
  assert.match(settingCardSource, /rows=\{3\}/);
  assert.doesNotMatch(settingCardSource, /minRows/);
  assert.match(globalCssSource, /\.MuiInputBase-multiline textarea \{[\s\S]*resize: vertical/);
});
