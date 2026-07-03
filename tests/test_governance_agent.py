"""
MEP-light™ — ADK Governance Agent Tests

Verifies that the governance agent correctly detects:
  - Overconfident language
  - Market-entry approval language
  - Legal/financial advice
  - Missing uncertainty markers
  - PII exposure

Charter: "Clarify Preparedness, Do Not Predict Success" [10, 14]
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.python.adk.governance_agent import (
    check_overconfidence,
    check_approval_language,
    check_legal_financial,
    check_missing_uncertainty,
    check_pii_exposure,
    run_full_governance_check,
)


def test_overconfidence_detection():
    """GOV-001: Overconfident language must be detected."""
    # Should detect
    assert len(check_overconfidence("This market will guarantee success")) > 0
    assert len(check_overconfidence("The company will definitely succeed in this region")) > 0
    assert len(check_overconfidence("There is no risk in entering this market")) > 0
    assert len(check_overconfidence("This is a risk-free opportunity")) > 0
    assert len(check_overconfidence("Without doubt, this is the best option")) > 0
    
    # Should NOT detect
    assert len(check_overconfidence("Based on current evidence, this appears promising")) == 0
    assert len(check_overconfidence("This market warrants further validation")) == 0
    assert len(check_overconfidence("Preliminary assessment suggests moderate potential")) == 0
    
    print("  ✓ GOV-001: Overconfidence detection")


def test_approval_language_detection():
    """GOV-002: Approval language must be detected."""
    # Should detect
    assert len(check_approval_language("You should enter this market immediately")) > 0
    assert len(check_approval_language("We recommend entry into Germany")) > 0
    assert len(check_approval_language("This market is approved for entry")) > 0
    assert len(check_approval_language("Go ahead with the expansion plan")) > 0
    
    # Should NOT detect
    assert len(check_approval_language("This market appears to be a validation candidate")) == 0
    assert len(check_approval_language("The diagnostic suggests further evaluation")) == 0
    
    print("  ✓ GOV-002: Approval language detection")


def test_legal_financial_detection():
    """GOV-003: Legal/financial advice must be detected."""
    # Should detect
    assert len(check_legal_financial("This is legally compliant with EU regulations")) > 0
    assert len(check_legal_financial("This meets all regulatory requirements")) > 0
    assert len(check_legal_financial("We can provide tax advice on this structure")) > 0
    
    # Should NOT detect
    assert len(check_legal_financial("Regulatory complexity requires specialist review")) == 0
    assert len(check_legal_financial("Consult qualified legal counsel before proceeding")) == 0
    
    print("  ✓ GOV-003: Legal/financial advice detection")


def test_missing_uncertainty():
    """GOV-004: Substantial content without uncertainty markers should be flagged."""
    # Long content without uncertainty markers
    long_content = "This market offers excellent opportunities. " * 10
    violations = check_missing_uncertainty(long_content)
    assert len(violations) > 0, "Long content without uncertainty should be flagged"
    
    # Content WITH uncertainty markers
    qualified_content = ("Based on current evidence and preliminary assessment, "
                         "this market appears to offer moderate opportunities. "
                         "The confidence level remains Medium pending validation. " * 3)
    violations = check_missing_uncertainty(qualified_content)
    assert len(violations) == 0, "Content with uncertainty markers should pass"
    
    # Short content — should not flag
    short_content = "Market looks good."
    violations = check_missing_uncertainty(short_content)
    assert len(violations) == 0, "Short content should not be flagged"
    
    print("  ✓ GOV-004: Missing uncertainty detection")


def test_pii_exposure():
    """GOV-005: PII exposure must be detected."""
    # Should detect
    violations = check_pii_exposure("Contact john.doe@example.com for details")
    assert len(violations) > 0, "Email addresses should be detected"
    
    # Should NOT detect safe emails
    violations = check_pii_exposure("Contact consultant@innobase.app for support")
    assert len(violations) == 0, "Safe emails should be allowed"
    
    # No PII
    violations = check_pii_exposure("This market has strong potential based on evidence.")
    assert len(violations) == 0, "Content without PII should pass"
    
    print("  ✓ GOV-005: PII exposure detection")


def test_full_governance_check_pass():
    """Full governance check should pass for compliant content."""
    compliant = ("Based on current evidence and preliminary assessment, "
                 "this market appears to be a leading validation candidate. "
                 "Confidence level: Medium. Subject to further validation. "
                 "This assessment does not constitute market-entry approval.")
    
    result = run_full_governance_check(compliant)
    assert result["passed"] is True, f"Compliant content should pass. Violations: {result['violations']}"
    assert len(result["checked_rules"]) >= 5
    
    print("  ✓ Full governance check — compliant content passes")


def test_full_governance_check_fail():
    """Full governance check should fail for non-compliant content."""
    non_compliant = ("You should enter this market. It will guarantee success. "
                     "There is no risk. This is legally compliant.")
    
    result = run_full_governance_check(non_compliant)
    assert result["passed"] is False, "Non-compliant content should fail"
    critical_count = sum(1 for v in result["violations"] if v["severity"] == "critical")
    assert critical_count >= 3, f"Expected >= 3 critical violations, got {critical_count}"
    
    print("  ✓ Full governance check — non-compliant content fails")


def test_governance_violation_codes():
    """Governance violations should have proper codes."""
    result = run_full_governance_check("This will guarantee profit and we recommend entry.")
    codes = [v["code"] for v in result["violations"]]
    assert any(c.startswith("GOV-001") for c in codes), "Should have overconfidence code"
    assert any(c.startswith("GOV-002") for c in codes), "Should have approval code"
    
    print("  ✓ Governance violation codes are properly structured")


# ─── Test Runner ──────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n" + "─" * 60)
    print("  MEP-light™ — ADK Governance Agent Tests")
    print("─" * 60 + "\n")
    
    tests = [
        test_overconfidence_detection,
        test_approval_language_detection,
        test_legal_financial_detection,
        test_missing_uncertainty,
        test_pii_exposure,
        test_full_governance_check_pass,
        test_full_governance_check_fail,
        test_governance_violation_codes,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"  ✗ {test.__name__}: {e}")
            failed += 1
        except Exception as e:
            print(f"  ✗ {test.__name__}: UNEXPECTED ERROR: {e}")
            failed += 1
    
    print("\n" + "─" * 60)
    print(f"  GOVERNANCE TEST SUMMARY")
    print("─" * 60)
    print(f"\n  Total: {passed + failed}  Passed: {passed}  Failed: {failed}\n")
    
    if failed == 0:
        print("  ╔══════════════════════════════════════════════════╗")
        print("  ║  ✓ ALL GOVERNANCE TESTS PASSED                  ║")
        print("  ╚══════════════════════════════════════════════════╝\n")
    else:
        print("  ╔══════════════════════════════════════════════════╗")
        print(f"  ║  ✗ {failed} GOVERNANCE TEST(S) FAILED              ║")
        print("  ╚══════════════════════════════════════════════════╝\n")
        sys.exit(1)
