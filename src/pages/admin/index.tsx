import {
  quotePowerShellArg,
  quoteShellArg,
  quoteShellArgs,
} from "@/utils/shellQuote";
import { publicVersion } from "@/utils/version";
import {
  LITE_AGENT_DOCKER_IMAGE,
  liteAgentInstallScriptUrl,
} from "@/utils/agentInstall";
import { normalizeOptionalServiceUrl } from "@/utils/serviceUrl";
import { writeClipboardText } from "@/utils/clipboard";
import React, { useEffect, useState } from "react";
import {
  NodeDetailsProvider,
  useNodeDetails,
  type NodeDetail,
} from "@/contexts/NodeDetailsContext";
import { createInstallTokenSession, installCommandCopyAllowed } from "@/lib/installTokenSession";
import { AdminMobileCardStack, AdminMobileListCard } from "@/components/admin/AdminMobileListCard";
import Alert from "@mui/material/Alert";
import MuiButton from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import {
  AppDialogContent,
  Flex,
  TextField,
  Button,
  Text,
  Dialog,
  IconButton,
  TextArea,
  Callout,
  Badge,
  Select,
  Tabs,
} from "@/components/admin/ui";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CircleDollarSign,
  CheckCircle2,
  Clock3,
  Copy,
  CornerRightUp,
  Download,
  Gauge,
  GripVertical,
  Pencil,
  Plus,
  Radar,
  Save,
  Send,
  Settings,
  Terminal,
  Trash2Icon,
  XCircle,
} from "@/components/admin/muiIcons";
import { Link, useSearchParams } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  TouchSensor,
  MouseSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import Flag from "@/components/Flag";
import { NODE_OFFLINE, NODE_ONLINE } from "@/theme/brand";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatBytes, stringToBytes } from "@/utils/unitHelper";
import { normalizeBandwidth } from "@/utils/bandwidth";
import PriceTags, { CustomTags } from "@/components/PriceTags";
import Loading from "@/components/loading";
import Tips from "@/components/ui/tips";
import {
  SettingCardSelect,
  SettingCardShortTextInput,
  SettingCardSwitch,
} from "@/components/admin/SettingCard";
import { useSettings } from "@/lib/api";
import {
  dateInputToISOString,
  timestampToDateInput,
} from "@/lib/dateInput";
import { currencyForDisplay, currencyForStorage } from "@/lib/currency";
import { openRemoteTerminal } from "@/utils/remoteLaunch";
import { useRemoteManagementGate } from "@/components/admin/RemoteManagementGate";
import { SelectOrInput } from "@/components/ui/select-or-input";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { AdminSheetTabs, AdminTabLabel } from "@/components/admin/AdminSheetTabs";
import AdminNodeListFilters, {
  type AdminNodeStatusValue,
} from "@/components/admin/AdminNodeListFilters";
import { ADMIN_LIST_ACTION_SX } from "@/components/admin/adminListLayout";
import {
  AdminPagination,
} from "@/components/admin/AdminPagination";
import { useAdminDefaultPageSize } from "@/hooks/useAdminDefaultPageSize";
import {
  AdminNodeLiveDataProvider,
  nodeOnlineState,
  useAdminNodeLiveData,
} from "@/hooks/use-admin-node-live-data";
import {
  getRegionCode,
  getRegionDisplayName,
  getSupportedRegions,
} from "@/utils/regionHelper";
import {
  dashboardAlertNodeUuidSet,
  getDashboardAlertItemsSnapshot,
  parseServerListAlertKind,
  requestDashboardAlertItems,
} from "@/utils/adminAlertFilters";


const NodeDetailsPage = () => {
  return (
    <NodeDetailsProvider>
      <AdminNodeLiveDataProvider>
        <Layout />
      </AdminNodeLiveDataProvider>
    </NodeDetailsProvider>
  );
};

const PREVIOUS_PAGE_DROP_ID = "admin-node-previous-page";
const NEXT_PAGE_DROP_ID = "admin-node-next-page";

function nodeSearchHaystack(node: NodeDetail) {
  return [
    node.name,
    node.ipv4,
    node.ipv6,
    node.group,
    node.remark,
    node.public_remark,
    node.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

const Layout = () => {
  const { t } = useTranslation();
  const { nodeDetail, isLoading, error, refresh } = useNodeDetails();
  const { settings, loading: settingsLoading } = useSettings();
  const { liveData, available } = useAdminNodeLiveData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const routeStatus = searchParams.get("status")?.trim();
  const [statusFilters, setStatusFilters] = useState<AdminNodeStatusValue[]>(() =>
    routeStatus === "offline" || routeStatus === "online" ? [routeStatus] : [],
  );
  const [regionFilters, setRegionFilters] = useState<string[]>([]);
  const [groupFilters, setGroupFilters] = useState<string[]>([]);
  const routeNode = searchParams.get("node")?.trim() || "";
  const listAlertKind = parseServerListAlertKind(searchParams.get("alert"));
  const [alertNodeUuids, setAlertNodeUuids] = useState<ReadonlySet<string> | null>(() => {
    if (!listAlertKind) return null;
    const snapshot = getDashboardAlertItemsSnapshot(listAlertKind);
    return snapshot ? dashboardAlertNodeUuidSet(snapshot.items) : null;
  });
  const onlineSet = React.useMemo(
    () => new Set(liveData?.data.online ?? []),
    [liveData?.data.online],
  );
  const alertFilterPending = Boolean(listAlertKind) && alertNodeUuids === null;

  const clearListAlert = React.useCallback(() => {
    setSearchParams((current) => {
      if (!current.has("alert")) return current;
      const next = new URLSearchParams(current);
      next.delete("alert");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    if (!listAlertKind) {
      setAlertNodeUuids(null);
      return;
    }
    const controller = new AbortController();
    const snapshot = getDashboardAlertItemsSnapshot(listAlertKind);
    setAlertNodeUuids(snapshot ? dashboardAlertNodeUuidSet(snapshot.items) : null);
    void requestDashboardAlertItems(listAlertKind, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setAlertNodeUuids(dashboardAlertNodeUuidSet(data.items));
      })
      .catch((error: { name?: string } | undefined) => {
        if (controller.signal.aborted || error?.name === "AbortError") return;
        setAlertNodeUuids(new Set());
      });
    return () => controller.abort();
  }, [listAlertKind]);

  const filteredNodes = React.useMemo(
    () => {
      if (!Array.isArray(nodeDetail) || alertFilterPending) return [];
      return nodeDetail.filter((node) => {
        const query = searchTerm.trim().toLowerCase();
        const matchesSearch = !query || nodeSearchHaystack(node).includes(query);
        const isOnline = nodeOnlineState(available, onlineSet, node.uuid);
        const matchesStatus =
          statusFilters.length === 0 ||
          isOnline === null ||
          statusFilters.includes(isOnline ? "online" : "offline");
        const matchesRegion =
          regionFilters.length === 0 || regionFilters.includes(getRegionCode(node.region));
        const nodeGroup = node.group?.trim() ? node.group.trim() : "__none__";
        const matchesGroup = groupFilters.length === 0 || groupFilters.includes(nodeGroup);
        const matchesNode = !routeNode || node.uuid === routeNode;
        const matchesAlert = !listAlertKind || Boolean(alertNodeUuids?.has(node.uuid));
        return (
          matchesSearch &&
          matchesStatus &&
          matchesRegion &&
          matchesGroup &&
          matchesNode &&
          matchesAlert
        );
      });
    },
    [
      alertFilterPending,
      alertNodeUuids,
      groupFilters,
      listAlertKind,
      nodeDetail,
      onlineSet,
      available,
      regionFilters,
      routeNode,
      searchTerm,
      statusFilters,
    ],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (isLoading) return <Loading text="" />;
  if (error) return <div>{error}</div>;

  const isEmpty = Array.isArray(nodeDetail) && nodeDetail.length === 0;

  return (
    <Flex direction="column" gap="4" className="p-0 md:p-4">
      <Header
        settings={settings}
        settingsLoading={settingsLoading}
      />

      {isEmpty ? (
        <EmptyNodesGuide />
      ) : (
        <div className="km-admin-node-list">
          <AdminNodeListFilters
            nodes={nodeDetail}
            onlineSet={onlineSet}
            available={available}
            resultCount={filteredNodes.length}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            statusFilters={statusFilters}
            onStatusFiltersChange={setStatusFilters}
            regionFilters={regionFilters}
            onRegionFiltersChange={setRegionFilters}
            groupFilters={groupFilters}
            onGroupFiltersChange={setGroupFilters}
            alertChip={
              listAlertKind
                ? {
                    label: t(
                      `admin_dashboard.alert_${listAlertKind}`,
                      listAlertKind === "resource"
                        ? "资源超限"
                        : listAlertKind === "traffic"
                          ? "流量容量"
                          : "账单提醒",
                    ),
                    onClear: clearListAlert,
                  }
                : null
            }
          />
          {alertFilterPending ? (
            <Loading inline text="" />
          ) : filteredNodes.length === 0 ? (
            <div className="px-5 py-6">
              <Alert severity="info">{t("common.no_data", "没有符合当前筛选的服务器")}</Alert>
            </div>
          ) : (
            <NodeTable
              nodes={filteredNodes}
              settings={settings}
              onlineSet={onlineSet}
              available={available}
              reorderEnabled={
                !searchTerm.trim() &&
                statusFilters.length === 0 &&
                regionFilters.length === 0 &&
                groupFilters.length === 0 &&
                !routeNode &&
                !listAlertKind
              }
            />
          )}
        </div>
      )}
    </Flex>
  );
};

const EmptyNodesGuide = () => {
  const { t } = useTranslation();
  return (
    <Flex
      direction="column"
      align="end"
      justify="start"
      style={{ minHeight: "60vh" }}
      pr="2"
      pt="1"
    >
      {/* 回转箭头指向右上角的“添加节点”按钮 */}
      <CornerRightUp
        size={72}
        strokeWidth={1.25}
        className="text-[var(--accent-9)] animate-bounce"
        style={{ marginRight: "1.5rem" }}
      />
      <Flex direction="column" align="end" gap="1" mt="2" mr="2">
        <Text size="4" weight="bold">
          {t("admin.nodeTable.emptyGuide.title", "还没有任何服务器")}
        </Text>
        <Text size="2" color="gray" align="right" style={{ maxWidth: "20rem" }}>
          {t(
            "admin.nodeTable.emptyGuide.description",
            "点击右上角的“添加节点”开始，或开启自动发现批量接入服务器。"
          )}
        </Text>
      </Flex>
    </Flex>
  );
};

type AutoDiscoveryInstallOptions = {
  enableRemoteControl: boolean;
  disableAutoUpdate: boolean;
  ignoreUnsafeCert: boolean;
  memoryIncludeCache: boolean;
  getIpAddrFromNic: boolean;
  enableGpu: boolean;
  ghproxy: string;
  dir: string;
  serviceName: string;
  includeNics: string;
  excludeNics: string;
  includeMountpoints: string;
  interval: string;
  monthRotate: string;
};

const AutoDiscoverySection = ({
  settings,
  loading,
}: {
  settings: any;
  loading?: boolean;
}) => {
  const { t } = useTranslation();
  const adKey: string = settings?.auto_discovery_key || "";
  const enabled = Boolean(adKey);

  const [selectedPlatform, setSelectedPlatform] =
    React.useState<Platform>("linux");
  const [showOptions, setShowOptions] = React.useState(false);
  const [installOptions, setInstallOptions] =
    React.useState<AutoDiscoveryInstallOptions>({
      enableRemoteControl: false,
      disableAutoUpdate: false,
      ignoreUnsafeCert: false,
      memoryIncludeCache: false,
      getIpAddrFromNic: false,
      enableGpu: false,
      ghproxy: "",
      dir: "",
      serviceName: "",
      includeNics: "",
      excludeNics: "",
      includeMountpoints: "",
      interval: "",
      monthRotate: "",
    });

  const [enableGhproxy, setEnableGhproxy] = React.useState(false);
  const [enableCustomDir, setEnableCustomDir] = React.useState(false);
  const [enableCustomServiceName, setEnableCustomServiceName] =
    React.useState(false);
  const [enableIncludeNics, setEnableIncludeNics] = React.useState(false);
  const [enableExcludeNics, setEnableExcludeNics] = React.useState(false);
  const [enableIncludeMountpoints, setEnableIncludeMountpoints] =
    React.useState(false);
  const [enableInterval, setEnableInterval] = React.useState(false);
  const [enableMonthRotate, setEnableMonthRotate] = React.useState(false);

  const generateCommand = () => {
    const host = (function () {
      if (!settings?.script_domain) {
        return window.location.origin;
      }
      return normalizeOptionalServiceUrl(settings.script_domain);
    })();
    const args: string[] = ["-e", host, "--auto-discovery", adKey];
    if (installOptions.enableRemoteControl) {
      args.push("--enable-remote-control");
    } else {
      args.push("--enable-remote-control=false");
    }
    if (installOptions.disableAutoUpdate) {
      args.push("--disable-auto-update");
    }
    if (installOptions.ignoreUnsafeCert) {
      args.push("--ignore-unsafe-cert");
    }
    if (installOptions.memoryIncludeCache) {
      args.push("--memory-include-cache");
    }
    if (installOptions.getIpAddrFromNic) {
      args.push("--get-ip-addr-from-nic");
    }
    if (installOptions.enableGpu) {
      args.push("--gpu");
    }
    const ghproxy = installOptions.ghproxy.trim();
    if (enableGhproxy && ghproxy) {
      const finalUrl = normalizeOptionalServiceUrl(ghproxy);
      args.push(`--install-ghproxy`);
      args.push(finalUrl);
    }
    const installDir = installOptions.dir.trim();
    if (enableCustomDir && installDir) {
      args.push(`--install-dir`);
      args.push(installDir);
    }
    const serviceName = installOptions.serviceName.trim();
    if (enableCustomServiceName && serviceName) {
      args.push(`--install-service-name`);
      args.push(serviceName);
    }
    const includeNics = installOptions.includeNics.trim();
    if (enableIncludeNics && includeNics) {
      args.push(`--include-nics`);
      args.push(includeNics);
    }
    const excludeNics = installOptions.excludeNics.trim();
    if (enableExcludeNics && excludeNics) {
      args.push(`--exclude-nics`);
      args.push(excludeNics);
    }
    const includeMountpoints = installOptions.includeMountpoints.trim();
    if (enableIncludeMountpoints && includeMountpoints) {
      args.push(`--include-mountpoint`);
      args.push(includeMountpoints);
    }
    if (enableInterval) {
      const intervalVal = Number.parseFloat(
        (installOptions.interval || "").trim()
      );
      args.push("-i");
      args.push(
        Number.isFinite(intervalVal) && intervalVal >= 1
          ? String(intervalVal)
          : "1"
      );
    }
    if (enableMonthRotate) {
      const rotateVal = (installOptions.monthRotate || "").trim() || "1";
      args.push(`--month-rotate`);
      args.push(rotateVal);
    }

    let scriptFile: "install.sh" | "install.ps1" = "install.sh";
    if (selectedPlatform === "windows") {
      scriptFile = "install.ps1";
    }
    const scriptUrl = liteAgentInstallScriptUrl(
      scriptFile,
      enableGhproxy ? ghproxy : "",
    );

    let finalCommand = "";
    switch (selectedPlatform) {
      case "linux":
        finalCommand =
          `wget -qO- ${quoteShellArg(scriptUrl)} | sudo bash -s -- ` +
          quoteShellArgs(args);
        break;
      case "windows":
        finalCommand =
          `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ` +
          `"iwr ${quotePowerShellArg(scriptUrl)}` +
          ` -UseBasicParsing -OutFile 'install.ps1'; &` +
          ` '.\\install.ps1'`;
        args.forEach((arg) => {
          finalCommand += ` ${quotePowerShellArg(arg)}`;
        });
        finalCommand += `"`;
        break;
      case "macos":
        finalCommand =
          `zsh <(curl -sL ${quoteShellArg(scriptUrl)}) ` +
          quoteShellArgs(args);
        break;
      case "docker": {
        // Docker 运行时不支持安装脚本专用参数，剔除它们及其取值
        const installOnlyFlags = [
          "--install-ghproxy",
          "--install-dir",
          "--install-service-name",
        ];
        const dockerArgs: string[] = [];
        for (let i = 0; i < args.length; i++) {
          if (installOnlyFlags.includes(args[i])) {
            i++; // 跳过该标志的取值
            continue;
          }
          dockerArgs.push(args[i]);
        }
        // 自动发现会在 /app/auto-discovery.json 写入注册得到的 uuid/token，
        // 通过 bind mount 持久化该文件，容器更新重建后复用同一身份，避免重复注册。
        // 注意：文件挂载要求宿主机上文件已存在，否则 Docker 会将其创建为目录。
        finalCommand =
          `touch .lite-auto-discovery.json && ` +
          `docker run -d --name lite-agent --restart=always ` +
          `-v .lite-auto-discovery.json:/app/auto-discovery.json ` +
          `${LITE_AGENT_DOCKER_IMAGE} ` +
          quoteShellArgs(dockerArgs);
        break;
      }
    }
    return finalCommand;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await writeClipboardText(text);
      toast.success(t("copy_success", "已复制到剪贴板"));
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" mt="4" py="4">
        <Loading inline text="" />
      </Flex>
    );
  }

  if (!enabled) {
    return (
      <Callout.Root color="blue" mt="4" size="1">
        <Callout.Icon>
          <Radar size={16} />
        </Callout.Icon>
        <Callout.Text>
          <Flex direction="column" gap="2" align="start">
            <Text weight="bold">
              {t("admin.nodeTable.autoDiscovery.tryIt", "试试自动发现")}
            </Text>
            <Text size="2">
              {t(
                "admin.nodeTable.autoDiscovery.disabledDescription",
                "开启自动发现后，无需逐台手动添加节点。只要在目标服务器上运行一条命令，Agent 就会携带密钥自动注册并上线，非常适合批量部署多台服务器。"
              )}
            </Text>
            <Link to="/admin/settings/general">
              <Button variant="soft" size="1">
                <Settings size={14} />
                {t(
                  "admin.nodeTable.autoDiscovery.goToSettings",
                  "前往“通用设置”开启自动发现"
                )}
              </Button>
            </Link>
          </Flex>
        </Callout.Text>
      </Callout.Root>
    );
  }

  return (
    <Flex direction="column" gap="3" mt="4">
      <Flex direction="column" gap="1">
        <Flex gap="2" align="center">
          <Radar size={16} />
          <Text weight="bold">
            {t("admin.nodeTable.autoDiscovery.title", "自动发现")}
          </Text>
        </Flex>
        <Text size="2" color="gray">
          {t(
            "admin.nodeTable.autoDiscovery.enabledDescription",
            "在目标服务器上运行下面的命令，Agent 将自动注册并上线，无需手动添加节点。"
          )}
        </Text>
      </Flex>

      <InstallPlatformToggle
        className="admin-install-platforms"
        value={selectedPlatform}
        onChange={setSelectedPlatform}
      />

      <Flex gap="2" align="center">
        <Checkbox
          checked={showOptions}
          onCheckedChange={(checked) => setShowOptions(Boolean(checked))}
        />
        <label
          className="text-sm font-bold cursor-pointer"
          onClick={() => setShowOptions((prev) => !prev)}
        >
          {t("admin.nodeTable.installOptions", "安装选项")}
        </label>
      </Flex>

      {showOptions && (
        <Flex direction="column" gap="2">
          <div className="admin-install-options-grid grid grid-cols-2 gap-2">
            <Flex gap="2" align="center">
              <Checkbox
                checked={installOptions.enableRemoteControl}
                onCheckedChange={(checked) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    enableRemoteControl: Boolean(checked),
                  }))
                }
              />
              <label
                className="text-sm font-normal cursor-pointer"
                title={t("admin.nodeTable.enableRemoteControlHint")}
                onClick={() =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    enableRemoteControl: !prev.enableRemoteControl,
                  }))
                }
              >
                {t("admin.nodeTable.enableRemoteControl")}
              </label>
            </Flex>
            <Flex gap="2" align="center">
              <Checkbox
                checked={installOptions.disableAutoUpdate}
                onCheckedChange={(checked) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    disableAutoUpdate: Boolean(checked),
                  }))
                }
              />
              <label
                className="text-sm font-normal cursor-pointer"
                onClick={() =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    disableAutoUpdate: !prev.disableAutoUpdate,
                  }))
                }
              >
                {t("admin.nodeTable.disableAutoUpdate", "禁用自动更新")}
              </label>
            </Flex>
            <Flex gap="2" align="center">
              <Checkbox
                checked={installOptions.ignoreUnsafeCert}
                onCheckedChange={(checked) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    ignoreUnsafeCert: Boolean(checked),
                  }))
                }
              />
              <label
                className="text-sm font-normal cursor-pointer"
                onClick={() =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    ignoreUnsafeCert: !prev.ignoreUnsafeCert,
                  }))
                }
              >
                {t("admin.nodeTable.ignoreUnsafeCert", "忽略不安全证书")}
              </label>
            </Flex>
            <Flex gap="2" align="center">
              <Checkbox
                checked={installOptions.memoryIncludeCache}
                onCheckedChange={(checked) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    memoryIncludeCache: Boolean(checked),
                  }))
                }
              />
              <label
                className="text-sm font-normal cursor-pointer"
                onClick={() =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    memoryIncludeCache: !prev.memoryIncludeCache,
                  }))
                }
              >
                {t("admin.nodeTable.memoryModeAvailable", "监测可用内存")}
              </label>
              <Tips size="14">
                {t("admin.nodeTable.memoryModeAvailable_tip")}
              </Tips>
            </Flex>
            <Flex gap="2" align="center">
              <Checkbox
                checked={installOptions.getIpAddrFromNic}
                onCheckedChange={(checked) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    getIpAddrFromNic: Boolean(checked),
                  }))
                }
              />
              <label
                className="text-sm font-normal cursor-pointer"
                onClick={() =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    getIpAddrFromNic: !prev.getIpAddrFromNic,
                  }))
                }
              >
                {t("admin.nodeTable.getIpAddrFromNic", "从网卡获取 IP 地址")}
              </label>
            </Flex>
            <Flex gap="2" align="center">
              <Checkbox
                checked={installOptions.enableGpu}
                onCheckedChange={(checked) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    enableGpu: Boolean(checked),
                  }))
                }
              />
              <label
                className="text-sm font-normal cursor-pointer"
                onClick={() =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    enableGpu: !prev.enableGpu,
                  }))
                }
              >
                {t("admin.nodeTable.enableGpuMonitoring", "启用详细 GPU 监控")}
              </label>
            </Flex>
          </div>

          <Flex direction="column" gap="2" className="[&_label]:font-normal">
            <Flex gap="2" align="center">
              <Checkbox
                checked={enableGhproxy}
                onCheckedChange={(checked) => {
                  setEnableGhproxy(Boolean(checked));
                  if (!checked) {
                    setInstallOptions((prev) => ({ ...prev, ghproxy: "" }));
                  }
                }}
              />
              <label
                className="text-sm font-bold cursor-pointer"
                onClick={() => {
                  setEnableGhproxy(!enableGhproxy);
                  if (enableGhproxy) {
                    setInstallOptions((prev) => ({ ...prev, ghproxy: "" }));
                  }
                }}
              >
                {t("admin.nodeTable.ghproxy", "GitHub 代理")}
              </label>
            </Flex>
            {enableGhproxy && (
              <TextField.Root
                placeholder="https://ghfast.top/"
                value={installOptions.ghproxy}
                onChange={(e) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    ghproxy: e.target.value,
                  }))
                }
              />
            )}

            <Flex gap="2" align="center">
              <Checkbox
                checked={enableCustomDir}
                onCheckedChange={(checked) => {
                  setEnableCustomDir(Boolean(checked));
                  if (!checked) {
                    setInstallOptions((prev) => ({ ...prev, dir: "" }));
                  }
                }}
              />
              <label
                className="text-sm font-bold cursor-pointer"
                onClick={() => {
                  setEnableCustomDir(!enableCustomDir);
                  if (enableCustomDir) {
                    setInstallOptions((prev) => ({ ...prev, dir: "" }));
                  }
                }}
              >
                {t("admin.nodeTable.install_dir", "安装目录")}
              </label>
            </Flex>
            {enableCustomDir && (
              <TextField.Root
                placeholder={t(
                  "admin.nodeTable.install_dir_placeholder",
                  "安装目录，为空则使用默认目录(/opt/lite-agent)"
                )}
                value={installOptions.dir}
                onChange={(e) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    dir: e.target.value,
                  }))
                }
              />
            )}

            <Flex gap="2" align="center">
              <Checkbox
                checked={enableCustomServiceName}
                onCheckedChange={(checked) => {
                  setEnableCustomServiceName(Boolean(checked));
                  if (!checked) {
                    setInstallOptions((prev) => ({ ...prev, serviceName: "" }));
                  }
                }}
              />
              <label
                className="text-sm font-bold cursor-pointer"
                onClick={() => {
                  setEnableCustomServiceName(!enableCustomServiceName);
                  if (enableCustomServiceName) {
                    setInstallOptions((prev) => ({ ...prev, serviceName: "" }));
                  }
                }}
              >
                {t("admin.nodeTable.serviceName", "服务名称")}
              </label>
            </Flex>
            {enableCustomServiceName && (
              <TextField.Root
                placeholder={t(
                  "admin.nodeTable.serviceName_placeholder",
                  "服务名称，为空则使用默认名称(lite-agent)"
                )}
                value={installOptions.serviceName}
                onChange={(e) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    serviceName: e.target.value,
                  }))
                }
              />
            )}

            <Flex gap="2" align="center">
              <Checkbox
                checked={enableIncludeNics}
                onCheckedChange={(checked) => {
                  setEnableIncludeNics(Boolean(checked));
                  if (!checked) {
                    setInstallOptions((prev) => ({ ...prev, includeNics: "" }));
                  }
                }}
              />
              <label
                className="text-sm font-bold cursor-pointer"
                onClick={() => {
                  setEnableIncludeNics(!enableIncludeNics);
                  if (enableIncludeNics) {
                    setInstallOptions((prev) => ({ ...prev, includeNics: "" }));
                  }
                }}
              >
                {t("admin.nodeTable.includeNics", "只监测特定网卡")}
              </label>
            </Flex>
            {enableIncludeNics && (
              <TextField.Root
                placeholder="eth0,eth1"
                value={installOptions.includeNics}
                onChange={(e) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    includeNics: e.target.value,
                  }))
                }
              />
            )}

            <Flex gap="2" align="center">
              <Checkbox
                checked={enableExcludeNics}
                onCheckedChange={(checked) => {
                  setEnableExcludeNics(Boolean(checked));
                  if (!checked) {
                    setInstallOptions((prev) => ({ ...prev, excludeNics: "" }));
                  }
                }}
              />
              <label
                className="text-sm font-bold cursor-pointer"
                onClick={() => {
                  setEnableExcludeNics(!enableExcludeNics);
                  if (enableExcludeNics) {
                    setInstallOptions((prev) => ({ ...prev, excludeNics: "" }));
                  }
                }}
              >
                {t("admin.nodeTable.excludeNics", "排除特定网卡")}
              </label>
            </Flex>
            {enableExcludeNics && (
              <TextField.Root
                placeholder="lo"
                value={installOptions.excludeNics}
                onChange={(e) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    excludeNics: e.target.value,
                  }))
                }
              />
            )}

            <Flex gap="2" align="center">
              <Checkbox
                checked={enableIncludeMountpoints}
                onCheckedChange={(checked) => {
                  setEnableIncludeMountpoints(Boolean(checked));
                  if (!checked) {
                    setInstallOptions((prev) => ({
                      ...prev,
                      includeMountpoints: "",
                    }));
                  }
                }}
              />
              <label
                className="text-sm font-bold cursor-pointer"
                onClick={() => {
                  setEnableIncludeMountpoints(!enableIncludeMountpoints);
                  if (enableIncludeMountpoints) {
                    setInstallOptions((prev) => ({
                      ...prev,
                      includeMountpoints: "",
                    }));
                  }
                }}
              >
                {t("admin.nodeTable.includeMountpoints", "只监测特定挂载点")}
              </label>
            </Flex>
            {enableIncludeMountpoints && (
              <TextField.Root
                placeholder="/;/home;/var"
                value={installOptions.includeMountpoints}
                onChange={(e) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    includeMountpoints: e.target.value,
                  }))
                }
              />
            )}

            <Flex gap="2" align="center">
              <Checkbox
                checked={enableInterval}
                onCheckedChange={(checked) => {
                  const en = Boolean(checked);
                  setEnableInterval(en);
                  setInstallOptions((prev) => ({
                    ...prev,
                    interval: en
                      ? prev.interval?.trim()
                        ? prev.interval
                        : "1"
                      : "",
                  }));
                }}
              />
              <label
                className="text-sm font-bold cursor-pointer"
                onClick={() => {
                  const willEnable = !enableInterval;
                  setEnableInterval(willEnable);
                  setInstallOptions((prev) => ({
                    ...prev,
                    interval: willEnable
                      ? prev.interval?.trim()
                        ? prev.interval
                        : "1"
                      : "",
                  }));
                }}
              >
                {t("admin.nodeTable.interval", "采集间隔(秒)")}
              </label>
            </Flex>
            {enableInterval && (
              <TextField.Root
                placeholder="1"
                type="number"
                min="1"
                step="0.1"
                value={installOptions.interval}
                onChange={(e) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    interval: e.target.value,
                  }))
                }
              />
            )}

            <Flex gap="2" align="center">
              <Checkbox
                checked={enableMonthRotate}
                onCheckedChange={(checked) => {
                  const en = Boolean(checked);
                  setEnableMonthRotate(en);
                  setInstallOptions((prev) => ({
                    ...prev,
                    monthRotate: en
                      ? prev.monthRotate?.trim()
                        ? prev.monthRotate
                        : "1"
                      : "",
                  }));
                }}
              />
              <label
                className="text-sm font-bold cursor-pointer"
                onClick={() => {
                  const willEnable = !enableMonthRotate;
                  setEnableMonthRotate(willEnable);
                  setInstallOptions((prev) => ({
                    ...prev,
                    monthRotate: willEnable
                      ? prev.monthRotate?.trim()
                        ? prev.monthRotate
                        : "1"
                      : "",
                  }));
                }}
              >
                {t("admin.nodeTable.monthRotate", "流量重置日")}
              </label>
            </Flex>
            {enableMonthRotate && (
              <TextField.Root
                placeholder="1"
                value={installOptions.monthRotate}
                onChange={(e) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    monthRotate: e.target.value,
                  }))
                }
              />
            )}
          </Flex>
        </Flex>
      )}

      <Flex direction="column" gap="2">
        <label className="text-sm font-bold">
          {t("admin.nodeTable.generatedCommand", "指令")}
        </label>
        <TextArea
          disabled
          className="w-full"
          style={{ minHeight: "80px" }}
          value={generateCommand()}
        />
      </Flex>
      <Button
        style={{ width: "100%" }}
        onClick={() => copyToClipboard(generateCommand())}
      >
        <Copy size={16} />
        {t("copy")}
      </Button>
    </Flex>
  );
};

const Header = ({
  settings,
  settingsLoading,
}: {
  settings: any;
  settingsLoading: boolean;
}) => {
  const { t } = useTranslation();
  const { refresh } = useNodeDetails();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const handleAddNode = async (name: string | undefined) => {
    setDialogOpen(true);
    setLoading(true);
    try {
      await fetch("/api/admin/client/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || "" }),
      });
      refresh();
    } catch (error) {
      toast.error(
        `${t("common.error", "Error")}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setLoading(false);
      setDialogOpen(false);
    }
  };
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <AdminPageTitle
        description={t(
          "admin.nodeTable.description",
          "集中查看节点连接、网络、分组、备注与账单信息，拖动可调整全局显示顺序。",
        )}
      >
        {t("admin.nodeTable.nodeList")}
      </AdminPageTitle>
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Trigger asChild>
          <MuiButton
            variant="contained"
            startIcon={<Plus size={16} />}
            className="shrink-0"
            sx={ADMIN_LIST_ACTION_SX}
            onClick={() => setDialogOpen(true)}
          >
            {t("admin.nodeTable.addNode")}
          </MuiButton>
        </Dialog.Trigger>
        <AppDialogContent>
          <Dialog.Title>{t("admin.nodeTable.addNode")}</Dialog.Title>
          <TextField.Root
            ref={inputRef}
            placeholder={t("admin.nodeTable.nameOptional")}
          />
          <Flex justify="end" gap="2" mt="4">
            <Button
              onClick={() => handleAddNode(inputRef.current?.value)}
              disabled={loading}
            >
              {t("admin.nodeTable.addNode")}
            </Button>
          </Flex>
          <AutoDiscoverySection
            settings={settings}
            loading={settingsLoading}
          />
        </AppDialogContent>
      </Dialog.Root>
    </div>
  );
};

const compactIPv6 = (value: string) => {
  if (value.length <= 22) return value;
  const segments = value.split(":");
  return segments.length > 3
    ? `${segments.slice(0, 2).join(":")}:...${segments[segments.length - 1]}`
    : value;
};

function nodeNetworkAddresses(node: NodeDetail) {
  return (
    [
      ["IPv4", node.ipv4?.trim()],
      ["IPv6", node.ipv6?.trim()],
    ] as const
  ).filter(
    (entry): entry is readonly ["IPv4" | "IPv6", string] => Boolean(entry[1]),
  );
}

function nodeBillingTagsNeedStack(root: HTMLElement) {
  const groups = root.querySelectorAll<HTMLElement>(".admin-node-billing-tags");
  for (const group of groups) {
    const badges = Array.from(group.children) as HTMLElement[];
    if (badges.length < 2) continue;
    const cell = group.closest("td");
    const box = cell ?? group;
    if (box.clientWidth <= 0) continue;
    const cellStyle = getComputedStyle(box);
    const available =
      box.clientWidth -
      (Number.parseFloat(cellStyle.paddingLeft) || 0) -
      (Number.parseFloat(cellStyle.paddingRight) || 0);
    const gap =
      Number.parseFloat(getComputedStyle(group).columnGap || getComputedStyle(group).gap) ||
      0;
    let needed = 0;
    for (let i = 0; i < badges.length; i += 1) {
      needed += Math.max(badges[i].scrollWidth, badges[i].offsetWidth);
      if (i > 0) needed += gap;
    }
    if (needed > available + 0.5) return true;
  }
  return false;
}

function nodeDeploymentStatusPresentation(
  status: string | undefined | null,
  t: TFunction,
) {
  switch (status) {
    case "saved":
      return {
        label: t("admin.nodeTable.deliverySaved", "已保存"),
        color: "blue" as const,
      };
    case "sent":
      return {
        label: t("admin.nodeTable.deliverySent", "已发送"),
        color: "orange" as const,
      };
    case "applied":
      return {
        label: t("admin.nodeTable.deliveryApplied", "已生效"),
        color: "green" as const,
      };
    case "failed":
      return {
        label: t("admin.nodeTable.deliveryFailed", "应用失败"),
        color: "red" as const,
      };
    default:
      return null;
  }
}

const SortableRow = React.memo(({
  node,
  settings,
  online,
  reorderEnabled,
}: {
  node: NodeDetail;
  settings: any;
  online: boolean | null;
  reorderEnabled: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: node.uuid, disabled: !reorderEnabled });
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderColor: "var(--gray-a5)",
  };
  async function copy(text: string) {
    try {
      await writeClipboardText(text);
      toast.success(t("copy_success"));
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  }
  const networkAddresses = nodeNetworkAddresses(node);
  const deploymentStatusPresentation = nodeDeploymentStatusPresentation(
    node.deployment_status,
    t,
  );
  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className="text-sm hover:bg-[var(--accent-a2)] [&>td]:align-middle [&>td]:py-2.5"
      data-node-status={online === null ? "pending" : online ? "online" : "offline"}
    >
      <TableCell className="w-[44px] px-2 !align-middle" data-label={t("common.sort", "排序")}>
        <div className="flex items-center">
          <button
            type="button"
            {...attributes}
            {...listeners}
            disabled={!reorderEnabled}
            className={`inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[var(--gray-9)] transition-colors ${
              reorderEnabled
                ? "cursor-grab hover:bg-[var(--accent-a3)] hover:text-[var(--accent-11)] active:cursor-grabbing"
                : "cursor-not-allowed opacity-40"
            } ${isMobile ? "touch-manipulation select-none" : ""}`}
            style={{ touchAction: "none" }}
            title={
              reorderEnabled
                ? t("admin.nodeTable.dragToReorder", "长按拖拽重新排序")
                : t("admin.nodeTable.clearFilterToReorder", "清除搜索和筛选后可调整顺序")
            }
            aria-label={t("admin.nodeTable.dragToReorder", "长按拖拽重新排序")}
          >
            <GripVertical size={isMobile ? 18 : 16} />
          </button>
        </div>
      </TableCell>
      <TableCell
        className="overflow-hidden !align-middle"
        data-label={t("admin.nodeTable.name")}
        title={node.name}
      >
        <NodeNameLink node={node} online={online} />
      </TableCell>
      <TableCell className="!align-middle" data-label={t("admin.nodeTable.network", "网络")}>
        <div className="flex min-w-0 flex-col justify-center text-sm leading-[1.125rem] text-muted-foreground">
          {networkAddresses.length > 0 ? networkAddresses.map(([type, address]) => (
            <div key={type} className="flex min-w-0 items-center gap-1" title={address}>
              <span className="whitespace-nowrap tabular-nums">
                {type} {type === "IPv6" ? compactIPv6(address) : address}
              </span>
              <button
                type="button"
                className="inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-[var(--accent-a3)] hover:text-[var(--accent-11)]"
                onClick={() => copy(address)}
                aria-label={t("copy", "复制")}
                title={t("copy", "复制")}
              >
                <Copy size={13} />
              </button>
            </div>
          )) : <span className="tabular-nums">--</span>}
        </div>
      </TableCell>
      <TableCell className="!align-middle" data-label={t("admin.nodeTable.agent", "Agent")}>
        <div className="admin-node-agent-cell flex min-w-0 flex-col items-center justify-center gap-0.5 text-center leading-none">
          <span className="block max-w-full truncate text-sm leading-5 text-muted-foreground" title={publicVersion(node.version) || "--"}>
            {publicVersion(node.version) || "--"}
          </span>
          {deploymentStatusPresentation ? (
            <Badge
              color={deploymentStatusPresentation.color}
              size="1"
              variant="soft"
              className="text-sm"
            >
              <label className="text-xs" title={deploymentStatusPresentation.label}>
                {deploymentStatusPresentation.label}
              </label>
            </Badge>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="!align-middle min-w-0 overflow-hidden" data-label={t("common.group", "分组")}>
        <span className="admin-cell-clip text-sm font-normal text-muted-foreground" title={node.group || ""}>
          {node.group || "--"}
        </span>
      </TableCell>
      <TableCell className="!align-middle min-w-0 overflow-hidden" data-label={t("common.remark", "备注")}>
        <span className="admin-cell-clip text-sm text-muted-foreground" title={node.remark || ""}>
          {node.remark || "--"}
        </span>
      </TableCell>
      <TableCell className="!align-middle min-w-0 whitespace-normal" data-label={t("admin.nodeTable.billing")}>
        {Number(node.price) === 0 ? (
          <span className="text-sm text-muted-foreground">--</span>
        ) : (
          <PriceTags
            className="admin-node-billing-tags [&_label]:!text-xs"
            direction="row"
            wrap="nowrap"
            price={node.price}
            billing_cycle={node.billing_cycle}
            expired_at={node.expired_at}
            currency={node.currency}
          />
        )}
      </TableCell>
      <TableCell className="!align-middle min-w-0 overflow-hidden" data-label={t("admin.nodeTable.tags", "标签")}>
        {(node.tags || "").trim() ? (
          <div className="admin-cell-clip-row" title={node.tags || ""}>
            <CustomTags tags={node.tags || ""} />
          </div>
        ) : (
          <span className="admin-cell-clip text-sm text-muted-foreground">--</span>
        )}
      </TableCell>
      <TableCell className="!align-middle" data-label={t("common.action", "操作")}>
        <ActionButtons node={node} settings={settings} />
      </TableCell>
    </TableRow>
  );
});
SortableRow.displayName = "SortableRow";

const SortableMobileCard = React.memo(function SortableMobileCard({
  node,
  settings,
  online,
  reorderEnabled,
}: {
  node: NodeDetail;
  settings: any;
  online: boolean | null;
  reorderEnabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: node.uuid, disabled: !reorderEnabled });
  const { t } = useTranslation();
  const networkAddresses = nodeNetworkAddresses(node);
  const deploymentStatusPresentation = nodeDeploymentStatusPresentation(
    node.deployment_status,
    t,
  );
  const networkValue =
    networkAddresses.length > 0 ? (
      <Stack spacing={0.25} sx={{ minWidth: 0 }}>
        {networkAddresses.map(([type, address]) => (
          <Typography
            key={type}
            sx={{
              fontSize: 13.5,
              fontWeight: 400,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={address}
          >
            {type} {type === "IPv6" ? compactIPv6(address) : address}
          </Typography>
        ))}
      </Stack>
    ) : (
      "--"
    );
  const billingValue =
    Number(node.price) === 0 ? (
      "--"
    ) : (
      <PriceTags
        className="[&_label]:!text-xs"
        direction="row"
        wrap="nowrap"
        price={node.price}
        billing_cycle={node.billing_cycle}
        expired_at={node.expired_at}
        currency={node.currency}
      />
    );
  const cells: Array<[string, React.ReactNode]> = [
    [t("admin.nodeTable.network", "网络"), networkValue],
    [
      t("admin.nodeTable.agent", "Agent"),
      <Stack key="agent" spacing={0.4} sx={{ minWidth: 0, alignItems: "flex-start" }}>
        <Typography
          sx={{
            fontSize: 13.5,
            fontWeight: 400,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            width: "100%",
          }}
          title={publicVersion(node.version) || "--"}
        >
          {publicVersion(node.version) || "--"}
        </Typography>
        {deploymentStatusPresentation ? (
          <Badge
            color={deploymentStatusPresentation.color}
            size="1"
            variant="soft"
            className="text-sm"
          >
            <label className="text-xs" title={deploymentStatusPresentation.label}>
              {deploymentStatusPresentation.label}
            </label>
          </Badge>
        ) : null}
      </Stack>,
    ],
    [t("common.group", "分组"), node.group || "--"],
    [t("common.remark", "备注"), node.remark || "--"],
    [t("admin.nodeTable.billing"), billingValue],
    [
      t("admin.nodeTable.tags", "标签"),
      (node.tags || "").trim() ? (
        <Flex gap="1" wrap="wrap">
          <CustomTags tags={node.tags || ""} />
        </Flex>
      ) : (
        "--"
      ),
    ],
  ];

  return (
    <AdminMobileListCard
      ref={setNodeRef}
      sx={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      title={<NodeNameLink node={node} online={online} />}
      headerExtra={
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={!reorderEnabled}
          className={`inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[var(--gray-9)] ${
            reorderEnabled
              ? "cursor-grab hover:bg-[var(--accent-a3)] hover:text-[var(--accent-11)] active:cursor-grabbing"
              : "cursor-not-allowed opacity-40"
          } touch-manipulation select-none`}
          style={{ touchAction: "none" }}
          title={
            reorderEnabled
              ? t("admin.nodeTable.dragToReorder", "长按拖拽重新排序")
              : t("admin.nodeTable.clearFilterToReorder", "清除搜索和筛选后可调整顺序")
          }
          aria-label={t("admin.nodeTable.dragToReorder", "长按拖拽重新排序")}
        >
          <GripVertical size={18} />
        </button>
      }
      cells={cells}
      actions={<ActionButtons node={node} settings={settings} />}
    />
  );
});

const NodeTable = ({
  nodes,
  settings,
  onlineSet,
  available,
  reorderEnabled,
}: {
  nodes: NodeDetail[];
  settings: any;
  onlineSet: ReadonlySet<string>;
  available: boolean;
  reorderEnabled: boolean;
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const sensors = useSensors(
    useSensor(MouseSensor, {
      // 需要按住 10px 距离才开始拖拽，避免与点击冲突
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      // 移动端需要按住 5px 距离才开始拖拽，并且延迟 200ms，避免与滚动冲突
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {})
  );
  // 添加 localNodes 状态，实现即时 UI 更新
  const [localNodes, setLocalNodes] = useState<NodeDetail[]>(nodes);
  const [isDragging, setIsDragging] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const defaultPageSize = useAdminDefaultPageSize();
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const pageSizeCustomized = React.useRef(false);
  const totalPages = Math.max(
    1,
    Math.ceil(localNodes.length / pageSize),
  );
  const visiblePage = Math.min(currentPage, totalPages);
  const pageStart = (visiblePage - 1) * pageSize;
  const visibleNodes = localNodes.slice(
    pageStart,
    pageStart + pageSize,
  );
  const tableWrapRef = React.useRef<HTMLDivElement>(null);
  const [billingStack, setBillingStack] = useState(false);
  const billingLayoutKey = visibleNodes
    .map(
      (node) =>
        `${node.uuid}:${node.price}:${node.billing_cycle}:${node.expired_at}:${node.currency}`,
    )
    .join("|");

  React.useLayoutEffect(() => {
    if (isMobile) return;
    const root = tableWrapRef.current;
    if (!root) return;
    const update = () => {
      setBillingStack(nodeBillingTagsNeedStack(root));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(root);
    const table = root.querySelector("table");
    if (table) observer.observe(table);
    void document.fonts?.ready.then(update);
    return () => observer.disconnect();
  }, [isMobile, billingLayoutKey]);

  React.useEffect(() => {
    setLocalNodes(nodes);
  }, [nodes]);
  React.useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);
  React.useEffect(() => {
    if (pageSizeCustomized.current) return;
    setPageSize(defaultPageSize);
    setCurrentPage(1);
  }, [defaultPageSize]);
  const handleDragStart = () => {
    if (!reorderEnabled) return;
    setIsDragging(true);
    if ("vibrate" in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleDragEnd = async (event: any) => {
    setIsDragging(false);
    if (!reorderEnabled) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localNodes.findIndex((node) => node.uuid === active.id);
    if (oldIndex < 0) return;

    let newIndex = localNodes.findIndex((node) => node.uuid === over.id);
    let destinationPage = visiblePage;
    if (over.id === PREVIOUS_PAGE_DROP_ID && visiblePage > 1) {
      destinationPage = visiblePage - 1;
      newIndex = destinationPage * pageSize - 1;
    } else if (over.id === NEXT_PAGE_DROP_ID && visiblePage < totalPages) {
      destinationPage = visiblePage + 1;
      newIndex = (destinationPage - 1) * pageSize;
    }
    if (newIndex < 0) return;

    const reorderedNodes = Array.from(localNodes);
    const [reorderedItem] = reorderedNodes.splice(oldIndex, 1);
    reorderedNodes.splice(Math.min(newIndex, reorderedNodes.length), 0, reorderedItem);

    // 立即更新 UI
    setLocalNodes(reorderedNodes);
    setCurrentPage(destinationPage);

    if ("vibrate" in navigator) {
      navigator.vibrate([30, 10, 30]);
    }

    try {
      const orderData = reorderedNodes.reduce((acc, node, index) => {
        acc[node.uuid] = index;
        return acc;
      }, {} as Record<string, number>);

      await fetch("/api/admin/client/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      // 不再调用 refresh，以免覆盖本地排序
    } catch {
      toast.error(t("admin.nodeTable.errorRefreshNodeList"));
    }
  };

  return (
    <div
      className={`admin-responsive-table-wrap overflow-x-auto overflow-y-hidden ${
        isDragging ? "select-none" : ""
      }`}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setIsDragging(false)}
      >
        {isMobile ? (
          <SortableContext
            items={visibleNodes.map((node) => node.uuid)}
            strategy={verticalListSortingStrategy}
          >
            <AdminMobileCardStack>
              {visibleNodes.map((node) => (
                <SortableMobileCard
                  key={node.uuid}
                  node={node}
                  settings={settings}
                  online={nodeOnlineState(available, onlineSet, node.uuid)}
                  reorderEnabled={reorderEnabled}
                />
              ))}
            </AdminMobileCardStack>
          </SortableContext>
        ) : (
        <div ref={tableWrapRef}>
        <Table className={`admin-responsive-table admin-node-table min-w-[1136px] table-fixed text-sm${billingStack ? " admin-node-billing-stack" : ""}`}>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[44px]">
                <span className="sr-only">{t("common.sort", "排序")}</span>
              </TableHead>
              <TableHead className="w-[170px]">{t("admin.nodeTable.name")}</TableHead>
              <TableHead className="w-[170px]">
                {t("admin.nodeTable.network", "网络")}
              </TableHead>
              <TableHead className="w-[64px] text-center">
                {t("admin.nodeTable.agent", "Agent")}
              </TableHead>
              <TableHead className="w-[64px]">
                {t("common.group", "分组")}
              </TableHead>
              <TableHead className="w-[64px]">
                {t("common.remark", "备注")}
              </TableHead>
              <TableHead className="w-[80px]">{t("admin.nodeTable.billing")}</TableHead>
              <TableHead className="w-[116px]">
                {t("admin.nodeTable.tags", "标签")}
              </TableHead>
              <TableHead className="w-[272px]">{t("common.action", "操作")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <SortableContext
              items={visibleNodes.map((node) => node.uuid)}
              strategy={verticalListSortingStrategy}
            >
              {visibleNodes.map((node) => (
                <SortableRow
                  key={node.uuid}
                  node={node}
                  settings={settings}
                  online={nodeOnlineState(available, onlineSet, node.uuid)}
                  reorderEnabled={reorderEnabled}
                />
              ))}
            </SortableContext>
          </TableBody>
        </Table>
        </div>
        )}
      <AdminPagination
        page={visiblePage}
        total={localNodes.length}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        onPageSizeChange={(value) => {
          pageSizeCustomized.current = true;
          setPageSize(value);
          setCurrentPage(1);
        }}
        previousDropId={PREVIOUS_PAGE_DROP_ID}
        nextDropId={NEXT_PAGE_DROP_ID}
        dragging={isDragging}
        showSummary={false}
      />
      </DndContext>
    </div>
  );
};

type Platform = "linux" | "windows" | "macos" | "docker";

function InstallPlatformToggle({
  value,
  onChange,
  className,
}: {
  value: Platform;
  onChange: (value: Platform) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <ToggleButtonGroup
      className={className}
      exclusive
      size="small"
      value={value}
      aria-label={t("admin.nodeTable.deployPlatform", "部署平台")}
      onChange={(_event, next: Platform | null) => next && onChange(next)}
      sx={{
        "& .MuiToggleButton-root.Mui-selected": {
          bgcolor: "rgba(7, 141, 238, 0.12)",
          color: "#078dee",
          boxShadow: "inset 0 0 0 1px rgba(7, 141, 238, 0.48)",
          "&:hover": { bgcolor: "rgba(7, 141, 238, 0.12)" },
        },
      }}
    >
      <ToggleButton disableRipple value="linux">Linux</ToggleButton>
      <ToggleButton disableRipple value="windows">Windows</ToggleButton>
      <ToggleButton disableRipple value="macos">macOS</ToggleButton>
      <ToggleButton disableRipple value="docker">Docker</ToggleButton>
    </ToggleButtonGroup>
  );
}

type TrafficUsage = { up: number; down: number };
type SignedTrafficUsage = { up: number; down: number };
type TrafficCalibrationHistory = {
  calibration_id: string;
  target: TrafficUsage;
  adjustment: SignedTrafficUsage;
  operator?: string;
  created_at: string;
};
type TrafficCalibrationSnapshot = {
  client: string;
  cycle: string;
  cycle_start: string;
  cycle_end: string;
  raw: TrafficUsage;
  adjustment: SignedTrafficUsage;
  effective: TrafficUsage;
  history: TrafficCalibrationHistory[];
};

const trafficInputPattern = /^\s*(\d+(?:\.\d+)?)\s*(b|kb|kib|mb|mib|gb|gib|tb|tib|pb|pib)?\s*$/i;

function parseTrafficInput(value: string): number | null {
  if (!trafficInputPattern.test(value)) return null;
  const bytes = stringToBytes(value);
  if (!Number.isSafeInteger(bytes) || bytes < 0) return null;
  return bytes;
}

function formatSignedTraffic(value: number): string {
  if (value === 0) return formatBytes(0);
  return `${value > 0 ? "+" : "-"}${formatBytes(Math.abs(value))}`;
}

function formatTrafficCycleRange(snapshot: TrafficCalibrationSnapshot, language: string): string {
  const locale = language.replace("_", "-");
  const formatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Shanghai",
  });
  return `${formatter.format(new Date(snapshot.cycle_start))}-${formatter.format(new Date(snapshot.cycle_end))}`;
}

const ActionButtons = ({ node, settings }: { node: NodeDetail, settings: any }) => {
  const { t } = useTranslation();
  const { ensureEnabled } = useRemoteManagementGate();
  return (
    <div className="flex h-10 items-center justify-start gap-1 admin-node-actions max-md:w-full">
      <GenerateCommandButton node={node} settings={settings} />
      <IconButton
        title={t("terminal.title")}
        variant="ghost"
        onClick={() => {
          if (!ensureEnabled()) return;
          if (!openRemoteTerminal(node.uuid)) toast.error("浏览器阻止了远程管理窗口");
        }}
      >
        <Terminal size="18" />
      </IconButton>
      <EditButton node={node} />
      <BillingButton node={node} />
      <TrafficCalibrationButton node={node} />
      <DeleteButton node={node} />
    </div>
  );
};

function TrafficCalibrationButton({ node }: { node: NodeDetail }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState(true);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<TrafficCalibrationSnapshot | null>(null);
  const [targetUp, setTargetUp] = useState("");
  const [targetDown, setTargetDown] = useState("");
  const requestRef = React.useRef<AbortController | null>(null);

  useEffect(() => {
    return () => requestRef.current?.abort();
  }, []);

  const prepareCalibration = async () => {
    if (requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError("");
    setReason("");
    setAvailable(true);
    setSnapshot(null);
    try {
      const response = await fetch(`/api/admin/client/${node.uuid}/traffic-calibration`, {
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || `HTTP ${response.status}`);
      }
      const data = payload?.data;
      const nextAvailable = data?.available !== false;
      setAvailable(nextAvailable);
      setReason(data?.reason || "");
      if (nextAvailable && data?.snapshot) {
        const next = data.snapshot as TrafficCalibrationSnapshot;
        setSnapshot(next);
        setTargetUp(formatBytes(next.effective.up));
        setTargetDown(formatBytes(next.effective.down));
      }
      setOpen(true);
    } catch (cause: unknown) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : String(cause));
        setOpen(true);
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  };

  const saveCalibration = async () => {
    const up = parseTrafficInput(targetUp);
    const down = parseTrafficInput(targetDown);
    if (up === null || down === null) {
      setError(t("admin.nodeTable.trafficCalibration.invalidValue"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/client/${node.uuid}/traffic-calibration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_up: up,
          target_down: down,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || `HTTP ${response.status}`);
      }
      const next = payload?.data?.snapshot as TrafficCalibrationSnapshot | undefined;
      if (!next) throw new Error(t("admin.nodeTable.trafficCalibration.invalidResponse"));
      setSnapshot(next);
      setTargetUp(formatBytes(next.effective.up));
      setTargetDown(formatBytes(next.effective.down));
      toast.success(t("admin.nodeTable.trafficCalibration.saved"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const summaryItems = snapshot
    ? [
        [t("admin.nodeTable.trafficCalibration.raw"), snapshot.raw],
        [t("admin.nodeTable.trafficCalibration.adjustment"), snapshot.adjustment],
        [t("admin.nodeTable.trafficCalibration.effective"), snapshot.effective],
      ]
    : [];

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) void prepareCalibration();
        else setOpen(false);
      }}
    >
      <Dialog.Trigger>
        <IconButton
          variant="ghost"
          disabled={loading}
          title={t("admin.nodeTable.trafficCalibration.title")}
        >
          <Gauge size="18" className={loading ? "animate-pulse" : undefined} />
        </IconButton>
      </Dialog.Trigger>
      <AppDialogContent maxWidth="720px" className="max-h-[88vh] overflow-y-auto">
        <Dialog.Title>{t("admin.nodeTable.trafficCalibration.title")}</Dialog.Title>
        <Dialog.Description>
          <Trans
            i18nKey="admin.nodeTable.trafficCalibration.description"
            values={{ name: node.name }}
            components={{ strong: <strong className="font-semibold" /> }}
          />
        </Dialog.Description>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            {t("common.loading")}
          </div>
        ) : (
          <Flex direction="column" gap="4" mt="4">
            {!available && (
              <Callout.Root color="amber" role="alert">
                <Callout.Text>{reason || t("admin.nodeTable.trafficCalibration.resetDayRequired")}</Callout.Text>
              </Callout.Root>
            )}
            {error && (
              <Callout.Root color="red" role="alert">
                <Callout.Text>{error}</Callout.Text>
              </Callout.Root>
            )}

            {snapshot && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <Text size="2" color="gray">{t("admin.nodeTable.trafficCalibration.currentCycle")}</Text>
                  <Text size="2" weight="bold">
                    {formatTrafficCycleRange(snapshot, i18n.resolvedLanguage || i18n.language)}
                  </Text>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {summaryItems.map(([label, usage]) => {
                    const value = usage as TrafficUsage & SignedTrafficUsage;
                    const signed = label === t("admin.nodeTable.trafficCalibration.adjustment");
                    return (
                      <div key={label as string} className="min-w-0 border-l-2 border-[var(--accent-7)] pl-3">
                        <Text as="div" size="2" weight="bold">{label as string}</Text>
                        <Text as="div" size="2" color="gray" className="mt-1 break-words">
                          {t("admin.nodeTable.trafficCalibration.upload")}: {signed ? formatSignedTraffic(value.up) : formatBytes(value.up)}
                        </Text>
                        <Text as="div" size="2" color="gray" className="break-words">
                          {t("admin.nodeTable.trafficCalibration.download")}: {signed ? formatSignedTraffic(value.down) : formatBytes(value.down)}
                        </Text>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold">
                    {t("admin.nodeTable.trafficCalibration.targetUp")}
                    <TextField.Root value={targetUp} onChange={(event) => setTargetUp(event.target.value)} placeholder="10 GB" />
                  </label>
                  <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold">
                    {t("admin.nodeTable.trafficCalibration.targetDown")}
                    <TextField.Root value={targetDown} onChange={(event) => setTargetDown(event.target.value)} placeholder="10 GB" />
                  </label>
                </div>

                <Callout.Root color="blue" size="1">
                  <Callout.Text>{t("admin.nodeTable.trafficCalibration.syncNotice")}</Callout.Text>
                </Callout.Root>

                <div>
                  <Text as="div" size="2" weight="bold" mb="2">
                    {t("admin.nodeTable.trafficCalibration.history")}
                  </Text>
                  {snapshot.history?.length ? (
                    <div className="admin-responsive-table-wrap overflow-hidden rounded-md border border-[var(--gray-a5)]">
                      <Table container={false} className="admin-responsive-table min-w-[560px] text-left text-sm">
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("admin.nodeTable.trafficCalibration.time")}</TableHead>
                            <TableHead>{t("admin.nodeTable.trafficCalibration.targetUp")}</TableHead>
                            <TableHead>{t("admin.nodeTable.trafficCalibration.targetDown")}</TableHead>
                            <TableHead>{t("admin.nodeTable.trafficCalibration.change")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {snapshot.history.map((item) => (
                            <TableRow key={item.calibration_id}>
                              <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
                              <TableCell>{formatBytes(item.target.up)}</TableCell>
                              <TableCell>{formatBytes(item.target.down)}</TableCell>
                              <TableCell>↑ {formatSignedTraffic(item.adjustment.up)} / ↓ {formatSignedTraffic(item.adjustment.down)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <Text size="2" color="gray">{t("admin.nodeTable.trafficCalibration.noHistory")}</Text>
                  )}
                </div>
              </>
            )}

            <Flex gap="2" justify="end" wrap="wrap">
              <Dialog.Close>
                <Button variant="soft">{t("admin.nodeTable.cancel")}</Button>
              </Dialog.Close>
              <Button disabled={!snapshot || !available || saving} onClick={() => void saveCalibration()}>
                {saving ? t("common.loading") : t("admin.nodeTable.trafficCalibration.save")}
              </Button>
            </Flex>
          </Flex>
        )}
      </AppDialogContent>
    </Dialog.Root>
  );
}

export default NodeDetailsPage;
function DeleteButton({ node }: { node: NodeDetail }) {
  const { t } = useTranslation();
  const { refresh } = useNodeDetails();
  const [open, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const handleDelete = async () => {
    try {
      setDeleting(true);
      await fetch(`/api/admin/client/${node.uuid}/remove`, {
        method: "POST",
      });
      toast.success(`Delete ${node.name}`);
      setOpen(false);
      refresh();
    } catch (error) {
      toast.error(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setDeleting(false);
    }
  };
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <IconButton variant="ghost" color="red" title={t("delete")}>
          <Trash2Icon size="18" />
        </IconButton>
      </Dialog.Trigger>
      <AppDialogContent className="admin-install-dialog">
        <Dialog.Title>{t("delete")}</Dialog.Title>
        <Dialog.Description>
          <Text as="span" weight="bold">{node.name}</Text>{" "}
          {t("admin.nodeTable.confirmDeleteQuestion")}
        </Dialog.Description>
        <Flex justify="end" gap="2" mt="4">
          <Dialog.Close>
            <Button variant="soft">{t("admin.nodeTable.cancel")}</Button>
          </Dialog.Close>
          <Button disabled={deleting} color="red" onClick={handleDelete}>
            {t("admin.nodeTable.confirmDelete")}
          </Button>
        </Flex>
      </AppDialogContent>
    </Dialog.Root>
  );
}
type InstallOptions = {
  enableRemoteControl: boolean;
  disableAutoUpdate: boolean;
  ignoreUnsafeCert: boolean;
  memoryIncludeCache: boolean;
  getIpAddrFromNic: boolean;
  enableGpu: boolean;
  ghproxy: string;
  dir: string;
  serviceName: string;
  includeNics: string;
  excludeNics: string;
  includeMountpoints: string;
  interval: string;
  monthRotate: string;
};

type DeploymentProfilePayload = {
  platform: Platform;
  enable_remote_control: boolean;
  disable_auto_update: boolean;
  ignore_unsafe_cert: boolean;
  get_ip_addr_from_nic: boolean;
  memory_include_cache: boolean;
  enable_gpu: boolean;
  enable_ghproxy: boolean;
  ghproxy: string;
  enable_custom_dir: boolean;
  dir: string;
  enable_custom_service_name: boolean;
  service_name: string;
  enable_include_nics: boolean;
  include_nics: string;
  enable_exclude_nics: boolean;
  exclude_nics: string;
  enable_include_mountpoints: boolean;
  include_mountpoints: string;
  enable_interval: boolean;
  interval: number;
  enable_month_rotate: boolean;
  month_rotate: number;
};

type DeploymentProfileResponse = {
  profile: DeploymentProfilePayload;
  saved?: boolean;
  delivery?: "saved" | "sent" | "applied" | "failed" | "agent_upgrade_required";
  delivery_state?: DeploymentDeliveryState;
  runtime_changed?: boolean;
};

type DeploymentDeliveryState = {
  revision: number;
  status: "saved" | "sent" | "applied" | "failed";
  error?: string;
  saved_at?: string;
  updated_at?: string;
  sent_at?: string;
  finished_at?: string;
};

function GenerateCommandButton({ node, settings }: { node: NodeDetail, settings: any }) {
  const { t } = useTranslation();
  const { refresh } = useNodeDetails();
  const isMobile = useIsMobile();
  const configuredResetDay = Number(node.traffic_reset_day);
  const initialResetDay =
    Number.isInteger(configuredResetDay) &&
    configuredResetDay >= 1 &&
    configuredResetDay <= 31
      ? String(configuredResetDay)
      : "";
  const [selectedPlatform, setSelectedPlatform] =
    React.useState<Platform>("linux");
  const [installOptions, setInstallOptions] = React.useState<InstallOptions>({
    enableRemoteControl: false,
    disableAutoUpdate: false,
    ignoreUnsafeCert: false,
    memoryIncludeCache: false,
    getIpAddrFromNic: false,
    enableGpu: false,
    ghproxy: "",
    dir: "",
    serviceName: "",
    includeNics: "",
    excludeNics: "",
    includeMountpoints: "",
    interval: "",
    monthRotate: initialResetDay,
  });

  const [enableGhproxy, setEnableGhproxy] = React.useState(false);
  const [enableCustomDir, setEnableCustomDir] = React.useState(false);
  const [enableCustomServiceName, setEnableCustomServiceName] =
    React.useState(false);
  const [enableIncludeNics, setEnableIncludeNics] = React.useState(false);
  const [enableExcludeNics, setEnableExcludeNics] = React.useState(false);
  const [enableIncludeMountpoints, setEnableIncludeMountpoints] =
    React.useState(false);
  const [enableInterval, setEnableInterval] = React.useState(false);
  const [enableMonthRotate, setEnableMonthRotate] = React.useState(
    initialResetDay !== "",
  );
  const [open, setOpen] = React.useState(false);
  const [dialogTab, setDialogTab] = React.useState<"online" | "install">("online");
  const [loadingProfile, setLoadingProfile] = React.useState(false);
  const [profileAction, setProfileAction] = React.useState<"dispatch" | "copy" | null>(null);
  const [deliveryState, setDeliveryState] = React.useState<DeploymentDeliveryState>();
  const [copyFeedback, setCopyFeedback] = React.useState<{
    kind: "success" | "warning" | "error";
    message: string;
  }>();
  const tokenSessionRef = React.useRef<ReturnType<typeof createInstallTokenSession> | null>(null);
  if (!tokenSessionRef.current) {
    tokenSessionRef.current = createInstallTokenSession();
  }
  const tokenAbortControllerRef = tokenSessionRef.current.tokenAbortControllerRef;
  const [tokenState, setTokenState] = React.useState(tokenSessionRef.current.getSnapshot());
  const [otpInput, setOtpInput] = React.useState("");
  const commandTextAreaRef = React.useRef<HTMLTextAreaElement>(null);
  const otpFieldRef = React.useRef<HTMLInputElement>(null);
  const deliveryStatus = deliveryState?.status;
  const installToken = tokenState.token;
  const tokenLoading = tokenState.loading;
  const tokenError = tokenState.error
    ? t("admin.nodeTable.tokenLoadFailed", "读取节点 Token 失败")
    : null;
  const needTwoFactor = tokenState.twoFactorOpen;
  const otpSubmitting = tokenState.submitting;
  const copyBlocked = !installCommandCopyAllowed(tokenState);

  React.useEffect(() => tokenSessionRef.current?.subscribe(setTokenState), []);

  const cancelDeployTwoFactor = () => {
    tokenAbortControllerRef.current?.abort();
    tokenAbortControllerRef.current = null;
    tokenSessionRef.current?.cancelTwoFactor();
    setOtpInput("");
    setDialogTab("online");
  };

  React.useEffect(() => {
    const session = tokenSessionRef.current;
    if (!session) return;
    if (!open) {
      session.closeDialog();
      setOtpInput("");
      setDialogTab("online");
      return;
    }
    return () => {
      session.dispose();
      setOtpInput("");
    };
  }, [node.uuid, open]);

  React.useEffect(() => {
    if (!open || dialogTab !== "install") return;
    const session = tokenSessionRef.current;
    if (!session) return;
    const snapshot = session.getSnapshot();
    if (snapshot.token || snapshot.loading || snapshot.submitting || snapshot.twoFactorOpen) {
      return;
    }
    void session.beginDeployTokenFetch(node.uuid);
  }, [dialogTab, node.uuid, open]);

  React.useEffect(() => {
    if (!needTwoFactor || otpSubmitting) return;
    const timer = window.setTimeout(() => {
      otpFieldRef.current?.focus();
      if (tokenState.twoFactorInvalid) otpFieldRef.current?.select();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [needTwoFactor, otpSubmitting, tokenState.twoFactorInvalid]);

  React.useEffect(() => {
    if (installToken) setOtpInput("");
  }, [installToken]);

  React.useEffect(() => {
    setEnableMonthRotate(initialResetDay !== "");
    setInstallOptions((previous) => ({
      ...previous,
      monthRotate: initialResetDay,
    }));
  }, [node.uuid, initialResetDay]);

  React.useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoadingProfile(true);
    fetch(`/api/admin/client/${node.uuid}/deployment-profile`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error((await response.text()) || `HTTP ${response.status}`);
        }
        return response.json() as Promise<DeploymentProfileResponse>;
      })
      .then(({ profile, saved, delivery_state }) => {
        setSelectedPlatform(profile.platform || "linux");
        setInstallOptions({
          enableRemoteControl: profile.enable_remote_control,
          disableAutoUpdate: profile.disable_auto_update,
          ignoreUnsafeCert: profile.ignore_unsafe_cert,
          memoryIncludeCache: profile.memory_include_cache,
          getIpAddrFromNic: profile.get_ip_addr_from_nic,
          enableGpu: profile.enable_gpu,
          ghproxy: profile.ghproxy || "",
          dir: profile.dir || "",
          serviceName: profile.service_name || "",
          includeNics: profile.include_nics || "",
          excludeNics: profile.exclude_nics || "",
          includeMountpoints: profile.include_mountpoints || "",
          interval: profile.enable_interval ? String(profile.interval) : "",
          monthRotate: profile.enable_month_rotate ? String(profile.month_rotate) : "",
        });
        setEnableGhproxy(profile.enable_ghproxy);
        setEnableCustomDir(profile.enable_custom_dir);
        setEnableCustomServiceName(profile.enable_custom_service_name);
        setEnableIncludeNics(profile.enable_include_nics);
        setEnableExcludeNics(profile.enable_exclude_nics);
        setEnableIncludeMountpoints(profile.enable_include_mountpoints);
        setEnableInterval(profile.enable_interval);
        setEnableMonthRotate(profile.enable_month_rotate);
        setDeliveryState(saved ? delivery_state : undefined);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        toast.error(
          error instanceof Error
            ? error.message
            : t("admin.nodeTable.deploymentProfileLoadFailed", "读取部署配置失败"),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingProfile(false);
      });
    return () => controller.abort();
  }, [node.uuid, open, t]);

  React.useEffect(() => {
    if (!open || !deliveryStatus || !["saved", "sent"].includes(deliveryStatus)) {
      return;
    }
    const controller = new AbortController();
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (attempts > 30) {
        window.clearInterval(timer);
        return;
      }
      void fetch(`/api/admin/client/${node.uuid}/deployment-profile`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then((response) => response.ok ? response.json() as Promise<DeploymentProfileResponse> : undefined)
        .then((result) => {
          if (!result?.delivery_state) return;
          if (result.delivery_state.status !== deliveryStatus) refresh();
          setDeliveryState(result.delivery_state);
        })
        .catch(() => undefined);
    }, 2000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [deliveryStatus, node.uuid, open, refresh]);

  const selectedTrafficResetDay = () => {
    if (!enableMonthRotate) return 0;
    const value = Number(installOptions.monthRotate);
    return Number.isInteger(value) && value >= 1 && value <= 31
      ? value
      : null;
  };

  const selectedInterval = () => {
    if (!enableInterval) return 0;
    const value = Number(installOptions.interval);
    return Number.isFinite(value) && value >= 1 && value <= 3600
      ? value
      : null;
  };

  const deploymentProfile = (): DeploymentProfilePayload => ({
    platform: selectedPlatform,
    enable_remote_control: installOptions.enableRemoteControl,
    disable_auto_update: installOptions.disableAutoUpdate,
    ignore_unsafe_cert: installOptions.ignoreUnsafeCert,
    get_ip_addr_from_nic: installOptions.getIpAddrFromNic,
    memory_include_cache: installOptions.memoryIncludeCache,
    enable_gpu: installOptions.enableGpu,
    enable_ghproxy: enableGhproxy,
    ghproxy: installOptions.ghproxy,
    enable_custom_dir: enableCustomDir,
    dir: installOptions.dir,
    enable_custom_service_name: enableCustomServiceName,
    service_name: installOptions.serviceName,
    enable_include_nics: enableIncludeNics,
    include_nics: installOptions.includeNics,
    enable_exclude_nics: enableExcludeNics,
    exclude_nics: installOptions.excludeNics,
    enable_include_mountpoints: enableIncludeMountpoints,
    include_mountpoints: installOptions.includeMountpoints,
    enable_interval: enableInterval,
    interval: selectedInterval() ?? 0,
    enable_month_rotate: enableMonthRotate,
    month_rotate: selectedTrafficResetDay() ?? 0,
  });

  const generateCommand = () => {
    const host = function () {
      if (!settings.script_domain) {
        return window.location.origin;
      }
      return normalizeOptionalServiceUrl(settings.script_domain);
    }();
    const token = installToken || "";
    let args = ["-e", host, "-t", token];
    // 根据安装选项生成参数
    if (installOptions.enableRemoteControl) {
      args.push("--enable-remote-control");
    } else {
      args.push("--enable-remote-control=false");
    }
    if (installOptions.disableAutoUpdate) {
      args.push("--disable-auto-update");
    }
    if (installOptions.ignoreUnsafeCert) {
      args.push("--ignore-unsafe-cert");
    }
    if (installOptions.memoryIncludeCache) {
      args.push("--memory-include-cache");
    }
    if (installOptions.getIpAddrFromNic) {
      args.push("--get-ip-addr-from-nic");
    }
    if (installOptions.enableGpu) {
      args.push("--gpu");
    }
    const ghproxy = installOptions.ghproxy.trim();
    if (enableGhproxy && ghproxy) {
      const finalUrl = normalizeOptionalServiceUrl(ghproxy);
      args.push(`--install-ghproxy`);
      args.push(finalUrl);
    }
    const installDir = installOptions.dir.trim();
    if (enableCustomDir && installDir) {
      args.push(`--install-dir`);
      args.push(installDir);
    }
    const serviceName = installOptions.serviceName.trim();
    if (enableCustomServiceName && serviceName) {
      args.push(`--install-service-name`);
      args.push(serviceName);
    }
    const includeNics = installOptions.includeNics.trim();
    if (enableIncludeNics && includeNics) {
      args.push(`--include-nics`);
      args.push(includeNics);
    }
    const excludeNics = installOptions.excludeNics.trim();
    if (enableExcludeNics && excludeNics) {
      args.push(`--exclude-nics`);
      args.push(excludeNics);
    }
    const includeMountpoints = installOptions.includeMountpoints.trim();
    if (enableIncludeMountpoints && includeMountpoints) {
      args.push(`--include-mountpoint`);
      args.push(includeMountpoints);
    }
    if (enableInterval) {
      const intervalVal = Number.parseFloat((installOptions.interval || "").trim());
      args.push("-i");
      args.push(Number.isFinite(intervalVal) && intervalVal >= 1 ? String(intervalVal) : "1");
    }
    if (enableMonthRotate) {
      const rotateVal = (installOptions.monthRotate || "").trim() || "1"; // 默认 1
      args.push(`--month-rotate`);
      args.push(rotateVal);
    }
    let scriptFile: "install.sh" | "install.ps1" = "install.sh";
    if (selectedPlatform === "windows") {
      scriptFile = "install.ps1";
    }
    const scriptUrl = liteAgentInstallScriptUrl(
      scriptFile,
      enableGhproxy ? ghproxy : "",
    );
    let finalCommand = "";
    switch (selectedPlatform) {
      case "linux":
        finalCommand =
          `wget -qO- ${quoteShellArg(scriptUrl)} | sudo bash -s -- ` +
          quoteShellArgs(args);
        break;
      case "windows":
        finalCommand =
          `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ` +
          `"iwr ${quotePowerShellArg(scriptUrl)}` +
          ` -UseBasicParsing -OutFile 'install.ps1'; &` +
          ` '.\\install.ps1'`;
        args.forEach((arg) => {
          finalCommand += ` ${quotePowerShellArg(arg)}`;
        });
        finalCommand += `"`;
        break;
      case "macos":
        finalCommand =
          `zsh <(curl -sL ${quoteShellArg(scriptUrl)}) ` + quoteShellArgs(args);
        break;
      case "docker": {
        // Docker 运行时不支持安装脚本专用参数，剔除它们及其取值
        const installOnlyFlags = [
          "--install-ghproxy",
          "--install-dir",
          "--install-service-name",
        ];
        const dockerArgs: string[] = [];
        for (let i = 0; i < args.length; i++) {
          if (installOnlyFlags.includes(args[i])) {
            i++; // 跳过该标志的取值
            continue;
          }
          dockerArgs.push(args[i]);
        }
        finalCommand =
          `docker run -d --name lite-agent --restart=always ` +
          `${LITE_AGENT_DOCKER_IMAGE} ` +
          quoteShellArgs(dockerArgs);
        break;
      }
    }
    return finalCommand;
  };

  const saveProfile = async (copyCommand: boolean) => {
    if (profileAction) return;
    setCopyFeedback(undefined);
    const trafficResetDay = selectedTrafficResetDay();
    if (trafficResetDay === null) {
      toast.error(
        t(
          "admin.nodeTable.invalidMonthRotate",
          "流量重置日必须是 1 到 31 的整数",
        ),
      );
      return;
    }

    if (selectedInterval() === null) {
      toast.error(
        t(
          "admin.nodeTable.invalidInterval",
          "采集间隔必须在 1 到 3600 秒之间",
        ),
      );
      return;
    }

    if (copyCommand && copyBlocked) {
      toast.error(
        t(
          "admin.nodeTable.tokenMissingCopyBlocked",
          "Token 尚未就绪，无法复制安装命令",
        ),
      );
      return;
    }

    const action = copyCommand ? "copy" : "dispatch";
    setProfileAction(action);
    const copyAttempt = copyCommand
      ? writeClipboardText(generateCommand()).then(
          (value) => ({ ok: true as const, value }),
          (error: unknown) => ({ ok: false as const, error }),
        )
      : null;
    try {
      const response = await fetch(
        `/api/admin/client/${node.uuid}/deployment-profile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: deploymentProfile() }),
        },
      );
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      const result = (await response.json()) as DeploymentProfileResponse;
      setDeliveryState(result.delivery_state);
      const deliveryMessage = result.delivery_state?.status === "applied"
        ? t("admin.nodeTable.deliveryApplied", "已生效")
        : result.delivery_state?.status === "failed"
          ? t("admin.nodeTable.deliveryFailed", "应用失败")
          : result.delivery_state?.status === "sent" || result.delivery === "sent"
            ? t("admin.nodeTable.deliverySent", "已发送")
        : result.delivery === "agent_upgrade_required"
          ? t("admin.nodeTable.runtimeConfigUpgradeRequired", "配置已保存，Agent 升级后应用")
          : t("admin.nodeTable.deliverySaved", "已保存");

      if (copyAttempt) {
        const copyResult = await copyAttempt;
        if (!copyResult.ok) {
          refresh();
          const message = `${deliveryMessage}；${t(
              "admin.nodeTable.installCommandCopyDenied",
              "浏览器拒绝访问剪贴板，请检查网站权限后重试",
            )}`;
          setCopyFeedback({ kind: "error", message });
          commandTextAreaRef.current?.focus();
          commandTextAreaRef.current?.select();
          toast.warning(message);
          return;
        }
        if (!copyResult.value.confirmed) {
          refresh();
          const message = `${deliveryMessage}；${t(
              "admin.nodeTable.installCommandCopyUnconfirmed",
              "浏览器无法确认复制，请从上方指令框手动复制",
            )}`;
          setCopyFeedback({ kind: "warning", message });
          commandTextAreaRef.current?.focus();
          commandTextAreaRef.current?.select();
          toast.warning(message);
          return;
        }
      }
      refresh();
      const message = copyCommand
          ? `${deliveryMessage}；${t(
              "admin.nodeTable.installCommandSaved",
              "部署指令已复制到剪贴板",
            )}`
          : deliveryMessage;
      if (copyCommand) {
        setCopyFeedback({ kind: "success", message });
      }
      toast.success(message);
    } catch (err) {
      console.error("Failed to save install options or copy command:", err);
      const message = err instanceof Error
          ? err.message
          : t("admin.nodeTable.installCommandSaveFailed", "保存配置失败");
      if (copyCommand) {
        setCopyFeedback({ kind: "error", message });
        commandTextAreaRef.current?.focus();
        commandTextAreaRef.current?.select();
      }
      toast.error(message);
    } finally {
      setProfileAction(null);
    }
  };
  const deliveryPresentation = (() => {
    switch (deliveryState?.status) {
      case "sent":
        return {
          Icon: Send,
          color: "orange",
          label: t("admin.nodeTable.deliverySent", "已发送"),
          hint: t("admin.nodeTable.deliverySentHint", "等待 Agent 返回应用结果"),
        };
      case "applied":
        return {
          Icon: CheckCircle2,
          color: "green",
          label: t("admin.nodeTable.deliveryApplied", "已生效"),
          hint: t("admin.nodeTable.deliveryAppliedHint", "Agent 已确认配置生效"),
        };
      case "failed":
        return {
          Icon: XCircle,
          color: "red",
          label: t("admin.nodeTable.deliveryFailed", "应用失败"),
          hint: deliveryState.error || t("admin.nodeTable.deliveryFailedHint", "Agent 未能应用此配置"),
        };
      case "saved":
        return {
          Icon: Clock3,
          color: "blue",
          label: t("admin.nodeTable.deliverySaved", "已保存"),
          hint: t("admin.nodeTable.deliverySavedHint", "等待 Agent 上线后发送"),
        };
      default:
        return {
          Icon: Clock3,
          color: "gray",
          label: t("admin.nodeTable.deliveryNotStarted", "尚未下发"),
          hint: t(
            "admin.nodeTable.deliveryNotStartedHint",
            "保存在线采集配置后，可在这里查看发送和 Agent 应用结果",
          ),
        };
    }
  })();
  return (
    <Dialog.Root
      open={open}
      disableEnforceFocus={needTwoFactor}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setDialogTab("online");
          return;
        }
        tokenAbortControllerRef.current?.abort();
        tokenAbortControllerRef.current = null;
        tokenSessionRef.current?.closeDialog();
        setOtpInput("");
        setDialogTab("online");
      }}
    >
      <Dialog.Trigger>
        <IconButton variant="ghost" title={t("admin.nodeTable.installCommand")}>
          <Download size="18" />
        </IconButton>
      </Dialog.Trigger>
      <AppDialogContent
        maxWidth="720px"
        className="km-node-dialog km-node-deploy-dialog"
      >
        <Dialog.Title>
          {t("admin.nodeTable.nodeConfig", "节点配置")}
        </Dialog.Title>
        <Tabs.Root
          value={dialogTab}
          onValueChange={(value) => {
            if (value === "online" || value === "install") setDialogTab(value);
          }}
        >
          <AdminSheetTabs>
            <Tabs.List>
              <Tabs.Trigger value="online">
                <AdminTabLabel>
                  {t("admin.nodeTable.onlineConfigTab", "在线配置")}
                </AdminTabLabel>
              </Tabs.Trigger>
              <Tabs.Trigger value="install">
                <AdminTabLabel>
                  {t("admin.nodeTable.deployCommandTab", "部署指令")}
                </AdminTabLabel>
              </Tabs.Trigger>
            </Tabs.List>
          </AdminSheetTabs>
        <div
          className="km-node-dialog-body flex flex-col gap-4"
          aria-busy={loadingProfile || (dialogTab === "install" && tokenLoading)}
          style={{
            opacity: loadingProfile ? 0.55 : 1,
            pointerEvents: loadingProfile ? "none" : undefined,
          }}
        >
          <Tabs.Content value="install" className="flex flex-col gap-4">
          <InstallPlatformToggle
            className="admin-install-platforms"
            value={selectedPlatform}
            onChange={setSelectedPlatform}
          />

          <section className="km-node-dialog-pane">
            <Flex justify="between" align="center">
              <Text size="3" weight="bold">
                {t("admin.nodeTable.installationSettings", "安装配置")}
              </Text>
              <Text size="1" color="gray">
                {t("admin.nodeTable.reinstallRequired", "重装后生效")}
              </Text>
            </Flex>
            <div className="admin-install-options-grid grid grid-cols-2 gap-2">
              <Flex gap="2" align="center">
                <Checkbox
                  checked={installOptions.enableRemoteControl}
                  onCheckedChange={(checked) => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      enableRemoteControl: Boolean(checked),
                    }));
                  }}
                />
                <label
                  className="text-sm font-normal"
                  title={t("admin.nodeTable.enableRemoteControlHint")}
                  onClick={() => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      enableRemoteControl: !prev.enableRemoteControl,
                    }));
                  }}
                >
                  {t("admin.nodeTable.enableRemoteControl")}
                </label>
              </Flex>
              <Flex gap="2" align="center">
                <Checkbox
                  checked={installOptions.disableAutoUpdate}
                  onCheckedChange={(checked) => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      disableAutoUpdate: Boolean(checked),
                    }));
                  }}
                ></Checkbox>
                <label
                  className="text-sm font-normal"
                  onClick={() => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      disableAutoUpdate: !prev.disableAutoUpdate,
                    }));
                  }}
                >
                  {t("admin.nodeTable.disableAutoUpdate", "禁用自动更新")}
                </label>
              </Flex>
              <Flex gap="2" align="center">
                <Checkbox
                  checked={installOptions.ignoreUnsafeCert}
                  onCheckedChange={(checked) => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      ignoreUnsafeCert: Boolean(checked),
                    }));
                  }}
                />
                <label
                  className="text-sm font-normal"
                  onClick={() => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      ignoreUnsafeCert: !prev.ignoreUnsafeCert,
                    }));
                  }}
                >
                  {t("admin.nodeTable.ignoreUnsafeCert", "忽略不安全证书")}
                </label>
              </Flex>
              <Flex gap="2" align="center">
                <Checkbox
                  checked={installOptions.getIpAddrFromNic}
                  onCheckedChange={(checked) => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      getIpAddrFromNic: Boolean(checked),
                    }));
                  }}
                />
                <label
                  className="text-sm font-normal"
                  onClick={() => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      getIpAddrFromNic: !prev.getIpAddrFromNic,
                    }));
                  }}
                >
                  {t("admin.nodeTable.getIpAddrFromNic", "从网卡获取 IP 地址")}
                </label>
              </Flex>
            </div>
            <Flex direction="column" gap="2" className="km-node-dialog-fields [&_label]:font-normal">
              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableGhproxy}
                  onCheckedChange={(checked) => {
                    setEnableGhproxy(Boolean(checked));
                    if (!checked) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        ghproxy: "",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    setEnableGhproxy(!enableGhproxy);
                    if (enableGhproxy) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        ghproxy: "",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.ghproxy", "GitHub 代理")}
                </label>
              </Flex>
              {enableGhproxy && (
                <TextField.Root
                  // placeholder={t(
                  //   "admin.nodeTable.ghproxy_placeholder",
                  //   "GitHub 代理，为空则不使用代理"
                  // )}
                  placeholder="https://ghfast.top/"
                  value={installOptions.ghproxy}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      ghproxy: e.target.value,
                    }))
                  }
                />
              )}

              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableCustomDir}
                  onCheckedChange={(checked) => {
                    setEnableCustomDir(Boolean(checked));
                    if (!checked) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        dir: "",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    setEnableCustomDir(!enableCustomDir);
                    if (enableCustomDir) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        dir: "",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.install_dir", "安装目录")}
                </label>
              </Flex>
              {enableCustomDir && (
                <TextField.Root
                  placeholder={t(
                    "admin.nodeTable.install_dir_placeholder",
                    "安装目录，为空则使用默认目录(/opt/lite-agent)"
                  )}
                  value={installOptions.dir}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      dir: e.target.value,
                    }))
                  }
                />
              )}

              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableCustomServiceName}
                  onCheckedChange={(checked) => {
                    setEnableCustomServiceName(Boolean(checked));
                    if (!checked) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        serviceName: "",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    setEnableCustomServiceName(!enableCustomServiceName);
                    if (enableCustomServiceName) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        serviceName: "",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.serviceName", "服务名称")}
                </label>
              </Flex>
              {enableCustomServiceName && (
                <TextField.Root
                  placeholder={t(
                    "admin.nodeTable.serviceName_placeholder",
                    "服务名称，为空则使用默认名称(lite-agent)"
                  )}
                  value={installOptions.serviceName}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      serviceName: e.target.value,
                    }))
                  }
                />
              )}
            </Flex>
            </section>
          </Tabs.Content>
          <Tabs.Content value="online">
            <section className="km-node-dialog-pane">
              <Flex
                justify="between"
                align="center"
                wrap="wrap"
                gap="2"
                className="km-node-online-heading"
              >
                <Text size="3" weight="bold">
                  {t("admin.nodeTable.onlineCollectionSettings", "在线采集配置")}
                </Text>
                <Text size="1" color="green">
                  {t(
                    "admin.nodeTable.onlineApplicable",
                    "部署完成后，保存后可直接下发",
                  )}
                </Text>
              </Flex>
            <Flex direction="column" gap="2" className="km-node-dialog-fields [&_label]:font-normal">
              <div className="admin-install-options-grid grid grid-cols-2 gap-2">
                <Flex gap="2" align="center">
                  <Checkbox
                    checked={installOptions.memoryIncludeCache}
                    onCheckedChange={(checked) => {
                      setInstallOptions((prev) => ({
                        ...prev,
                        memoryIncludeCache: Boolean(checked),
                      }));
                    }}
                  />
                  <label
                    className="text-sm font-normal"
                    onClick={() => {
                      setInstallOptions((prev) => ({
                        ...prev,
                        memoryIncludeCache: !prev.memoryIncludeCache,
                      }));
                    }}
                  >
                    {t("admin.nodeTable.memoryModeAvailable", "监测可用内存")}
                  </label>
                  <Tips size="14">
                    {t("admin.nodeTable.memoryModeAvailable_tip")}
                  </Tips>
                </Flex>
                <Flex gap="2" align="center">
                  <Checkbox
                    checked={installOptions.enableGpu}
                    onCheckedChange={(checked) => {
                      setInstallOptions((prev) => ({
                        ...prev,
                        enableGpu: Boolean(checked),
                      }));
                    }}
                  />
                  <label
                    className="text-sm font-normal"
                    onClick={() => {
                      setInstallOptions((prev) => ({
                        ...prev,
                        enableGpu: !prev.enableGpu,
                      }));
                    }}
                  >
                    {t("admin.nodeTable.enableGpuMonitoring", "启用详细 GPU 监控")}
                  </label>
                </Flex>
              </div>
              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableIncludeNics}
                  onCheckedChange={(checked) => {
                    setEnableIncludeNics(Boolean(checked));
                    if (!checked) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        includeNics: "",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    setEnableIncludeNics(!enableIncludeNics);
                    if (enableIncludeNics) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        includeNics: "",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.includeNics", "只监测特定网卡")}
                </label>
              </Flex>
              {enableIncludeNics && (
                <TextField.Root
                  // placeholder={t(
                  //   "admin.nodeTable.includeNics_placeholder",
                  //   "多个网卡使用逗号隔开"
                  // )}
                  placeholder="eth0,eth1"
                  value={installOptions.includeNics}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      includeNics: e.target.value,
                    }))
                  }
                />
              )}
              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableExcludeNics}
                  onCheckedChange={(checked) => {
                    setEnableExcludeNics(Boolean(checked));
                    if (!checked) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        excludeNics: "",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    setEnableExcludeNics(!enableExcludeNics);
                    if (enableExcludeNics) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        excludeNics: "",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.excludeNics", "排除特定网卡")}
                </label>
              </Flex>
              {enableExcludeNics && (
                <TextField.Root
                  // placeholder={t(
                  //   "admin.nodeTable.excludeNics_placeholder",
                  //   "多个网卡使用逗号隔开"
                  // )}
                  placeholder="lo"
                  value={installOptions.excludeNics}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      excludeNics: e.target.value,
                    }))
                  }
                />
              )}
              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableIncludeMountpoints}
                  onCheckedChange={(checked) => {
                    setEnableIncludeMountpoints(Boolean(checked));
                    if (!checked) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        includeMountpoints: "",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    setEnableIncludeMountpoints(!enableIncludeMountpoints);
                    if (enableIncludeMountpoints) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        includeMountpoints: "",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.includeMountpoints", "只监测特定挂载点")}
                </label>
              </Flex>
              {enableIncludeMountpoints && (
                <TextField.Root
                  placeholder="/;/home;/var"
                  value={installOptions.includeMountpoints}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      includeMountpoints: e.target.value,
                    }))
                  }
                />
              )}
              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableInterval}
                  onCheckedChange={(checked) => {
                    const enabled = Boolean(checked);
                    setEnableInterval(enabled);
                    if (!enabled) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        interval: "",
                      }));
                    } else {
                      setInstallOptions((prev) => ({
                        ...prev,
                        interval: prev.interval?.trim() ? prev.interval : "1",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    const willEnable = !enableInterval;
                    setEnableInterval(willEnable);
                    if (!willEnable) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        interval: "",
                      }));
                    } else {
                      setInstallOptions((prev) => ({
                        ...prev,
                        interval: prev.interval?.trim() ? prev.interval : "1",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.interval", "采集间隔(秒)")}
                </label>
              </Flex>
              {enableInterval && (
                <TextField.Root
                  placeholder="1"
                  value={installOptions.interval}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      interval: e.target.value,
                    }))
                  }
                />
              )}
              <Flex gap="2" align="center">
                <Checkbox
                  checked={enableMonthRotate}
                  onCheckedChange={(checked) => {
                    const enabled = Boolean(checked);
                    setEnableMonthRotate(enabled);
                    if (!enabled) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        monthRotate: "",
                      }));
                    } else {
                      setInstallOptions((prev) => ({
                        ...prev,
                        monthRotate: prev.monthRotate?.trim()
                          ? prev.monthRotate
                          : "1",
                      }));
                    }
                  }}
                />
                <label
                  className="text-sm font-bold cursor-pointer"
                  onClick={() => {
                    const willEnable = !enableMonthRotate;
                    setEnableMonthRotate(willEnable);
                    if (!willEnable) {
                      setInstallOptions((prev) => ({
                        ...prev,
                        monthRotate: "",
                      }));
                    } else {
                      setInstallOptions((prev) => ({
                        ...prev,
                        monthRotate: prev.monthRotate?.trim()
                          ? prev.monthRotate
                          : "1",
                      }));
                    }
                  }}
                >
                  {t("admin.nodeTable.monthRotate", "流量重置日")}
                </label>
              </Flex>
              {enableMonthRotate && (
                <TextField.Root
                  placeholder="1"
                  value={installOptions.monthRotate}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      monthRotate: e.target.value,
                    }))
                  }
                />
              )}
              <div
                className="admin-deployment-delivery"
                role="status"
                aria-live="polite"
              >
                <Text size="2" weight="bold" className="admin-deployment-delivery-title">
                  {t("admin.nodeTable.deliveryStatusTitle", "在线配置状态")}
                </Text>
                <div className="admin-deployment-delivery-body">
                  <div
                    className="admin-deployment-delivery-current"
                    data-status={deliveryState?.status || "not-started"}
                  >
                    <Badge
                      color={deliveryPresentation.color}
                      size="1"
                      variant="soft"
                      className="text-sm"
                    >
                      <span className="text-xs">{deliveryPresentation.label}</span>
                    </Badge>
                  </div>
                  <Flex gap="2" align="center" className="admin-deployment-delivery-hint">
                    <deliveryPresentation.Icon size={15} />
                    <Text
                      size="1"
                      color={deliveryState?.status === "failed" ? "red" : "gray"}
                    >
                      {deliveryPresentation.hint}
                    </Text>
                  </Flex>
                </div>
              </div>
              <Button
                mt="2"
                variant="solid"
                aria-busy={profileAction === "dispatch"}
                disabled={
                  selectedTrafficResetDay() === null ||
                  selectedInterval() === null
                }
                onClick={() => void saveProfile(false)}
              >
                <Save size={16} />
                {t("admin.nodeTable.saveAndDispatch", "保存并下发")}
              </Button>
            </Flex>
            </section>
          </Tabs.Content>
          <Tabs.Content value="install" className="flex flex-col gap-4">
          <Flex direction="column" gap="2">
            <label className="text-base font-bold">
              {t("admin.nodeTable.generatedCommand", "生成的指令")}
            </label>
            {tokenError ? (
              <Callout.Root color="red" size="1">
                <Callout.Text>{tokenError}</Callout.Text>
              </Callout.Root>
            ) : null}
            <div className="relative">
              <TextArea
                ref={commandTextAreaRef}
                readOnly
                className="w-full"
                style={{ minHeight: "80px" }}
                value={
                  tokenLoading
                    ? t("admin.nodeTable.installTokenLoading", "正在读取节点 Token…")
                    : installToken
                      ? generateCommand()
                      : ""
                }
                onFocus={(event) => event.currentTarget.select()}
              />
            </div>
          </Flex>
          <Flex direction="column" gap="2">
            <Button
              style={{ width: "100%" }}
              aria-busy={tokenLoading || profileAction === "copy"}
              disabled={
                copyBlocked ||
                selectedTrafficResetDay() === null ||
                selectedInterval() === null
              }
              onClick={() => void saveProfile(true)}
            >
              <Copy size={16} />
              {t("admin.nodeTable.saveAndCopyCommand", "保存并复制部署指令")}
            </Button>
            {isMobile && copyFeedback && (
              <Text
                as="div"
                size="2"
                weight="medium"
                color={
                  copyFeedback.kind === "success"
                    ? "green"
                    : copyFeedback.kind === "warning"
                      ? "amber"
                      : "red"
                }
                role="status"
                aria-live="polite"
                className="px-1"
              >
                {copyFeedback.message}
              </Text>
            )}
          </Flex>
          </Tabs.Content>
        </div>
        </Tabs.Root>
      </AppDialogContent>
      {needTwoFactor ? (
      <Dialog.Root
        open
        zIndex={1400}
        onOpenChange={(nextOpen) => {
          if (nextOpen) return;
          if (tokenSessionRef.current?.getSnapshot().twoFactorOpen) {
            cancelDeployTwoFactor();
          }
        }}
      >
        <AppDialogContent className="admin-install-dialog">
          <Dialog.Title>
            {t("admin.nodeTable.identityAuthTitle", "身份验证")}
          </Dialog.Title>
          <Dialog.Description>
            {t("admin.nodeTable.identityAuthDescription", "请输入身份验证器中的 6 位动态口令")}
          </Dialog.Description>
          <form
            autoComplete="on"
            onSubmit={(event) => {
              event.preventDefault();
              if (otpInput.length === 6 && !otpSubmitting) {
                void tokenSessionRef.current?.submitTwoFactor(node.uuid, otpInput);
              }
            }}
          >
            <TextField.Root
              ref={otpFieldRef}
              id="admin-node-deploy-otp"
              name="one-time-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              color={tokenState.twoFactorInvalid ? "red" : undefined}
              disabled={otpSubmitting}
              value={otpInput}
              onChange={(event) =>
                setOtpInput(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder={t("admin.nodeTable.identityAuthInput", "6 位动态口令")}
              aria-label={t("admin.nodeTable.identityAuthInput", "6 位动态口令")}
            />
            {tokenState.twoFactorInvalid ? (
              <Text size="2" color="red" className="mt-2" role="alert">
                {t("admin.nodeTable.twoFactorInvalid", "验证码错误")}
              </Text>
            ) : null}
            <Flex justify="end" gap="2" mt="4">
              <Button
                type="button"
                variant="soft"
                disabled={otpSubmitting}
                onClick={cancelDeployTwoFactor}
              >
                {t("admin.nodeTable.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={otpInput.length !== 6 || otpSubmitting}
              >
                {t("common.confirm", "确认")}
              </Button>
            </Flex>
          </form>
        </AppDialogContent>
      </Dialog.Root>
      ) : null}
    </Dialog.Root>
  );
}

function EditButton({ node }: { node: NodeDetail }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const { refresh } = useNodeDetails();
  const nameRef = React.useRef<HTMLInputElement>(null);
  const groupRef = React.useRef<HTMLInputElement>(null);
  const tagsRef = React.useRef<HTMLInputElement>(null);
  const bandwidthRef = React.useRef<HTMLInputElement>(null);
  const privateRemarkRef = React.useRef<HTMLInputElement>(null);
  const publicRemarkRef = React.useRef<HTMLInputElement>(null);
  const [hidden, setHidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [traffic_limit, setTrafficLimit] = useState(0);
  const [traffic_limit_type, setTrafficLimitType] = useState("sum");
  const [trafficResetDay, setTrafficResetDay] = useState(0);
  const [regionOverride, setRegionOverride] = useState("");
  const [trafficResetAllowance, setTrafficResetAllowance] = useState(0);

  const regionOptions = React.useMemo(
    () => [
      {
        label: t("admin.nodeEdit.regionAuto", "自动识别"),
        value: "",
      },
      ...getSupportedRegions().map((region) => {
        const code = getRegionCode(region);
        return {
          label: `${code} ${getRegionDisplayName(region, i18n.language.startsWith("zh") ? "zh" : "en")}`,
          value: code,
          icon: <Flag flag={code} compact />,
        };
      }),
    ],
    [i18n.language, t],
  );

  React.useEffect(() => {
    setHidden(node.hidden);
    setTrafficLimit(node.traffic_limit || 0);
    setTrafficLimitType(node.traffic_limit_type || "sum");
    setTrafficResetDay(node.traffic_reset_day ?? 0);
    setRegionOverride(
      node.region_override ? getRegionCode(node.region_override) : "",
    );
    setTrafficResetAllowance(node.traffic_reset_allowance ?? 0);
  }, [
    node.hidden,
    node.traffic_limit,
    node.traffic_limit_type,
    node.traffic_reset_day,
    node.region_override,
    node.traffic_reset_allowance,
  ]);

  const save = async () => {
    if (trafficResetAllowance > 0 && (trafficResetDay < 1 || trafficResetDay > 31)) {
      toast.error(
        t(
          "admin.nodeEdit.trafficResetDayRequired",
          "请先设置 1-31 日的流量重置日，再填写本周期重置流量",
        ),
      );
      return;
    }
    try {
      setSaving(true);
      const payload: Record<string, unknown> = {
        name: nameRef.current?.value,
        group: groupRef.current?.value,
        tags: tagsRef.current?.value,
        bandwidth: normalizeBandwidth(bandwidthRef.current?.value ?? ""),
        remark: privateRemarkRef.current?.value ?? "",
        public_remark: publicRemarkRef.current?.value ?? "",
        hidden,
      };
      if (traffic_limit !== (node.traffic_limit || 0)) {
        payload.traffic_limit = traffic_limit;
      }
      if (traffic_limit_type !== (node.traffic_limit_type || "sum")) {
        payload.traffic_limit_type = traffic_limit_type;
      }
      payload.traffic_reset_day = trafficResetDay;
      const currentRegionOverride = node.region_override
        ? getRegionCode(node.region_override)
        : "";
      if (regionOverride !== currentRegionOverride) {
        payload.region_override = regionOverride;
      }
      if (trafficResetAllowance !== (node.traffic_reset_allowance ?? 0)) {
        payload.traffic_reset_allowance = trafficResetAllowance;
      }
      const response = await fetch(`/api/admin/client/${node.uuid}/edit`, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `HTTP ${response.status}`);
      }
      refresh();
      setOpen(false);
      toast.success(t("admin.nodeEdit.saveSuccess", "保存成功"));
    } catch (error) {
      console.error("Error updating client:", error);
      toast.error(t("admin.nodeEdit.saveError", "保存失败"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <IconButton
          variant="ghost"
          title={t("admin.nodeEdit.editInfo", "编辑信息")}
        >
          <Pencil size="18" />
        </IconButton>
      </Dialog.Trigger>
      <AppDialogContent
        maxWidth={920}
        className="km-node-dialog km-node-edit-dialog"
      >
        <Dialog.Title>
          {t("admin.nodeEdit.editInfo", "编辑信息")}
        </Dialog.Title>
        <Dialog.Description>
          {t(
            "admin.nodeEdit.editInfoDescription",
            "调整服务器标识、展示信息与流量策略。",
          )}
        </Dialog.Description>
        <div className="km-node-dialog-grid">
          <section className="km-node-dialog-pane km-node-dialog-fields">
          <div>
            <label className="block mb-1 text-sm font-medium text-muted-foreground">
              {t("admin.nodeEdit.name", "名称")}
            </label>
            <TextField.Root
              defaultValue={node.name}
              placeholder={t("admin.nodeEdit.namePlaceholder", "请输入名称")}
              ref={nameRef}
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-muted-foreground">
              {t("admin.nodeEdit.regionOverride", "国家\\地区图标")}
            </label>
            <SelectOrInput
              options={regionOptions}
              value={regionOverride}
              allowCustomInput={false}
              onChange={setRegionOverride}
              placeholder={t("admin.nodeEdit.regionAuto", "自动识别")}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t(
                "admin.nodeEdit.regionOverride_description",
                "用于广播 IP 或 GeoIP 识别不准的情况；清空后恢复自动识别。",
              )}
            </p>
          </div>
          <div>
            <label className="mb-1 text-sm font-medium text-muted-foreground flex items-center">
              {t("common.tags")}
              <label className="text-muted-foreground ml-1 text-xs self-end">
                {t("common.tagsDescription")}
              </label>
              <Tips>
                <span
                  dangerouslySetInnerHTML={{ __html: t("common.tagsTips") }}
                />
              </Tips>
            </label>
            <TextField.Root defaultValue={node.tags} ref={tagsRef} />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-muted-foreground">
              {t("admin.nodeEdit.bandwidth", "带宽")}
            </label>
            <TextField.Root
              defaultValue={node.bandwidth || ""}
              ref={bandwidthRef}
              placeholder={t(
                "admin.nodeEdit.bandwidthPlaceholder",
                "例如 100 Mbps 或 1 Gbps",
              )}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t(
                "admin.nodeEdit.bandwidth_description",
                "用于概览展示，可填写 100 Mbps、1 Gbps、10 G 这类带宽。",
              )}
            </p>
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-muted-foreground">
              {t("common.group")}
            </label>
            <TextField.Root defaultValue={node.group} ref={groupRef} />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-muted-foreground">
              {t("admin.nodeEdit.remark", "私有备注")}
            </label>
            <TextField.Root
              defaultValue={node.remark}
              ref={privateRemarkRef}
              placeholder={t(
                "admin.nodeEdit.remarkPlaceholder",
                "请输入私有备注",
              )}
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-muted-foreground">
              {t("admin.nodeEdit.publicRemark", "公开备注")}
            </label>
            <TextField.Root
              defaultValue={node.public_remark}
              ref={publicRemarkRef}
              placeholder={t(
                "admin.nodeEdit.publicRemarkPlaceholder",
                "请输入公开备注",
              )}
            />
          </div>
          <div>
            <SettingCardSwitch
              bordless
              title={t("admin.nodeEdit.hidden")}
              description={t("admin.nodeEdit.hidden_description")}
              defaultChecked={hidden}
              onChange={setHidden}
            />
          </div>
          </section>
          <section className="km-node-dialog-pane km-node-dialog-fields">
          <div className="km-node-traffic-section">
            <div className="space-y-2 pb-3 pt-2">
              <label className="block text-sm font-semibold leading-5">
                {t("admin.nodeEdit.trafficResetDay", "流量重置日")}
              </label>
              <TextField.Root
                aria-label={t("admin.nodeEdit.trafficResetDay")}
                value={String(trafficResetDay)}
                onChange={(event) => {
                  const day = Number.parseInt(event.target.value || "0", 10);
                  setTrafficResetDay(
                    Math.min(
                      31,
                      Math.max(0, Number.isFinite(day) ? day : 0),
                    ),
                  );
                }}
              />
              <p className="text-sm leading-6 text-muted-foreground">
                {t(
                  "admin.nodeEdit.trafficResetDay_description",
                  "0 表示关闭；1-31 表示每月重置日。保存后自动同步到 Agent。",
                )}
              </p>
            </div>
            <SettingCardSelect
              bordless
              title={t("admin.nodeEdit.trafficLimitType")}
              defaultValue={node.traffic_limit_type || "sum"}
              options={[
                {
                  label: t("admin.nodeEdit.trafficLimitType_sum"),
                  value: "sum",
                },
                {
                  label: t("admin.nodeEdit.trafficLimitType_max"),
                  value: "max",
                },
                {
                  label: t("admin.nodeEdit.trafficLimitType_min"),
                  value: "min",
                },
                {
                  label: t("admin.nodeEdit.trafficLimitType_up"),
                  value: "up",
                },
                {
                  label: t("admin.nodeEdit.trafficLimitType_down"),
                  value: "down",
                },
              ]}
              OnSave={(value) => {
                setTrafficLimitType(value);
              }}
            />
            <SettingCardShortTextInput
              aria-label={t("admin.nodeEdit.trafficLimit")}
              bordless
              title={t("admin.nodeEdit.trafficLimit")}
              description={t("admin.nodeEdit.trafficLimit_description")}
              defaultValue={formatBytes(traffic_limit || 0)}
              showSaveButton={false}
              onChange={(e) => {
                setTrafficLimit(stringToBytes(e.currentTarget.value));
              }}
              onBlur={(e) => {
                e.currentTarget.value = formatBytes(traffic_limit);
              }}
            ></SettingCardShortTextInput>
            <div className="mt-5 border-t border-gray-200 pt-4 dark:border-gray-700">
              <SettingCardShortTextInput
                aria-label={t("admin.nodeEdit.trafficResetAllowance")}
                bordless
                title={t("admin.nodeEdit.trafficResetAllowance", "重置流量额度")}
                description={t(
                  "admin.nodeEdit.trafficResetAllowance_description",
                  "同一计费周期可多次调整；与原流量限额相加，按上方统计方式计算，并在下个重置日自动归零。",
                )}
                defaultValue={formatBytes(trafficResetAllowance || 0)}
                showSaveButton={false}
                onChange={(event) => {
                  setTrafficResetAllowance(stringToBytes(event.currentTarget.value));
                }}
                onBlur={(event) => {
                  event.currentTarget.value = formatBytes(trafficResetAllowance);
                }}
              />
            </div>
            <div className="mt-3 space-y-1.5 pb-3 text-sm leading-6 text-muted-foreground">
              <div>
                {t("admin.nodeEdit.trafficEffectiveFormula", {
                  defaultValue: "原限额 {{base}} + 重置流量 {{reset}} = 本周期总限额 {{total}}",
                  base: formatBytes(traffic_limit),
                  reset: formatBytes(trafficResetAllowance),
                  total: formatBytes(traffic_limit + trafficResetAllowance),
                })}
              </div>
              <div>
                {t(
                  "admin.nodeEdit.trafficResetReportNotice",
                  "这里只调整本周期额度，不会清零或修改真实流量，日、周、月报仍按实际产生的流量统计。",
                )}
              </div>
            </div>
          </div>
          </section>
        </div>
        <Flex gap="2" justify={"end"} className="km-node-dialog-actions">
          <Dialog.Close>
            <Button type="button" variant="soft" color="gray">
              {t("common.cancel", "取消")}
            </Button>
          </Dialog.Close>
          <Button
            type="submit"
            disabled={saving}
            onClick={save}
          >
            {saving
              ? t("admin.nodeEdit.waiting", "等待...")
              : t("save", "保存")}
          </Button>
        </Flex>
      </AppDialogContent>
    </Dialog.Root>
  );
}

function NodeNameLink({ node, online }: { node: NodeDetail; online: boolean | null }) {
  const { t } = useTranslation();
  const pending = online === null;
  const statusLabel = online
    ? t("nodeCard.online", "在线")
    : t("nodeCard.offline", "离线");

  return (
    <Link
      to={`/admin/servers/${node.uuid}`}
      className="flex w-full min-w-0 items-center gap-2 text-left"
    >
      <span className="admin-node-country-flag">
        <Flag flag={node.region} compact />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="block max-w-full truncate text-[15px] font-semibold leading-6 hover:underline">
          {node.name}
        </span>
        <span
          className="flex h-[18px] items-center gap-1.5 text-[13.5px] text-muted-foreground"
          aria-hidden={pending || undefined}
          style={pending ? { visibility: "hidden" } : undefined}
        >
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: online ? NODE_ONLINE : NODE_OFFLINE }}
          />
          {statusLabel}
        </span>
      </span>
    </Link>
  );
}

function BillingButton({ node }: { node: NodeDetail }) {
  const { t } = useTranslation();
  const { refresh } = useNodeDetails();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [billingCycle, setBillingCycle] = React.useState<string>(
    node.billing_cycle.toString()
  );
  const [autoRenewal, setAutoRenewal] = React.useState<boolean>(
    node.auto_renewal || false
  );
  const [currency, setCurrency] = React.useState<string>(
    currencyForDisplay(node.currency || "$")
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const formData = new FormData(e.target as HTMLFormElement);
      const priceValue = (formData.get("price") as string) || "0";

      const price = parseFloat(priceValue);

      if (isNaN(price) || (price < 0 && price !== -1)) {
        toast.error(t("admin.nodeTable.invalidPrice"));
        return;
      }
      const billingCycleValue = parseInt(
        (formData.get("billingCycle") as string) || "30"
      );
      const expiredAtValue = (formData.get("expiredAt") as string) || "";
      const expiredAt = dateInputToISOString(expiredAtValue);
      const rawCurrency = (formData.get("currency") as string) || "$";
      const currencyValue = currencyForStorage(rawCurrency);

      await fetch(`/api/admin/client/${node.uuid}/edit`, {
        method: "POST",
        body: JSON.stringify({
          price,
          billing_cycle: billingCycleValue,
          expired_at: expiredAt,
          currency: currencyValue,
          auto_renewal: autoRenewal,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      setCurrency(currencyForDisplay(currencyValue));
      refresh();
      setOpen(false);
    } catch (error) {
      toast.error("Failed to save billing information:" + error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <IconButton
          variant="ghost"
          title={t("admin.nodeTable.billing", "账单")}
        >
          <CircleDollarSign size="18" />
        </IconButton>
      </Dialog.Trigger>
      <AppDialogContent
        maxWidth={820}
        className="km-node-dialog km-node-billing-dialog"
      >
        <Dialog.Title>
          {t("admin.nodeTable.billing", "账单")}
        </Dialog.Title>
        <Dialog.Description>
          {t(
            "admin.nodeTable.billingDescription",
            "设置价格、计费周期与到期续费策略。",
          )}
        </Dialog.Description>
        <form onSubmit={handleSave}>
          <div className="km-node-dialog-grid">
            <section className="km-node-dialog-pane km-node-dialog-fields">
            <label className="font-bold">
              <label>{t("admin.nodeTable.price")}</label>
              <label className="text-muted-foreground text-sm ml-1 font-medium">
                {t("admin.nodeTable.priceTips")}
              </label>
            </label>
            <TextField.Root name="price" defaultValue={node.price} />

            <label className="font-bold">
              <label>{t("admin.nodeTable.currency", "货币")}</label>
              <label className="text-muted-foreground text-sm ml-1 font-medium">
                {t("admin.nodeTable.currencyTips")}
              </label>
            </label>
            <SelectOrInput
              options={["¥", "$", "€", "£", "₽", "₣", "₹", "₫", "฿", "C$"]}
              name="currency"
              value={currency}
              onChange={(value) => setCurrency(value)}
              allowCustomInput
            />
            </section>
            <section className="km-node-dialog-pane km-node-dialog-fields">
            <label className="font-bold flex items-center gap-1">
              {t("admin.nodeTable.billingCycle")} <Tips><span dangerouslySetInnerHTML={{ __html: t("admin.nodeTable.billingCycleTips") }}></span></Tips>
            </label>
            <Select.Root
              name="billingCycle"
              className="w-full"
              value={billingCycle === "0" ? "" : billingCycle}
              onValueChange={setBillingCycle}
            >
              <Select.Trigger
                className="w-full"
                placeholder={t("admin.nodeTable.selectBillingCycle", "选择计费周期")}
              />
              <Select.Content>
                <Select.Item value="30">{t("common.monthly")}</Select.Item>
                <Select.Item value="92">{t("common.quarterly")}</Select.Item>
                <Select.Item value="184">{t("common.semi_annual")}</Select.Item>
                <Select.Item value="365">{t("common.annual")}</Select.Item>
                <Select.Item value="730">{t("common.biennial")}</Select.Item>
                <Select.Item value="1095">{t("common.triennial")}</Select.Item>
                <Select.Item value="1825">{t("common.quinquennial")}</Select.Item>
                <Select.Item value="-1">{t("common.once")}</Select.Item>
              </Select.Content>
            </Select.Root>

            <Flex gap="2" align="center">
              <label className="font-bold">
                {t("admin.nodeTable.expiredAt")}
              </label>
            </Flex>
            <TextField.Root
              name="expiredAt"
              defaultValue={
                node.expired_at
                  ? timestampToDateInput(node.expired_at)
                  : "0001-01-01"
              }
              type="date"
            >
              <TextField.Slot side="right">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    const dateInput = document.querySelector(
                      'input[name="expiredAt"]'
                    ) as HTMLInputElement;
                    if (dateInput) {
                      const futureDate = new Date();
                      futureDate.setFullYear(futureDate.getFullYear() + 200);
                      dateInput.value = timestampToDateInput(futureDate);
                    }
                  }}
                >
                  {t("admin.nodeTable.setToLongTerm", "设置为长期")}
                </Button>
              </TextField.Slot>
            </TextField.Root>
            <Flex gap="2" align="center"></Flex>
            <SettingCardSwitch
              bordless
              title={t("admin.nodeTable.autoRenewal")}
              description={t("admin.nodeTable.autoRenewalDescription")}
              defaultChecked={node.auto_renewal || false}
              onChange={setAutoRenewal}
            />
            </section>
          </div>
          <Flex gap="2" justify="end" className="km-node-dialog-actions">
            <Dialog.Close>
              <Button type="button" variant="soft" color="gray">
                {t("common.cancel", "取消")}
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={saving}>
              {t("save")}
            </Button>
          </Flex>
        </form>
      </AppDialogContent>
    </Dialog.Root>
  );
}
