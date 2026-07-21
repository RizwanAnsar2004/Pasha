type ChoiceOption = { value: string; label: string; legacy?: string; isOther?: boolean };

// The legacy option value that reveals the companion free-text input.
export const OTHER_VALUE = "Other";

const OTHER_IDS = new Set<string>();

// Records the option ids whose underlying value is the "Other" sentinel.
export function registerOtherOptionIds(ids: Iterable<string>): void {
  for (const id of ids) {
    const raw = typeof id === "string" ? id.trim() : "";
    if (raw) OTHER_IDS.add(raw);
  }
}

// Harvests the "Other" ids out of a resolved registry so id-valued lists stay detectable.
export function registerOtherOptionsFromRegistry(
  registry: Record<string, readonly ChoiceOption[]> | null | undefined
): void {
  if (!registry) return;
  for (const list of Object.values(registry)) {
    for (const item of list) {
      if (item?.isOther && item.value) OTHER_IDS.add(item.value.trim());
    }
  }
}

// True when a single stored choice is the "Other" sentinel, as legacy text or as an option id.
export function isOtherChoice(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const raw = value.trim();
  if (!raw) return false;
  return raw === OTHER_VALUE || OTHER_IDS.has(raw);
}

// True when "Other" is picked, handling both scalar selects and multiselect arrays.
export function isOtherPicked(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(isOtherChoice);
  return isOtherChoice(value);
}

// Maps a legacy text answer onto its option id so saved drafts still select the right entry.
export function coerceOptionValue(
  stored: unknown,
  options: readonly (string | ChoiceOption)[]
): string {
  if (typeof stored !== "string") return "";
  const raw = stored.trim();
  if (!raw) return stored;
  const needle = raw.toLowerCase();
  let match = "";
  for (const option of options) {
    const item: ChoiceOption =
      typeof option === "string" ? { value: option, label: option } : option;
    if (item.value === raw) return stored;
    if (match) continue;
    if ((item.legacy ?? "").trim().toLowerCase() === needle) match = item.value;
    else if (item.label.trim().toLowerCase() === needle) match = item.value;
  }
  return match || stored;
}
