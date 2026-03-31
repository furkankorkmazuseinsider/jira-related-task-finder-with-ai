#!/usr/bin/env python3
"""
Slack Search Integration for Jira Related Task Finder
Searches Slack for task mentions and related discussions
"""

import json
import sys
from datetime import datetime
from typing import Dict, List, Optional, Tuple

try:
    import requests # type: ignore
except ImportError:
    print("Error: 'requests' library not found. Install: pip install requests", file=sys.stderr)
    sys.exit(1)

# Load credentials from mcp.json
def load_slack_token() -> Optional[str]:
    """Load Slack user token from mcp.json"""
    try:
        with open('mcp.json', 'r') as f:
            config = json.load(f)
            token = config.get('mcpServers', {}) \
                         .get('jira-related-task-finder', {}) \
                         .get('env', {}) \
                         .get('SLACK_USER_TOKEN')
            return token if token and token.strip() else None
    except Exception as e:
        print(f"⚠️ Could not load SLACK_USER_TOKEN: {e}", file=sys.stderr)
        return None


def search_slack_direct(token: str, query: str, count: int = 20) -> Tuple[bool, List[Dict]]:
    """
    Search Slack for direct task ID mentions (e.g., "SD-134980")
    Returns: (success, results)
    """
    if not token:
        return False, []

    try:
        headers = {"Authorization": f"Bearer {token}"}
        url = f"https://slack.com/api/search.messages"
        params = {
            "query": query,
            "count": count,
            "sort": "timestamp"
        }

        response = requests.get(url, headers=headers, params=params, timeout=10)
        data = response.json()

        if not data.get('ok'):
            error = data.get('error', 'Unknown error')
            if error == 'not_authed':
                print(f"❌ Slack auth failed: Check SLACK_USER_TOKEN in mcp.json", file=sys.stderr)
            elif error == 'missing_scope':
                print(f"❌ Slack token missing 'search:read' scope", file=sys.stderr)
            else:
                print(f"⚠️ Slack search failed: {error}", file=sys.stderr)
            return False, []

        messages = data.get('messages', {}).get('matches', [])
        return True, messages

    except requests.exceptions.RequestException as e:
        print(f"⚠️ Slack API error: {e}", file=sys.stderr)
        return False, []


def search_slack_keywords(token: str, keywords: List[str], count: int = 10) -> Tuple[bool, List[Dict]]:
    """
    Search Slack for keywords (high-weight terms from task)
    Returns: (success, results)
    """
    if not token or not keywords:
        return False, []

    # Build query: multiple keywords with OR
    query = " OR ".join(f'"{kw}"' for kw in keywords)
    return search_slack_direct(token, query, count)


def format_slack_result(msg: Dict) -> Dict:
    """Format Slack message result"""
    try:
        ts = msg.get('ts', '')
        ts_float = float(ts.split('.')[0]) if ts else 0
        date = datetime.fromtimestamp(ts_float).strftime('%Y-%m-%d %H:%M') if ts_float else 'Unknown'

        channel = msg.get('channel', {})
        channel_name = channel.get('name', 'Unknown') if isinstance(channel, dict) else channel

        user = msg.get('user', {})
        user_name = user.get('real_name', user.get('name', 'Unknown')) if isinstance(user, dict) else user

        text = msg.get('text', '')[:200]  # Truncate to 200 chars

        return {
            'channel': channel_name,
            'author': user_name,
            'date': date,
            'content': text,
            'message_id': f"{channel_name}/{ts}" if ts else None
        }
    except Exception as e:
        return None


def search_task_on_slack(task_id: str, task_summary: str) -> Dict:
    """
    Main function: Search Slack for task mentions
    Returns results structured for display
    """
    token = load_slack_token()

    result = {
        'enabled': bool(token),
        'task_id': task_id,
        'direct_mentions': [],
        'keyword_matches': [],
        'total_found': 0,
        'status': 'disabled'
    }

    if not token:
        result['status'] = 'token_missing'
        return result

    # Step 1: Direct task ID search (e.g., SD-134980)
    print(f"🔍 Searching Slack for direct mentions of '{task_id}'...", file=sys.stderr)
    success, direct_results = search_slack_direct(token, task_id, count=15)

    if success:
        result['direct_mentions'] = [
            fmt for msg in direct_results
            if (fmt := format_slack_result(msg)) is not None
        ]
        print(f"   Found {len(result['direct_mentions'])} direct mentions", file=sys.stderr)
    else:
        result['status'] = 'auth_failed'
        return result

    # Step 2: Keyword search (entity weights >= 2)
    keywords = extract_high_weight_keywords(task_summary)
    if keywords:
        print(f"🔍 Searching Slack for keywords: {', '.join(keywords[:5])}...", file=sys.stderr)
        success, keyword_results = search_slack_keywords(token, keywords, count=10)

        if success:
            # Deduplicate with direct mentions
            direct_ids = {m.get('message_id') for m in result['direct_mentions']}
            result['keyword_matches'] = [
                fmt for msg in keyword_results
                if (fmt := format_slack_result(msg)) is not None
                and fmt.get('message_id') not in direct_ids
            ]
            print(f"   Found {len(result['keyword_matches'])} keyword matches", file=sys.stderr)

    result['total_found'] = len(result['direct_mentions']) + len(result['keyword_matches'])
    result['status'] = 'success' if result['total_found'] > 0 else 'no_results'

    return result


def extract_high_weight_keywords(text: str) -> List[str]:
    """Extract high-weight keywords (weight >= 2) from task summary"""
    entity_weights = {
        'coupon': 3, 'architect': 3, 'wrong': 3, 'crash': 3,
        'template': 2, 'inapp': 2, 'in-app': 2, 'journey': 2,
        'popup': 2, 'notification': 2, 'email': 2, 'sms': 2,
        'push': 2, 'webhook': 2, 'segment': 2, 'event': 2,
        'mobile': 2, 'android': 2, 'ios': 2, 'web': 2,
        'bug': 2, 'error': 2, 'fix': 2, 'broken': 2,
        'samsung': 2, 'partner': 2, 'customer': 2
    }

    words = text.lower().split()
    high_weight = []

    for word in words:
        # Clean word (remove punctuation)
        clean_word = ''.join(c for c in word if c.isalnum() or c == '-')
        if clean_word in entity_weights:
            high_weight.append(clean_word)

    # Return unique, max 5 keywords
    return list(dict.fromkeys(high_weight))[:5]


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python slack_search.py <task_id> [task_summary]")
        sys.exit(1)

    task_id = sys.argv[1]
    task_summary = sys.argv[2] if len(sys.argv) > 2 else ""

    results = search_task_on_slack(task_id, task_summary)
    print(json.dumps(results, indent=2))
