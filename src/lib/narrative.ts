/**
 * MEP-light™ — Narrative generation (Demo Scenario v0.2)
 *
 * Pure, testable text synthesis for:
 *   - the Dynamic Decision Statement (Step 1, spec §4.3/4.4)
 *   - the Organizational Context Summary (Step 2, spec §5.4)
 *
 * Extracted from the screen components so the "synthesize, not concatenate"
 * requirement can be unit-tested (directive §5.5, §10.2). No React imports.
 */

import { CompanySnapshot, EvidenceState } from "../types";

// ─── Step 1: Dynamic Decision Statement ──────────────────────────────

export interface DecisionStatementInput {
  businessName: string;
  decisionMode: string;
  expansionHorizon: string;
  strategicObjective: string;
  capabilities?: string;
  constraints?: string;
  sector?: string;
}

/** Spec §4.3 default paragraph, shown before user input. */
export const DEFAULT_DECISION_STATEMENT =
  "The business wants to identify the most practical and evidence-informed market entry or expansion pathway within a selected time horizon. The assessment will help clarify readiness, compare possible opportunities, and identify what can be validated before major investment.";

/** Short synthesized phrase from a free-text field (first meaningful clause). */
function firstClause(text?: string): string {
  if (!text) return "";
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  const clause = cleaned.split(/[.,;]/)[0].trim();
  return clause.length > 90 ? clause.slice(0, 90).trim() + "…" : clause;
}

export function buildDecisionStatement(input: DecisionStatementInput): string {
  const horizon = (input.expansionHorizon || "").trim();
  const objective = (input.strategicObjective || "").trim();
  const businessName = (input.businessName || "").trim();

  // Before meaningful input → spec §4.3 default paragraph.
  if (!businessName && !objective) return DEFAULT_DECISION_STATEMENT;

  const name = businessName || "The business";
  const entryOrExpansion =
    input.decisionMode === "Existing Market Expansion Readiness" ? "expansion" : "entry";
  const months = (horizon.match(/\d+/) || ["12"])[0];

  // Spec §4.3 dynamic template (after Step 1).
  let statement =
    `${name} wants to identify the most practical and evidence-informed market ${entryOrExpansion} ` +
    `pathway within a ${months}-month period. The assessment will review readiness, compare relevant ` +
    `opportunities, and identify validation actions that can support a more confident decision.`;

  // Spec §4.4 enrichment after Step 2 (synthesized, not concatenated).
  const strength = firstClause(input.capabilities);
  const constraint = firstClause(input.constraints);
  const sectorPhrase = input.sector ? `As a ${input.sector} business, ` : "";
  if (strength || constraint) {
    const parts: string[] = [];
    if (strength) parts.push(`stated strengths such as ${strength.toLowerCase()}`);
    if (constraint) parts.push(`constraints such as ${constraint.toLowerCase()}`);
    statement +=
      ` ${sectorPhrase}the comparison will weigh ${parts.join(" against ")} to focus on where readiness is strongest and what must be validated first.`;
  }

  return statement;
}

// ─── Step 2: Organizational Context Summary ──────────────────────────

/** Spec §5.4 default message before the required company information is completed. */
export const DEFAULT_ORG_SUMMARY =
  "The organizational context summary will appear here after the required company information is completed. It will synthesize the business's current position, capabilities, constraints, and readiness considerations into a concise advisory paragraph.";

/**
 * Synthesizes the company snapshot into an advisory paragraph. It rephrases and
 * interprets inputs rather than concatenating field values (spec §5.4).
 *
 * @param decisionMode — optional; used to produce mode-consistent language
 *   ("entry" vs "expansion") rather than the generic "market entry or expansion".
 */
export function buildOrgContextSummary(data: CompanySnapshot, decisionMode?: string): string {
  const name = data.businessName?.trim() || "";
  const sector = data.sector?.trim() || "";
  const marketSize = data.domesticMarketSize?.trim() || "";
  const exportExp = data.exportExperience?.trim() || "";
  const capabilities = data.internalCapabilities?.trim() || "";
  const constraints = data.knownConstraints?.trim() || "";
  const ev = data.evidenceStates;

  if (!name) return DEFAULT_ORG_SUMMARY;

  const filledCount = [sector, marketSize, exportExp, capabilities, constraints].filter(Boolean).length;
  if (filledCount < 2) {
    return `${name} has been identified as the subject of this assessment. Complete additional fields — capabilities, constraints, and market context — to synthesize a meaningful organizational context summary.`;
  }

  const entryOrExpansion =
    decisionMode === "Existing Market Expansion Readiness" ? "expansion" : "entry";

  const isToValidate = (state: EvidenceState) => state === "To Validate" || state === "Unknown";
  const evidenceTag = (state: EvidenceState): string => {
    if (state === "Confirmed") return "";
    if (state === "Estimated") return " (estimated)";
    return " (to be validated)";
  };
  const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

  const uncertainFields = Object.values(ev).filter((v) => isToValidate(v as EvidenceState)).length;
  const estimatedFields = Object.values(ev).filter((v) => v === "Estimated").length;

  const sentences: string[] = [];

  if (sector) {
    sentences.push(
      `${name} operates in the ${sector} sector${evidenceTag(ev.sector)}, positioning it within an industry where market ${entryOrExpansion} dynamics are shaped by regulatory standards, channel structures, and competitive density.`
    );
  } else {
    sentences.push(`${name} is being assessed for market ${entryOrExpansion} potential.`);
  }

  if (marketSize) {
    const sizeNote = isToValidate(ev.domesticMarketSize)
      ? `The organization's domestic market position — described as "${marketSize}" — has not yet been independently verified, and should be confirmed before it is used to benchmark international opportunity.`
      : ev.domesticMarketSize === "Estimated"
      ? `With a domestic footprint reported at approximately ${marketSize}, the company appears to have a foundation from which to explore expansion — though this figure is estimated and should be substantiated.`
      : `With a confirmed domestic footprint of ${marketSize}, the company has a quantifiable baseline against which to evaluate international opportunity sizing.`;
    sentences.push(sizeNote);
  }

  if (exportExp) {
    const expLower = exportExp.toLowerCase();
    if (expLower.includes("no experience")) {
      sentences.push(
        `The organization has no prior international or export experience${evidenceTag(ev.exportExperience)}, which means the assessment should place particular emphasis on operational feasibility, partner access, and the learning curve associated with first-market ${entryOrExpansion}.`
      );
    } else if (expLower.includes("limited") || expLower.includes("indirect")) {
      sentences.push(
        `The company reports limited or indirect export experience${evidenceTag(ev.exportExperience)}, suggesting some familiarity with cross-border operations — though likely not at a scale that would reduce execution risk significantly.`
      );
    } else if (expLower.includes("active")) {
      sentences.push(
        `As an active international exporter${evidenceTag(ev.exportExperience)}, the company is likely to have existing logistics, compliance, and distribution capabilities that may accelerate market ${entryOrExpansion} timelines.`
      );
    }
  }

  if (capabilities) {
    const capItems = capabilities.split(/[,;\n]+/).map((s) => lc(s.trim())).filter(Boolean);
    if (capItems.length === 1) {
      sentences.push(
        `Among its identified strengths, the organization cites ${capItems[0]}${evidenceTag(ev.internalCapabilities)} — a capability that should be evaluated for its transferability to target markets.`
      );
    } else if (capItems.length > 1) {
      const lastItem = capItems.pop();
      sentences.push(
        `Key capabilities identified include ${capItems.join(", ")}, and ${lastItem}${evidenceTag(ev.internalCapabilities)}. The relevance and transferability of these strengths to prospective markets will be a critical factor in the prioritization analysis.`
      );
    }
  }

  if (constraints) {
    const conItems = constraints.split(/[,;\n]+/).map((s) => lc(s.trim())).filter(Boolean);
    if (conItems.length === 1) {
      sentences.push(
        `However, the expansion decision is tempered by a notable constraint: ${conItems[0]}${evidenceTag(ev.knownConstraints)}. This factor should be stress-tested against each candidate market's conditions.`
      );
    } else if (conItems.length > 1) {
      const lastCon = conItems.pop();
      sentences.push(
        `The expansion decision is shaped by several identified constraints, including ${conItems.join(", ")}, and ${lastCon}${evidenceTag(ev.knownConstraints)}. These factors will need to be weighed against each market's accessibility and risk profile.`
      );
    }
  }

  if (uncertainFields >= 3) {
    sentences.push(
      `It should be noted that a significant portion of the inputs provided remain unvalidated. The resulting prioritization should be treated as directional rather than definitive, and a structured validation effort is recommended before committing resources.`
    );
  } else if (uncertainFields >= 1 || estimatedFields >= 2) {
    sentences.push(
      `Some inputs are currently flagged as estimated or unvalidated, which introduces uncertainty into the assessment. The roadmap phase should include targeted validation actions for these areas.`
    );
  } else {
    sentences.push(
      `The evidence basis across inputs is relatively strong, providing a solid foundation for prioritization. Validation efforts can focus on market-specific assumptions rather than internal data gaps.`
    );
  }

  return sentences.join(" ");
}
