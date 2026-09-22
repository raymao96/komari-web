import { useTheme } from "next-themes"
import { toast, Toaster as Sonner, type ToasterProps } from "sonner"

const SUCCESS_DURATION = 1000
const ALERT_DURATION = 2500

function withDuration(
  method: typeof toast.success,
  duration: number,
): typeof toast.success {
  const original = method.bind(toast)
  return (message, data) => original(message, { duration, ...data })
}

toast.success = withDuration(toast.success, SUCCESS_DURATION)
toast.info = withDuration(toast.info, SUCCESS_DURATION)
toast.message = withDuration(toast.message, SUCCESS_DURATION)
toast.warning = withDuration(toast.warning, ALERT_DURATION)
toast.error = withDuration(toast.error, ALERT_DURATION)

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      offset={{
        top: "calc(16px + var(--safe-area-top))",
        right: "16px",
        bottom: "16px",
        left: "16px",
      }}
      mobileOffset={{
        top: "calc(16px + var(--safe-area-top))",
        right: "16px",
        bottom: "16px",
        left: "16px",
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
