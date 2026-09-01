import Stack from "@mui/material/Stack";
import { useOutlet } from "react-router-dom";

export default function SettingLayout() {
  const outlet = useOutlet();
  return (
    <Stack
      spacing={2.5}
      className="p-0 md:p-4"
      sx={{ width: "100%", minWidth: 0 }}
      data-admin-route-pending={outlet ? undefined : "true"}
    >
      {outlet}
    </Stack>
  );
}
