// Content Script for Jira Pages
// Detects task ID and adds UI elements

console.log('🔗 Jira Content Script loaded');

// Extract task ID from current Jira page
function getCurrentTaskId() {
  const match = window.location.pathname.match(/browse\/([A-Z]+-\d+)/);
  return match ? match[1] : null;
}

// Create sidebar button
function createSidebarButton() {
  const taskId = getCurrentTaskId();
  if (!taskId) return;

  // Look for Jira sidebar or any suitable container
  const header = document.querySelector('[data-testid="software-board"]') ||
                 document.querySelector('nav') ||
                 document.querySelector('header');

  if (!header) return;

  // Don't create duplicate
  if (document.getElementById('jira-task-finder-btn')) return;

  const button = document.createElement('button');
  button.id = 'jira-task-finder-btn';
  button.innerHTML = '🔗 Task Finder';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 16px;
    background: #0052cc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 82, 204, 0.3);
    transition: all 0.2s;
  `;

  button.addEventListener('mouseover', () => {
    button.style.background = '#0747a6';
    button.style.boxShadow = '0 6px 16px rgba(0, 82, 204, 0.4)';
  });

  button.addEventListener('mouseout', () => {
    button.style.background = '#0052cc';
    button.style.boxShadow = '0 4px 12px rgba(0, 82, 204, 0.3)';
  });

  button.addEventListener('click', () => {
    // Open popup in new tab
    chrome.runtime.sendMessage({
      action: 'openPopup',
      taskId: taskId
    }, () => {
      console.log('Popup opened for', taskId);
    });
  });

  document.body.appendChild(button);
}

// Highlight task IDs on the page
function highlightTaskIds() {
  const taskPattern = /\b([A-Z]+-\d+)\b/g;
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  const nodesToProcess = [];
  let node;
  while (node = walker.nextNode()) {
    if (taskPattern.test(node.textContent)) {
      nodesToProcess.push(node);
    }
  }

  nodesToProcess.forEach(textNode => {
    const span = document.createElement('span');
    span.innerHTML = textNode.textContent.replace(
      /\b([A-Z]+-\d+)\b/g,
      '<span class="jira-task-link" style="cursor: pointer; color: #0052cc; text-decoration: underline; border-radius: 2px; padding: 0 2px;">$1</span>'
    );

    // Add click handlers to highlighted links
    const links = span.querySelectorAll('.jira-task-link');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = `/browse/${link.textContent}`;
      });
    });

    textNode.parentNode.replaceChild(span, textNode);
  });
}

// Initialize when page loads
function init() {
  const taskId = getCurrentTaskId();

  if (taskId) {
    console.log(`📌 Current task: ${taskId}`);

    // Add button after a delay to ensure DOM is ready
    setTimeout(() => {
      createSidebarButton();
      highlightTaskIds();
    }, 500);
  }
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Handle URL changes (Jira is SPA)
const observer = new MutationObserver(() => {
  const newTaskId = getCurrentTaskId();
  if (newTaskId) {
    const btn = document.getElementById('jira-task-finder-btn');
    if (!btn) {
      createSidebarButton();
    }
  }
});

observer.observe(document.body, {
  subtree: true,
  childList: true
});
