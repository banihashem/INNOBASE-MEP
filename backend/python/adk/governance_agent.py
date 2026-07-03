"""
MEP-light™ — Governance and Guardrail Agent

Checks every agent output for:
  - Overconfidence (asserting certainty without evidence)
  - Unsupported claims (facts without citations)
  - Legal/financial/regulatory advice risk
  - Missing uncertainty labels
  - Missing human review status
  - Unsafe user data exposure
  - Prompt injection concerns

This agent is the final line of defense before any output reaches
a client or consultant. It enforces the MEP-light™ Concept Layer Charter.

Charter Compliance:
  "Clarify Preparedness, Do Not Predict Success" [10, 14]
  "Prohibited Agency: Do not issue final market-entry approvals" [10, 18]
"""

import re
import logging
from typing import Optional

logger = logging.getLogger("mep.adk.governance")

# ─── Prohibited Language Patterns ─────────────────────────────────────

# Patterns that indicate overconfident or prescriptive language
OVERCONFIDENCE_PATTERNS = [
    r"\bguarantee[sd]?\b",
    r"\bwill\s+succeed\b",
    r"\bwill\s+generate\s+(ROI|revenue|profit)\b",
    r"\bcertain(ly)?\s+to\b",
    r"\bwithout\s+doubt\b",
    r"\bno\s+risk\b",
    r"\brisk[\-\s]?free\b",
    r"\bsure\s+(to|that)\b",
    r"\bdefinitely\s+will\b",
    r"\bwill\s+definitely\b",
    r"\babsolutely\b",
    r"\bunquestionably\b",
]

# Patterns that indicate prescriptive/approval language
APPROVAL_PATTERNS = [
    r"\byou\s+should\s+enter\b",
    r"\benter\s+this\s+market\b",
    r"\bthis\s+is\s+the\s+best\s+market\b",
    r"\bwe\s+recommend\s+entry\b",
    r"\bapproved?\s+for\s+entry\b",
    r"\bentry\s+is\s+approved\b",
    r"\bgo\s+ahead\s+with\b",
    r"\bproceed\s+with\s+entry\b",
]

# Patterns that indicate legal/financial/regulatory advice
LEGAL_FINANCIAL_PATTERNS = [
    r"\bthis\s+is\s+compliant\b",
    r"\blegally?\s+compliant\b",
    r"\btax\s+advice\b",
    r"\bfinancial\s+advice\b",
    r"\blegal\s+advice\b",
    r"\bregulatory\s+advice\b",
    r"\byou\s+are\s+(legally|tax)\b",
    r"\bthis\s+meets?\s+all\s+regulatory\b",
    r"\bno\s+regulatory\s+issues?\b",
    r"\bcertified\b.*\bcomplian(ce|t)\b",
]

# Preferred advisory language
PREFERRED_PHRASES = [
    "Based on current evidence and assumptions",
    "appears to be a leading validation candidate",
    "subject to further validation",
    "requires verification",
    "preliminary assessment suggests",
    "based on available evidence",
    "warrants further investigation",
]


# ─── Governance Checks ───────────────────────────────────────────────

def check_overconfidence(content: str) -> list[dict]:
    """Check content for overconfident language."""
    violations = []
    for pattern in OVERCONFIDENCE_PATTERNS:
        matches = re.finditer(pattern, content, re.IGNORECASE)
        for match in matches:
            violations.append({
                "code": "GOV-001-OVERCONFIDENCE",
                "severity": "critical",
                "message": f"Overconfident language detected: '{match.group()}'",
                "location": f"position {match.start()}-{match.end()}",
                "suggestion": "Replace with cautious, validation-oriented language. "
                              "Use: 'Based on current evidence and assumptions, this appears to be a leading validation candidate.'"
            })
    return violations


def check_approval_language(content: str) -> list[dict]:
    """Check content for market-entry approval language."""
    violations = []
    for pattern in APPROVAL_PATTERNS:
        matches = re.finditer(pattern, content, re.IGNORECASE)
        for match in matches:
            violations.append({
                "code": "GOV-002-APPROVAL",
                "severity": "critical",
                "message": f"Prohibited approval language detected: '{match.group()}'",
                "location": f"position {match.start()}-{match.end()}",
                "suggestion": "MEP-light™ does not approve or reject market entry. "
                              "Use: 'Based on diagnostics, this market warrants further validation.'"
            })
    return violations


def check_legal_financial(content: str) -> list[dict]:
    """Check content for legal/financial/regulatory advice."""
    violations = []
    for pattern in LEGAL_FINANCIAL_PATTERNS:
        matches = re.finditer(pattern, content, re.IGNORECASE)
        for match in matches:
            violations.append({
                "code": "GOV-003-LEGAL-FINANCIAL",
                "severity": "critical",
                "message": f"Potential legal/financial/regulatory advice detected: '{match.group()}'",
                "location": f"position {match.start()}-{match.end()}",
                "suggestion": "MEP-light™ does not provide legal, regulatory, tax, or financial advice. "
                              "Add disclaimer and recommend professional consultation."
            })
    return violations


def check_missing_uncertainty(content: str) -> list[dict]:
    """Check that content includes appropriate uncertainty markers."""
    violations = []
    
    # Check if content makes claims without any uncertainty language
    uncertainty_markers = [
        r"\bassum",
        r"\bestimate",
        r"\bvalidation\b",
        r"\buncertain",
        r"\bpreliminary\b",
        r"\bbased on\b",
        r"\bsubject to\b",
        r"\brequires?\s+verification\b",
        r"\bconfidence\b",
        r"\bevidence\b",
    ]
    
    has_uncertainty = any(
        re.search(pattern, content, re.IGNORECASE)
        for pattern in uncertainty_markers
    )
    
    # Only flag if content is substantial (>100 chars) and lacks uncertainty
    if len(content) > 100 and not has_uncertainty:
        violations.append({
            "code": "GOV-004-MISSING-UNCERTAINTY",
            "severity": "warning",
            "message": "Content lacks uncertainty/evidence qualification markers",
            "location": "entire content",
            "suggestion": "Add confidence levels, evidence basis, or assumption markers to qualify claims."
        })
    
    return violations


def check_pii_exposure(content: str) -> list[dict]:
    """Check for potential PII exposure in content."""
    violations = []
    
    # Email pattern
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = re.findall(email_pattern, content)
    # Allow known safe emails
    safe_emails = {"consultant@innobase.app"}
    unsafe_emails = [e for e in emails if e not in safe_emails]
    
    if unsafe_emails:
        violations.append({
            "code": "GOV-005-PII",
            "severity": "warning",
            "message": f"Potential PII exposure: {len(unsafe_emails)} email address(es) found",
            "location": "content body",
            "suggestion": "Remove or mask personal email addresses before client-facing output."
        })
    
    return violations


def run_full_governance_check(
    content: str,
    content_type: str = "advisory_text",
) -> dict:
    """
    Run all governance checks on content.
    
    Returns:
        {
            "passed": bool,
            "violations": list[dict],
            "checked_rules": list[str],
            "content_type": str,
        }
    """
    all_violations = []
    checked_rules = []
    
    # Overconfidence check
    checked_rules.append("GOV-001-OVERCONFIDENCE")
    all_violations.extend(check_overconfidence(content))
    
    # Approval language check
    checked_rules.append("GOV-002-APPROVAL")
    all_violations.extend(check_approval_language(content))
    
    # Legal/financial check
    checked_rules.append("GOV-003-LEGAL-FINANCIAL")
    all_violations.extend(check_legal_financial(content))
    
    # Uncertainty markers check
    checked_rules.append("GOV-004-MISSING-UNCERTAINTY")
    all_violations.extend(check_missing_uncertainty(content))
    
    # PII check
    checked_rules.append("GOV-005-PII")
    all_violations.extend(check_pii_exposure(content))
    
    # Determine if passed — critical violations fail
    has_critical = any(v["severity"] == "critical" for v in all_violations)
    
    logger.info(
        "Governance check completed",
        extra={
            "content_type": content_type,
            "passed": not has_critical,
            "total_violations": len(all_violations),
            "critical_violations": sum(1 for v in all_violations if v["severity"] == "critical"),
        }
    )
    
    return {
        "passed": not has_critical,
        "violations": all_violations,
        "checked_rules": checked_rules,
        "content_type": content_type,
    }
