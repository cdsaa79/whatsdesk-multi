let state = { instances: [], activeInstanceId: null, settings: {} };
let modal = null;
let pendingLink = null;
let drawerCollapsed = false;
let crmCollapsed = false;
let crmTab = "details";
let activeCrm = null;
let crmSaveState = "Waiting for chat";
let crmSaveTimer;
let crmRenderTimer;

const app = document.getElementById("app");

const icons = {
  chevronLeft: '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
  message: '<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/></svg>',
  users: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  briefcase: '<svg viewBox="0 0 24 24"><path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1"/><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 12h18"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M4 19V9M10 19V5M16 19v-8M22 19H2"/></svg>',
  bot: '<svg viewBox="0 0 24 24"><rect x="5" y="8" width="14" height="10" rx="2"/><path d="M12 8V4M8 4h8M9 13h.01M15 13h.01M8 18l-2 3M16 18l2 3"/></svg>',
  grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 8.6 19a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 5 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15.4 5a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.12.38.33.72.6 1 .3.3.7.4 1.1.4h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.7.6z"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 1-15.5 6.2"/><path d="M3 12A9 9 0 0 1 18.5 5.8"/><path d="M18 2v4h-4M6 22v-4h4"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/></svg>',
  external: '<svg viewBox="0 0 24 24"><path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.5a16 16 0 0 0 6.5 6.5l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6a2 2 0 0 1 1.7 2z"/></svg>',
  mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  owner: '<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg>',
  tag: '<svg viewBox="0 0 24 24"><path d="M20 10 12 2H4v8l8 8z"/><circle cx="8" cy="6" r="1"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  layers: '<svg viewBox="0 0 24 24"><path d="m12 2 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></svg>',
  broom: '<svg viewBox="0 0 24 24"><path d="M3 21h14"/><path d="m6 21 8-8"/><path d="m15 12 4-4-3-3-4 4z"/><path d="M8 17c2 1 4 1 6 0"/><path d="M4 21c0-2 1-4 3-5"/></svg>'
};

function icon(name) {
  return icons[name] || "";
}

function activeInstance() {
  return state.instances.find((instance) => instance.id === state.activeInstanceId);
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}

function render() {
  const active = activeInstance();
  const unreadTotal = state.instances.reduce((sum, instance) => sum + Number(instance.unreadCount || 0), 0);
  app.innerHTML = `
    <main class="app-shell ${drawerCollapsed ? "drawer-collapsed" : ""} ${crmCollapsed ? "crm-collapsed" : ""}">
      <aside class="rail">
        <div class="rail-logo">W</div>
        <button class="rail-icon" id="toggle-drawer-rail" title="${drawerCollapsed ? "Expand instances drawer" : "Collapse instances drawer"}">${drawerCollapsed ? icon("chevronRight") : icon("chevronLeft")}</button>
        <button class="rail-icon active" title="${unreadTotal ? `Unread chats across all instances: ${unreadTotal}` : "Chats"}">${icon("message")}${unreadTotal ? `<span class="rail-badge">${unreadTotal}</span>` : ""}</button>
        <button class="rail-icon" title="CRM contacts">${icon("users")}</button>
        <button class="rail-icon" title="Follow-ups">${icon("clock")}</button>
        <button class="rail-icon" title="Labels">${icon("tag")}</button>
        <button class="rail-icon rail-bottom" id="rail-settings" title="Settings">${icon("settings")}</button>
        <div class="rail-avatar">C</div>
      </aside>

      <aside class="instances-drawer">
        <div class="drawer-head">
          <div>
            <div class="eyebrow">WhatsDesk Multi</div>
            <h1>Instances</h1>
          </div>
          <button class="icon-button" id="toggle-drawer" title="${drawerCollapsed ? "Expand instances drawer" : "Collapse instances drawer"}">${drawerCollapsed ? icon("chevronRight") : icon("chevronLeft")}</button>
        </div>

        <div class="instance-list">
          ${state.instances.map(renderInstanceButton).join("")}
        </div>

        <div class="drawer-actions">
          <button id="add-instance">+ Add Instance</button>
          <button class="soft-action disabled" title="Coming soon">${icon("bot")} AI Drafts</button>
          <button class="soft-action disabled" title="Coming soon">${icon("layers")} Bulk</button>
        </div>
      </aside>

      <section class="workspace">
        <header class="workspace-toolbar">
          <div class="workspace-title">
            <span class="section-icon">▰</span>
            <strong>WhatsApp</strong>
            <span class="active-name">${active ? escapeHtml(active.name) : "No active instance"}</span>
          </div>
          <div class="top-actions">
            ${active ? `<button class="icon-button subtle" id="rename-active" title="Rename instance">${icon("edit")}</button><button class="icon-button subtle" id="reload-active" title="Reload WhatsApp session">${icon("refresh")}</button><button class="icon-button subtle danger" id="clear-active" title="Clear WhatsApp login session">${icon("broom")}</button>` : ""}
            <button class="icon-button" id="open-router" title="Open WhatsApp link router">${icon("external")}</button>
            <button class="icon-button" id="open-settings" title="Settings">${icon("settings")}</button>
          </div>
        </header>

        <div class="web-area" id="web-area">
          ${state.instances.length ? "" : renderEmptyState()}
        </div>
      </section>

      <aside class="crm-drawer">
        ${crmCollapsed ? renderCrmCollapsed() : renderCrmDrawer(active)}
      </aside>
    </main>
    <div id="modal-root">${modal || ""}</div>
  `;
  bindEvents();
  requestAnimationFrame(syncWebBounds);
}

function renderCrmCollapsed() {
  return `
    <button class="crm-collapsed-toggle" id="toggle-crm" title="Expand CRM drawer">
      ${icon("chevronLeft")}
      <span>CRM</span>
    </button>
  `;
}

function renderInstanceButton(instance) {
  const active = instance.id === state.activeInstanceId ? "active" : "";
  return `
    <button class="instance ${active}" data-instance-id="${instance.id}">
      <span class="color-dot" style="background:${escapeHtml(instance.color)}"></span>
      <span>
        <span class="instance-name">${escapeHtml(instance.name)}</span>
        <span class="hint"><span class="status-dot"></span>${instance.isMuted ? "Muted" : "Connected"}</span>
      </span>
      ${instance.unreadCount ? `<span class="badge">${instance.unreadCount}</span>` : ""}
    </button>
  `;
}

function renderCrmDrawer(active) {
  if (!active) {
    return `
      <div class="crm-tabs">
        <button class="crm-tab active">Details</button>
        <button class="crm-tab">Follow-up</button>
        <button class="crm-tab">Notes</button>
        <button class="crm-more" id="toggle-crm" title="Collapse CRM drawer">${icon("chevronRight")}</button>
      </div>
      <div class="crm-empty">Create an instance to attach CRM context to conversations.</div>
    `;
  }

  if (!activeCrm || activeCrm.contact.instanceId !== active.id) {
    return `
      <div class="crm-tabs">
        <button class="crm-tab active">Details</button>
        <button class="crm-tab">Follow-up</button>
        <button class="crm-tab">Notes</button>
        <button class="crm-more" id="toggle-crm" title="Collapse CRM drawer">${icon("chevronRight")}</button>
      </div>
      <div class="crm-empty">
        <strong>No active chat detected yet.</strong>
        <span>Open a WhatsApp chat, or save one manually.</span>
        <button class="primary wide" id="manual-crm-contact">Save Current Chat Manually</button>
      </div>
    `;
  }

  return `
    <div class="crm-tabs">
      ${["details", "follow-up", "notes"].map((tab) => `<button class="crm-tab ${crmTab === tab ? "active" : ""}" data-crm-tab="${tab}">${tab === "follow-up" ? "Follow-up" : tab[0].toUpperCase() + tab.slice(1)}</button>`).join("")}
        <button class="crm-more" id="toggle-crm" title="Collapse CRM drawer">${icon("chevronRight")}</button>
    </div>
    ${crmTab === "details" ? renderDetailsCrm(activeCrm) : ""}
    ${crmTab === "follow-up" ? renderFollowUpCrm(activeCrm) : ""}
    ${crmTab === "notes" ? renderNotesCrm(activeCrm) : ""}
  `;
}

function renderDetailsCrm(payload) {
  const record = payload.contact;
  const latestNote = payload.notes.find((note) => note.pinned) || payload.notes[0];
  return `
    <div class="crm-scroll">
      <div class="save-state ${record.identityConfidence === "low" ? "warning" : ""}">
        <span>${record.crmStatus === "auto_created" ? "Auto-created contact" : "User-confirmed contact"}</span>
        <strong>${crmSaveState}</strong>
      </div>
      ${record.identityConfidence === "low" ? `<div class="crm-warning stacked"><span>Partial contact detected. Name came from visible WhatsApp text; phone is not confirmed yet.</span><button class="mini-button refresh-crm-detection">Read visible details</button></div>` : ""}
      <section class="crm-card contact-card">
        <div class="avatar">${escapeHtml(record.displayName).slice(0, 1)}</div>
        <div>
          <input class="contact-name-input" data-contact-field="displayName" value="${escapeHtml(record.displayName)}" />
          <input class="contact-sub-input" data-contact-field="companyName" placeholder="Company" value="${escapeHtml(record.companyName || "")}" />
          <input class="contact-sub-input" data-contact-field="phoneNumber" placeholder="Phone number" value="${escapeHtml(record.phoneNumber || "")}" />
        </div>
        ${renderQuickActions(record)}
      </section>

      <section class="crm-card">
        <div class="card-head"><h3>Labels</h3><button class="mini-button" id="add-label">+</button></div>
        <div class="labels">
          ${record.labels.map((label) => `<button class="label ${labelClass(label)}" data-remove-label="${escapeHtml(label)}">${escapeHtml(label)} ×</button>`).join("") || `<span class="note-text">No labels yet</span>`}
        </div>
      </section>

      <section class="crm-card info-list">
        ${renderReadonlyInfoRow("clock", "Last seen", formatDate(record.lastSeenAt || record.firstSeenAt))}
        ${renderFollowupSummary(payload)}
        ${renderEditableContactRow("owner", "ownerName", "Owner", record.ownerName || "Me")}
        ${renderStageRow(record.leadStage)}
      </section>

      ${record.businessText ? `<section class="crm-card"><div class="card-head"><h3>Detected Business Info</h3><button class="mini-button refresh-crm-detection">Refresh</button></div><p class="note-text">${escapeHtml(record.businessText)}</p></section>` : ""}

      <section class="crm-card">
        <div class="card-head"><h3>Private Notes ${icon("lock")}</h3><button class="mini-button" data-crm-tab-jump="notes">Edit</button></div>
        <p class="note-text">${escapeHtml(latestNote?.body || "No notes yet. Add one in the Notes tab.")}</p>
      </section>

      <section class="crm-card custom-fields">
        <div class="card-head"><h3>Custom Fields</h3><button class="mini-button">Edit</button></div>
        ${renderEditableCustomRow("", "source", "Source", record.source || customValue(payload, "source"))}
        ${renderEditableCustomRow("", "location", "Location", record.location || customValue(payload, "location"))}
        ${renderEditableCustomRow("", "budget", "Budget", record.budget || customValue(payload, "budget"))}
        ${renderEditableCustomRow("", "nextAction", "Next Action", record.nextAction || customValue(payload, "nextAction"))}
        ${renderEditableContactRow("", "email", "Email", record.email || "")}
      </section>

      <section class="crm-card dashed">
        <h3>AI Suggestions</h3>
        <p class="note-text">Coming later. CRM data will stay local until AI is explicitly enabled.</p>
      </section>
    </div>
  `;
}

function renderFollowUpCrm(payload) {
  const contact = payload.contact;
  const pending = payload.followups.find((followup) => followup.status === "pending");
  return `
    <div class="crm-scroll">
      <section class="crm-card">
        <div class="card-head"><h3>Next Follow-up</h3><button class="mini-button" id="create-followup">Add</button></div>
        ${pending ? `<strong>${escapeHtml(pending.title)}</strong><p class="note-text">Due: ${formatDate(pending.dueAt)}</p><button class="primary wide" data-complete-followup="${pending.id}">Mark Complete</button>` : `<p class="note-text">No pending follow-up. Add one below.</p>`}
      </section>
      <section class="crm-card">
        <h3>Quick Set</h3>
        <div class="quick-set">
          <button data-followup-shortcut="today">Later Today</button>
          <button data-followup-shortcut="tomorrow">Tomorrow</button>
          <button data-followup-shortcut="2days">In 2 Days</button>
          <button data-followup-shortcut="week">Next Week</button>
        </div>
        <div class="field">
          <label>Custom follow-up title</label>
          <input id="followup-title" value="${escapeHtml(contact.nextAction || "Follow up")}" />
        </div>
        <div class="field">
          <label>Due date/time</label>
          <input id="followup-due" type="datetime-local" />
        </div>
        <button class="primary wide" id="save-custom-followup">Save Follow-up</button>
      </section>
      <section class="crm-card">
        <h3>History</h3>
        ${payload.activities.filter((activity) => activity.type.includes("followup") || activity.type.includes("stage")).slice(0, 8).map(renderActivity).join("") || `<p class="note-text">No follow-up history yet.</p>`}
      </section>
    </div>
  `;
}

function renderNotesCrm(payload) {
  return `
    <div class="crm-scroll">
      <section class="crm-card">
        <div class="card-head"><h3>Add Note</h3><button class="mini-button" id="save-note">Save</button></div>
        <textarea class="notes-box" id="new-note" placeholder="Write a private note. This is not sent to WhatsApp."></textarea>
      </section>
      <section class="crm-card">
        <h3>Pinned / Latest</h3>
        ${payload.notes.slice(0, 1).map(renderNote).join("") || `<p class="note-text">No notes yet.</p>`}
      </section>
      <section class="crm-card">
        <h3>All Notes</h3>
        ${payload.notes.map(renderNote).join("") || `<p class="note-text">Add the first private note above.</p>`}
      </section>
      <section class="crm-card">
        <h3>Activity Timeline</h3>
        ${payload.activities.slice(0, 10).map(renderActivity).join("") || `<p class="note-text">No activity yet.</p>`}
      </section>
    </div>
  `;
}

function customValue(payload, key) {
  return payload.customFields.find((field) => field.fieldKey === key)?.fieldValue || "";
}

function labelClass(label) {
  const lower = String(label).toLowerCase();
  if (lower.includes("hot") || lower.includes("urgent")) return "hot";
  if (lower.includes("service") || lower.includes("recruit")) return "purple";
  if (lower.includes("dubai") || lower.includes("event")) return "blue";
  return "";
}

function renderQuickActions(record) {
  const phone = String(record.normalizedPhoneNumber || record.phoneNumber || "").replace(/\D/g, "");
  const email = String(record.email || "").trim();
  const actions = [];
  actions.push(`<button title="Focus the active WhatsApp chat" data-crm-action="message">${icon("message")}</button>`);
  if (phone) {
    actions.push(`<button title="Call ${escapeHtml(record.phoneNumber || record.normalizedPhoneNumber)}" data-crm-action="call">${icon("phone")}</button>`);
  }
  if (email) {
    actions.push(`<button title="Email ${escapeHtml(email)}" data-crm-action="email">${icon("mail")}</button>`);
  }
  if (!phone && !email) {
    actions.push(`<span class="contact-actions-empty">Add phone or email to enable call/email.</span>`);
  }
  return `<div class="quick-actions">${actions.join("")}</div>`;
}

function renderReadonlyInfoRow(iconName, label, value) {
  return `<div class="info-row"><span class="info-icon">${icon(iconName)}</span><span>${label}</span><strong>${escapeHtml(value || "-")}</strong></div>`;
}

function renderEditableContactRow(iconName, field, label, value) {
  return `<label class="info-row"><span class="info-icon">${icon(iconName)}</span><span>${label}</span><input data-contact-field="${field}" value="${escapeHtml(value || "")}" /></label>`;
}

function renderEditableCustomRow(iconName, field, label, value) {
  return `<label class="info-row"><span class="info-icon">${icon(iconName)}</span><span>${label}</span><input data-custom-field="${field}" value="${escapeHtml(value || "")}" /></label>`;
}

function renderStageRow(value) {
  const stages = [
    ["new", "New"],
    ["contacted", "Contacted"],
    ["qualified", "Qualified"],
    ["proposal_sent", "Proposal Sent"],
    ["follow_up", "Follow-up"],
    ["won", "Won"],
    ["lost", "Lost"],
    ["not_relevant", "Not Relevant"]
  ];
  return `<label class="info-row"><span class="info-icon">${icon("tag")}</span><span>Stage / Status</span><select data-contact-field="leadStage">${stages.map(([id, label]) => `<option value="${id}" ${value === id ? "selected" : ""}>${label}</option>`).join("")}</select></label>`;
}

function renderFollowupSummary(payload) {
  const pending = payload.followups.find((followup) => followup.status === "pending");
  return renderReadonlyInfoRow("clock", "Next reminder", pending ? formatDate(pending.dueAt) : "Not set");
}

function renderActivity(activity) {
  return `<div class="activity"><strong>${escapeHtml(activity.title)}</strong><span>${formatDate(activity.createdAt)}</span>${activity.description ? `<p>${escapeHtml(activity.description)}</p>` : ""}</div>`;
}

function renderNote(note) {
  return `<div class="note-item"><textarea data-note-id="${note.id}">${escapeHtml(note.body)}</textarea><div class="note-actions"><span>${formatDate(note.updatedAt)}</span><button class="mini-button danger" data-delete-note="${note.id}">Delete</button></div></div>`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function dueDateForShortcut(shortcut) {
  const date = new Date();
  if (shortcut === "today") date.setHours(date.getHours() + 4);
  if (shortcut === "tomorrow") date.setDate(date.getDate() + 1);
  if (shortcut === "2days") date.setDate(date.getDate() + 2);
  if (shortcut === "week") date.setDate(date.getDate() + 7);
  date.setSeconds(0, 0);
  return date.toISOString();
}

function renderEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-card">
        <h1>Manage multiple WhatsApp accounts in one macOS app.</h1>
        <p>Create separate WhatsApp instances for personal, sales, support, and client accounts. Each instance has its own QR login and stays separate.</p>
        <button class="primary" id="create-first">Create First Instance</button>
      </div>
    </div>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-instance-id]").forEach((button) => {
    button.addEventListener("click", () => window.whatsdesk.activateInstance(button.dataset.instanceId));
  });
  document.querySelectorAll("[data-crm-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      crmTab = button.dataset.crmTab;
      render();
    });
  });
  document.querySelectorAll("[data-contact-field]").forEach((field) => {
    field.addEventListener("input", () => queueContactUpdate(field.dataset.contactField, field.value));
    field.addEventListener("change", () => queueContactUpdate(field.dataset.contactField, field.value, true));
  });
  document.querySelectorAll("[data-custom-field]").forEach((field) => {
    field.addEventListener("input", () => queueCustomFieldUpdate(field.dataset.customField, field.value));
  });
  document.querySelectorAll("[data-note-id]").forEach((field) => {
    field.addEventListener("input", () => queueNoteUpdate(field.dataset.noteId, field.value));
  });
  document.querySelectorAll("[data-crm-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const contact = activeCrm?.contact;
      if (!contact) return;
      const phone = String(contact.normalizedPhoneNumber || contact.phoneNumber || "").replace(/\D/g, "");
      if (button.dataset.crmAction === "message") syncWebBounds();
      if (button.dataset.crmAction === "call" && phone) window.location.href = `tel:+${phone}`;
      if (button.dataset.crmAction === "email" && contact.email) window.location.href = `mailto:${contact.email}`;
    });
  });
  document.querySelectorAll("[data-remove-label]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!activeCrm) return;
      activeCrm = await window.whatsdesk.removeCrmLabel(activeCrm.contact.id, button.dataset.removeLabel);
      crmSaveState = "Saved";
      render();
    });
  });
  document.getElementById("add-label")?.addEventListener("click", addLabel);
  document.getElementById("save-note")?.addEventListener("click", saveNote);
  document.querySelectorAll("[data-delete-note]").forEach((button) => {
    button.addEventListener("click", async () => {
      activeCrm = await window.whatsdesk.deleteCrmNote(button.dataset.deleteNote);
      crmSaveState = "Saved";
      render();
    });
  });
  document.getElementById("save-custom-followup")?.addEventListener("click", saveCustomFollowup);
  document.getElementById("create-followup")?.addEventListener("click", () => {
    document.getElementById("followup-title")?.focus();
  });
  document.querySelectorAll("[data-followup-shortcut]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!activeCrm) return;
      activeCrm = await window.whatsdesk.createCrmFollowUp(activeCrm.contact.id, {
        title: document.getElementById("followup-title")?.value || activeCrm.contact.nextAction || "Follow up",
        dueAt: dueDateForShortcut(button.dataset.followupShortcut)
      });
      crmSaveState = "Saved";
      render();
    });
  });
  document.querySelectorAll("[data-complete-followup]").forEach((button) => {
    button.addEventListener("click", async () => {
      activeCrm = await window.whatsdesk.completeCrmFollowUp(button.dataset.completeFollowup);
      crmSaveState = "Saved";
      render();
    });
  });
  document.getElementById("manual-crm-contact")?.addEventListener("click", showManualContactModal);
  document.querySelectorAll(".refresh-crm-detection").forEach((button) => {
    button.addEventListener("click", async () => {
      crmSaveState = "Reading visible WhatsApp details...";
      render();
      await window.whatsdesk.refreshCrmDetection();
    });
  });
  document.querySelectorAll("[data-crm-tab-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      crmTab = button.dataset.crmTabJump;
      render();
    });
  });
  document.querySelectorAll("#toggle-drawer, #toggle-drawer-rail").forEach((button) => button.addEventListener("click", () => {
    drawerCollapsed = !drawerCollapsed;
    render();
  }));
  document.getElementById("toggle-crm")?.addEventListener("click", () => {
    crmCollapsed = !crmCollapsed;
    render();
  });
  document.getElementById("add-instance")?.addEventListener("click", () => showCreateInstance());
  document.getElementById("create-first")?.addEventListener("click", () => showCreateInstance());
  document.getElementById("rename-active")?.addEventListener("click", () => showRenameInstance());
  document.getElementById("reload-active")?.addEventListener("click", () => reloadActive(false));
  document.getElementById("clear-active")?.addEventListener("click", clearActiveSession);
  document.getElementById("open-router")?.addEventListener("click", () => showLinkRouter());
  document.getElementById("open-settings")?.addEventListener("click", () => showSettings());
  document.getElementById("rail-settings")?.addEventListener("click", () => showSettings());
  document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModal));
  document.getElementById("instance-form")?.addEventListener("submit", submitInstanceForm);
  document.getElementById("rename-form")?.addEventListener("submit", submitRenameForm);
  document.getElementById("link-form")?.addEventListener("submit", submitLinkForm);
  document.getElementById("parse-link")?.addEventListener("input", parseLinkPreview);
  document.getElementById("settings-form")?.addEventListener("change", submitSettingsForm);
  document.getElementById("clear-session-form")?.addEventListener("submit", submitClearSessionForm);
}

function setCrmPayload(payload, saveState = "Saved automatically") {
  activeCrm = payload;
  crmSaveState = payload ? saveState : "Waiting for chat";
  clearTimeout(crmRenderTimer);
  crmRenderTimer = setTimeout(render, 40);
}

function queueContactUpdate(field, value, immediate = false) {
  if (!activeCrm) return;
  crmSaveState = "Saving...";
  clearTimeout(crmSaveTimer);
  crmSaveTimer = setTimeout(async () => {
    const updates = { [field]: value };
    activeCrm = await window.whatsdesk.updateCrmContact(activeCrm.contact.id, updates);
    crmSaveState = "Saved";
    render();
  }, immediate ? 0 : 800);
}

function queueCustomFieldUpdate(field, value) {
  if (!activeCrm) return;
  crmSaveState = "Saving...";
  clearTimeout(crmSaveTimer);
  crmSaveTimer = setTimeout(async () => {
    activeCrm = await window.whatsdesk.updateCrmCustomField(activeCrm.contact.id, field, value);
    crmSaveState = "Saved";
    render();
  }, 800);
}

function queueNoteUpdate(noteId, value) {
  crmSaveState = "Saving...";
  clearTimeout(crmSaveTimer);
  crmSaveTimer = setTimeout(async () => {
    activeCrm = await window.whatsdesk.updateCrmNote(noteId, value);
    crmSaveState = "Saved";
    render();
  }, 800);
}

async function addLabel() {
  if (!activeCrm) return;
  const label = prompt("Label name");
  if (!label) return;
  activeCrm = await window.whatsdesk.addCrmLabel(activeCrm.contact.id, label);
  crmSaveState = "Saved";
  render();
}

async function saveNote() {
  if (!activeCrm) return;
  const field = document.getElementById("new-note");
  if (!field || !field.value.trim()) return;
  activeCrm = await window.whatsdesk.addCrmNote(activeCrm.contact.id, field.value.trim(), false);
  crmSaveState = "Saved";
  render();
}

async function saveCustomFollowup() {
  if (!activeCrm) return;
  const due = document.getElementById("followup-due")?.value;
  if (!due) {
    alert("Choose a due date/time first.");
    return;
  }
  activeCrm = await window.whatsdesk.createCrmFollowUp(activeCrm.contact.id, {
    title: document.getElementById("followup-title")?.value || "Follow up",
    dueAt: new Date(due).toISOString()
  });
  crmSaveState = "Saved";
  render();
}

function showManualContactModal() {
  const active = activeInstance();
  if (!active) return;
  modal = `
    <div class="modal-backdrop">
      <form class="modal" id="manual-contact-form">
        <h2>Save Current Chat to CRM</h2>
        <p class="note-text">Automatic detection is not confident yet. Add the contact basics manually; it will stay linked to this WhatsApp instance.</p>
        <div class="field"><label>Name or group</label><input name="displayName" required autofocus /></div>
        <div class="field"><label>Phone number (optional)</label><input name="phoneNumber" placeholder="+971..." /></div>
        <div class="modal-actions"><button type="button" data-close-modal>Cancel</button><button class="primary" type="submit">Save Contact</button></div>
      </form>
    </div>
  `;
  window.whatsdesk.setModalOpen(true);
  render();
  document.getElementById("manual-contact-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    activeCrm = await window.whatsdesk.createManualCrmContact({
      instanceId: active.id,
      displayName: data.get("displayName"),
      phoneNumber: data.get("phoneNumber")
    });
    closeModal();
  });
}

function syncWebBounds() {
  const area = document.getElementById("web-area");
  if (!area || !state.instances.length) return;
  const rect = area.getBoundingClientRect();
  window.whatsdesk.setViewBounds({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height
  });
}

function closeModal() {
  modal = null;
  pendingLink = null;
  window.whatsdesk.setModalOpen(false);
  render();
}

function showCreateInstance() {
  modal = `
    <div class="modal-backdrop">
      <form class="modal" id="instance-form">
        <h2>Create WhatsApp Instance</h2>
        <div class="field">
          <label for="instance-name">Instance name</label>
          <input id="instance-name" name="name" placeholder="Sales" required autofocus />
        </div>
        <div class="field">
          <label for="instance-color">Color</label>
          <input id="instance-color" name="color" type="color" value="#25d366" />
        </div>
        <div class="field">
          <label for="instance-muted">Notifications</label>
          <select id="instance-muted" name="isMuted">
            <option value="false">On</option>
            <option value="true">Muted</option>
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" data-close-modal>Cancel</button>
          <button class="primary" type="submit">Create</button>
        </div>
      </form>
    </div>
  `;
  window.whatsdesk.setModalOpen(true);
  render();
}

async function submitInstanceForm(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  await window.whatsdesk.createInstance({
    name: data.get("name"),
    color: data.get("color"),
    isMuted: data.get("isMuted") === "true"
  });
  closeModal();
}

function showRenameInstance() {
  const active = activeInstance();
  if (!active) return;
  modal = `
    <div class="modal-backdrop">
      <form class="modal" id="rename-form">
        <h2>Rename Instance</h2>
        <div class="field">
          <label for="rename-name">Instance name</label>
          <input id="rename-name" name="name" value="${escapeHtml(active.name)}" required autofocus />
        </div>
        <div class="field">
          <label for="rename-color">Color</label>
          <input id="rename-color" name="color" type="color" value="${escapeHtml(active.color)}" />
        </div>
        <div class="field">
          <label for="rename-muted">Notifications</label>
          <select id="rename-muted" name="isMuted">
            <option value="false" ${!active.isMuted ? "selected" : ""}>On</option>
            <option value="true" ${active.isMuted ? "selected" : ""}>Muted</option>
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" data-close-modal>Cancel</button>
          <button class="primary" type="submit">Save</button>
        </div>
      </form>
    </div>
  `;
  window.whatsdesk.setModalOpen(true);
  render();
}

async function submitRenameForm(event) {
  event.preventDefault();
  const active = activeInstance();
  if (!active) return;
  const data = new FormData(event.currentTarget);
  await window.whatsdesk.updateInstance(active.id, {
    name: data.get("name"),
    color: data.get("color"),
    isMuted: data.get("isMuted") === "true"
  });
  closeModal();
}

async function reloadActive(hard) {
  const active = activeInstance();
  if (active) await window.whatsdesk.reloadInstance(active.id, hard);
}

async function clearActiveSession() {
  const active = activeInstance();
  if (!active) return;
  if (state.settings.confirmBeforeClearSession) {
    showClearSessionModal();
    return;
  }
  await window.whatsdesk.clearSession(active.id);
}

function showClearSessionModal() {
  const active = activeInstance();
  if (!active) return;
  modal = `
    <div class="modal-backdrop">
      <form class="modal" id="clear-session-form">
        <h2>Clear this WhatsApp session?</h2>
        <p class="note-text">This will log out <strong>${escapeHtml(active.name)}</strong> and remove its saved WhatsApp session data.</p>
        <p class="note-text">Your CRM notes, labels, follow-ups, and contact records will not be deleted.</p>
        <div class="modal-actions">
          <button type="button" data-close-modal>Cancel</button>
          <button class="primary danger-primary" type="submit">Clear WhatsApp Session</button>
        </div>
      </form>
    </div>
  `;
  window.whatsdesk.setModalOpen(true);
  render();
}

async function submitClearSessionForm(event) {
  event.preventDefault();
  const active = activeInstance();
  if (!active) return;
  await window.whatsdesk.clearSession(active.id);
  closeModal();
}

async function deleteActiveInstance() {
  const active = activeInstance();
  if (!active) return;
  if (state.settings.confirmBeforeDelete && !confirm(`Delete "${active.name}"? This will not affect other instances.`)) return;
  const clearSession = confirm("Also clear this instance's WhatsApp login/session data?");
  await window.whatsdesk.deleteInstance(active.id, clearSession);
}

function showLinkRouter(payload = null) {
  pendingLink = payload;
  const parsedPhone = payload?.phone || "";
  const parsedText = payload?.text || "";
  modal = `
    <div class="modal-backdrop">
      <form class="modal" id="link-form">
        <h2>Open WhatsApp Link</h2>
        <div class="field">
          <label for="parse-link">Paste WhatsApp link</label>
          <input id="parse-link" name="url" placeholder="https://wa.me/971501234567?text=Hi" value="${escapeHtml(payload?.originalUrl || "")}" ${payload ? "" : "autofocus"} />
        </div>
        <div class="field">
          <label>Parsed destination</label>
          <div class="hint" id="link-preview">${parsedPhone ? `Phone: +${escapeHtml(parsedPhone)}${parsedText ? `<br>Message: ${escapeHtml(parsedText)}` : ""}` : "Paste a supported WhatsApp link."}</div>
        </div>
        <div class="field">
          <label for="selected-instance">Open with</label>
          <select id="selected-instance" name="selectedInstanceId" required>
            ${state.instances.map((instance) => `<option value="${instance.id}" ${instance.id === state.activeInstanceId ? "selected" : ""}>${escapeHtml(instance.name)}</option>`).join("")}
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" data-close-modal>Cancel</button>
          <button class="primary" type="submit" ${state.instances.length ? "" : "disabled"}>Open</button>
        </div>
      </form>
    </div>
  `;
  window.whatsdesk.setModalOpen(true);
  render();
}

async function parseLinkPreview(event) {
  pendingLink = await window.whatsdesk.parseLink(event.target.value, "paste");
  const preview = document.getElementById("link-preview");
  if (!preview) return;
  preview.innerHTML = pendingLink
    ? `Phone: +${escapeHtml(pendingLink.phone)}${pendingLink.text ? `<br>Message: ${escapeHtml(pendingLink.text)}` : ""}`
    : "Unsupported link format.";
}

async function submitLinkForm(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  if (!pendingLink) pendingLink = await window.whatsdesk.parseLink(data.get("url"), "paste");
  if (!pendingLink) {
    alert("Paste a supported WhatsApp link first.");
    return;
  }
  await window.whatsdesk.openLink({
    ...pendingLink,
    selectedInstanceId: data.get("selectedInstanceId")
  });
  closeModal();
}

function showSettings() {
  const settings = state.settings;
  modal = `
    <div class="modal-backdrop">
      <form class="modal" id="settings-form">
        <h2>Settings</h2>
        <div class="settings-grid">
          ${renderToggle("launchAtLogin", "Launch at login", settings.launchAtLogin)}
          ${renderToggle("showMenuBarIcon", "Show menu bar icon", settings.showMenuBarIcon)}
          ${renderToggle("globalMute", "Mute all notifications", settings.globalMute)}
          ${renderToggle("confirmBeforeDelete", "Confirm before deleting instance", settings.confirmBeforeDelete)}
          ${renderToggle("confirmBeforeClearSession", "Confirm before clearing session", settings.confirmBeforeClearSession)}
          <div class="field">
            <label for="theme">Theme</label>
            <select id="theme" name="theme">
              ${["system", "light", "dark"].map((item) => `<option value="${item}" ${settings.theme === item ? "selected" : ""}>${item}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="notificationPreview">Notification preview</label>
            <select id="notificationPreview" name="notificationPreview">
              <option value="generic" ${settings.notificationPreview === "generic" ? "selected" : ""}>Generic notification only</option>
              <option value="senderOnly" ${settings.notificationPreview === "senderOnly" ? "selected" : ""}>Sender only</option>
              <option value="full" ${settings.notificationPreview === "full" ? "selected" : ""}>Sender and message</option>
            </select>
          </div>
          <div class="field">
            <label for="defaultLinkBehavior">Default link behavior</label>
            <select id="defaultLinkBehavior" name="defaultLinkBehavior">
              <option value="ask" ${settings.defaultLinkBehavior === "ask" ? "selected" : ""}>Always ask</option>
              <option value="lastSelected" ${settings.defaultLinkBehavior === "lastSelected" ? "selected" : ""}>Use last selected</option>
              <option value="defaultInstance" ${settings.defaultLinkBehavior === "defaultInstance" ? "selected" : ""}>Use default instance</option>
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" data-close-modal>Done</button>
        </div>
      </form>
    </div>
  `;
  window.whatsdesk.setModalOpen(true);
  render();
}

function renderToggle(name, label, checked) {
  return `
    <label class="setting">
      <span>${label}</span>
      <input type="checkbox" name="${name}" ${checked ? "checked" : ""} />
    </label>
  `;
}

async function submitSettingsForm(event) {
  const form = event.currentTarget;
  const data = new FormData(form);
  await window.whatsdesk.updateSettings({
    launchAtLogin: data.get("launchAtLogin") === "on",
    showMenuBarIcon: data.get("showMenuBarIcon") === "on",
    globalMute: data.get("globalMute") === "on",
    confirmBeforeDelete: data.get("confirmBeforeDelete") === "on",
    confirmBeforeClearSession: data.get("confirmBeforeClearSession") === "on",
    theme: data.get("theme"),
    notificationPreview: data.get("notificationPreview"),
    defaultLinkBehavior: data.get("defaultLinkBehavior")
  });
}

window.addEventListener("resize", syncWebBounds);

window.whatsdesk.onState((nextState) => {
  const previousInstanceId = state.activeInstanceId;
  state = nextState;
  if (previousInstanceId !== state.activeInstanceId) {
    window.whatsdesk.getActiveCrmContact().then((payload) => setCrmPayload(payload, payload ? "Loaded" : "Waiting for chat"));
  }
  render();
});

window.whatsdesk.onRouteLink((payload) => showLinkRouter(payload));

window.whatsdesk.onCrmContact((payload) => setCrmPayload(payload));

window.whatsdesk.onCrmFollowUpDue((payload) => {
  setCrmPayload(payload, "Follow-up due");
  crmTab = "follow-up";
});

window.whatsdesk.onShortcut((action) => {
  if (action === "add-instance") showCreateInstance();
  if (action === "link-router") showLinkRouter();
  if (action === "settings") showSettings();
  if (action === "measure-view") syncWebBounds();
});

window.whatsdesk.ready().then((nextState) => {
  state = nextState;
  window.whatsdesk.getActiveCrmContact().then((payload) => {
    activeCrm = payload;
    crmSaveState = payload ? "Loaded" : "Waiting for chat";
    render();
  });
});
