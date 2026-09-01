import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ExpandMore from "@mui/icons-material/ExpandMore";
import React from "react";
import type { ErrorInfo, ReactNode } from "react";

import i18n from "@/i18n/config";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Caught error in ErrorBoundary:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const message =
      this.state.error?.message ||
      i18n.t("common.unexpected_error", "An unexpected error occurred.");
    const stack = this.state.error?.stack || "";

    return (
      <Box
        sx={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          px: 2,
          py: 4,
        }}
      >
        <Stack spacing={2} sx={{ width: "100%", maxWidth: 640 }}>
          <Alert severity="error">
            <AlertTitle>
              {i18n.t("common.something_went_wrong", "Something went wrong")}
            </AlertTitle>
            {message}
          </Alert>
          {stack ? (
            <Accordion
              disableGutters
              elevation={0}
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: "8px",
                overflow: "hidden",
                "&:before": { display: "none" },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore fontSize="small" />}
                sx={{
                  flexDirection: "row-reverse",
                  justifyContent: "flex-start",
                  gap: 1,
                  minHeight: 44,
                  px: 1.5,
                  "& .MuiAccordionSummary-content": {
                    my: 0,
                    ml: 0,
                    flexGrow: 0,
                    alignItems: "center",
                  },
                  "& .MuiAccordionSummary-expandIconWrapper": {
                    display: "inline-flex",
                    alignItems: "center",
                    mr: 0,
                  },
                }}
              >
                <Typography variant="body2">
                  {i18n.t("common.view_error_details", "View error details")}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1.5,
                    borderRadius: "8px",
                    bgcolor: "action.hover",
                    color: "text.primary",
                    fontSize: 12,
                    lineHeight: 1.5,
                    overflowX: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {stack}
                </Box>
              </AccordionDetails>
            </Accordion>
          ) : null}
          <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: "wrap" }}>
            <Button
              variant="contained"
              color="error"
              onClick={() => window.location.reload()}
            >
              {i18n.t("common.reload_page", "Reload page")}
            </Button>
            <Button variant="outlined" onClick={() => { window.location.href = "/"; }}>
              {i18n.t("common.go_home", "Go to home")}
            </Button>
          </Stack>
        </Stack>
      </Box>
    );
  }
}

export default ErrorBoundary;
