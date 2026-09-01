import React, { useState } from "react";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import { Info } from "@/components/admin/muiIcons";
import { AppDialogContent, Dialog } from "@/components/admin/ui";
import { useIsMobile } from "@/hooks/use-mobile";

interface TipsProps {
  size?: string;
  color?: string;
  children?: React.ReactNode;
  trigger?: React.ReactNode;
  mode?: "popup" | "dialog" | "auto";
  side?: "top" | "right" | "bottom" | "left";
  ariaLabel?: string;
}

const Tips: React.FC<TipsProps & React.HTMLAttributes<HTMLDivElement>> = ({
  size = "16",
  color = "gray",
  trigger,
  children,
  side = "bottom",
  mode = "popup",
  ariaLabel,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const isDialog = mode === "dialog" || (mode === "auto" && isMobile);
  const icon = trigger ?? <Info color={color} size={size} />;

  if (isDialog) {
    return (
      <div className="relative inline-block" {...props}>
        <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
          <Dialog.Trigger aria-label={ariaLabel}>
            <div className="flex cursor-pointer items-center justify-center rounded-full font-bold">
              {icon}
            </div>
          </Dialog.Trigger>
          <AppDialogContent>
            <div className="flex flex-col gap-2">
              <div>{children}</div>
            </div>
          </AppDialogContent>
        </Dialog.Root>
      </div>
    );
  }

  return (
    <div className="relative inline-block" {...props}>
      <Tooltip title={<Box sx={{ fontSize: 13 }}>{children}</Box>} placement={side}>
        <span
          className="inline-flex cursor-pointer items-center justify-center rounded-full font-bold"
          aria-label={ariaLabel}
        >
          {icon}
        </span>
      </Tooltip>
    </div>
  );
};

export default Tips;
