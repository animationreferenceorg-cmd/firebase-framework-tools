import { z } from 'zod';

/**
 * Content reports (copyright, inappropriate, spam). Anyone can report; only
 * admins read reports and act on them through /api/admin/reports. Acting on
 * a copyright report adds a strike to the uploader; REPEAT_INFRINGER_STRIKES
 * strikes flags the account for termination under the DMCA policy.
 */

export const REPORT_COLLECTION = 'content_reports';
export const REPEAT_INFRINGER_STRIKES = 3;

export const REPORT_REASONS = ['copyright', 'inappropriate', 'spam', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_TARGETS = ['clip', 'video', 'portfolio'] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  copyright: 'Copyright: I own this or represent the owner',
  inappropriate: 'Inappropriate or offensive',
  spam: 'Spam or misleading',
  other: 'Something else',
};

export const reportSchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.string().trim().regex(/^[A-Za-z0-9_-]{1,128}$/),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(2000).default(''),
  contactEmail: z.string().trim().email().max(200).optional().or(z.literal('')),
});

export type ReportInput = z.infer<typeof reportSchema>;

/** Firestore collection holding the reported item, by target type. */
export function targetCollection(target: ReportTarget): string {
  return target === 'clip' ? 'reference_clips' : target === 'video' ? 'videos' : 'portfolio_items';
}

/** Field holding the uploader's uid, or null for admin-curated library videos. */
export function ownerField(target: ReportTarget): string | null {
  return target === 'clip' ? 'creatorId' : target === 'portfolio' ? 'userId' : null;
}

/**
 * The update that hides an item once a report is upheld, or null when the
 * item should be deleted outright (portfolio posts have no hidden state).
 * A hidden clip stays visible to its creator only, so a counter-notice can
 * restore it.
 */
export function takedownUpdate(target: ReportTarget, reason: ReportReason, now: number): Record<string, unknown> | null {
  const base = { takenDownAt: now, takenDownReason: reason };
  if (target === 'clip') return { ...base, isPrivate: true, communityVisible: false };
  if (target === 'video') return { ...base, status: 'removed' };
  return null;
}
