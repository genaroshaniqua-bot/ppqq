export const COMMISSION_DRAFT_STORAGE_KEY = "oc-forge-commission-draft";

export type CommissionDraft = {
  title: string;
  category: string;
  brief: string;
  budgetMin: number;
  budgetMax: number;
  deadlineLabel: string;
  usageScope: "personal" | "commercial";
  requirements: string[];
};
