import { LITE_BLUE, LITE_NAME } from "@/theme/brand";

type LiteBrandProps = {
  size?: "sm" | "md";
  className?: string;
};

const sizeClasses = {
  sm: "text-xl",
  md: "text-2xl",
};

export default function LiteBrand({
  size = "md",
  className = "",
}: LiteBrandProps) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap leading-none ${className}`}
      aria-label={LITE_NAME}
    >
      <span
        className={`${sizeClasses[size]} font-bold leading-none`}
        style={{ color: LITE_BLUE }}
      >
        {LITE_NAME}
      </span>
    </span>
  );
}
