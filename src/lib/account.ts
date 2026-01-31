import { Plan } from '@prisma/client';

/**
 * Defines the feature set for each account plan type.
 */
export interface AccountFeatures {
  /** Maximum number of projects allowed for this plan. */
  maxProjects: number;
  /** Number of free tokens granted on sign-up. */
  initialTokens: number;
}

/**
 * Mapping of account plans to their corresponding feature sets.
 */
export const accountFeatures: Record<Plan, AccountFeatures> = {
  [Plan.FREE]: { maxProjects: 1, initialTokens: 5 },
  [Plan.PAID]: { maxProjects: Infinity, initialTokens: 0 },
};

/**
 * Retrieves the feature set for a given account plan.
 * @param plan - The account plan type.
 * @returns The features associated with the plan.
 */
export function getAccountFeatures(plan: Plan): AccountFeatures {
  return accountFeatures[plan] || accountFeatures[Plan.FREE];
}