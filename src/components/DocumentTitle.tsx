import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { LITE_ADMIN_TITLE, LITE_NAME } from "@/theme/brand";

const ADMIN_TITLE = LITE_ADMIN_TITLE;
const PUBLIC_TITLE = LITE_NAME;

export default function DocumentTitle() {
  const { pathname } = useLocation();
  const { publicInfo } = usePublicInfo();

  useEffect(() => {
    if (pathname === "/terminal") return;

    document.title =
      pathname === "/admin" || pathname.startsWith("/admin/")
        ? ADMIN_TITLE
        : publicInfo?.sitename?.trim() || PUBLIC_TITLE;
  }, [pathname, publicInfo?.sitename]);

  return null;
}
