
import { UserTier } from '../types';

interface TierLimits {
  monthlyArticles: number;
  hasLegalSafeMode: boolean;
  hasFullVerificationUI: boolean; // Forensic Mode
  hasInternalLinking: boolean;
  hasGEOScoring: boolean;
  hasBiasResilience: boolean; // Agency+
  hasBacklinkStrategy: boolean; // Agency+
  hasAuditLogs: boolean; // Agency+
  hasMultiWorkspace: boolean;
}

const TIER_CONFIG: Record<UserTier, TierLimits> = {
  CREATOR: {
    monthlyArticles: 10,
    hasLegalSafeMode: false,
    hasFullVerificationUI: false, // Basic Verification only
    hasInternalLinking: false,
    hasGEOScoring: false,
    hasBiasResilience: false,
    hasBacklinkStrategy: false,
    hasAuditLogs: false,
    hasMultiWorkspace: false,
  },
  STUDIO: {
    monthlyArticles: 50, // Higher limit
    hasLegalSafeMode: true,
    hasFullVerificationUI: true,
    hasInternalLinking: true,
    hasGEOScoring: true,
    hasBiasResilience: false,
    hasBacklinkStrategy: false,
    hasAuditLogs: false,
    hasMultiWorkspace: false,
  },
  AGENCY: {
    monthlyArticles: 200,
    hasLegalSafeMode: true,
    hasFullVerificationUI: true,
    hasInternalLinking: true,
    hasGEOScoring: true,
    hasBiasResilience: true,
    hasBacklinkStrategy: true,
    hasAuditLogs: true,
    hasMultiWorkspace: true,
  },
  ENTERPRISE: {
    monthlyArticles: 9999,
    hasLegalSafeMode: true,
    hasFullVerificationUI: true,
    hasInternalLinking: true,
    hasGEOScoring: true,
    hasBiasResilience: true,
    hasBacklinkStrategy: true,
    hasAuditLogs: true,
    hasMultiWorkspace: true,
  },
  ACADEMIC: {
    monthlyArticles: 500,
    hasLegalSafeMode: true,
    hasFullVerificationUI: true,
    hasInternalLinking: true,
    hasGEOScoring: true,
    hasBiasResilience: true, // Key feature for Academic
    hasBacklinkStrategy: false,
    hasAuditLogs: true, // Evidence audit exports
    hasMultiWorkspace: false,
  }
};

export const getTierConfig = (tier: UserTier): TierLimits => {
  return TIER_CONFIG[tier] || TIER_CONFIG.CREATOR;
};

export const checkPermission = (tier: UserTier, feature: keyof TierLimits): boolean => {
  const config = TIER_CONFIG[tier];
  if (!config) return false;
  return config[feature] === true;
};
