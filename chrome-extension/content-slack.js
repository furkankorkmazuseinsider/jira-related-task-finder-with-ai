// Content Script for Slack
// Detects task IDs in messages and adds tooltips

console.log('💬 Slack Content Script loaded');

// Task ID pattern
const TASK_PATTERN = /\b([A-Z]+-\d+)\b/g;

// Create tooltip element
function createTooltip(taskId) {
  const tooltip = document.createElement('div');
  tooltip.className = 'jira-task-tooltip';
  tooltip.style.cssText = `
    position: absolute;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 12px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    white-space: nowrap;
    cursor: pointer;
    background: #f9f9f9;
  `;

  tooltip.innerHTML = `
    <div style="font-weight: 600; color: #0052cc; margin-bottom: 4px;">${taskId}</div>
    <div style="color: #666; font-size: 11px;">Click to view related tasks</div>
  `;

  tooltip.addEventListener('click', () => {
    // Open popup
    chrome.runtime.sendMessage({
      action: 'searchTask',
      taskId: taskId
    });
  });

  return tooltip;
}

// Highlight task IDs in Slack messages
function highlightTaskIds() {
  // Find all message containers (Slack uses various structures)
  const messageElements = document.querySelectorAll(
    '[data-qa="message"], [class*="c-message"], [role="listitem"]'
  );

  messageElements.forEach(msg => {
    // Skip if already processed
    if (msg.hasAttribute('data-jira-processed')) return;
    msg.setAttribute('data-jira-processed', 'true');

    // Find text nodes with task IDs
    const walker = document.createTreeWalker(
      msg,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const nodesToReplace = [];
    let textNode;

    while (textNode = walker.nextNode()) {
      if (TASK_PATTERN.test(textNode.textContent)) {
        nodesToReplace.push(textNode);
      }
    }

    nodesToReplace.forEach(node => {
      // Don't process if already contains task links
      if (node.parentElement.classList.contains('jira-task-highlight')) return;

      const span = document.createElement('span');
      const text = node.textContent;

      span.innerHTML = text.replace(
        /\b([A-Z]+-\d+)\b/g,
        '<span class="jira-task-highlight" style="' +
        'background: #fffae3; ' +
        'color: #0052cc; ' +
        'padding: 2px 4px; ' +
        'border-radius: 2px; ' +
        'cursor: pointer; ' +
        'font-weight: 500; ' +
        'display: inline-block; ' +
        '">$1</span>'
      );

      // Add hover and click handlers
      const highlights = span.querySelectorAll('.jira-task-highlight');
      highlights.forEach(hl => {
        let tooltip = null;

        hl.addEventListener('mouseenter', (e) => {
          tooltip = createTooltip(hl.textContent);
          document.body.appendChild(tooltip);

          const rect = hl.getBoundingClientRect();
          tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + 'px';
          tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
        });

        hl.addEventListener('mouseleave', () => {
          if (tooltip) {
            tooltip.remove();
            tooltip = null;
          }
        });

        hl.addEventListener('click', (e) => {
          e.stopPropagation();
          // Send message to background to open popup
          chrome.runtime.sendMessage({
            action: 'searchTask',
            taskId: hl.textContent
          });
        });
      });

      node.parentNode.replaceChild(span, node);
    });
  });
}

// Observe for new messages
const observer = new MutationObserver(() => {
  setTimeout(highlightTaskIds, 100);
});

observer.observe(document.body, {
  subtree: true,
  childList: true
});

// Initial run
setTimeout(highlightTaskIds, 500);

console.log('✅ Slack task ID highlighting enabled');
