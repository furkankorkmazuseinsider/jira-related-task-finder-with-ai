#!/usr/bin/env python3
"""
Build IDF cache for a Jira project.

Usage:
    python build_idf.py <PROJECT_KEY> [--days 365] [--quick]

--quick : Only fetch the most recent 50 tasks (fast bootstrap, no pagination).
Default : Fetch all tasks created in the last N days (full corpus, paginated).

Output : cache/idf_<PROJECT_KEY>.json with shape:
    {
        "project": "SD",
        "built_at": "2026-04-08T12:00:00Z",
        "doc_count": 1234,
        "idf": { "token": 4.21, ... },
        "df":  { "token": 18, ... }   # raw doc-frequency, useful for debugging
    }

Reads Jira credentials from ../../../mcp.json (JIRA_URL, JIRA_USERNAME,
JIRA_API_TOKEN).
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import requests  # type: ignore
from requests.auth import HTTPBasicAuth  # type: ignore

# --- structural stop words only — NO domain words ---------------------------
STOP_WORDS = {
    # English
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "to", "of", "in", "for", "on", "with", "at", "by", "from", "as",
    "and", "or", "but", "if", "then", "than", "that", "this", "these",
    "those", "it", "its", "we", "you", "they", "i", "he", "she", "him",
    "her", "them", "our", "your", "their", "do", "does", "did", "have",
    "has", "had", "will", "would", "should", "could", "can", "may",
    "might", "must", "not", "no", "so", "such", "into", "out", "up",
    "down", "over", "under", "again", "further", "more", "most", "some",
    "any", "all", "each", "few", "other", "only", "own", "same", "very",
    # Turkish
    "ve", "ile", "için", "icin", "bir", "bu", "şu", "su", "o", "da",
    "de", "mi", "mu", "ki", "ya", "ama", "ancak", "fakat", "veya",
    "çünkü", "cunku", "gibi", "kadar", "göre", "gore", "ise", "her",
    "hiç", "hic", "çok", "cok", "daha", "en", "olan", "olarak",
}

TOKEN_RE = re.compile(r"[a-zçğıöşü0-9_\-]{3,}", re.IGNORECASE)


def load_credentials() -> tuple[str, str, str]:
    mcp_path = Path(__file__).resolve().parents[3] / "mcp.json"
    with mcp_path.open() as f:
        cfg = json.load(f)
    # mcp.json structure varies; walk it to find the env block.
    for server in cfg.get("mcpServers", {}).values():
        env = server.get("env", {})
        if "JIRA_URL" in env and "JIRA_API_TOKEN" in env:
            return env["JIRA_URL"], env["JIRA_USERNAME"], env["JIRA_API_TOKEN"]
    raise SystemExit("JIRA credentials not found in mcp.json")


def clean(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"https?://\S+", " ", text)
    text = re.sub(r"`[^`]*`", " ", text)
    text = re.sub(r"[*_~>#\[\](){}|]", " ", text)
    return text.lower()


def tokenize(text: str) -> set[str]:
    return {
        t for t in TOKEN_RE.findall(clean(text))
        if t not in STOP_WORDS and not t.isdigit()
    }


def fetch_tasks(base_url: str, auth: HTTPBasicAuth, jql: str, max_results: int) -> Iterable[dict]:
    """Yield issues using the new /search/jql endpoint with nextPageToken."""
    url = f"https://{base_url}/rest/api/3/search/jql"
    next_token = None
    fetched = 0
    while True:
        body = {
            "jql": jql,
            "maxResults": min(100, max_results - fetched),
            "fields": ["summary", "description"],
        }
        if next_token:
            body["nextPageToken"] = next_token
        r = requests.post(url, json=body, auth=auth, timeout=30)
        r.raise_for_status()
        data = r.json()
        issues = data.get("issues", [])
        for issue in issues:
            yield issue
            fetched += 1
            if fetched >= max_results:
                return
        next_token = data.get("nextPageToken")
        if not next_token or not issues:
            return


def extract_text(issue: dict) -> str:
    f = issue.get("fields", {})
    parts = [f.get("summary") or ""]
    desc = f.get("description")
    # description in v3 API is ADF (Atlassian Doc Format) — flatten naively
    if isinstance(desc, dict):
        parts.append(json.dumps(desc))
    elif isinstance(desc, str):
        parts.append(desc)
    return " ".join(parts)


def build_idf(project: str, days: int, quick: bool) -> dict:
    base_url, user, token = load_credentials()
    auth = HTTPBasicAuth(user, token)

    if quick:
        jql = f"project = {project} ORDER BY created DESC"
        max_results = 50
    else:
        jql = f"project = {project} AND created >= -{days}d ORDER BY created DESC"
        max_results = 5000  # safety cap

    df: dict[str, int] = {}
    doc_count = 0
    for issue in fetch_tasks(base_url, auth, jql, max_results):
        tokens = tokenize(extract_text(issue))
        for tok in tokens:
            df[tok] = df.get(tok, 0) + 1
        doc_count += 1
        if doc_count % 100 == 0:
            print(f"  ... {doc_count} tasks processed", file=sys.stderr)

    if doc_count == 0:
        raise SystemExit(f"No tasks found for project {project}")

    idf = {tok: math.log(doc_count / freq) for tok, freq in df.items()}

    return {
        "project": project,
        "built_at": datetime.now(timezone.utc).isoformat(),
        "doc_count": doc_count,
        "mode": "quick" if quick else f"last_{days}_days",
        "idf": idf,
        "df": df,
    }


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("project", help="Jira project key (e.g., SD, INAPP)")
    p.add_argument("--days", type=int, default=365)
    p.add_argument("--quick", action="store_true", help="Fast bootstrap (50 tasks)")
    args = p.parse_args()

    print(f"Building IDF for {args.project} ({'quick' if args.quick else f'last {args.days} days'})...", file=sys.stderr)
    result = build_idf(args.project, args.days, args.quick)

    cache_dir = Path(__file__).resolve().parents[1] / "cache"
    cache_dir.mkdir(exist_ok=True)
    out = cache_dir / f"idf_{args.project}.json"
    with out.open("w") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"OK — {result['doc_count']} docs, {len(result['idf'])} tokens → {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
