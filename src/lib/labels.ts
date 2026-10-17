import type { FilingStatus } from '../core/types';

export const FILING_STATUS_LABELS: Record<FilingStatus, string> = {
  single: 'Single',
  married_joint: 'Married, filing jointly',
  married_separate: 'Married, filing separately',
  head_of_household: 'Head of household',
};
