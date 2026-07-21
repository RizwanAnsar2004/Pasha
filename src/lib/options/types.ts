export type OptionList = readonly string[] | readonly { value: string; label: string }[];

export type OptionItem = {
  value: string;
  label: string;
  legacy?: string;
  isOther?: boolean;
};

export type OptionRegistry = Record<string, OptionItem[]>;

export type OptionRow = {
  option_id: string;
  option_type: string;
  option_value: string;
  option_label: string;
  sort_order: number;
  is_active: boolean;
};

export type OptionListMeta = {
  name: string;
  label: string;
  items: OptionItem[];
  source: "code" | "db" | "override";
};
