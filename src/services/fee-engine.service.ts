// Fee Engine — computes the full escrow breakdown for a TXLOGPAY operation.
// Rates are configured by user tier and are the single source of truth for
// every UI breakdown, funding totals and future smart-contract settlement.

import type { UserTier } from "@/domain/user";
import type { EscrowBreakdown } from "@/types";

export interface FeeStructure {
  operational: number; // applied on gross_amount
  custody:     number; // applied on gross_amount
  settlement:  number; // applied on gross_amount
}

export const TIER_FEES: Record<UserTier, FeeStructure> = {
  STANDARD:       { operational: 0.0080, custody: 0.0010, settlement: 0.0005 },
  ENTERPRISE:     { operational: 0.0045, custody: 0.0008, settlement: 0.0004 },
  VIP:            { operational: 0.0030, custody: 0.0006, settlement: 0.0003 },
  ANCHOR_PARTNER: { operational: 0.0020, custody: 0.0004, settlement: 0.0002 },
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const feeEngine = {
  feesFor(tier: UserTier): FeeStructure {
    return TIER_FEES[tier];
  },

  /**
   * Compute the full escrow breakdown.
   *
   * total_funding       = gross + operational + custody + settlement
   *                       (importer deposits this as garantia)
   * net_exporter_amount = gross (importer's payable, paid 100% to exporter
   *                       on customs release; fees are TXLOGPAY's margin)
   */
  calculateBreakdown(grossAmount: number, tier: UserTier): EscrowBreakdown {
    const fees = TIER_FEES[tier];
    const gross = Math.max(0, grossAmount);
    const fee_amount      = round2(gross * fees.operational);
    const custody_fee     = round2(gross * fees.custody);
    const settlement_fee  = round2(gross * fees.settlement);
    const total_funding   = round2(gross + fee_amount + custody_fee + settlement_fee);
    return {
      gross_amount: round2(gross),
      fee_amount,
      custody_fee,
      settlement_fee,
      total_funding,
      net_exporter_amount: round2(gross),
    };
  },

  effectiveRate(tier: UserTier): number {
    const f = TIER_FEES[tier];
    return f.operational + f.custody + f.settlement;
  },
};
