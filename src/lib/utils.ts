import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const uiTerms = {
  latestIntelligence: "最新情报",
  viewAll: "查看全部",
  pro: "Pro",
  proOnly: "Pro 专享",
  butterflyMap: "蝴蝶效应图谱",
  dailyBriefing: "每日简报",
  insightNoteTeam: "InsightNote 团队",
  insightNoteResearch: "InsightNote 研究团队",
} as const

export function formatDateCN(
  value: string | number | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "2-digit", day: "2-digit" },
  fallback = "—",
) {
  if (!value) return fallback
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleDateString("zh-CN", options)
}

export function formatTimeCN(
  value: string | number | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" },
  fallback = "",
) {
  if (!value) return fallback
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return date.toLocaleTimeString("zh-CN", options)
}

export function isSubscriptionActive(
  subscriptionStatus: unknown,
  subscriptionEndDate: unknown,
  now: Date = new Date(),
) {
  if (subscriptionStatus !== "pro") return false
  if (subscriptionEndDate == null) return true
  const endDate = subscriptionEndDate instanceof Date ? subscriptionEndDate : new Date(subscriptionEndDate as any)
  if (Number.isNaN(endDate.getTime())) return false
  return endDate.getTime() > now.getTime()
}
