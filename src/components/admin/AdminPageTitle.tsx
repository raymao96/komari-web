import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export default function AdminPageTitle({
  children,
  description,
}: {
  children: ReactNode;
  description?: ReactNode;
}) {
  return (
    <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 700, fontSize: 24, letterSpacing: 0, lineHeight: "36px" }}
        >
          {children}
        </Typography>
        {description ? (
          <Typography
            variant="body2"
            sx={{
              mt: 0.5,
              maxWidth: 720,
              fontSize: 14,
              fontWeight: 400,
              lineHeight: 1.6,
              color: "text.secondary",
            }}
          >
          {description}
        </Typography>
      ) : null}
    </Box>
  );
}

export function AdminSectionTitle({ children }: { children: ReactNode }) {
  return (
    <Typography
      variant="subtitle1"
      component="h2"
      sx={{ fontWeight: 600, lineHeight: 1.5 }}
    >
      {children}
    </Typography>
  );
}
