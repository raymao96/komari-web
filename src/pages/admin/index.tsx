import {
  quotePowerShellArg,
  quoteShellArg,
  quoteShellArgs,
} from "@/utils/shellQuote";
import { publicVersion } from "@/utils/version";
import { normalizeOptionalServiceUrl } from "@/utils/serviceUrl";
import React, { useEffect, useState } from "react";
import {
  NodeDetailsProvider,
  useNodeDetails,
  type NodeDetail,
} from "@/contexts/NodeDetailsContext";
import {
  Flex,
  TextField,
  Button,
  Checkbox,
  Text,
  Dialog,
  IconButton,
  TextArea,
  SegmentedControl,
  Callout,
} from "@radix-ui/themes";
import {
  CircleDollarSign,
  Copy,
  CornerRightUp,
  Download,
  Gauge,
  GripVertical,
  Pencil,
  Plus,
  Radar,
  RotateCw,
  Settings,
  Terminal,
  Trash2Icon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
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
import PriceTags from "@/components/PriceTags";
import Loading from "@/components/loading";
import Tips from "@/components/ui/tips";
import {
  SettingCardCollapse,
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
import { localizeTokenRotationError } from "@/utils/tokenRotation";
import { SelectOrInput } from "@/components/ui/select-or-input";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import AdminNodeStatusSummary, {
  type AdminNodeStatusFilter,
} from "@/components/admin/AdminNodeStatusSummary";
import {
  AdminPagination,
} from "@/components/admin/AdminPagination";
import { useAdminDefaultPageSize } from "@/hooks/useAdminDefaultPageSize";
import { useAdminNodeLiveData } from "@/hooks/use-admin-node-live-data";
import {
  getRegionCode,
  getRegionDisplayName,
  getSupportedRegions,
} from "@/utils/regionHelper";


const NodeDetailsPage = () => {
  return (
    <NodeDetailsProvider>
      <Layout />
    </NodeDetailsProvider>
  );
};

const PREVIOUS_PAGE_DROP_ID = "admin-node-previous-page";
const NEXT_PAGE_DROP_ID = "admin-node-next-page";

const Layout = () => {
  const { nodeDetail, isLoading, error, refresh } = useNodeDetails();
  const { settings, loading: settingsLoading } = useSettings();
  const { liveData, available } = useAdminNodeLiveData();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminNodeStatusFilter>("all");
  const onlineSet = React.useMemo(
    () => new Set(liveData?.data.online ?? []),
    [liveData?.data.online],
  );
  const filteredNodes = React.useMemo(
    () => (Array.isArray(nodeDetail)
      ? nodeDetail.filter((node) => {
        const matchesSearch = node.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const isOnline = onlineSet.has(node.uuid);
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "online" && isOnline) ||
          (statusFilter === "offline" && !isOnline);
          return matchesSearch && matchesStatus;
        })
      : []),
    [nodeDetail, onlineSet, searchTerm, statusFilter],
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
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        settings={settings}
        settingsLoading={settingsLoading}
        showStatusSummary={!isEmpty}
        total={nodeDetail.length}
        online={onlineSet.size}
        available={available}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {isEmpty ? (
        <EmptyNodesGuide />
      ) : (
        <>
          <NodeTable
            nodes={filteredNodes}
            settings={settings}
            onlineSet={onlineSet}
            reorderEnabled={!searchTerm.trim() && statusFilter === "all"}
          />
        </>
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
  disableWebSsh: boolean;
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
      disableWebSsh: false,
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
    if (installOptions.disableWebSsh) {
      args.push("--disable-web-ssh");
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

    let scriptFile = "install.sh";
    if (selectedPlatform === "windows") {
      scriptFile = "install.ps1";
    }
    let scriptUrl = `https://raw.githubusercontent.com/raymao96/komari-agent/refs/heads/github-nuomiiiii/${scriptFile}`;
    if (enableGhproxy && ghproxy) {
      scriptUrl = scriptUrl.slice(8); // 去掉 https://
      if (ghproxy.endsWith("/")) {
        scriptUrl = `${ghproxy}${scriptUrl}`;
      } else {
        scriptUrl = `${ghproxy}/${scriptUrl}`;
      }
      if (!scriptUrl.startsWith("http")) {
        scriptUrl = `http://${scriptUrl}`;
      }
    }

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
          `touch .komari-auto-discovery.json && ` +
          `docker run -d --name komari-agent --restart=always ` +
          `-v .komari-auto-discovery.json:/app/auto-discovery.json ` +
          `ghcr.io/raymao96/komari-agent:latest ` +
          quoteShellArgs(dockerArgs);
        break;
      }
    }
    return finalCommand;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copy_success", "已复制到剪贴板"));
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  if (loading) {
    return (
      <Flex align="center" justify="center" mt="4" py="4">
        <Loading text="" />
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

      <SegmentedControl.Root
        className="admin-install-platforms"
        value={selectedPlatform}
        onValueChange={(value) => setSelectedPlatform(value as Platform)}
      >
        <SegmentedControl.Item value="linux">Linux</SegmentedControl.Item>
        <SegmentedControl.Item value="windows">Windows</SegmentedControl.Item>
        <SegmentedControl.Item value="macos">macOS</SegmentedControl.Item>
        <SegmentedControl.Item value="docker">Docker</SegmentedControl.Item>
      </SegmentedControl.Root>

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
                checked={installOptions.disableWebSsh}
                onCheckedChange={(checked) =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    disableWebSsh: Boolean(checked),
                  }))
                }
              />
              <label
                className="text-sm font-normal cursor-pointer"
                onClick={() =>
                  setInstallOptions((prev) => ({
                    ...prev,
                    disableWebSsh: !prev.disableWebSsh,
                  }))
                }
              >
                {t("admin.nodeTable.disableWebSsh")}
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
                  "安装目录，为空则使用默认目录(/opt/komari-agent)"
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
                  "服务名称，为空则使用默认名称(komari-agent)"
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
                {t("admin.nodeTable.monthRotate", "网络统计月重置")}
              </label>
            </Flex>
            {enableMonthRotate && (
              <TextField.Root
                placeholder="1"
                type="number"
                min="1"
                max="31"
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
  searchTerm,
  setSearchTerm,
  settings,
  settingsLoading,
  showStatusSummary,
  total,
  online,
  available,
  statusFilter,
  setStatusFilter,
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  settings: any;
  settingsLoading: boolean;
  showStatusSummary: boolean;
  total: number;
  online: number;
  available: boolean;
  statusFilter: AdminNodeStatusFilter;
  setStatusFilter: (filter: AdminNodeStatusFilter) => void;
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
    <Flex direction="column" gap="3">
      <AdminPageTitle
        description={t(
          "admin.nodeTable.description",
          "集中查看节点连接、网络、分组、备注与账单信息，拖动可调整全局显示顺序。",
        )}
      >
        {t("admin.nodeTable.nodeList")}
      </AdminPageTitle>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        {showStatusSummary ? (
          <AdminNodeStatusSummary
            total={total}
            online={online}
            available={available}
            value={statusFilter}
            onValueChange={setStatusFilter}
          />
        ) : null}
        <Flex gap="2" className="w-full md:ml-auto md:w-auto">
        <TextField.Root
          size="2"
          className="min-w-0 flex-1 text-sm md:w-56"
          placeholder={t("admin.nodeTable.searchByName")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
          <Dialog.Trigger>
            <Button size="2" className="px-3 text-sm" onClick={() => setDialogOpen(true)}>
              <Plus size={16} />
              {t("admin.nodeTable.addNode")}
            </Button>
          </Dialog.Trigger>
          <Dialog.Content>
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
          </Dialog.Content>
        </Dialog.Root>
        </Flex>
      </div>
    </Flex>
  );
};

const compactIPv6 = (value: string) => {
  if (value.length <= 22) return value;
  const segments = value.split(":");
  return segments.length > 3
    ? `${segments.slice(0, 2).join(":")}:...${segments[segments.length - 1]}`
    : value;
};

const SortableRow = React.memo(({
  node,
  settings,
  online,
  reorderEnabled,
}: {
  node: NodeDetail;
  settings: any;
  online: boolean;
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
  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success(t("copy_success"));
  }
  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className="text-sm hover:bg-[var(--accent-a2)] [&>td]:align-middle [&>td]:py-1.5"
      data-node-status={online ? "online" : "offline"}
    >
      <TableCell className="w-16 !align-middle" data-label={t("common.sort", "排序")}>
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
      <TableCell className="overflow-hidden !align-middle" data-label={t("admin.nodeTable.name")}>
        <DetailView node={node} online={online} />
      </TableCell>
      <TableCell className="!align-middle" data-label={t("admin.nodeTable.network", "网络")}>
        <div className="flex min-w-0 flex-col text-sm leading-[1.125rem] text-muted-foreground">
          <div className="flex min-w-0 items-center gap-1">
            <span className="truncate tabular-nums">IPv4 {node.ipv4 || "--"}</span>
            {node.ipv4 && (
              <button
                type="button"
                className="inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-[var(--accent-a3)] hover:text-[var(--accent-11)]"
                onClick={() => copy(node.ipv4)}
                aria-label={t("copy", "复制")}
                title={t("copy", "复制")}
              >
                <Copy size={13} />
              </button>
            )}
          </div>
          {node.ipv6 && (
          <div className="flex min-w-0 items-center gap-1" title={node.ipv6}>
            <span className="truncate tabular-nums">
              IPv6 {node.ipv6 ? compactIPv6(node.ipv6) : "--"}
            </span>
              <button
                type="button"
                className="inline-flex size-5 shrink-0 items-center justify-center rounded hover:bg-[var(--accent-a3)] hover:text-[var(--accent-11)]"
                onClick={() => copy(node.ipv6)}
                aria-label={t("copy", "复制")}
                title={t("copy", "复制")}
              >
                <Copy size={13} />
              </button>
          </div>
          )}
        </div>
      </TableCell>
      <TableCell className="!align-middle" data-label={t("admin.nodeTable.agent", "Agent")}>
        <span className="block truncate text-sm leading-5 text-muted-foreground" title={publicVersion(node.version) || "--"}>
          {publicVersion(node.version) || "--"}
        </span>
      </TableCell>
      <TableCell className="!align-middle" data-label={t("common.group", "分组")}>
        <span className="block truncate text-sm font-normal text-muted-foreground" title={node.group || ""}>
          {node.group || "--"}
        </span>
      </TableCell>
      <TableCell className="!align-middle" data-label={t("common.remark", "备注")}>
        <span className="block whitespace-normal break-words text-sm text-muted-foreground" title={node.remark || ""}>
          {node.remark || "--"}
        </span>
      </TableCell>
      <TableCell className="!align-middle" data-label={t("admin.nodeTable.billing")}>
        <PriceTags
          className="[&_label]:!text-xs"
          price={node.price}
          billing_cycle={node.billing_cycle}
          expired_at={node.expired_at}
          currency={node.currency}
          tags={node.tags || ""}
        />
      </TableCell>
      <TableCell className="!align-middle" data-label={t("common.action", "操作")}>
        <ActionButtons node={node} settings={settings} />
      </TableCell>
    </TableRow>
  );
});
SortableRow.displayName = "SortableRow";

const NodeTable = ({
  nodes,
  settings,
  onlineSet,
  reorderEnabled,
}: {
  nodes: NodeDetail[];
  settings: any;
  onlineSet: ReadonlySet<string>;
  reorderEnabled: boolean;
}) => {
  const { t } = useTranslation();
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
      className={`admin-responsive-table-wrap overflow-x-auto overflow-y-hidden rounded-md border border-[var(--gray-a5)] ${
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
        <Table className="admin-responsive-table admin-node-table min-w-[1280px] table-fixed text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[4%]">
                <span className="sr-only">{t("common.sort", "排序")}</span>
              </TableHead>
              <TableHead className="w-[15%]">{t("admin.nodeTable.name")}</TableHead>
              <TableHead className="w-[16%]">
                {t("admin.nodeTable.network", "网络")}
              </TableHead>
              <TableHead className="w-[6%]">
                {t("admin.nodeTable.agent", "Agent")}
              </TableHead>
              <TableHead className="w-[7%]">
                {t("common.group", "分组")}
              </TableHead>
              <TableHead className="w-[11%]">
                {t("common.remark", "备注")}
              </TableHead>
              <TableHead className="w-[19%]">{t("admin.nodeTable.billing")}</TableHead>
              <TableHead className="w-[23%]">{t("common.action", "操作")}</TableHead>
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
                  online={onlineSet.has(node.uuid)}
                  reorderEnabled={reorderEnabled}
                />
              ))}
            </SortableContext>
          </TableBody>
        </Table>
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
  return (
    <div className="flex h-10 items-center justify-start gap-1.5 max-md:h-auto max-md:flex-wrap admin-node-actions max-md:w-full">
      <RotateTokenButton node={node} />
      <GenerateCommandButton node={node} settings={settings} />
      <IconButton
        title={t("terminal.title")}
        variant="ghost"
        onClick={() => {
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
      <Dialog.Content maxWidth="720px" className="max-h-[88vh] overflow-y-auto">
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
                    <div className="overflow-x-auto rounded border">
                      <table className="w-full min-w-[560px] text-left text-sm">
                        <thead className="admin-table-header">
                          <tr>
                            <th className="px-3 py-2 font-medium">{t("admin.nodeTable.trafficCalibration.time")}</th>
                            <th className="px-3 py-2 font-medium">{t("admin.nodeTable.trafficCalibration.targetUp")}</th>
                            <th className="px-3 py-2 font-medium">{t("admin.nodeTable.trafficCalibration.targetDown")}</th>
                            <th className="px-3 py-2 font-medium">{t("admin.nodeTable.trafficCalibration.change")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {snapshot.history.map((item) => (
                            <tr key={item.calibration_id} className="border-t">
                              <td className="whitespace-nowrap px-3 py-2">{new Date(item.created_at).toLocaleString()}</td>
                              <td className="whitespace-nowrap px-3 py-2">{formatBytes(item.target.up)}</td>
                              <td className="whitespace-nowrap px-3 py-2">{formatBytes(item.target.down)}</td>
                              <td className="whitespace-nowrap px-3 py-2">↑ {formatSignedTraffic(item.adjustment.up)} / ↓ {formatSignedTraffic(item.adjustment.down)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
      </Dialog.Content>
    </Dialog.Root>
  );
}

function RotateTokenButton({ node }: { node: NodeDetail }) {
  const { t } = useTranslation();
  const { refresh } = useNodeDetails();
  const [open, setOpen] = React.useState(false);
  const [twoFactorCode, setTwoFactorCode] = React.useState("");
  const [error, setError] = React.useState("");
  const [rotating, setRotating] = React.useState(false);

  const rotateToken = async () => {
    setRotating(true);
    setError("");
    try {
      const response = await fetch("/api/admin/client/token/rotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uuid: node.uuid,
          ...(twoFactorCode ? { "2fa_code": twoFactorCode } : {}),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            payload?.message === "Invalid 2FA code"
              ? "动态口令无效"
              : "请输入动态口令",
          );
        }
        throw new Error(localizeTokenRotationError(payload?.message));
      }
      if (!(payload?.data?.token || payload?.token)) {
        throw new Error("Server 未返回新 Token");
      }
      setTwoFactorCode("");
      setOpen(false);
      toast.success("Token 已重置，请使用新指令更新 Agent；新 Token 连接后旧 Token 自动失效");
      refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Token 重置失败");
    } finally {
      setRotating(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <IconButton
        type="button"
        size="2"
        variant="ghost"
        title={t("admin.nodeTable.rotateToken", "重置 Token")}
        aria-label={t("admin.nodeTable.rotateToken", "重置 Token")}
        onClick={() => setOpen(true)}
      >
        <RotateCw size={18} />
      </IconButton>
      <Dialog.Content maxWidth="440px">
        <Dialog.Title>
          {t("admin.nodeTable.rotateToken", "重置 Token")}
        </Dialog.Title>
        <Dialog.Description>
          {t(
            "admin.nodeTable.rotateTokenDescription",
            "生成新 Token 后，旧 Token 最多保留 24 小时；新 Token 首次成功连接后旧 Token 会立即失效。",
          )}
          <br />
          {t(
            "admin.nodeTable.rotateTokenInstructions",
            "重置后在节点上重新执行更新后的部署指令即可，无需手动卸载；自动更新只替换程序文件，不会修改 Token。",
          )}
        </Dialog.Description>
        <Flex direction="column" gap="2">
          <label className="text-sm font-normal">
            {t(
              "admin.nodeTable.twoFactorCode",
              "动态口令（未开启 2FA 可留空）",
            )}
          </label>
          <TextField.Root
            value={twoFactorCode}
            inputMode="numeric"
            autoFocus
            onChange={(event) =>
              setTwoFactorCode(event.target.value.replace(/\D/g, ""))
            }
            onKeyDown={(event) =>
              event.key === "Enter" && !rotating && void rotateToken()
            }
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </Flex>
        <Flex gap="2" justify="end" mt="4">
          <Button variant="soft" onClick={() => setOpen(false)}>
            {t("common.cancel", "取消")}
          </Button>
          <Button
            color="orange"
            disabled={rotating}
            onClick={() => void rotateToken()}
          >
            {rotating
              ? t("common.loading", "处理中...")
              : t("admin.nodeTable.confirmRotateToken", "确认重置")}
          </Button>
        </Flex>
      </Dialog.Content>
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
      <Dialog.Content className="admin-install-dialog">
        <Dialog.Title>{t("delete")}</Dialog.Title>
        <Dialog.Description>
          {t("admin.nodeTable.confirmDelete")}
        </Dialog.Description>
        <Flex justify="end" gap="2" mt="4">
          <Dialog.Trigger>
            <Button variant="soft">{t("admin.nodeTable.cancel")}</Button>
          </Dialog.Trigger>
          <Button disabled={deleting} color="red" onClick={handleDelete}>
            {t("admin.nodeTable.confirmDelete")}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
type InstallOptions = {
  disableWebSsh: boolean;
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
function GenerateCommandButton({ node, settings }: { node: NodeDetail, settings: any }) {
  const { t } = useTranslation();
  const { refresh } = useNodeDetails();
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
    disableWebSsh: false,
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
  const [savingResetDay, setSavingResetDay] = React.useState(false);

  React.useEffect(() => {
    setEnableMonthRotate(initialResetDay !== "");
    setInstallOptions((previous) => ({
      ...previous,
      monthRotate: initialResetDay,
    }));
  }, [node.uuid, initialResetDay]);

  const selectedTrafficResetDay = () => {
    if (!enableMonthRotate) return 0;
    const value = Number(installOptions.monthRotate);
    return Number.isInteger(value) && value >= 1 && value <= 31
      ? value
      : null;
  };

  const generateCommand = () => {
    const host = function () {
      if (!settings.script_domain) {
        return window.location.origin;
      }
      return normalizeOptionalServiceUrl(settings.script_domain);
    }();
    const token = node.token || "";
    let args = ["-e", host, "-t", token];
    // 根据安装选项生成参数
    if (installOptions.disableWebSsh) {
      args.push("--disable-web-ssh");
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
    let scriptFile = "install.sh";
    if (selectedPlatform === "windows") {
      scriptFile = "install.ps1";
    }
    let scriptUrl =
      `https://raw.githubusercontent.com/raymao96/komari-agent/refs/heads/github-nuomiiiii/${scriptFile}`;
    if (enableGhproxy) {
      if (enableGhproxy && ghproxy) {
        scriptUrl = scriptUrl.slice(8); // 去掉 https://
        if (ghproxy.endsWith("/")) {
          scriptUrl = `${ghproxy}${scriptUrl}`;
        } else {
          scriptUrl = `${ghproxy}/${scriptUrl}`;
        }
        if (!scriptUrl.startsWith("http")) {
          scriptUrl = `http://${scriptUrl}`;
        }
      }
    }
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
          `docker run -d --name komari-agent --restart=always ` +
          `ghcr.io/raymao96/komari-agent:latest ` +
          quoteShellArgs(dockerArgs);
        break;
      }
    }
    return finalCommand;
  };

  const saveAndCopyCommand = async () => {
    const trafficResetDay = selectedTrafficResetDay();
    if (trafficResetDay === null) {
      toast.error(
        t(
          "admin.nodeTable.invalidMonthRotate",
          "网络统计月重置日必须是 1 到 31 的整数",
        ),
      );
      return;
    }

    setSavingResetDay(true);
    try {
      if (trafficResetDay !== (node.traffic_reset_day ?? 0)) {
        const response = await fetch(`/api/admin/client/${node.uuid}/edit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ traffic_reset_day: trafficResetDay }),
        });
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `HTTP ${response.status}`);
        }
        refresh();
      }

      await navigator.clipboard.writeText(generateCommand());
      toast.success(
        t(
          "admin.nodeTable.installCommandSaved",
          "配置已保存，指令已复制到剪贴板",
        ),
      );
    } catch (err) {
      console.error("Failed to save install options or copy command:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : t("admin.nodeTable.installCommandSaveFailed", "保存配置失败"),
      );
    } finally {
      setSavingResetDay(false);
    }
  };
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <IconButton variant="ghost" title={t("admin.nodeTable.installCommand")}>
          <Download size="18" />
        </IconButton>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>
          {t("admin.nodeTable.installCommand", "一键部署指令")}
        </Dialog.Title>
        <div className="flex flex-col gap-4">
          <SegmentedControl.Root
            className="admin-install-platforms"
            value={selectedPlatform}
            onValueChange={(value) => setSelectedPlatform(value as Platform)}
          >
            <SegmentedControl.Item value="linux">Linux</SegmentedControl.Item>
            <SegmentedControl.Item value="windows">
              Windows
            </SegmentedControl.Item>
            <SegmentedControl.Item value="macos">macOS</SegmentedControl.Item>
            <SegmentedControl.Item value="docker">Docker</SegmentedControl.Item>
          </SegmentedControl.Root>

          <Flex direction="column" gap="2">
            <label className="text-base font-bold">
              {t("admin.nodeTable.installOptions", "安装选项")}
            </label>
            <div className="admin-install-options-grid grid grid-cols-2 gap-2">
              <Flex gap="2" align="center">
                <Checkbox
                  checked={installOptions.disableWebSsh}
                  onCheckedChange={(checked) => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      disableWebSsh: Boolean(checked),
                    }));
                  }}
                />
                <label
                  className="text-sm font-normal"
                  onClick={() => {
                    setInstallOptions((prev) => ({
                      ...prev,
                      disableWebSsh: !prev.disableWebSsh,
                    }));
                  }}
                >
                  {t("admin.nodeTable.disableWebSsh")}
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
            <Flex direction="column" gap="2" className="[&_label]:font-normal">
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
                    "安装目录，为空则使用默认目录(/opt/komari-agent)"
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
                    "服务名称，为空则使用默认名称(komari-agent)"
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
                  {t("admin.nodeTable.monthRotate", "网络统计月重置")}
                </label>
              </Flex>
              {enableMonthRotate && (
                <TextField.Root
                  placeholder="1"
                  type="number"
                  min="1"
                  max="31"
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
          <Flex direction="column" gap="2">
            <label className="text-base font-bold">
              {t("admin.nodeTable.generatedCommand", "生成的指令")}
            </label>
            <div className="relative">
              <TextArea
                disabled
                className="w-full"
                style={{ minHeight: "80px" }}
                value={generateCommand()}
              />
            </div>
          </Flex>
          <Flex justify="center">
            <Button
              style={{ width: "100%" }}
              disabled={savingResetDay || selectedTrafficResetDay() === null}
              onClick={saveAndCopyCommand}
            >
              <Copy size={16} />
              {t("copy")}
            </Button>
          </Flex>
        </div>
      </Dialog.Content>
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
  const publicRemarkRef = React.useRef<HTMLTextAreaElement>(null);
  const privateRemarkRef = React.useRef<HTMLTextAreaElement>(null);
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
    setRegionOverride(getRegionCode(node.region_override ?? ""));
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
        remark: privateRemarkRef.current?.value,
        public_remark: publicRemarkRef.current?.value,
        group: groupRef.current?.value,
        tags: tagsRef.current?.value,
        hidden,
      };
      if (traffic_limit !== (node.traffic_limit || 0)) {
        payload.traffic_limit = traffic_limit;
      }
      if (traffic_limit_type !== (node.traffic_limit_type || "sum")) {
        payload.traffic_limit_type = traffic_limit_type;
      }
      if (trafficResetDay !== (node.traffic_reset_day ?? 0)) {
        payload.traffic_reset_day = trafficResetDay;
      }
      if (regionOverride !== getRegionCode(node.region_override ?? "")) {
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
      <Dialog.Content>
        <Dialog.Title>{t("admin.nodeEdit.editInfo", "编辑信息")}</Dialog.Title>
        <div className="flex flex-col gap-4">
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
              {t("admin.nodeEdit.token", "Token 令牌")}
            </label>
            <TextField.Root
              value={node.token}
              placeholder={t("admin.nodeEdit.tokenPlaceholder", "请输入 Token")}
              readOnly
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-muted-foreground">
              {t("admin.nodeEdit.regionOverride", "国家图标")}
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
              {t("common.group")}
            </label>
            <TextField.Root defaultValue={node.group} ref={groupRef} />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-muted-foreground">
              {t("admin.nodeEdit.remark", "私有备注")}
            </label>
            <TextArea
              defaultValue={node.remark}
              ref={privateRemarkRef}
              resize={"vertical"}
              placeholder={t(
                "admin.nodeEdit.remarkPlaceholder",
                "请输入私有备注"
              )}
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-muted-foreground">
              {t("admin.nodeEdit.publicRemark", "公开备注")}
            </label>
            <TextArea
              defaultValue={node.public_remark}
              resize={"vertical"}
              placeholder={t(
                "admin.nodeEdit.publicRemarkPlaceholder",
                "请输入公开备注"
              )}
              ref={publicRemarkRef}
            />
          </div>
          <div>
            <SettingCardSwitch
              title={t("admin.nodeEdit.hidden")}
              description={t("admin.nodeEdit.hidden_description")}
              defaultChecked={hidden}
              onChange={setHidden}
            />
          </div>
          <SettingCardCollapse title={t("admin.nodeEdit.trafficLimit")}>
            <div className="space-y-2 pb-3 pt-2">
              <label className="block text-base font-semibold leading-6">
                {t("admin.nodeEdit.trafficResetDay", "流量重置日")}
              </label>
              <TextField.Root
                aria-label={t("admin.nodeEdit.trafficResetDay")}
                type="number"
                min="0"
                max="31"
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
              defaultValue={node.traffic_limit_type || "max"}
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
          </SettingCardCollapse>
        </div>
        <Flex gap="2" justify={"end"} className="mt-4">
          <Button
            type="submit"
            className="w-full"
            disabled={saving}
            onClick={save}
          >
            {saving
              ? t("admin.nodeEdit.waiting", "等待...")
              : t("save", "保存")}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function ReadOnlyDetailField({
  label,
  value,
  copyable = false,
  mono = false,
}: {
  label: React.ReactNode;
  value?: string | number | null;
  copyable?: boolean;
  mono?: boolean;
}) {
  const { t } = useTranslation();
  const displayValue = value === undefined || value === null || value === "" ? "-" : String(value);
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <TextField.Root
        value={displayValue}
        readOnly
        title={displayValue}
        className={`w-full bg-[var(--color-panel-solid)] ${mono ? "[&_input]:font-mono [&_input]:text-[13px]" : ""}`}
      >
        {copyable && displayValue !== "-" ? (
          <TextField.Slot side="right">
            <IconButton
              type="button"
              size="1"
              variant="ghost"
              color="gray"
              title={t("copy", "复制")}
              aria-label={t("copy", "复制")}
              onClick={() => {
                navigator.clipboard.writeText(displayValue);
                toast.success(t("copy_success"));
              }}
            >
              <Copy size={14} />
            </IconButton>
          </TextField.Slot>
        ) : null}
      </TextField.Root>
    </div>
  );
}

function DetailView({ node, online }: { node: NodeDetail; online: boolean }) {
  const { t } = useTranslation();
  const dialogContentRef = React.useRef<HTMLDivElement>(null);
  const statusLabel = online
    ? t("nodeCard.online", "在线")
    : t("nodeCard.offline", "离线");
  const formatDateTime = (value?: string) =>
    value ? new Date(value).toLocaleString() : "-";

  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <button
          type="button"
          className="flex w-full min-w-0 items-start gap-2 text-left"
        >
          <span className="admin-node-country-flag">
            <Flag flag={node.region} compact />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="block max-w-full truncate text-sm font-semibold leading-6 hover:underline">
              {node.name}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: online ? "var(--green-9)" : "var(--red-9)" }}
              />
              {statusLabel}
            </span>
          </span>
        </button>
      </Dialog.Trigger>
      <Dialog.Content
        ref={dialogContentRef}
        tabIndex={-1}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          dialogContentRef.current?.focus({ preventScroll: true });
        }}
        maxWidth="720px"
        className="max-h-[88vh] overflow-y-auto bg-[var(--color-panel-solid)] max-sm:w-[calc(100%-1rem)]"
        style={{ maxHeight: "88vh" }}
      >
        <div className="flex items-start gap-3">
          <span className="admin-node-detail-country-flag mt-0.5 inline-flex shrink-0 items-center justify-center">
            <Flag flag={node.region} compact />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Dialog.Title className="mb-0 truncate">{node.name}</Dialog.Title>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  color: online ? "var(--green-11)" : "var(--red-11)",
                  backgroundColor: online ? "var(--green-a3)" : "var(--red-a3)",
                }}
              >
                <span className="size-1.5 rounded-full" style={{ backgroundColor: online ? "var(--green-9)" : "var(--red-9)" }} />
                {statusLabel}
              </span>
            </div>
            <Dialog.Description size="2" color="gray" className="mt-1">
              {t("admin.nodeDetail.machineDetail", "机器详细信息")}
            </Dialog.Description>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="border-b border-[var(--gray-a5)] pb-2 text-sm font-semibold sm:col-span-2">
            {t("admin.nodeDetail.network", "网络与客户端")}
          </div>
          <ReadOnlyDetailField label="IPv4" value={node.ipv4} copyable mono />
          <ReadOnlyDetailField label="IPv6" value={node.ipv6} copyable mono />
          <ReadOnlyDetailField label={t("admin.nodeDetail.clientVersion", "客户端版本")} value={publicVersion(node.version)} />
          <ReadOnlyDetailField label={t("admin.nodeTable.region", "国家 / 地区")} value={getRegionDisplayName(node.region)} />

          <div className="border-b border-[var(--gray-a5)] pb-2 pt-1 text-sm font-semibold sm:col-span-2">
            {t("admin.nodeDetail.system", "系统信息")}
          </div>
          <ReadOnlyDetailField label={t("admin.nodeDetail.os", "操作系统")} value={node.os} />
          <ReadOnlyDetailField label={t("admin.nodeDetail.arch", "系统架构")} value={node.arch} />
          <div className="sm:col-span-2">
            <ReadOnlyDetailField label={t("admin.nodeDetail.cpu", "处理器")} value={node.cpu_name} />
          </div>
          <ReadOnlyDetailField label={t("admin.nodeDetail.cpuCores", "CPU 核心")} value={node.cpu_cores ? `${node.cpu_cores} 核` : ""} />
          <ReadOnlyDetailField label={t("admin.nodeDetail.virtualization", "虚拟化")} value={node.virtualization} />
          <div className="sm:col-span-2">
            <ReadOnlyDetailField label={t("admin.nodeDetail.gpu", "显卡")} value={node.gpu_name} />
          </div>

          <div className="border-b border-[var(--gray-a5)] pb-2 pt-1 text-sm font-semibold sm:col-span-2">
            {t("admin.nodeDetail.resources", "硬件资源")}
          </div>
          <ReadOnlyDetailField label={t("admin.nodeDetail.memTotal", "内存")} value={formatBytes(node.mem_total)} />
          <ReadOnlyDetailField label={t("admin.nodeDetail.swapTotal", "Swap")} value={formatBytes(node.swap_total)} />
          <ReadOnlyDetailField label={t("admin.nodeDetail.diskTotal", "磁盘")} value={formatBytes(node.disk_total)} />

          <div className="border-b border-[var(--gray-a5)] pb-2 pt-1 text-sm font-semibold sm:col-span-2">
            {t("admin.nodeDetail.identity", "标识与时间")}
          </div>
          <div className="sm:col-span-2">
            <ReadOnlyDetailField label={t("admin.nodeDetail.uuid", "UUID")} value={node.uuid} copyable mono />
          </div>
          <ReadOnlyDetailField label={t("admin.nodeDetail.createdAt", "创建时间")} value={formatDateTime(node.created_at)} />
          <ReadOnlyDetailField label={t("admin.nodeDetail.updatedAt", "更新时间")} value={formatDateTime(node.updated_at)} />
        </div>

        <Flex justify="end" className="mt-5">
          <Dialog.Close>
            <Button variant="soft">{t("admin.nodeDetail.done", "完成")}</Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
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
      <Dialog.Content>
        <Dialog.Title>{t("admin.nodeTable.billing", "账单")}</Dialog.Title>
        <form onSubmit={handleSave}>
          <Flex direction="column" gap="2">
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

            <label className="font-bold flex items-center gap-1">
              {t("admin.nodeTable.billingCycle")} <Tips><span dangerouslySetInnerHTML={{ __html: t("admin.nodeTable.billingCycleTips") }}></span></Tips>
            </label>
            <SelectOrInput
            options={[
              { label: t("common.monthly"), value: "30" },
              { label: t("common.quarterly"), value: "92" },
              { label: t("common.semi_annual"), value: "184" },
              { label: t("common.annual"), value: "365" },
              { label: t("common.biennial"), value: "730" },
              { label: t("common.triennial"), value: "1095" },
              { label: t("common.quinquennial"), value: "1825" },
              { label: t("common.once"), value: "-1" },
            ]}
            type="number"
            name="billingCycle"
            value={billingCycle === "0" ? "" : billingCycle}
            onChange={setBillingCycle}
          />

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
              title={t("admin.nodeTable.autoRenewal")}
              description={t("admin.nodeTable.autoRenewalDescription")}
              defaultChecked={node.auto_renewal || false}
              onChange={setAutoRenewal}
            />
            <Button type="submit" disabled={saving}>
              {t("save")}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
