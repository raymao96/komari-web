import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ExpandMore from "@mui/icons-material/ExpandMore";
import React from "react";
import { useTranslation } from "react-i18next";
import { adminMenuProps } from "@/components/admin/adminMenu";

interface SettingCardProps {
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bordless?: boolean;
  direction?: "row" | "column" | "row-reverse" | "column-reverse";
  onHeaderClick?: () => void;
}

const compactFieldSx = {
  width: "100%",
  "& .MuiOutlinedInput-input": {
    padding: "10px 12px",
    fontSize: 14,
  },
} as const;

const multilineFieldSx = {
  ...compactFieldSx,
  "& .MuiInputBase-root": {
    alignItems: "stretch",
  },
  "& textarea": {
    resize: "vertical",
    overflow: "auto !important",
  },
} as const;

const settingActionButtonSx = {
  minHeight: 36,
  height: 36,
  px: 1.75,
  py: 0,
  fontSize: 15,
  lineHeight: 1.35,
  boxShadow: "none",
  "&:hover": { boxShadow: "none" },
} as const;

function SaveButton({
  children,
  disabled,
  hidden,
  onClick,
  buttonRef,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  hidden?: boolean;
  onClick?: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <Button
      ref={buttonRef}
      variant="contained"
      color="primary"
      disabled={disabled}
      onClick={onClick}
      sx={{
        ...settingActionButtonSx,
        display: hidden ? "none" : "inline-flex",
        alignSelf: "flex-end",
      }}
    >
      {children}
    </Button>
  );
}

export function SettingCard({
  title = "",
  description = "",
  children,
  className = "",
  direction = "column",
  bordless = false,
  onHeaderClick = () => {},
}: SettingCardProps) {
  const actionChild = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === Action,
  );

  const otherChildren = React.Children.toArray(children).filter(
    (child) => !(React.isValidElement(child) && child.type === Action),
  );
  const hasHeader = Boolean(title || description || actionChild);

  return (
    <Paper
      elevation={0}
      data-setting-card
      className={
        bordless
          ? `min-w-0 max-w-full border-0 ${className}`
          : `min-h-8 min-w-0 max-w-full ${className}`
      }
      sx={{
        display: "flex",
        flexDirection: direction,
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        border: 0,
        ...(bordless
          ? { boxShadow: "none", bgcolor: "transparent", p: 0, borderRadius: 0 }
          : {
              px: 2.5,
              py: 2,
              borderRadius: "8px",
              bgcolor: "background.paper",
              boxShadow: "none",
              border: "1px solid",
              borderColor: "divider",
            }),
      }}
    >
      {hasHeader ? (
        <Stack
          className="setting-card-header w-full min-w-0 max-w-full gap-3"
          direction="row"
          onClick={onHeaderClick}
          sx={{
            width: "100%",
            minWidth: 0,
            gap: 1.5,
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: { xs: "wrap", sm: "nowrap" },
          }}
        >
          <Stack
            direction="column"
            spacing={0.5}
            sx={{ minHeight: title || description ? 40 : 0, minWidth: 0, flex: 1, justifyContent: "center" }}
          >
            {title ? (
              <Typography
                component="label"
                sx={{
                  minWidth: 0,
                  fontSize: 15,
                  fontWeight: 600,
                  overflowWrap: "anywhere",
                }}
              >
                {title}
              </Typography>
            ) : null}
            {description ? (
              <Typography
                component="label"
                sx={{
                  minWidth: 0,
                  fontSize: 14,
                  fontWeight: 400,
                  lineHeight: 1.6,
                  color: "text.secondary",
                  overflowWrap: "anywhere",
                }}
              >
                {description}
              </Typography>
            ) : null}
          </Stack>
          {actionChild ? (
            <Box
              className="setting-card-action min-w-0 shrink-0"
              sx={{ maxWidth: "100%", ml: { xs: "auto", sm: 0 } }}
            >
              {actionChild}
            </Box>
          ) : null}
        </Stack>
      ) : null}
      {otherChildren}
    </Paper>
  );
}

function Action({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

SettingCard.Action = Action;

export function SettingCardSwitch({
  label = "",
  autoDisabled = true,
  defaultChecked,
  onChange,
  ...props
}: SettingCardProps & {
  label?: string;
  autoDisabled?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean, switchElement: HTMLButtonElement) => void;
}) {
  const switchRef = React.useRef<HTMLInputElement>(null);
  const [disabled, setDisabled] = React.useState(false);
  const [checked, setChecked] = React.useState(defaultChecked || false);

  React.useEffect(() => {
    setChecked(Boolean(defaultChecked));
  }, [defaultChecked]);

  const handleChange = (_event: React.ChangeEvent<HTMLInputElement>, next: boolean) => {
    if (autoDisabled) setDisabled(true);
    const previousValue = checked;
    setChecked(next);
    const result: unknown = onChange
      ? onChange(next, (switchRef.current ?? document.createElement("button")) as HTMLButtonElement)
      : undefined;
    if (autoDisabled) {
      const promise = result as Promise<unknown> | undefined;
      if (promise && typeof promise.then === "function") {
        promise
          .then(() => {})
          .catch(() => {
            setChecked(previousValue);
          })
          .finally(() => {
            setDisabled(false);
          });
      } else {
        setDisabled(false);
      }
    }
  };

  return (
    <SettingCard {...props} direction="column">
      <SettingCard.Action>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0, whiteSpace: "nowrap", alignItems: "center" }}>
          {label ? <Typography variant="body2">{label}</Typography> : null}
            <Switch
            slotProps={{ input: { ref: switchRef } }}
            checked={checked}
            onChange={handleChange}
            disabled={disabled}
            color="primary"
          />
        </Stack>
      </SettingCard.Action>
    </SettingCard>
  );
}

function mapButtonVariant(
  variant: "solid" | "soft" | "outline" | "ghost",
): "contained" | "outlined" | "text" {
  if (variant === "outline") return "outlined";
  if (variant === "ghost" || variant === "soft") return "text";
  return "contained";
}

export function SettingCardButton({
  label = "",
  variant = "solid",
  children,
  onClick,
  autoDisabled = true,
  ...props
}: SettingCardProps & {
  label?: string;
  variant?: "solid" | "soft" | "outline" | "ghost";
  children?: React.ReactNode;
  onClick?: (buttonElement: HTMLButtonElement) => void;
  autoDisabled?: boolean;
}) {
  const [disabled, setDisabled] = React.useState(false);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (autoDisabled) setDisabled(true);
    const result: unknown = onClick ? onClick(event.currentTarget) : undefined;
    if (autoDisabled) {
      const promise = result as Promise<unknown> | undefined;
      if (promise && typeof promise.then === "function") {
        promise.finally(() => setDisabled(false)).catch(() => {});
      } else {
        setDisabled(false);
      }
    }
  };
  return (
    <SettingCard {...props} direction="column">
      <SettingCard.Action>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          {label ? <Typography variant="body2">{label}</Typography> : null}
          <Button
            onClick={handleClick}
            variant={mapButtonVariant(variant)}
            color="primary"
            disabled={disabled}
            sx={settingActionButtonSx}
          >
            {children}
          </Button>
        </Stack>
      </SettingCard.Action>
    </SettingCard>
  );
}

export function SettingCardIconButton({
  label = "",
  children,
  onClick,
  autoDisabled = true,
  ...props
}: SettingCardProps & {
  label?: string;
  variant?: "solid" | "soft" | "outline" | "ghost";
  children?: React.ReactNode;
  onClick?: (buttonElement: HTMLButtonElement) => void;
  autoDisabled?: boolean;
}) {
  const [disabled, setDisabled] = React.useState(false);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (autoDisabled) setDisabled(true);
    const result: unknown = onClick ? onClick(event.currentTarget) : undefined;
    if (autoDisabled) {
      const promise = result as Promise<unknown> | undefined;
      if (promise && typeof promise.then === "function") {
        promise.finally(() => setDisabled(false)).catch(() => {});
      } else {
        setDisabled(false);
      }
    }
  };
  return (
    <SettingCard {...props} direction="column">
      <SettingCard.Action>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          {label ? <Typography variant="body2">{label}</Typography> : null}
          <IconButton onClick={handleClick} disabled={disabled}>
            {children}
          </IconButton>
        </Stack>
      </SettingCard.Action>
    </SettingCard>
  );
}

interface SettingCardShortTextInputProps {
  title?: string;
  description?: string;
  descriptionPlacement?: "header" | "footer";
  bordless?: boolean;
  showSaveButton?: boolean;
  label?: string;
  autoDisabled?: boolean;
  isSaving?: boolean;
  OnSave?: (
    value: string,
    inputElement: HTMLInputElement,
    buttonElement: HTMLButtonElement,
  ) => void | Promise<unknown>;
  children?: React.ReactNode | null;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  value?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
  disabled?: boolean;
  type?: React.HTMLInputTypeAttribute;
  required?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  name?: string;
  id?: string;
  className?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}

export function SettingCardShortTextInput({
  title = "",
  description = "",
  descriptionPlacement = "header",
  bordless = false,
  showSaveButton = true,
  label = "",
  autoDisabled = true,
  isSaving,
  OnSave = () => {},
  children = null,
  onChange,
  onKeyDown,
  value,
  defaultValue,
  placeholder,
  disabled,
  type = "text",
  required,
  readOnly,
  maxLength,
  minLength,
  pattern,
  autoComplete,
  autoFocus,
  name,
  id,
  className = "w-full",
  min,
  max,
  step,
  onBlur,
  inputMode,
}: SettingCardShortTextInputProps) {
  const { t } = useTranslation();
  const [internalDisabled, setInternalDisabled] = React.useState(false);
  const savingState = Boolean(isSaving) || internalDisabled;
  const normalizedValue =
    value !== undefined && value !== null ? String(value) : "";
  const normalizedDefaultValue =
    defaultValue !== undefined && defaultValue !== null
      ? String(defaultValue)
      : "";
  const [internalValue, setInternalValue] = React.useState(
    value !== undefined ? normalizedValue : normalizedDefaultValue,
  );
  const previousDefaultValueRef = React.useRef(normalizedDefaultValue);
  const currentValue = value !== undefined ? normalizedValue : internalValue;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const resolvedLabel = label || t("save");

  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(normalizedValue);
      previousDefaultValueRef.current = normalizedDefaultValue;
      return;
    }

    if (normalizedDefaultValue !== previousDefaultValueRef.current) {
      const previousDefaultValue = previousDefaultValueRef.current;
      setInternalValue((currentInternalValue) =>
        currentInternalValue === previousDefaultValue
          ? normalizedDefaultValue
          : currentInternalValue,
      );
      previousDefaultValueRef.current = normalizedDefaultValue;
    }
  }, [normalizedDefaultValue, normalizedValue, value]);

  const handleSave = () => {
    if (autoDisabled) setInternalDisabled(true);
    const valueToSave = currentValue?.toString() || "";
    const result: unknown =
      inputRef.current && buttonRef.current
        ? OnSave(valueToSave, inputRef.current, buttonRef.current)
        : undefined;
    if (autoDisabled) {
      const promise = result as Promise<unknown> | undefined;
      if (promise && typeof promise.then === "function") {
        promise.finally(() => setInternalDisabled(false)).catch(() => {});
      } else {
        setInternalDisabled(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (value === undefined) {
      setInternalValue(e.target.value);
    }
    onChange?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    onKeyDown?.(e);
  };

  const showFooterDescription =
    descriptionPlacement === "footer" &&
    description !== undefined &&
    description !== null &&
    description !== "";
  const showFooterRow =
    descriptionPlacement === "footer" &&
    (showFooterDescription || showSaveButton);
  const showHiddenFooterSaveButton =
    descriptionPlacement === "footer" &&
    !showFooterDescription &&
    !showSaveButton;

  const saveButton = (
    <SaveButton
      buttonRef={buttonRef}
      onClick={handleSave}
      hidden={!showSaveButton}
      disabled={savingState}
    >
      {resolvedLabel}
    </SaveButton>
  );

  return (
    <SettingCard
      title={title}
      description={descriptionPlacement === "footer" ? undefined : description}
      bordless={bordless}
    >
      <Stack spacing={1} sx={{ width: "100%", mt: 1, alignItems: "flex-start" }}>
        <TextField
          className={className}
          inputRef={inputRef}
          value={currentValue}
          placeholder={placeholder}
          disabled={disabled || savingState}
          type={type}
          required={required}
          slotProps={{
            htmlInput: {
              readOnly,
              maxLength,
              minLength,
              pattern,
              min,
              max,
              step,
              autoComplete,
              autoFocus,
              name,
              id,
              inputMode,
            },
          }}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          size="small"
          sx={compactFieldSx}
        />
        {children}
        {descriptionPlacement === "footer" ? (
          showFooterRow ? (
            <Stack
              direction="row"
              spacing={1.5}
              sx={{
                width: "100%",
                alignItems: "center",
                justifyContent: showFooterDescription ? "space-between" : "flex-end",
              }}
            >
              {showFooterDescription ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ minWidth: 0, flex: 1 }}
                >
                  {description}
                </Typography>
              ) : null}
              {saveButton}
            </Stack>
          ) : showHiddenFooterSaveButton ? (
            <SaveButton buttonRef={buttonRef} onClick={handleSave} hidden disabled={savingState}>
              {resolvedLabel}
            </SaveButton>
          ) : null
        ) : (
          saveButton
        )}
      </Stack>
    </SettingCard>
  );
}

export function SettingCardLongTextInput({
  title = "",
  description = "",
  descriptionPlacement = "header",
  label = "",
  defaultValue = "",
  OnSave = () => {},
  onChange,
  autoDisabled = true,
  isSaving,
  bordless = false,
  showSaveButton = true,
}: {
  title?: string;
  description?: string;
  descriptionPlacement?: "header" | "footer";
  label?: string;
  defaultValue?: string;
  OnSave?: (
    value: string,
    textAreaElement: HTMLTextAreaElement,
    buttonElement: HTMLButtonElement,
  ) => void | Promise<unknown>;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  autoDisabled?: boolean;
  isSaving?: boolean;
  bordless?: boolean;
  showSaveButton?: boolean;
}) {
  const { t } = useTranslation();
  const [disabled, setDisabled] = React.useState(false);
  const savingState = Boolean(isSaving) || disabled;
  const [value, setValue] = React.useState(defaultValue);
  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const resolvedLabel = label || t("save");

  React.useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const handleSave = () => {
    if (autoDisabled) setDisabled(true);
    const result: unknown =
      textAreaRef.current && buttonRef.current
        ? OnSave(value, textAreaRef.current, buttonRef.current)
        : undefined;
    if (autoDisabled) {
      const promise = result as Promise<unknown> | undefined;
      if (promise && typeof promise.then === "function") {
        promise.finally(() => setDisabled(false)).catch(() => {});
      } else {
        setDisabled(false);
      }
    }
  };

  const showFooterDescription =
    descriptionPlacement === "footer" &&
    description !== undefined &&
    description !== null &&
    description !== "";

  return (
    <SettingCard
      title={title}
      description={descriptionPlacement === "footer" ? undefined : description}
      bordless={bordless}
    >
      <Stack spacing={1} sx={{ width: "100%", mt: 1, alignItems: "flex-start" }}>
        <TextField
          multiline
          rows={3}
          inputRef={textAreaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            onChange?.(e as React.ChangeEvent<HTMLTextAreaElement>);
          }}
          size="small"
          sx={multilineFieldSx}
        />
        {descriptionPlacement === "footer" ? (
          showFooterDescription || showSaveButton ? (
            <Stack
              direction="row"
              spacing={1.5}
              sx={{
                width: "100%",
                alignItems: "center",
                justifyContent: showFooterDescription ? "space-between" : "flex-end",
              }}
            >
              {showFooterDescription ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ minWidth: 0, flex: 1 }}
                >
                  {description}
                </Typography>
              ) : null}
              {showSaveButton ? (
                <SaveButton buttonRef={buttonRef} onClick={handleSave} disabled={savingState}>
                  {resolvedLabel}
                </SaveButton>
              ) : null}
            </Stack>
          ) : null
        ) : showSaveButton ? (
          <SaveButton buttonRef={buttonRef} onClick={handleSave} disabled={savingState}>
            {resolvedLabel}
          </SaveButton>
        ) : null}
      </Stack>
    </SettingCard>
  );
}

export function SettingCardSelect({
  title,
  description,
  defaultValue = "",
  value,
  options = [],
  OnSave = () => {},
  autoDisabled = true,
  isSaving,
  bordless = false,
}: {
  title?: string;
  description?: string;
  defaultValue?: string;
  value?: string;
  label?: string;
  options?: { value: string; label?: string; disabled?: boolean }[];
  OnSave?: (value: string, buttonElement: HTMLButtonElement) => void;
  autoDisabled?: boolean;
  isSaving?: boolean;
  bordless?: boolean;
}) {
  const [disabled, setDisabled] = React.useState(false);
  const savingState = isSaving !== undefined ? isSaving : disabled;
  const [selectedValue, setSelectedValue] = React.useState(
    value !== undefined ? value : defaultValue,
  );
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleSave = (next: string) => {
    if (isSaving === undefined && autoDisabled) setDisabled(true);
    const previousValue = selectedValue;
    setSelectedValue(next);

    const result: unknown = buttonRef.current
      ? OnSave(next, buttonRef.current)
      : undefined;
    if (autoDisabled) {
      const promise = result as Promise<unknown> | undefined;
      if (promise && typeof promise.then === "function") {
        promise
          .catch(() => {
            setSelectedValue(previousValue);
          })
          .finally(() => {
            if (isSaving === undefined) {
              setDisabled(false);
            }
          });
      } else if (isSaving === undefined) {
        setDisabled(false);
      }
    }
  };

  return (
    <SettingCard title={title} description={description} bordless={bordless}>
      <SettingCard.Action>
        <Select
          size="small"
          value={selectedValue}
          disabled={savingState}
          onChange={(event) => handleSave(String(event.target.value))}
          inputRef={buttonRef}
          MenuProps={adminMenuProps}
          sx={{ minWidth: 140, fontSize: 14 }}
        >
          {options.map((option) => (
            <MenuItem
              disabled={option.disabled}
              key={option.value}
              value={option.value}
            >
              {option.label ? option.label : option.value}
            </MenuItem>
          ))}
        </Select>
      </SettingCard.Action>
    </SettingCard>
  );
}

export function SettingCardLabel({
  children,
}: {
  children: React.ReactNode | null;
}) {
  return (
    <Typography
      variant="subtitle1"
      component="label"
      sx={{ mt: 1, fontSize: 15, fontWeight: 600, lineHeight: 1.5, color: "text.primary" }}
    >
      {children}
    </Typography>
  );
}

export function SettingCardCollapse({
  title,
  description,
  defaultOpen = false,
  children,
  bordless = false,
}: {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  bordless?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <SettingCard
      title={title}
      description={description}
      onHeaderClick={() => setOpen(!open)}
      bordless={bordless}
    >
      <SettingCard.Action>
        <IconButton
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="collapsible-content"
        >
          <ExpandMore
            sx={{
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          />
        </IconButton>
      </SettingCard.Action>
      <Collapse in={open} timeout={200} sx={{ width: "100%" }}>
        <Box id="collapsible-content" sx={{ width: "100%", pt: 1 }}>
          <Box sx={{ borderTop: 1, borderColor: "divider", my: 1 }} />
          {children}
        </Box>
      </Collapse>
    </SettingCard>
  );
}

SettingCardCollapse.Header = function Header({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
};
