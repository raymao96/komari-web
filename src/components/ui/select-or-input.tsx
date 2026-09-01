import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import * as React from "react";

import { cn } from "@/lib/utils";

type Primitive = string | number;

export type SelectOption<T extends Primitive = string> = {
  label: string;
  value: T;
  icon?: React.ReactNode;
  disabled?: boolean;
};

export type SelectOrInputProps<T extends Primitive = string> = {
  options: Array<SelectOption<T> | T>;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, option?: SelectOption<T>) => void;
  placeholder?: string;
  allowCustomInput?: boolean;
  /** @deprecated Use `allowCustomInput` instead. */
  allowCustomValue?: boolean;
  className?: string;
  listClassName?: string;
  optionClassName?: string;
  emptyText?: string;
  filter?: (option: SelectOption<T>, input: string) => boolean;
  getOptionLabel?: (option: SelectOption<T>) => string;
  getOptionValue?: (option: SelectOption<T>) => string;
  disabled?: boolean;
  name?: string;
  type?: React.HTMLInputTypeAttribute;
} & Omit<
  React.ComponentProps<"input">,
  "value" | "defaultValue" | "onChange" | "placeholder" | "disabled" | "type"
>;

export function SelectOrInput<T extends Primitive = string>(
  props: SelectOrInputProps<T>,
) {
  const {
    options,
    value,
    defaultValue,
    onChange,
    placeholder,
    allowCustomInput,
    allowCustomValue,
    className,
    listClassName,
    optionClassName,
    emptyText = "No results",
    filter,
    getOptionLabel,
    getOptionValue,
    disabled,
    name,
    type = "text",
    id,
    required,
    readOnly,
    autoComplete,
    autoFocus,
    inputMode,
    spellCheck,
    maxLength,
    minLength,
    pattern,
    onBlur,
    onFocus,
    onKeyDown,
    style,
    ...nativeInputProps
  } = props;

  const normalizedOptions = React.useMemo<SelectOption<T>[]>(
    () =>
      options.map((option): SelectOption<T> => {
        if (typeof option === "object") return option as SelectOption<T>;
        return { label: String(option), value: option as T };
      }),
    [options],
  );
  const optionLabel = React.useCallback(
    (option: SelectOption<T>) =>
      getOptionLabel ? getOptionLabel(option) : option.label,
    [getOptionLabel],
  );
  const optionValue = React.useCallback(
    (option: SelectOption<T>) =>
      getOptionValue ? getOptionValue(option) : String(option.value),
    [getOptionValue],
  );
  const allowCustom = allowCustomInput ?? allowCustomValue ?? true;
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const currentValue = controlled ? value : internalValue;

  const selectedValue = React.useMemo<SelectOption<T> | string | null>(() => {
    const matchingOption = normalizedOptions.find(
      (option) => optionValue(option) === currentValue,
    );
    if (matchingOption) return matchingOption;
    return allowCustom && currentValue ? currentValue : null;
  }, [allowCustom, currentValue, normalizedOptions, optionValue]);
  const selectedOption =
    typeof selectedValue === "string" ? null : selectedValue;

  const commit = React.useCallback(
    (nextValue: string, option?: SelectOption<T>) => {
      if (!controlled) setInternalValue(nextValue);
      onChange?.(nextValue, option);
    },
    [controlled, onChange],
  );

  return (
    <Autocomplete<SelectOption<T>, false, false, true>
      className={cn(className)}
      style={style}
      options={normalizedOptions}
      value={selectedValue}
      disabled={disabled}
      freeSolo
      autoHighlight
      autoSelect={allowCustom}
      clearOnBlur={!allowCustom}
      openOnFocus
      clearOnEscape
      noOptionsText={emptyText}
      getOptionLabel={(option) =>
        typeof option === "string" ? option : optionLabel(option)
      }
      getOptionDisabled={(option) => option.disabled === true}
      isOptionEqualToValue={(option, selected) =>
        typeof selected !== "string" && optionValue(option) === optionValue(selected)
      }
      filterOptions={(availableOptions, state) => {
        const input = state.inputValue.trim();
        if (!input) return availableOptions;
        if (filter) {
          return availableOptions.filter((option) => filter(option, input));
        }
        const keyword = input.toLocaleLowerCase();
        return availableOptions.filter((option) =>
          `${optionLabel(option)} ${optionValue(option)}`
            .toLocaleLowerCase()
            .includes(keyword),
        );
      }}
      onInputChange={(_, nextInput, reason) => {
        if (allowCustom && reason === "input") commit(nextInput);
        if (reason === "clear") commit("");
      }}
      onChange={(_, nextValue) => {
        if (nextValue === null) {
          commit("");
          return;
        }
        if (typeof nextValue === "string") {
          if (allowCustom) commit(nextValue);
          return;
        }
        commit(optionValue(nextValue), nextValue);
      }}
      classes={{
        paper: cn("admin-select-or-input-content", listClassName),
        option: cn(optionClassName),
      }}
      renderOption={(optionProps, option) => {
        const { key, ...listItemProps } = optionProps;
        return (
          <li key={key} {...listItemProps}>
            {option.icon ? (
              <Box
                component="span"
                sx={{ display: "inline-flex", flexShrink: 0, alignItems: "center" }}
              >
                {option.icon}
              </Box>
            ) : null}
            <span>{optionLabel(option)}</span>
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          id={id}
          name={name}
          type={type}
          size="small"
          required={required}
          autoFocus={autoFocus}
          placeholder={placeholder}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              startAdornment: selectedOption?.icon ? (
                <InputAdornment
                  position="start"
                  sx={{ mr: 0.25, color: "text.secondary", lineHeight: 0 }}
                >
                  {selectedOption.icon}
                </InputAdornment>
              ) : (
                params.slotProps.input.startAdornment
              ),
            },
            htmlInput: {
              ...params.slotProps.htmlInput,
              ...nativeInputProps,
              name,
              type,
              readOnly,
              autoComplete,
              inputMode,
              spellCheck,
              maxLength,
              minLength,
              pattern,
              onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
                params.slotProps.htmlInput.onBlur?.(event);
                onBlur?.(event);
              },
              onFocus: (event: React.FocusEvent<HTMLInputElement>) => {
                params.slotProps.htmlInput.onFocus?.(event);
                onFocus?.(event);
              },
              onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
                params.slotProps.htmlInput.onKeyDown?.(event);
                onKeyDown?.(event);
              },
            },
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              minHeight: 40,
              py: 0,
            },
            "& .MuiAutocomplete-input": {
              minWidth: "32px !important",
            },
          }}
        />
      )}
    />
  );
}

export default SelectOrInput;
