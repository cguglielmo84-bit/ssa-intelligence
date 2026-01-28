export type ReportTypeId = 'GENERIC' | 'INDUSTRIALS' | 'PE' | 'FS' | 'INSURANCE';

export type BlueprintInputType = 'text' | 'textarea' | 'select';

export type BlueprintInputOption = {
  value: string;
  label: string;
};

export type BlueprintInput = {
  id: string;
  label: string;
  type: BlueprintInputType;
  required: boolean;
  options?: BlueprintInputOption[];
  helperText?: string;
};

export type BlueprintSection = {
  id: string;
  title: string;
  defaultSelected: boolean;
  focus: string;
  dependencies?: string[];
  reportSpecific?: boolean;
};

export type ReportBlueprint = {
  version: string;
  reportType: ReportTypeId;
  title: string;
  purpose: string;
  sections: BlueprintSection[];
  inputs: BlueprintInput[];
};
