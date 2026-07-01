"""
MEP-light™ — Executive Prioritisation PDF Generator

ReportLab-based document builder that compiles a branded strategic report
matching the INNOBASE corporate design system.

Color Palette:
  - Dark Slate Gray (#4A5568) for headers
  - Dark Gray (#2D3748) for body text
  - Crimson (#E53E3E) for strategic accent lines
  - Soft Off-White (#F7FAFC) for alternating table rows

Charter compliance:
  "Clarify Preparedness, Do Not Predict Success" [10, 14]
  "Neutral Strategic Advisor" [15]
"""

import io
import math
from datetime import datetime
from xml.sax.saxutils import escape

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    HRFlowable,
)
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics.charts.lineplots import LinePlot


# ─── Color Constants ─────────────────────────────────────
HEADER_COLOR = HexColor("#4A5568")
BODY_COLOR = HexColor("#2D3748")
ACCENT_COLOR = HexColor("#E53E3E")
ALT_ROW_COLOR = HexColor("#F7FAFC")
WHITE = HexColor("#FFFFFF")
LIGHT_GRAY = HexColor("#E2E8F0")
INDIGO = HexColor("#4F46E5")
SLATE = HexColor("#64748B")
WAVE_COLOR = HexColor("#E53E3E")  # Crimson accent for wave


def _build_wave_background() -> Drawing:
    """
    Create a subtle sinusoidal wave background decoration for the cover page.
    Uses crimson accent color at low opacity for a refined corporate feel.
    """
    page_w = letter[0] - 2 * inch  # Account for margins
    d = Drawing(page_w, 80)

    # Generate two overlapping sine waves for visual depth
    import math
    points_wave1 = []
    points_wave2 = []
    num_points = 120

    for i in range(num_points):
        x = (i / (num_points - 1)) * page_w
        # Primary wave — larger amplitude
        y1 = 40 + 18 * math.sin((i / num_points) * 4 * math.pi)
        points_wave1.append((x, y1))
        # Secondary wave — smaller, phase-shifted
        y2 = 40 + 10 * math.sin((i / num_points) * 4 * math.pi + 1.2)
        points_wave2.append((x, y2))

    from reportlab.graphics.shapes import PolyLine
    wave1 = PolyLine(
        [coord for pt in points_wave1 for coord in pt],
        strokeColor=HexColor("#E53E3E40"),  # Low opacity crimson
        strokeWidth=1.5,
    )
    wave2 = PolyLine(
        [coord for pt in points_wave2 for coord in pt],
        strokeColor=HexColor("#E53E3E25"),  # Even lower opacity
        strokeWidth=1.0,
    )
    d.add(wave1)
    d.add(wave2)
    return d


def _safe(text) -> str:
    """Escape XML chars and ensure string type."""
    if text is None:
        return ""
    return escape(str(text))


def _build_styles():
    """Create custom paragraph styles for the report."""
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        "CoverTitle",
        parent=styles["Title"],
        fontSize=28,
        leading=34,
        textColor=HEADER_COLOR,
        alignment=TA_LEFT,
        spaceAfter=6,
        fontName="Helvetica-Bold",
    ))

    styles.add(ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Normal"],
        fontSize=14,
        leading=18,
        textColor=SLATE,
        alignment=TA_LEFT,
        spaceAfter=4,
    ))

    styles.add(ParagraphStyle(
        "SectionHeader",
        parent=styles["Heading1"],
        fontSize=16,
        leading=20,
        textColor=HEADER_COLOR,
        spaceBefore=18,
        spaceAfter=8,
        fontName="Helvetica-Bold",
    ))

    styles.add(ParagraphStyle(
        "SubHeader",
        parent=styles["Heading2"],
        fontSize=12,
        leading=15,
        textColor=HEADER_COLOR,
        spaceBefore=10,
        spaceAfter=4,
        fontName="Helvetica-Bold",
    ))

    styles.add(ParagraphStyle(
        "MepBody",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=BODY_COLOR,
        spaceAfter=6,
    ))

    styles.add(ParagraphStyle(
        "MepNote",
        parent=styles["Normal"],
        fontSize=8,
        leading=10,
        textColor=SLATE,
        spaceAfter=4,
        fontName="Helvetica-Oblique",
    ))

    styles.add(ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=BODY_COLOR,
    ))

    styles.add(ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontSize=9,
        leading=12,
        textColor=WHITE,
        fontName="Helvetica-Bold",
    ))

    return styles


def _build_cover_page(styles, data: dict) -> list:
    """Build the cover page elements."""
    elements = []

    # Spacer at top
    elements.append(Spacer(1, 1.0 * inch))

    # Subtle wave background decoration
    elements.append(_build_wave_background())

    elements.append(Spacer(1, 0.3 * inch))

    # Accent line
    elements.append(HRFlowable(
        width="40%", thickness=3, color=ACCENT_COLOR,
        spaceBefore=0, spaceAfter=12,
    ))

    # Title
    elements.append(Paragraph(
        "MEP-light\u2122 Executive<br/>Prioritisation Report",
        styles["CoverTitle"],
    ))

    elements.append(Spacer(1, 12))

    # Subtitle
    company = _safe(data.get("companyName", "Client Company"))
    offering = _safe(data.get("offeringName", "Selected Offering"))
    elements.append(Paragraph(
        f"Strategic Market Entry Diagnostics for<br/>"
        f"<b>{company}</b> \u2014 {offering}",
        styles["CoverSubtitle"],
    ))

    elements.append(Spacer(1, 24))

    # Metadata table
    gen_date = datetime.now().strftime("%d %B %Y")
    horizon = _safe(data.get("expansionHorizon", "12 months"))
    mode = _safe(data.get("decisionMode", "compare"))

    meta_data = [
        ["Generated", gen_date],
        ["Expansion Horizon", horizon],
        ["Decision Mode", mode.replace("_", " ").title()],
        ["Engine Version", "MEP-light\u2122 v1.5"],
    ]
    meta_table = Table(meta_data, colWidths=[1.8 * inch, 3.5 * inch])
    meta_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), HEADER_COLOR),
        ("TEXTCOLOR", (1, 0), (1, -1), BODY_COLOR),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, LIGHT_GRAY),
    ]))
    elements.append(meta_table)

    elements.append(Spacer(1, 2 * inch))

    # Disclaimer
    elements.append(Paragraph(
        "This report is a strategic diagnostic tool. It does not constitute "
        "financial, legal, or regulatory advice. All scores represent structured "
        "preparedness assessments, not market success guarantees.",
        styles["MepNote"],
    ))

    elements.append(PageBreak())
    return elements


def _build_executive_summary(styles, data: dict) -> list:
    """Build the Executive Summary section."""
    elements = []
    elements.append(Paragraph("1. Executive Summary", styles["SectionHeader"]))
    elements.append(HRFlowable(
        width="100%", thickness=1.5, color=ACCENT_COLOR,
        spaceBefore=0, spaceAfter=10,
    ))

    objective = _safe(data.get("strategicObjective", "Not specified"))
    company = _safe(data.get("companyName", "Client Company"))
    offering = _safe(data.get("offeringName", "Selected Offering"))

    elements.append(Paragraph(
        f"<b>{company}</b> engaged the MEP-light\u2122 diagnostic system to evaluate "
        f"market entry priorities for <b>{offering}</b>.",
        styles["MepBody"],
    ))
    elements.append(Paragraph(
        f"<b>Strategic Objective:</b> {objective}",
        styles["MepBody"],
    ))

    results = data.get("results", [])
    if results:
        top = results[0]
        top_name = _safe(top.get("name", "N/A"))
        top_score = top.get("potentialScore", 0)
        top_tier = _safe(top.get("tier", "N/A"))
        elements.append(Paragraph(
            f"<b>Leading Validation Candidate:</b> {top_name} with an Expansion Potential "
            f"Score of <b>{top_score}/100</b> ({top_tier}). This option currently scores "
            f"highest under the available assumptions and evidence, but it should be "
            f"validated before major investment.",
            styles["MepBody"],
        ))

    elements.append(Spacer(1, 12))
    return elements


def _build_company_profile(styles, data: dict) -> list:
    """Build the Company Profile section."""
    elements = []
    elements.append(Paragraph("2. Company Profile", styles["SectionHeader"]))
    elements.append(HRFlowable(
        width="100%", thickness=1.5, color=ACCENT_COLOR,
        spaceBefore=0, spaceAfter=10,
    ))

    fields = [
        ("Business Name", data.get("companyName", "")),
        ("Sector", data.get("sector", "")),
        ("Domestic Market Size", data.get("domesticMarketSize", "")),
        ("Export Experience", data.get("exportExperience", "")),
        ("Internal Capabilities", data.get("internalCapabilities", "")),
        ("Known Constraints", data.get("knownConstraints", "")),
    ]

    table_data = []
    for label, value in fields:
        table_data.append([
            Paragraph(f"<b>{_safe(label)}</b>", styles["TableCell"]),
            Paragraph(_safe(value) or "\u2014", styles["TableCell"]),
        ])

    t = Table(table_data, colWidths=[2 * inch, 4.5 * inch])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, LIGHT_GRAY),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, ALT_ROW_COLOR]),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 12))
    return elements


def _build_market_ranking(styles, data: dict) -> list:
    """Build the Market Ranking Matrix table."""
    elements = []
    elements.append(Paragraph(
        "3. Market Ranking Matrix", styles["SectionHeader"]
    ))
    elements.append(HRFlowable(
        width="100%", thickness=1.5, color=ACCENT_COLOR,
        spaceBefore=0, spaceAfter=10,
    ))

    results = data.get("results", [])
    if not results:
        elements.append(Paragraph("No market results available.", styles["MepBody"]))
        return elements

    # Header row
    header = [
        Paragraph("<b>Rank</b>", styles["TableHeader"]),
        Paragraph("<b>Market</b>", styles["TableHeader"]),
        Paragraph("<b>Score</b>", styles["TableHeader"]),
        Paragraph("<b>Tier</b>", styles["TableHeader"]),
        Paragraph("<b>Risk</b>", styles["TableHeader"]),
        Paragraph("<b>Confidence</b>", styles["TableHeader"]),
    ]

    table_data = [header]
    for i, r in enumerate(results):
        row = [
            Paragraph(str(i + 1), styles["TableCell"]),
            Paragraph(_safe(r.get("name", "")), styles["TableCell"]),
            Paragraph(f"<b>{r.get('potentialScore', 0)}/100</b>", styles["TableCell"]),
            Paragraph(_safe(r.get("tier", "")), styles["TableCell"]),
            Paragraph(_safe(r.get("riskLevel", "")), styles["TableCell"]),
            Paragraph(_safe(r.get("confidence", "")), styles["TableCell"]),
        ]
        table_data.append(row)

    t = Table(table_data, colWidths=[
        0.5 * inch, 1.2 * inch, 0.8 * inch, 1.8 * inch, 0.8 * inch, 1.4 * inch,
    ])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_COLOR),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, LIGHT_GRAY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, ALT_ROW_COLOR]),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 12))
    return elements


def _build_priority_recommendations(styles, data: dict) -> list:
    """Build the Priority Recommendations section."""
    elements = []
    elements.append(Paragraph(
        "4. Priority Recommendations", styles["SectionHeader"]
    ))
    elements.append(HRFlowable(
        width="100%", thickness=1.5, color=ACCENT_COLOR,
        spaceBefore=0, spaceAfter=10,
    ))

    results = data.get("results", [])
    for i, r in enumerate(results):
        name = _safe(r.get("name", ""))
        score = r.get("potentialScore", 0)
        tier = _safe(r.get("tier", ""))
        risk = _safe(r.get("riskLevel", ""))
        alert = r.get("discrepancyAlert", False)

        elements.append(Paragraph(
            f"<b>#{i+1} {name}</b> \u2014 Score: {score}/100, {tier}",
            styles["SubHeader"],
        ))

        if alert:
            elements.append(Paragraph(
                "\u26a0 <b>Evidence Discrepancy Alert:</b> This market scores highly "
                "but evidence confidence is low. Classification capped at Tier B "
                "until evidence quality improves.",
                styles["MepBody"],
            ))

        elements.append(Paragraph(
            f"Risk Level: {risk}. "
            f"Evidence Confidence: {_safe(r.get('confidence', 'Unknown'))}.",
            styles["MepBody"],
        ))

    elements.append(Spacer(1, 12))
    return elements


def _build_exposed_assumptions(styles, data: dict) -> list:
    """Build the Exposed Assumptions section."""
    elements = []
    elements.append(Paragraph(
        "5. Exposed Assumptions & Uncertainties", styles["SectionHeader"]
    ))
    elements.append(HRFlowable(
        width="100%", thickness=1.5, color=ACCENT_COLOR,
        spaceBefore=0, spaceAfter=10,
    ))

    offering = _safe(data.get("offeringName", "the offering"))
    results = data.get("results", [])
    top_market = _safe(results[0].get("name", "the target market")) if results else "the target market"

    assumptions = [
        ("Demand", f"Local target shoppers in {top_market} will buy {offering} at a premium compared to existing options.", "Conduct 50 consumer interviews and digital concept tests."),
        ("Channel Access", "Distributors will accept standard 40% margin splits and provide prominent placement.", "Draft product pitch and secure 3 exploratory LOIs."),
        ("Financial Margins", "Tariffs, customs, and logistics fees will not compress net margins below 25%.", "Perform landing cost exercise with customs broker."),
        ("Adaptation", "Standard labeling requires no massive reformulation or packaging overhauls.", "Submit packaging files to local regulatory consultants."),
    ]

    table_data = [[
        Paragraph("<b>Category</b>", styles["TableHeader"]),
        Paragraph("<b>Assumption</b>", styles["TableHeader"]),
        Paragraph("<b>Validation Action</b>", styles["TableHeader"]),
    ]]
    for cat, assumption, action in assumptions:
        table_data.append([
            Paragraph(_safe(cat), styles["TableCell"]),
            Paragraph(_safe(assumption), styles["TableCell"]),
            Paragraph(_safe(action), styles["TableCell"]),
        ])

    t = Table(table_data, colWidths=[1.2 * inch, 3 * inch, 2.3 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HEADER_COLOR),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, LIGHT_GRAY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, ALT_ROW_COLOR]),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 12))
    return elements


def _build_roadmap(styles, data: dict) -> list:
    """Build the 30-60-90 Day Validation Roadmap section."""
    elements = []
    elements.append(Paragraph(
        "6. 30-60-90 Day Validation Roadmap", styles["SectionHeader"]
    ))
    elements.append(HRFlowable(
        width="100%", thickness=1.5, color=ACCENT_COLOR,
        spaceBefore=0, spaceAfter=10,
    ))

    results = data.get("results", [])
    top_market = _safe(results[0].get("name", "Target Market")) if results else "Target Market"
    company = _safe(data.get("companyName", "Company"))
    offering = _safe(data.get("offeringName", "Offering"))

    elements.append(Paragraph(
        f"Based on current diagnostics, <b>{top_market}</b> represents a key "
        f"target for {company}'s expansion of {offering}. Near-term validation "
        f"must prioritize testing key hypotheses before capital deployment.",
        styles["MepBody"],
    ))

    phases = [
        ("Days 1\u201330: Regulatory & Margins", [
            "Submit label files to regional compliance auditor.",
            "Verify exact duty rates with customs broker.",
            "Build complete landed cost model worksheet.",
        ], "Landed Margin > 45%"),
        ("Days 31\u201360: Channel Exploration", [
            "Draft digital sales deck and product specs.",
            "Conduct 3 exploratory meetings with potential partners.",
            "Run localized test marketing campaigns.",
        ], "Minimum 1 LOI / Partner Agreement"),
        ("Days 61\u201390: Pilot Test Loops", [
            "Execute small air-freight test shipment batch.",
            "Conduct physical demo tastings or digital loops.",
            "Compile pricing response and repeat purchase signals.",
        ], "Shopper Acceptance Rate > 70%"),
    ]

    for phase_title, actions, gate in phases:
        elements.append(Paragraph(
            f"<b>{_safe(phase_title)}</b>", styles["SubHeader"]
        ))
        for action in actions:
            elements.append(Paragraph(
                f"\u2022 {_safe(action)}", styles["MepBody"]
            ))
        elements.append(Paragraph(
            f"<i>Decision Gate: {_safe(gate)}</i>", styles["MepNote"]
        ))
        elements.append(Spacer(1, 6))

    # Notes
    notes = data.get("consultantNotes", "")
    if notes and notes.strip():
        elements.append(Spacer(1, 12))
        elements.append(Paragraph("Consultant Notes", styles["SubHeader"]))
        for line in notes.strip().split("\n"):
            elements.append(Paragraph(_safe(line), styles["MepBody"]))

    return elements


def generate_pdf(data: dict) -> bytes:
    """
    Generate a complete MEP-light™ Executive Prioritisation PDF.

    Args:
        data: Dictionary containing company info, results, roadmap data.

    Returns:
        PDF file contents as bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=1 * inch,
        rightMargin=1 * inch,
        topMargin=1 * inch,
        bottomMargin=1 * inch,
    )

    styles = _build_styles()
    elements = []

    # 1. Cover Page
    elements.extend(_build_cover_page(styles, data))

    # 2. Executive Summary
    elements.extend(_build_executive_summary(styles, data))

    # 3. Company Profile
    elements.extend(_build_company_profile(styles, data))

    # 4. Market Ranking Matrix
    elements.extend(_build_market_ranking(styles, data))

    elements.append(PageBreak())

    # 5. Priority Recommendations
    elements.extend(_build_priority_recommendations(styles, data))

    # 6. Exposed Assumptions
    elements.extend(_build_exposed_assumptions(styles, data))

    elements.append(PageBreak())

    # 7. Validation Roadmap
    elements.extend(_build_roadmap(styles, data))

    # Footer disclaimer
    elements.append(Spacer(1, 24))
    elements.append(HRFlowable(
        width="100%", thickness=0.5, color=LIGHT_GRAY,
        spaceBefore=0, spaceAfter=8,
    ))
    elements.append(Paragraph(
        "This document was generated by MEP-light\u2122, a strategic diagnostic "
        "intelligence product. It does not constitute final market-entry approval, "
        "legal, regulatory, tax, or financial advice. All scores reflect structured "
        "preparedness assessments based on user-supplied inputs.",
        styles["MepNote"],
    ))

    doc.build(elements)
    return buffer.getvalue()
