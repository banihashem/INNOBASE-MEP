/**
 * MEP-light™ — Executive Prioritisation PDF Generator (Node.js / PDFKit)
 *
 * Generates a branded strategic report matching the INNOBASE corporate design.
 * Ported from the Python ReportLab implementation to eliminate the need for
 * a separate Python PDF service in the Cloud Run container.
 *
 * Color Palette:
 *   - Dark Slate Gray (#4A5568) for headers
 *   - Dark Gray (#2D3748) for body text
 *   - Crimson (#E53E3E) for strategic accent lines
 *   - Soft Off-White (#F7FAFC) for alternating table rows
 *   - Indigo (#4F46E5) for branding highlights
 *
 * Charter compliance:
 *   "Clarify Preparedness, Do Not Predict Success" [10, 14]
 *   "Neutral Strategic Advisor" [15]
 */

import PDFDocument from "pdfkit";

// ─── Color Constants ─────────────────────────────────────
const HEADER_COLOR = "#4A5568";
const BODY_COLOR = "#2D3748";
const ACCENT_COLOR = "#E53E3E";
const ALT_ROW_BG = "#F7FAFC";
const WHITE = "#FFFFFF";
const LIGHT_GRAY = "#E2E8F0";
const INDIGO = "#4F46E5";
const SLATE = "#64748B";

// ─── Types ───────────────────────────────────────────────

interface MarketResult {
  name?: string;
  potentialScore?: number;
  tier?: string;
  riskLevel?: string;
  confidence?: string;
  opportunity?: number;
  fit?: number;
  feasibility?: number;
  discrepancyAlert?: boolean;
}

interface PdfPayload {
  companyName?: string;
  sector?: string;
  domesticMarketSize?: string;
  exportExperience?: string;
  internalCapabilities?: string;
  knownConstraints?: string;
  offeringName?: string;
  selectedStrategy?: string;
  decisionMode?: string;
  expansionHorizon?: string;
  strategicObjective?: string;
  results?: MarketResult[];
  selectedRoadmapMarketId?: string;
  consultantNotes?: string;
}

// ─── Helper: Draw a horizontal rule ─────────────────────

function drawHR(
  doc: InstanceType<typeof PDFDocument>,
  color: string,
  thickness: number,
  width?: number
) {
  const x = doc.x;
  const y = doc.y;
  const lineWidth = width || doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.save();
  doc.strokeColor(color).lineWidth(thickness);
  doc.moveTo(x, y).lineTo(x + lineWidth, y).stroke();
  doc.restore();
  doc.moveDown(0.5);
}

// ─── Helper: Draw a table ───────────────────────────────

function drawTable(
  doc: InstanceType<typeof PDFDocument>,
  headers: string[],
  rows: string[][],
  colWidths: number[],
  options?: { headerBg?: string; headerColor?: string }
) {
  const startX = doc.x;
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const headerBg = options?.headerBg || HEADER_COLOR;
  const headerColor = options?.headerColor || WHITE;
  const rowHeight = 28;
  const padding = 6;

  // Check if we need a page break for the table header + at least one row
  if (doc.y + rowHeight * 2 > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }

  // Draw header row
  let x = startX;
  const headerY = doc.y;
  doc.save();
  doc.rect(x, headerY, tableWidth, rowHeight).fill(headerBg);
  doc.fillColor(headerColor).fontSize(8).font("Helvetica-Bold");
  headers.forEach((h, i) => {
    doc.text(h, x + padding, headerY + 8, {
      width: colWidths[i] - padding * 2,
      align: "left",
    });
    x += colWidths[i];
  });
  doc.restore();
  doc.y = headerY + rowHeight;

  // Draw data rows
  rows.forEach((row, rowIdx) => {
    // Check for page break
    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }

    x = startX;
    const rowY = doc.y;
    const bgColor = rowIdx % 2 === 1 ? ALT_ROW_BG : WHITE;

    doc.save();
    doc.rect(x, rowY, tableWidth, rowHeight).fill(bgColor);

    // Draw cell borders
    doc.strokeColor(LIGHT_GRAY).lineWidth(0.5);
    doc.rect(x, rowY, tableWidth, rowHeight).stroke();

    doc.fillColor(BODY_COLOR).fontSize(8).font("Helvetica");
    row.forEach((cell, i) => {
      doc.text(cell || "—", x + padding, rowY + 8, {
        width: colWidths[i] - padding * 2,
        align: "left",
      });
      x += colWidths[i];
    });
    doc.restore();
    doc.y = rowY + rowHeight;
  });

  doc.moveDown(0.8);
}

// ─── Cover Page ─────────────────────────────────────────

function buildCoverPage(
  doc: InstanceType<typeof PDFDocument>,
  data: PdfPayload
) {
  const pageW =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.moveDown(4);

  // Draw decorative sine wave
  doc.save();
  doc.strokeColor("#E53E3E").opacity(0.25).lineWidth(1.5);
  const waveY = doc.y;
  doc.moveTo(doc.page.margins.left, waveY);
  for (let i = 0; i <= 120; i++) {
    const x = doc.page.margins.left + (i / 120) * pageW;
    const y = waveY + 18 * Math.sin((i / 120) * 4 * Math.PI);
    doc.lineTo(x, y);
  }
  doc.stroke();

  // Second wave — smaller, phase-shifted
  doc.strokeColor("#E53E3E").opacity(0.15).lineWidth(1);
  doc.moveTo(doc.page.margins.left, waveY);
  for (let i = 0; i <= 120; i++) {
    const x = doc.page.margins.left + (i / 120) * pageW;
    const y = waveY + 10 * Math.sin((i / 120) * 4 * Math.PI + 1.2);
    doc.lineTo(x, y);
  }
  doc.stroke();
  doc.restore();

  doc.moveDown(3);

  // Accent line
  doc.save();
  doc.strokeColor(ACCENT_COLOR).lineWidth(3);
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.margins.left + pageW * 0.4, doc.y)
    .stroke();
  doc.restore();
  doc.moveDown(1);

  // Title
  doc
    .font("Helvetica-Bold")
    .fontSize(28)
    .fillColor(HEADER_COLOR)
    .text("MEP-light\u2122 Executive", { align: "left" })
    .text("Prioritisation Report", { align: "left" });

  doc.moveDown(1);

  // Subtitle
  const company = data.companyName || "Client Company";
  const offering = data.offeringName || "Selected Offering";
  doc
    .font("Helvetica")
    .fontSize(14)
    .fillColor(SLATE)
    .text("Strategic Market Entry Diagnostics for", { continued: false })
    .font("Helvetica-Bold")
    .text(`${company} — ${offering}`);

  doc.moveDown(2);

  // Metadata
  const genDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const horizon = data.expansionHorizon || "12 months";
  const mode = (data.decisionMode || "compare")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  const metaFields = [
    ["Generated", genDate],
    ["Expansion Horizon", horizon],
    ["Decision Mode", mode],
    ["Engine Version", "MEP-light\u2122 v3.1"],
  ];

  doc.font("Helvetica").fontSize(9);
  metaFields.forEach(([label, value]) => {
    doc
      .fillColor(HEADER_COLOR)
      .font("Helvetica-Bold")
      .text(`${label}:  `, { continued: true })
      .font("Helvetica")
      .fillColor(BODY_COLOR)
      .text(value);
    doc.moveDown(0.3);
  });

  // Push disclaimer to bottom of page
  doc.y = doc.page.height - doc.page.margins.bottom - 60;

  doc
    .font("Helvetica-Oblique")
    .fontSize(8)
    .fillColor(SLATE)
    .text(
      "This report is a strategic diagnostic tool. It does not constitute " +
        "financial, legal, or regulatory advice. All scores represent structured " +
        "preparedness assessments, not market success guarantees.",
      { align: "left", width: pageW }
    );

  doc.addPage();
}

// ─── Executive Summary ──────────────────────────────────

function buildExecutiveSummary(
  doc: InstanceType<typeof PDFDocument>,
  data: PdfPayload
) {
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(HEADER_COLOR)
    .text("1. Executive Summary");
  drawHR(doc, ACCENT_COLOR, 1.5);

  const company = data.companyName || "Client Company";
  const offering = data.offeringName || "Selected Offering";
  const objective = data.strategicObjective || "Not specified";

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(BODY_COLOR)
    .text(
      `${company} engaged the MEP-light\u2122 diagnostic system to evaluate market entry priorities for ${offering}.`
    );
  doc.moveDown(0.5);
  doc
    .font("Helvetica-Bold")
    .text("Strategic Objective: ", { continued: true })
    .font("Helvetica")
    .text(objective);

  const results = data.results || [];
  if (results.length > 0) {
    const top = results[0];
    const topName = top.name || "N/A";
    const topScore = top.potentialScore || 0;
    const topTier = top.tier || "N/A";
    doc.moveDown(0.5);
    doc
      .font("Helvetica-Bold")
      .text("Leading Validation Candidate: ", { continued: true })
      .font("Helvetica")
      .text(
        `${topName} with an Expansion Potential Score of ${topScore}/100 (${topTier}). ` +
          "This option currently scores highest under the available assumptions and evidence, " +
          "but it should be validated before major investment."
      );
  }

  doc.moveDown(1.5);
}

// ─── Company Profile ────────────────────────────────────

function buildCompanyProfile(
  doc: InstanceType<typeof PDFDocument>,
  data: PdfPayload
) {
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(HEADER_COLOR)
    .text("2. Company Profile");
  drawHR(doc, ACCENT_COLOR, 1.5);

  const fields = [
    ["Business Name", data.companyName || ""],
    ["Sector", data.sector || ""],
    ["Domestic Market Size", data.domesticMarketSize || ""],
    ["Export Experience", data.exportExperience || ""],
    ["Internal Capabilities", data.internalCapabilities || ""],
    ["Known Constraints", data.knownConstraints || ""],
  ];

  drawTable(
    doc,
    ["Field", "Value"],
    fields,
    [140, 370]
  );
}

// ─── Market Ranking Matrix ──────────────────────────────

function buildMarketRanking(
  doc: InstanceType<typeof PDFDocument>,
  data: PdfPayload
) {
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(HEADER_COLOR)
    .text("3. Market Ranking Matrix");
  drawHR(doc, ACCENT_COLOR, 1.5);

  const results = data.results || [];
  if (results.length === 0) {
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(BODY_COLOR)
      .text("No market results available.");
    doc.moveDown(1);
    return;
  }

  const headers = ["Rank", "Market", "Score", "Tier", "Risk", "Confidence"];
  const rows = results.map((r, i) => [
    `#${i + 1}`,
    r.name || "",
    `${r.potentialScore || 0}/100`,
    r.tier || "",
    r.riskLevel || "",
    r.confidence || "",
  ]);

  drawTable(doc, headers, rows, [40, 100, 60, 130, 60, 120]);
}

// ─── Priority Recommendations ───────────────────────────

function buildPriorityRecommendations(
  doc: InstanceType<typeof PDFDocument>,
  data: PdfPayload
) {
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(HEADER_COLOR)
    .text("4. Priority Recommendations");
  drawHR(doc, ACCENT_COLOR, 1.5);

  const results = data.results || [];
  results.forEach((r, i) => {
    const name = r.name || "";
    const score = r.potentialScore || 0;
    const tier = r.tier || "";
    const risk = r.riskLevel || "";
    const confidence = r.confidence || "Unknown";

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(HEADER_COLOR)
      .text(`#${i + 1} ${name} — Score: ${score}/100, ${tier}`);

    if (r.discrepancyAlert) {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(ACCENT_COLOR)
        .text(
          "\u26a0 Evidence Discrepancy Alert: This market scores highly " +
            "but evidence confidence is low. Classification capped at Tier B " +
            "until evidence quality improves."
        );
    }

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(BODY_COLOR)
      .text(
        `Risk Level: ${risk}. Evidence Confidence: ${confidence}.`
      );
    doc.moveDown(0.8);
  });

  doc.moveDown(1);
}

// ─── Exposed Assumptions ────────────────────────────────

function buildExposedAssumptions(
  doc: InstanceType<typeof PDFDocument>,
  data: PdfPayload
) {
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(HEADER_COLOR)
    .text("5. Exposed Assumptions & Uncertainties");
  drawHR(doc, ACCENT_COLOR, 1.5);

  const offering = data.offeringName || "the offering";
  const results = data.results || [];
  const topMarket =
    results.length > 0 ? results[0].name || "the target market" : "the target market";

  const assumptions = [
    [
      "Demand",
      `Local target shoppers in ${topMarket} will buy ${offering} at a premium compared to existing options.`,
      "Conduct 50 consumer interviews and digital concept tests.",
    ],
    [
      "Channel Access",
      "Distributors will accept standard 40% margin splits and provide prominent placement.",
      "Draft product pitch and secure 3 exploratory LOIs.",
    ],
    [
      "Financial Margins",
      "Tariffs, customs, and logistics fees will not compress net margins below 25%.",
      "Perform landing cost exercise with customs broker.",
    ],
    [
      "Adaptation",
      "Standard labeling requires no massive reformulation or packaging overhauls.",
      "Submit packaging files to local regulatory consultants.",
    ],
  ];

  drawTable(
    doc,
    ["Category", "Assumption", "Validation Action"],
    assumptions,
    [80, 230, 200]
  );
}

// ─── 30-60-90 Day Roadmap ───────────────────────────────

function buildRoadmap(
  doc: InstanceType<typeof PDFDocument>,
  data: PdfPayload
) {
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(HEADER_COLOR)
    .text("6. 30-60-90 Day Validation Roadmap");
  drawHR(doc, ACCENT_COLOR, 1.5);

  const results = data.results || [];
  const topMarket =
    results.length > 0 ? results[0].name || "Target Market" : "Target Market";
  const company = data.companyName || "Company";
  const offering = data.offeringName || "Offering";

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(BODY_COLOR)
    .text(
      `Based on current diagnostics, ${topMarket} represents a key ` +
        `target for ${company}'s expansion of ${offering}. Near-term validation ` +
        "must prioritize testing key hypotheses before capital deployment."
    );
  doc.moveDown(1);

  const phases = [
    {
      title: "Days 1\u201330: Regulatory & Margins",
      actions: [
        "Submit label files to regional compliance auditor.",
        "Verify exact duty rates with customs broker.",
        "Build complete landed cost model worksheet.",
      ],
      gate: "Landed Margin > 45%",
    },
    {
      title: "Days 31\u201360: Channel Exploration",
      actions: [
        "Draft digital sales deck and product specs.",
        "Conduct 3 exploratory meetings with potential partners.",
        "Run localized test marketing campaigns.",
      ],
      gate: "Minimum 1 LOI / Partner Agreement",
    },
    {
      title: "Days 61\u201390: Pilot Test Loops",
      actions: [
        "Execute small air-freight test shipment batch.",
        "Conduct physical demo tastings or digital loops.",
        "Compile pricing response and repeat purchase signals.",
      ],
      gate: "Shopper Acceptance Rate > 70%",
    },
  ];

  phases.forEach((phase) => {
    // Check for page break
    if (doc.y + 100 > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(HEADER_COLOR)
      .text(phase.title);
    doc.moveDown(0.3);

    phase.actions.forEach((action) => {
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(BODY_COLOR)
        .text(`\u2022 ${action}`);
    });

    doc
      .font("Helvetica-Oblique")
      .fontSize(8)
      .fillColor(SLATE)
      .text(`Decision Gate: ${phase.gate}`);
    doc.moveDown(0.8);
  });

  // Consultant Notes
  const notes = data.consultantNotes;
  if (notes && notes.trim()) {
    doc.moveDown(1);

    // Check for page break
    if (doc.y + 60 > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(HEADER_COLOR)
      .text("Consultant Notes");
    doc.moveDown(0.3);

    notes
      .trim()
      .split("\n")
      .forEach((line: string) => {
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor(BODY_COLOR)
          .text(line);
      });
  }
}

// ─── Evidence Confidence Review ─────────────────────────

function buildEvidenceConfidenceReview(
  doc: InstanceType<typeof PDFDocument>,
  data: PdfPayload
) {
  const results = data.results || [];
  if (results.length === 0) return;

  // Check for page break
  if (doc.y + 120 > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(HEADER_COLOR)
    .text("Evidence Confidence Review");
  doc.moveDown(0.3);
  drawHR(doc, ACCENT_COLOR, 2, 80);
  doc.moveDown(0.5);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(BODY_COLOR)
    .text(
      "MEP-light™ separates Expansion Potential (what the scores suggest) from " +
        "Evidence Confidence (how much we should trust those scores). Markets " +
        "flagged as \"Low-Confidence Hypothesis\" have high potential but " +
        "insufficient evidence — their tier is automatically capped at Tier B " +
        "until evidence quality improves."
    );
  doc.moveDown(0.8);

  // Evidence confidence table
  const headers = ["Market", "Confidence", "Evidence Basis", "Alert"];
  const colWidths = [130, 90, 200, 80];

  const rows = results.map((r) => [
    r.name || "—",
    r.confidence || "—",
    "User-supplied input",
    r.discrepancyAlert ? "⚠ Low Confidence" : "✓ Aligned",
  ]);

  drawTable(doc, headers, rows, colWidths);

  // Low-Confidence Hypothesis explanation
  const hasDiscrepancy = results.some((r) => r.discrepancyAlert);
  if (hasDiscrepancy) {
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(ACCENT_COLOR)
      .text("⚠ Low-Confidence Hypothesis Active");
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(BODY_COLOR)
      .text(
        "One or more markets show high potential but low evidence confidence. " +
          "These markets have been capped at Tier B: Promising. Do not commit " +
          "significant capital without validation. Prioritize evidence-gathering " +
          "activities (trade missions, regulatory enquiries, channel conversations) " +
          "before resource allocation."
      );
    doc.moveDown(0.5);
  }
}

// ─── Disclaimer Page ────────────────────────────────────

function buildDisclaimerPage(doc: InstanceType<typeof PDFDocument>) {
  doc.addPage();

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(HEADER_COLOR)
    .text("Important Disclaimers & Limitations");
  doc.moveDown(0.3);
  drawHR(doc, ACCENT_COLOR, 2, 80);
  doc.moveDown(1);

  const disclaimers = [
    {
      title: "Decision-Support Tool",
      text:
        "MEP-light™ is a decision-support tool designed to clarify preparedness " +
        "for market entry. It does not make decisions, approve market entry, or " +
        "predict commercial success. All outputs are structured assessments " +
        "reflecting user-supplied inputs.",
    },
    {
      title: "Not Professional Advice",
      text:
        "This report does not constitute legal, regulatory, tax, financial, " +
        "contractual, or certification advice. Users must engage qualified " +
        "professional advisors in relevant jurisdictions before acting on any " +
        "recommendations.",
    },
    {
      title: "Evidence Confidence",
      text:
        "All scores reflect the quality and completeness of evidence provided " +
        "by the user at the time of assessment. Markets scored with \"Low\" " +
        "or \"Unknown\" confidence should be treated as hypotheses requiring " +
        "validation, not as actionable recommendations.",
    },
    {
      title: "Scoring Methodology",
      text:
        "The 9-dimension scoring model uses the SME Weight Model with fixed " +
        "category weights. Scores are deterministic — identical inputs always " +
        "produce identical outputs. The model does not incorporate external " +
        "data feeds, machine learning predictions, or real-time market conditions.",
    },
    {
      title: "Tier Classifications",
      text:
        "Tier A (Priority), Tier B (Promising), Tier C (Do not prioritize), " +
        "and Tier D (Exclude from current agenda) are preparedness indicators. " +
        "They do not guarantee market success or failure. The Low-Confidence " +
        "Hypothesis rule automatically caps Tier A markets to Tier B when " +
        "evidence confidence is insufficient.",
    },
    {
      title: "Data Accuracy",
      text:
        "The accuracy of this report depends entirely on the accuracy of " +
        "user-supplied inputs. MEP-light™ does not verify, validate, or " +
        "guarantee the accuracy of any input data.",
    },
  ];

  disclaimers.forEach((d) => {
    // Check for page break
    if (doc.y + 60 > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(HEADER_COLOR)
      .text(d.title);
    doc.moveDown(0.2);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(BODY_COLOR)
      .text(d.text);
    doc.moveDown(0.8);
  });

  // Final footer
  doc.moveDown(1);
  drawHR(doc, LIGHT_GRAY, 0.5);
  doc
    .font("Helvetica-Oblique")
    .fontSize(8)
    .fillColor(SLATE)
    .text(
      `© ${new Date().getFullYear()} MEP-light™ by INNOBASE. ` +
        "Proprietary strategic diagnostic tool. All rights reserved.",
      { align: "center" }
    );
}

// ─── Footer Disclaimer ──────────────────────────────────

function buildFooter(doc: InstanceType<typeof PDFDocument>) {
  doc.moveDown(2);

  // Check for page break
  if (doc.y + 40 > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }

  drawHR(doc, LIGHT_GRAY, 0.5);
  doc
    .font("Helvetica-Oblique")
    .fontSize(8)
    .fillColor(SLATE)
    .text(
      "This document was generated by MEP-light\u2122, a strategic diagnostic " +
        "intelligence product. It does not constitute final market-entry approval, " +
        "legal, regulatory, tax, or financial advice. All scores reflect structured " +
        "preparedness assessments based on user-supplied inputs. " +
        "Engage qualified advisors before acting on any recommendations.",
      { align: "left" }
    );
}

// ─── Main Export Function ───────────────────────────────

export function generatePdf(data: PdfPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "letter",
        margins: { top: 72, bottom: 72, left: 72, right: 72 },
        info: {
          Title: "MEP-light\u2122 Executive Prioritisation Report",
          Author: "MEP-light\u2122 by INNOBASE",
          Subject: `Market Entry Diagnostics — ${data.companyName || "Client"}`,
          Creator: "MEP-light\u2122 PDF Engine v3.1",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Build report sections
      buildCoverPage(doc, data);
      buildExecutiveSummary(doc, data);
      buildCompanyProfile(doc, data);
      buildMarketRanking(doc, data);

      doc.addPage();

      buildPriorityRecommendations(doc, data);
      buildExposedAssumptions(doc, data);

      doc.addPage();

      buildRoadmap(doc, data);
      buildEvidenceConfidenceReview(doc, data);
      buildDisclaimerPage(doc);
      buildFooter(doc);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
