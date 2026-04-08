// Background Service Worker - API Handler

class JiraAPI {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 60 * 60 * 1000; // 1 hour
  }

  async getCredentials() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['jiraUrl', 'jiraUsername', 'jiraToken'], (result) => {
        if (!result.jiraUrl || !result.jiraUsername || !result.jiraToken) {
          resolve(null);
        } else {
          resolve({
            url: result.jiraUrl,
            username: result.jiraUsername,
            token: result.jiraToken
          });
        }
      });
    });
  }

  async fetchAPI(endpoint, options = {}) {
    const credentials = await this.getCredentials();

    if (!credentials) {
      throw new Error(
        'Jira credentials not configured. Please open settings.'
      );
    }

    const url = `${credentials.url}/rest/api/3${endpoint}`;
    const auth = btoa(`${credentials.username}:${credentials.token}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(
        `Jira API Error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  getCacheKey(endpoint) {
    return `cache:${endpoint}`;
  }

  isCacheValid(cacheEntry) {
    return (
      cacheEntry &&
      cacheEntry.timestamp &&
      Date.now() - cacheEntry.timestamp < this.cacheExpiry
    );
  }

  async getIssue(taskId) {
    const cacheKey = this.getCacheKey(`/issue/${taskId}`);
    const cached = this.cache.get(cacheKey);

    if (this.isCacheValid(cached)) {
      return cached.data;
    }

    const data = await this.fetchAPI(`/issue/${taskId}?fields=summary,description,status,issuetype,issuelinks,subtasks,parent,customfield_10014`);

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  async searchIssues(jql, maxResults = 50) {
    const body = JSON.stringify({
      jql: jql,
      maxResults: maxResults,
      fields: ['summary', 'status', 'issuetype']
    });

    const cacheKey = this.getCacheKey(`/search:${jql}`);
    const cached = this.cache.get(cacheKey);

    if (this.isCacheValid(cached)) {
      return cached.data;
    }

    const data = await this.fetchAPI('/search', {
      method: 'POST',
      body: body
    });

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  async getComments(taskId) {
    const data = await this.fetchAPI(`/issue/${taskId}/comment`);
    return data.comments || [];
  }
}

const jiraAPI = new JiraAPI();

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'searchTask') {
    handleSearchTask(request.taskId)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep channel open for async
  }
});

async function handleSearchTask(taskId) {
  try {
    const issue = await jiraAPI.getIssue(taskId);

    const results = {
      parent: [],
      jiraLinks: [],
      subtasks: [],
      similar: [],
      commentRefs: []
    };

    // 1. Parent task
    if (issue.fields.parent) {
      const parent = issue.fields.parent;
      results.parent.push({
        key: parent.key,
        summary: parent.fields.summary,
        status: parent.fields.status.name,
        type: parent.fields.issuetype.name,
        link: `${getJiraUrl(issue.self)}/browse/${parent.key}`,
        relation: 'Parent'
      });
    }

    // 2. Jira Links
    const links = issue.fields.issuelinks || [];
    for (const link of links) {
      if (link.outwardIssue) {
        const linkedIssue = link.outwardIssue;
        results.jiraLinks.push({
          key: linkedIssue.key,
          summary: linkedIssue.fields.summary,
          status: linkedIssue.fields.status.name,
          type: linkedIssue.fields.issuetype.name,
          link: `${getJiraUrl(issue.self)}/browse/${linkedIssue.key}`,
          relation: `Jira-Link (${link.type.name})`
        });
      }

      if (link.inwardIssue) {
        const linkedIssue = link.inwardIssue;
        results.jiraLinks.push({
          key: linkedIssue.key,
          summary: linkedIssue.fields.summary,
          status: linkedIssue.fields.status.name,
          type: linkedIssue.fields.issuetype.name,
          link: `${getJiraUrl(issue.self)}/browse/${linkedIssue.key}`,
          relation: `Jira-Link (${link.type.inward})`
        });
      }
    }

    // 3. Subtasks
    const subtasks = issue.fields.subtasks || [];
    for (const subtask of subtasks) {
      results.subtasks.push({
        key: subtask.key,
        summary: subtask.fields.summary,
        status: subtask.fields.status.name,
        type: subtask.fields.issuetype.name,
        link: `${getJiraUrl(issue.self)}/browse/${subtask.key}`,
        relation: 'Sub-task'
      });
    }

    // 4. Similar tasks (by description/summary)
    const projectKey = issue.key.split('-')[0];
    const similarTasks = await findSimilarTasks(issue, projectKey);
    results.similar = similarTasks;

    // 5. Comment references
    const comments = await jiraAPI.getComments(taskId);
    const referencedTasks = extractTaskReferences(comments);
    for (const refTaskId of referencedTasks) {
      if (refTaskId !== taskId) {
        try {
          const refIssue = await jiraAPI.getIssue(refTaskId);
          results.commentRefs.push({
            key: refIssue.key,
            summary: refIssue.fields.summary,
            status: refIssue.fields.status.name,
            type: refIssue.fields.issuetype.name,
            link: `${getJiraUrl(refIssue.self)}/browse/${refIssue.key}`,
            relation: 'From Comment'
          });
        } catch (e) {
          // Skip if task not found
        }
      }
    }

    return results;
  } catch (error) {
    throw error;
  }
}

async function findSimilarTasks(targetIssue, projectKey) {
  try {
    const jql = `project = ${projectKey} AND type != Epic AND key != ${targetIssue.key}`;
    const searchResults = await jiraAPI.searchIssues(jql, 30);

    const targetText = `${targetIssue.fields.summary}`.toLowerCase();
    const targetWords = new Set(
      targetText.match(/\w+/g).filter(w => w.length > 2)
    );

    const similar = [];

    for (const issue of searchResults.issues) {
      const issueText = issue.fields.summary.toLowerCase();
      const issueWords = new Set(
        issueText.match(/\w+/g).filter(w => w.length > 2)
      );

      if (issueWords.size === 0 || targetWords.size === 0) continue;

      const intersection = [...targetWords].filter(w => issueWords.has(w)).length;
      const union = new Set([...targetWords, ...issueWords]).size;
      const score = intersection / union;

      if (score >= 0.15) {
        similar.push({
          key: issue.key,
          summary: issue.fields.summary,
          status: issue.fields.status.name,
          type: issue.fields.issuetype.name,
          link: `${getJiraUrl(targetIssue.self)}/browse/${issue.key}`,
          relation: 'AI-Similar',
          score: (score * 100).toFixed(0) + '%'
        });
      }
    }

    return similar.sort((a, b) => {
      const scoreA = parseInt(a.score);
      const scoreB = parseInt(b.score);
      return scoreB - scoreA;
    }).slice(0, 5);
  } catch (e) {
    console.warn('Similar task search failed:', e);
    return [];
  }
}

function extractTaskReferences(comments) {
  const taskPattern = /[A-Z]+-\d+/g;
  const referenced = new Set();

  for (const comment of comments) {
    const text = extractTextFromADF(comment.body || {});
    const matches = text.match(taskPattern) || [];
    matches.forEach(task => referenced.add(task));
  }

  return Array.from(referenced);
}

function extractTextFromADF(adf) {
  if (!adf || !adf.content) return '';

  let text = '';

  function traverse(node) {
    if (node.type === 'text') {
      text += node.text + ' ';
    }
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }
  }

  adf.content.forEach(traverse);
  return text;
}

function getJiraUrl(selfUrl) {
  // Extract base URL from self URL
  // Example: https://winsider.atlassian.net/rest/api/3/issue/123
  const match = selfUrl.match(/^(https?:\/\/[^/]+)/);
  return match ? match[1] : '';
}

console.log('🚀 Jira Task Finder Background Worker loaded');
