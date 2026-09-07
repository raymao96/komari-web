const billingErrorKeys: Record<string, string> = {
  "a reversal entry cannot be voided": "billing.errors.reversalCannotVoid",
  "amount is out of range": "billing.errors.amountOutOfRange",
  "amount must be finite": "billing.errors.invalidAmount",
  "amount must be greater than zero": "billing.errors.amountMustNotBeNegative",
  "amount must not be negative": "billing.errors.amountMustNotBeNegative",
  "amount supports at most 6 decimal places": "billing.errors.tooManyDecimals",
  "client and idempotency_key are required": "billing.errors.clientRequired",
  "currency is not a recognized ISO 4217 code": "billing.errors.currencyInvalid",
  "currency must be CNY or USD": "billing.errors.currencyMustBeCnyUsd",
  "invalid amount": "billing.errors.invalidAmount",
  "months contains an invalid month": "billing.errors.invalidMonth",
  "reason is required": "billing.errors.reasonRequired",
};

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function billingErrorI18nKey(message?: string) {
  const text = message?.trim() ?? "";
  const stripped = text
    .replace(/^Invalid billing request:\s*/i, "")
    .replace(/^invalid billing input:\s*/i, "")
    .trim();
  return billingErrorKeys[stripped] || billingErrorKeys[text] || "";
}

export function localizeBillingError(message: string | undefined, t: Translate) {
  const key = billingErrorI18nKey(message);
  if (key) return String(t(key));
  const text = message?.trim() ?? "";
  const stripped = text
    .replace(/^Invalid billing request:\s*/i, "")
    .replace(/^invalid billing input:\s*/i, "")
    .trim();
  return stripped || String(t("common.error"));
}

export function billingSaveFailedToast(
  prefixKey: string,
  error: unknown,
  t: Translate,
  fallback = "费用录入失败",
) {
  const detail = localizeBillingError(
    error instanceof Error ? error.message : String(error),
    t,
  );
  return `${t(prefixKey, fallback)}: ${detail}`;
}
