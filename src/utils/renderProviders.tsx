import {
    SettingCardCollapse,
    SettingCardSelect,
    SettingCardSwitch,
    SettingCardShortTextInput,
    SettingCardLongTextInput,
    SettingCardButton,
} from "@/components/admin/SettingCard";
import React from "react";
import { toast } from "sonner";

interface RenderProviderInputsProps {
    currentProvider: string;
    providerDefs: any;
    providerValues: any;
    translationPrefix?: string;
    title?: string;
    description?: string;
    footer?: React.ReactNode | string;
    setProviderValues: (updater: (prev: any) => any) => void;
    handleSave: (values: any) => Promise<void>;
    t: any;
}

export function ProviderInputs({
    currentProvider,
    providerDefs,
    providerValues,
    translationPrefix,
    title,
    description,
    footer,
    setProviderValues,
    handleSave,
    t,
}: RenderProviderInputsProps) {
    const valuesRef = React.useRef<Record<string, any>>(providerValues);
    valuesRef.current = providerValues;

    if (!currentProvider || !providerDefs[currentProvider]) return null;

    const fields = providerDefs[currentProvider];

    const updateLocalValue = (fieldName: string, value: any) => {
        const next = { ...valuesRef.current, [fieldName]: value };
        valuesRef.current = next;
        setProviderValues(() => next);
    };

    const handleSaveAll = async () => {
        try {
            const finalValues = { ...valuesRef.current };

            fields.forEach((f: any) => {
                const current = finalValues[f.name];
                const empty =
                    current === undefined ||
                    current === null ||
                    (typeof current === "string" && current.trim() === "");
                if (empty && f.default !== undefined && f.default !== "") {
                    finalValues[f.name] = f.default;
                }
            });

            const requiredFields = fields.filter((f: any) => f.required);
            const missingFields = requiredFields.filter((f: any) => {
                const value = finalValues[f.name];
                return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
            });

            if (missingFields.length > 0) {
                const fieldNames = missingFields.map((f: any) => t(`${translationPrefix}.${f.name}`, f.name)).join(", ");
                toast.error(
                    t("settings.missing_required_fields", { fieldNames })
                );
                return;
            }

            const processedValues = { ...finalValues };
            fields.forEach((f: any) => {
                const value = processedValues[f.name];

                if (value === undefined || value === null) {
                    return;
                }

                if (["int", "int64"].includes(f.type)) {
                    const numValue = value === "" ? 0 : Number(value);
                    if (isNaN(numValue)) {
                        toast.error(t("settings.invalid_number", { field: t(`${translationPrefix}.${f.name}`, f.name) }));
                        throw new Error(`Invalid integer value for ${f.name}`);
                    }
                    if (!Number.isInteger(numValue)) {
                        toast.error(t("settings.invalid_integer", { field: t(`${translationPrefix}.${f.name}`, f.name) }));
                        throw new Error(`Value must be an integer for ${f.name}`);
                    }
                    processedValues[f.name] = numValue;
                } else if (["float32", "float64"].includes(f.type)) {
                    const numValue = value === "" ? 0 : Number(value);
                    if (isNaN(numValue)) {
                        toast.error(t("settings.invalid_number", { field: t(`${translationPrefix}.${f.name}`, f.name) }));
                        throw new Error(`Invalid float value for ${f.name}`);
                    }
                    processedValues[f.name] = numValue;
                }
            });

            valuesRef.current = processedValues;
            await handleSave(processedValues);
        } catch (error) {
            console.error("Validation error:", error);
            throw error;
        }
    };

    const renderField = (f: any) => {
        const fieldTitle = String(t(`${translationPrefix}.${f.name}`, f.name)) + (f.required ? " *" : "");
        const fieldDescription = f.help ? String(t(`${translationPrefix}.${f.name}_help`, f.help)) : undefined;
        const fieldValue = providerValues[f.name] !== undefined && providerValues[f.name] !== null && providerValues[f.name] !== ""
            ? providerValues[f.name]
            : (f.default || "");

        if (f.type === "option" && f.options) {
            return (
                <SettingCardSelect
                    key={f.name}
                    bordless
                    title={fieldTitle}
                    description={fieldDescription}
                    options={f.options.split(",").map((opt: string) => {
                        const value = opt.trim();
                        return { value, label: value };
                    })}
                    value={String(fieldValue)}
                    OnSave={(val: string) => {
                        updateLocalValue(f.name, val);
                    }}
                />
            );
        }

        if (f.type === "bool") {
            return (
                <SettingCardSwitch
                    bordless
                    key={f.name}
                    title={fieldTitle}
                    description={fieldDescription}
                    defaultChecked={fieldValue !== undefined ? !!fieldValue : (f.default === "true" || f.default === true)}
                    onChange={(checked: boolean) => {
                        updateLocalValue(f.name, checked);
                    }}
                />
            );
        }

        if (f.type === "richtext" || f.type === "text") {
            return (
                <SettingCardLongTextInput
                    key={f.name}
                    bordless
                    title={fieldTitle}
                    description={fieldDescription}
                    defaultValue={String(fieldValue)}
                    showSaveButton={false}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                        updateLocalValue(f.name, e.target.value);
                    }}
                    OnSave={(value: string) => {
                        updateLocalValue(f.name, value);
                    }}
                />
            );
        }

        const isNumber = ["int", "int64", "float32", "float64"].includes(f.type);
        return (
            <SettingCardShortTextInput
                key={f.name}
                bordless
                title={fieldTitle}
                description={fieldDescription}
                defaultValue={String(fieldValue)}
                type={isNumber ? "number" : "text"}
                showSaveButton={false}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = isNumber ? (e.target.value === "" ? 0 : Number(e.target.value)) : e.target.value;
                    updateLocalValue(f.name, value);
                }}
                OnSave={() => {
                }}
            />
        );
    };

    return (
        <div key={currentProvider}>
            <SettingCardCollapse
                title={title ?? t("common.details")}
                description={description}
                defaultOpen={true}
            >
                <div className="flex gap-4 flex-col">
                    {fields.map((f: any) => renderField(f))}

                    {footer && (
                        <label className="text-sm text-muted-foreground mt-2 block">
                            {footer}
                        </label>
                    )}

                    <SettingCardButton
                        bordless
                        onClick={handleSaveAll}
                    >
                        {t("save")}
                    </SettingCardButton>
                </div>
            </SettingCardCollapse>
        </div>
    );
}

export const renderProviderInputs = (props: RenderProviderInputsProps) => (
    <ProviderInputs {...props} />
);
