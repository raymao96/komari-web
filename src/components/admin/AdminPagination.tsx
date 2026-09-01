import React from "react";
import { useDroppable } from "@dnd-kit/core";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useTranslation } from "react-i18next";
import { adminMenuProps } from "@/components/admin/adminMenu";
import { useAdminDefaultPageSize } from "@/hooks/useAdminDefaultPageSize";
import {
  ADMIN_LIST_PAGE_SIZE,
  adminPageSizeOptions,
  normalizeAdminPageSize,
} from "@/utils/adminPagination";

export { ADMIN_LIST_PAGE_SIZE } from "@/utils/adminPagination";

export const useAdminPagination = <T,>(
  items: readonly T[],
  initialPageSize?: number,
) => {
  const defaultPageSize = useAdminDefaultPageSize();
  const followsGlobalDefault = initialPageSize === undefined;
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSizeState] = React.useState(() =>
    normalizeAdminPageSize(initialPageSize ?? defaultPageSize),
  );
  const pageSizeCustomized = React.useRef(false);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageItems = items.slice(pageStart, pageStart + pageSize);

  React.useEffect(() => {
    setPage((value) => Math.min(value, totalPages));
  }, [totalPages]);

  React.useEffect(() => {
    if (!followsGlobalDefault || pageSizeCustomized.current) return;
    setPageSizeState(defaultPageSize);
    setPage(1);
  }, [defaultPageSize, followsGlobalDefault]);

  const setPageSize = React.useCallback((value: number) => {
    pageSizeCustomized.current = true;
    setPageSizeState(normalizeAdminPageSize(value));
    setPage(1);
  }, []);

  return {
    page: currentPage,
    setPage,
    totalPages,
    pageStart,
    pageItems,
    pageSize,
    setPageSize,
  };
};

type PageButtonProps = {
  direction: "previous" | "next";
  disabled: boolean;
  label: string;
  onClick: () => void;
};

const PageButton = ({ direction, disabled, label, onClick }: PageButtonProps) => {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      className="admin-pagination-btn"
      disabled={disabled}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      <Icon sx={{ fontSize: 16 }} />
    </button>
  );
};

const PageDropButton = ({
  id,
  dragging,
  ...props
}: PageButtonProps & { id: string; dragging: boolean }) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
    disabled: props.disabled,
  });
  const Icon = props.direction === "previous" ? ChevronLeft : ChevronRight;
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`admin-pagination-btn${dragging && !props.disabled ? " is-drop-target" : ""}${isOver ? " is-over" : ""}`}
      disabled={props.disabled}
      title={props.label}
      aria-label={props.label}
      onClick={props.onClick}
    >
      <Icon sx={{ fontSize: 16 }} />
    </button>
  );
};

export const AdminPagination = ({
  page,
  total,
  onPageChange,
  pageSize = ADMIN_LIST_PAGE_SIZE,
  onPageSizeChange,
  previousDropId,
  nextDropId,
  dragging = false,
  summary,
  showSummary = true,
}: {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  previousDropId?: string;
  nextDropId?: string;
  dragging?: boolean;
  summary?: React.ReactNode;
  showSummary?: boolean;
}) => {
  const { t } = useTranslation();
  const [pageSizeAnchor, setPageSizeAnchor] = React.useState<HTMLElement | null>(null);
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageSizeOptions = adminPageSizeOptions();
  const usesCustomPageSize = !pageSizeOptions.includes(pageSize);
  const previousProps: PageButtonProps = {
    direction: "previous",
    disabled: currentPage <= 1,
    label: t("admin.nodeTable.previousPage", "上一页"),
    onClick: () => onPageChange(Math.max(1, currentPage - 1)),
  };
  const nextProps: PageButtonProps = {
    direction: "next",
    disabled: currentPage >= totalPages,
    label: t("admin.nodeTable.nextPage", "下一页"),
    onClick: () => onPageChange(Math.min(totalPages, currentPage + 1)),
  };

  return (
    <div className="admin-pagination px-3 py-1.5">
      {showSummary ? (
        <span className="admin-pagination-text">
          {summary ??
            t("admin.nodeTable.pageSummary", {
              start: pageStart + 1,
              end: Math.min(pageStart + pageSize, total),
              total,
              defaultValue: "显示 {{start}}-{{end}}，共 {{total}} 台",
            })}
        </span>
      ) : null}
      {onPageSizeChange ? (
        <>
          <button
            type="button"
            className="admin-pagination-size"
            aria-label={t("admin.nodeTable.pageSize", "每页条数")}
            aria-haspopup="listbox"
            aria-expanded={Boolean(pageSizeAnchor)}
            onClick={(event) => setPageSizeAnchor(event.currentTarget)}
          >
            <span className="admin-pagination-text">
              {pageSize} {t("admin.nodeTable.itemsPerPage", "条/页")}
            </span>
          </button>
          <Menu
            {...adminMenuProps}
            anchorEl={pageSizeAnchor}
            open={Boolean(pageSizeAnchor)}
            onClose={() => setPageSizeAnchor(null)}
          >
            {(usesCustomPageSize ? [pageSize, ...pageSizeOptions.filter((option) => option !== pageSize)] : pageSizeOptions).map((option) => (
              <MenuItem
                key={option}
                selected={option === pageSize}
                onClick={() => {
                  onPageSizeChange(option);
                  setPageSizeAnchor(null);
                }}
              >
                {option} {t("admin.nodeTable.itemsPerPage", "条/页")}
              </MenuItem>
            ))}
          </Menu>
        </>
      ) : null}
      <span className="admin-pagination-nav">
        {previousDropId ? (
          <PageDropButton id={previousDropId} dragging={dragging} {...previousProps} />
        ) : (
          <PageButton {...previousProps} />
        )}
        <span className="admin-pagination-text">
          {currentPage} / {totalPages}
        </span>
        {nextDropId ? (
          <PageDropButton id={nextDropId} dragging={dragging} {...nextProps} />
        ) : (
          <PageButton {...nextProps} />
        )}
      </span>
    </div>
  );
};
