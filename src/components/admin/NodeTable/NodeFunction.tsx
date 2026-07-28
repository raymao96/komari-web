import * as React from "react";
import { z } from "zod";
import { schema } from "@/components/admin/NodeTable/schema/node";
import { DataTableRefreshContext } from "@/components/admin/NodeTable/schema/DataTableRefreshContext";
import { Terminal, Trash2, Copy, Download, DollarSign, RotateCw } from "lucide-react";
import { t } from "i18next";
import type { Row } from "@tanstack/react-table";
import { EditDialog } from "./NodeEditDialog";
import { quotePowerShellArg, quoteShellArgs } from "@/utils/shellQuote";
import { openRemoteTerminal } from "@/utils/remoteLaunch";
import { localizeTokenRotationError } from "@/utils/tokenRotation";
import {
  Button,
  Checkbox,
  Dialog,
  Flex,
  IconButton,
  SegmentedControl,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { toast } from "sonner";

async function removeClient(uuid: string) {
  await fetch(`/api/admin/client/${uuid}/remove`, {
    method: "POST",
  });
}

type InstallOptions = {
  disableWebSsh: boolean;
  disableAutoUpdate: boolean;
  ignoreUnsafeCert: boolean;
  ghproxy: string;
  dir: string;
  serviceName: string;
};

type Platform = "linux" | "windows" | "macos";

export function ActionsCell({ row }: { row: Row<z.infer<typeof schema>> }) {
  const refreshTable = React.useContext(DataTableRefreshContext);
  const [removing, setRemoving] = React.useState(false);
  const [selectedPlatform, setSelectedPlatform] =
    React.useState<Platform>("linux");
  const [activeToken, setActiveToken] = React.useState(row.original.token ?? "");
  const [rotateTokenOpen, setRotateTokenOpen] = React.useState(false);
  const [rotateTokenCode, setRotateTokenCode] = React.useState("");
  const [rotateTokenError, setRotateTokenError] = React.useState("");
  const [rotatingToken, setRotatingToken] = React.useState(false);
  const [installOptions, setInstallOptions] = React.useState<InstallOptions>({
    disableWebSsh: false,
    disableAutoUpdate: false,
    ignoreUnsafeCert: false,
    ghproxy: "",
    dir: "",
    serviceName: "",
  });

  const generateCommand = () => {
    const host = window.location.origin;
    const token = activeToken;
    const args: string[] = ["-e", host, "-t", token];
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
    const trafficResetDay = Number(row.original.traffic_reset_day);
    if (Number.isInteger(trafficResetDay) && trafficResetDay >= 1 && trafficResetDay <= 31) {
      args.push("--month-rotate", String(trafficResetDay));
    }
    const ghproxy = installOptions.ghproxy.trim();
    if (ghproxy) {
      const finalGhproxy = ghproxy.startsWith("http")
        ? ghproxy
        : `http://${ghproxy}`;
      args.push(`--install-ghproxy`);
      args.push(finalGhproxy);
    }
    const installDir = installOptions.dir.trim();
    if (installDir) {
      args.push(`--install-dir`);
      args.push(installDir);
    }
    const serviceName = installOptions.serviceName.trim();
    if (serviceName) {
      args.push(`--install-service-name`);
      args.push(serviceName);
    }

    let finalCommand = "";
    switch (selectedPlatform) {
      case "linux":
        finalCommand =
          `wget -qO- https://raw.githubusercontent.com/raymao96/komari-agent/refs/heads/github-nuomiiiii/install.sh | sudo bash -s -- ` +
          quoteShellArgs(args);
        break;
      case "windows":
        finalCommand =
          `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ` +
          `"iwr 'https://raw.githubusercontent.com/raymao96/komari-agent/refs/heads/github-nuomiiiii/install.ps1'` +
          ` -UseBasicParsing -OutFile 'install.ps1'; &` +
          ` '.\\install.ps1'`;
        args.forEach((arg) => {
          finalCommand += ` ${quotePowerShellArg(arg)}`;
        });
        finalCommand += `"`;
        break;
      case "macos":
        finalCommand =
          `zsh <(curl -sL https://raw.githubusercontent.com/raymao96/komari-agent/refs/heads/github-nuomiiiii/install.sh) ` +
          quoteShellArgs(args);
        break;
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

  const rotateToken = async () => {
    setRotatingToken(true);
    setRotateTokenError("");
    try {
      const response = await fetch("/api/admin/client/token/rotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uuid: row.original.uuid,
          ...(rotateTokenCode ? { "2fa_code": rotateTokenCode } : {}),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(payload?.message === "Invalid 2FA code" ? "动态口令无效" : "请输入动态口令");
        }
        throw new Error(localizeTokenRotationError(payload?.message));
      }
      const token = payload?.data?.token || payload?.token;
      if (!token) throw new Error("Server 未返回新 Token");
      setActiveToken(token);
      setRotateTokenCode("");
      setRotateTokenOpen(false);
      toast.success("Token 已重置，请使用新指令更新 Agent；新 Token 连接后旧 Token 自动失效");
      refreshTable?.();
    } catch (error) {
      setRotateTokenError(error instanceof Error ? error.message : "Token 重置失败");
    } finally {
      setRotatingToken(false);
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      <IconButton
        type="button"
        size="1"
        variant="soft"
        color="orange"
        title={t("admin.nodeTable.rotateToken", "重置 Token")}
        aria-label={t("admin.nodeTable.rotateToken", "重置 Token")}
        onClick={() => setRotateTokenOpen(true)}
      >
        <RotateCw size={14} />
      </IconButton>
      <Dialog.Root>
        <Dialog.Trigger>
          <IconButton variant="ghost">
            <Download className="p-1" />
          </IconButton>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>
            {t("admin.nodeTable.installCommand", "一键部署指令")}
          </Dialog.Title>
          <div className="flex flex-col gap-4">
            <SegmentedControl.Root
              value={selectedPlatform}
              onValueChange={(value) => setSelectedPlatform(value as Platform)}
            >
              <SegmentedControl.Item value="linux">Linux</SegmentedControl.Item>
              <SegmentedControl.Item value="windows">
                Windows
              </SegmentedControl.Item>
              <SegmentedControl.Item value="macos">macOS</SegmentedControl.Item>
            </SegmentedControl.Root>

            <Flex direction="column" gap="2">
              <label className="text-sm font-normal">
                {t("admin.nodeTable.token", "节点 Token")}
              </label>
              <Flex gap="2">
                <TextField.Root className="flex-1" value={activeToken} readOnly />
                <Button type="button" variant="soft" color="orange" onClick={() => setRotateTokenOpen(true)}>
                  <RotateCw size={15} />
                  {t("admin.nodeTable.rotateToken", "重置 Token")}
                </Button>
              </Flex>
            </Flex>

            <Flex direction="column" gap="2">
              <label className="text-base font-bold">
                {t("admin.nodeTable.installOptions", "安装选项")}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Flex gap="2">
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
                    {t("admin.nodeTable.disableWebSsh", "禁用 WebSSH")}
                  </label>
                </Flex>
                <Flex gap="2">
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
                <Flex gap="2">
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
              </div>
              <Flex direction="column" gap="2" className="[&_label]:font-normal">
                <label className="text-sm font-bold">
                  {t("admin.nodeTable.ghproxy", "GitHub 代理")}
                </label>
                <TextField.Root
                  placeholder={t(
                    "admin.nodeTable.ghproxy_placeholder",
                    "GitHub 代理，为空则不使用代理"
                  )}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      ghproxy: e.target.value,
                    }))
                  }
                ></TextField.Root>
                <label className="text-sm font-bold">
                  {t("admin.nodeTable.install_dir", "安装目录")}
                </label>
                <TextField.Root
                  placeholder={t(
                    "admin.nodeTable.install_dir_placeholder",
                    "安装目录，为空则使用默认目录(/opt/komari-agent)"
                  )}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      dir: e.target.value,
                    }))
                  }
                ></TextField.Root>
                <label className="text-sm font-bold">
                  {t("admin.nodeTable.serviceName", "服务名称")}
                </label>
                <TextField.Root
                  placeholder={t(
                    "admin.nodeTable.serviceName_placeholder",
                    "服务名称，为空则使用默认名称(komari-agent)"
                  )}
                  onChange={(e) =>
                    setInstallOptions((prev) => ({
                      ...prev,
                      serviceName: e.target.value,
                    }))
                  }
                ></TextField.Root>
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
                onClick={() => copyToClipboard(generateCommand())}
              >
                <Copy size={16} />
                {t("copy")}
              </Button>
            </Flex>
          </div>
        </Dialog.Content>
      </Dialog.Root>
      <Dialog.Root open={rotateTokenOpen} onOpenChange={setRotateTokenOpen}>
        <Dialog.Content maxWidth="440px">
          <Dialog.Title>{t("admin.nodeTable.rotateToken", "重置 Token")}</Dialog.Title>
          <Dialog.Description>
            {t("admin.nodeTable.rotateTokenDescription", "生成新 Token 后，旧 Token 最多保留 24 小时；新 Token 首次成功连接后旧 Token 会立即失效。")}
            <br />
            {t("admin.nodeTable.rotateTokenInstructions", "重置后在节点上重新执行更新后的部署指令即可，无需手动卸载；自动更新只替换程序文件，不会修改 Token。")}
          </Dialog.Description>
          <Flex direction="column" gap="2">
            <label className="text-sm font-normal">
              {t("admin.nodeTable.twoFactorCode", "动态口令（未开启 2FA 可留空）")}
            </label>
            <TextField.Root
              value={rotateTokenCode}
              inputMode="numeric"
              autoFocus
              onChange={(event) => setRotateTokenCode(event.target.value.replace(/\D/g, ""))}
              onKeyDown={(event) => event.key === "Enter" && !rotatingToken && void rotateToken()}
            />
            {rotateTokenError && <p className="text-sm text-red-500">{rotateTokenError}</p>}
          </Flex>
          <Flex gap="2" justify="end" mt="4">
            <Button variant="soft" onClick={() => setRotateTokenOpen(false)}>{t("common.cancel", "取消")}</Button>
            <Button color="orange" disabled={rotatingToken} onClick={() => void rotateToken()}>
              {rotatingToken ? t("common.loading", "处理中...") : t("admin.nodeTable.confirmRotateToken", "确认重置")}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
      <IconButton
        variant="ghost"
        onClick={() => {
          if (!openRemoteTerminal(row.original.uuid)) toast.error("浏览器阻止了远程管理窗口");
        }}
      >
        <Terminal className="p-1" />
      </IconButton>
      {/** Edit Button */}
      <EditDialog item={row.original} />
      {/** Edit Money */}
      <Dialog.Root> 
        <Dialog.Trigger>
          <IconButton variant="ghost">
           <DollarSign className="p-1" />
          </IconButton>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>{t("admin.nodeTable.editNodePrice")}</Dialog.Title>
          <label>
            123
          </label>
        </Dialog.Content>
      </Dialog.Root>
      {/** Delete Button */}
      <Dialog.Root>
        <Dialog.Trigger>
          <IconButton variant="ghost" color="red" className="text-destructive">
            <Trash2 className="p-1" />
          </IconButton>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>{t("admin.nodeTable.confirmDelete")}</Dialog.Title>
          <Dialog.Description>
            {t("admin.nodeTable.cannotUndo")}
          </Dialog.Description>
          <Flex gap="2" justify={"end"}>
            <Dialog.Close>
              <Button variant="soft">{t("admin.nodeTable.cancel")}</Button>
            </Dialog.Close>
            <Dialog.Trigger>
              <Button
                disabled={removing}
                color="red"
                onClick={async () => {
                  setRemoving(true);
                  await removeClient(row.original.uuid);
                  setRemoving(false);
                  if (refreshTable) refreshTable();
                }}
              >
                {removing
                  ? t("admin.nodeTable.deleting")
                  : t("admin.nodeTable.confirm")}
              </Button>
            </Dialog.Trigger>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}

