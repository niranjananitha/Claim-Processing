"""The frontend mirrors the status workflow (frontend/app/lib/workflow.ts) so it never
offers an action the API would reject with 409. Fail if the two copies drift apart."""
import re
from pathlib import Path

from app.core.permissions import TRANSITIONS

WORKFLOW_TS = Path(__file__).resolve().parents[2] / "frontend" / "app" / "lib" / "workflow.ts"


def _parse_ts_transitions() -> dict[str, dict[str, set[str]]]:
    src = WORKFLOW_TS.read_text(encoding="utf-8")
    body = src[src.index("const TRANSITIONS"):src.index("};", src.index("const TRANSITIONS"))]
    result: dict[str, dict[str, set[str]]] = {}
    role = None
    for line in body.splitlines():
        m_role = re.match(r"\s{2}(\w+): \{", line)
        if m_role:
            role = m_role.group(1)
            result[role] = {}
            continue
        m_rule = re.match(r'\s{4}(?:"([^"]+)"|(\w[\w-]*)): \[(.*)\],', line)
        if m_rule and role:
            from_status = m_rule.group(1) or m_rule.group(2)
            result[role][from_status] = set(re.findall(r'"([^"]+)"', m_rule.group(3)))
    return result


def test_frontend_workflow_matches_backend():
    assert WORKFLOW_TS.exists(), WORKFLOW_TS
    assert _parse_ts_transitions() == TRANSITIONS
