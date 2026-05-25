const {
  app,
  BrowserView,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  Notification,
  protocol,
  session,
  shell,
  Tray
} = require("electron");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const WHATSAPP_HOME = "https://web.whatsapp.com";
const APP_PROTOCOL = "whatsdesk";
const DEFAULT_COLORS = ["#25D366", "#34B7F1", "#7C3AED", "#F97316", "#EF4444", "#14B8A6"];
const WHATSAPP_USER_AGENT = process.platform === "win32"
  ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
  : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";

let mainWindow;
let tray;
let storePath;
let crmStorePath;
let reminderTimer;
let isModalOpen = false;
let viewBounds = { x: 280, y: 64, width: 1000, height: 720 };
let state = {
  instances: [],
  activeInstanceId: null,
  settings: {
    launchAtLogin: false,
    showMenuBarIcon: true,
    theme: "system",
    globalMute: false,
    notificationPreview: "generic",
    defaultLinkBehavior: "ask",
    defaultInstanceId: undefined,
    confirmBeforeDelete: true,
    confirmBeforeClearSession: true
  }
};
const views = new Map();
const webContentsToInstance = new Map();
const lastUnread = new Map();
let crmState = {
  contacts: [],
  labels: [],
  notes: [],
  followups: [],
  customFields: [],
  activities: []
};

protocol.registerSchemesAsPrivileged([{ scheme: APP_PROTOCOL, privileges: { standard: true, secure: true } }]);
app.userAgentFallback = WHATSAPP_USER_AGENT;

function nowIso() {
  return new Date().toISOString();
}

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
}

function normalizeInstance(input) {
  const id = input.id || uuid();
  return {
    id,
    name: input.name || "WhatsApp",
    color: input.color || DEFAULT_COLORS[state.instances.length % DEFAULT_COLORS.length],
    icon: input.icon || "message-circle",
    partition: input.partition || `persist:wa-${id}`,
    isMuted: Boolean(input.isMuted),
    unreadCount: Number(input.unreadCount || 0),
    sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : state.instances.length,
    lastActiveAt: input.lastActiveAt,
    createdAt: input.createdAt || nowIso(),
    updatedAt: nowIso()
  };
}

function loadStore() {
  storePath = path.join(app.getPath("userData"), "whatsdesk-store.json");
  try {
    const parsed = JSON.parse(fs.readFileSync(storePath, "utf8"));
    state = {
      ...state,
      ...parsed,
      settings: { ...state.settings, ...(parsed.settings || {}) },
      instances: Array.isArray(parsed.instances) ? parsed.instances.map(normalizeInstance) : []
    };
  } catch {
    state.instances = [];
  }
  if (!state.activeInstanceId && state.instances[0]) {
    state.activeInstanceId = state.instances[0].id;
  }
}

function loadCrmStore() {
  crmStorePath = path.join(app.getPath("userData"), "whatsdesk-crm.json");
  try {
    const parsed = JSON.parse(fs.readFileSync(crmStorePath, "utf8"));
    crmState = {
      contacts: Array.isArray(parsed.contacts) ? parsed.contacts : [],
      labels: Array.isArray(parsed.labels) ? parsed.labels : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      followups: Array.isArray(parsed.followups) ? parsed.followups : [],
      customFields: Array.isArray(parsed.customFields) ? parsed.customFields : [],
      activities: Array.isArray(parsed.activities) ? parsed.activities : []
    };
    pruneInvalidCrmContacts();
  } catch {
    crmState = { contacts: [], labels: [], notes: [], followups: [], customFields: [], activities: [] };
  }
}

function pruneInvalidCrmContacts() {
  const invalidIds = new Set(
    crmState.contacts
      .filter((contact) => isBadCrmDisplayName(contact.displayName) && !contact.normalizedPhoneNumber && contact.crmStatus === "auto_created")
      .map((contact) => contact.id)
  );
  if (!invalidIds.size) return;
  crmState.contacts = crmState.contacts.filter((contact) => !invalidIds.has(contact.id));
  crmState.notes = crmState.notes.filter((note) => !invalidIds.has(note.contactId));
  crmState.followups = crmState.followups.filter((followup) => !invalidIds.has(followup.contactId));
  crmState.customFields = crmState.customFields.filter((field) => !invalidIds.has(field.contactId));
  crmState.activities = crmState.activities.filter((activity) => !invalidIds.has(activity.contactId));
  saveCrmStore();
}

function saveStore() {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(state, null, 2));
}

function saveCrmStore() {
  fs.mkdirSync(path.dirname(crmStorePath), { recursive: true });
  fs.writeFileSync(crmStorePath, JSON.stringify(crmState, null, 2));
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

function isBadCrmDisplayName(value) {
  const text = String(value || "").trim().toLowerCase();
  return !text ||
    text.length < 2 ||
    text.startsWith("wds-") ||
    text.includes("ic-") ||
    /search|menu|profile|video|call|filter|new chat|settings|status|channels|communities|archived|unread|favorites|groups/.test(text);
}

function slug(value) {
  return String(value || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

function crmContactPayload(contactId) {
  const contact = crmState.contacts.find((item) => item.id === contactId);
  if (!contact) return null;
  return {
    contact,
    labels: crmState.labels.filter((label) => contact.labels.includes(label.name)),
    notes: crmState.notes.filter((note) => note.contactId === contactId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    followups: crmState.followups.filter((followup) => followup.contactId === contactId).sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    customFields: crmState.customFields.filter((field) => field.contactId === contactId),
    activities: crmState.activities.filter((activity) => activity.contactId === contactId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  };
}

function addCrmActivity(contactId, instanceId, type, title, description, metadata = {}) {
  crmState.activities.push({
    id: uuid(),
    workspaceId: "local",
    contactId,
    instanceId,
    type,
    title,
    description,
    metadata,
    createdAt: nowIso()
  });
}

function ensureDefaultLabels() {
  const defaults = [
    ["Hot Lead", "#fee2e2"],
    ["Customer", "#dcfce7"],
    ["Supplier", "#fef3c7"],
    ["IT Services", "#ede9fe"],
    ["Dubai", "#dbeafe"],
    ["Follow-up", "#e0f2fe"]
  ];
  for (const [name, color] of defaults) {
    if (!crmState.labels.some((label) => label.name.toLowerCase() === name.toLowerCase())) {
      crmState.labels.push({ id: uuid(), workspaceId: "local", name, color, createdAt: nowIso(), updatedAt: nowIso() });
    }
  }
}

function resolveCrmContactFromActiveChat(event) {
  const instance = getInstance(event.instanceId);
  if (!instance) return null;
  ensureDefaultLabels();
  const normalizedPhoneNumber = normalizePhone(event.phoneNumber || event.normalizedPhoneNumber);
  const displayName = isBadCrmDisplayName(event.displayName) ? (normalizedPhoneNumber || `${instance.name} Chat`) : event.displayName;
  const chatKey = event.chatKey || event.chatId || normalizedPhoneNumber || `${slug(displayName)}-${new Date().toISOString().slice(0, 10)}`;
  const now = nowIso();
  let contact = crmState.contacts.find((item) => item.instanceId === instance.id && event.chatId && item.chatId === event.chatId);
  if (!contact && normalizedPhoneNumber) {
    contact = crmState.contacts.find((item) => item.instanceId === instance.id && item.normalizedPhoneNumber === normalizedPhoneNumber);
  }
  if (!contact) {
    contact = crmState.contacts.find((item) => item.instanceId === instance.id && item.chatKey === chatKey);
  }
  if (!contact) {
    contact = {
      id: uuid(),
      workspaceId: "local",
      instanceId: instance.id,
      chatId: event.chatId,
      chatKey,
      chatType: event.chatType || "unknown",
      displayName,
      phoneNumber: event.phoneNumber || normalizedPhoneNumber,
      normalizedPhoneNumber,
      avatarUrl: event.avatarUrl,
      companyName: "",
      roleTitle: "",
      email: "",
      location: "",
      crmStatus: "auto_created",
      identityConfidence: event.identityConfidence || (normalizedPhoneNumber ? "medium" : "low"),
      leadStage: "new",
      ownerId: "local_user",
      ownerName: "Me",
      source: "",
      budget: "",
      nextAction: "",
      labels: [],
      firstSeenAt: now,
      lastSeenAt: now,
      lastMessageAt: event.lastMessageAt,
      lastMessagePreview: event.lastMessagePreview,
      businessText: event.businessText || "",
      createdAt: now,
      updatedAt: now
    };
    crmState.contacts.push(contact);
    addCrmActivity(contact.id, instance.id, "contact_created", "Contact auto-created", `Detected ${displayName}`);
  } else {
    contact.displayName = displayName || contact.displayName;
    contact.phoneNumber = event.phoneNumber || contact.phoneNumber;
    contact.normalizedPhoneNumber = normalizedPhoneNumber || contact.normalizedPhoneNumber;
    contact.avatarUrl = event.avatarUrl || contact.avatarUrl;
    contact.lastSeenAt = now;
    contact.lastMessageAt = event.lastMessageAt || contact.lastMessageAt;
    contact.lastMessagePreview = event.lastMessagePreview || contact.lastMessagePreview;
    contact.businessText = event.businessText || contact.businessText;
    contact.updatedAt = now;
  }
  saveCrmStore();
  return crmContactPayload(contact.id);
}

function sendCrmContact(payload) {
  if (!mainWindow || !payload) return;
  mainWindow.webContents.send("crm:active-contact", payload);
}

function checkDueFollowups() {
  const now = Date.now();
  let changed = false;
  for (const followup of crmState.followups) {
    if (followup.status !== "pending" || followup.reminderEnabled === false || followup.notifiedAt) continue;
    const due = Date.parse(followup.dueAt);
    if (!Number.isFinite(due) || due > now) continue;
    const contact = crmState.contacts.find((item) => item.id === followup.contactId);
    const instance = contact ? getInstance(contact.instanceId) : null;
    followup.notifiedAt = nowIso();
    changed = true;
    if (Notification.isSupported() && contact && instance) {
      const notification = new Notification({
        title: `Follow up with ${contact.displayName}`,
        body: `Instance: ${instance.name}${contact.nextAction ? `\nNext action: ${contact.nextAction}` : ""}`
      });
      notification.on("click", () => {
        mainWindow?.show();
        mainWindow?.focus();
        setActiveView(instance.id);
        sendCrmContact(crmContactPayload(contact.id));
      });
      notification.show();
    }
    if (mainWindow && contact) {
      mainWindow.webContents.send("crm:follow-up-due", crmContactPayload(contact.id));
    }
  }
  if (changed) saveCrmStore();
}

function startReminderScheduler() {
  clearInterval(reminderTimer);
  checkDueFollowups();
  reminderTimer = setInterval(checkDueFollowups, 60 * 1000);
}

function publicState() {
  return {
    instances: state.instances.slice().sort((a, b) => a.sortOrder - b.sortOrder),
    activeInstanceId: state.activeInstanceId,
    settings: state.settings
  };
}

function broadcastState() {
  saveStore();
  createApplicationMenu();
  updateDockBadge();
  updateTray();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("state:changed", publicState());
  }
}

function getInstance(id) {
  return state.instances.find((instance) => instance.id === id);
}

function parseUnreadFromTitle(title) {
  const match = /^\((\d+)\)/.exec(title || "");
  return match ? Number(match[1]) : 0;
}

function shouldRouteUrl(rawUrl) {
  const payload = parseWhatsAppLink(rawUrl, "inApp");
  return payload && payload.phone ? payload : null;
}

function parseWhatsAppLink(rawUrl, source = "paste") {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();
  try {
    let url = new URL(trimmed);
    let phone = "";
    let text = "";

    if (url.protocol === `${APP_PROTOCOL}:` || url.protocol === "whatsapp:") {
      phone = url.searchParams.get("phone") || "";
      text = url.searchParams.get("text") || "";
    } else if (url.hostname === "wa.me") {
      phone = url.pathname.replace(/\D/g, "");
      text = url.searchParams.get("text") || "";
    } else if (["api.whatsapp.com", "web.whatsapp.com"].includes(url.hostname)) {
      phone = url.searchParams.get("phone") || "";
      text = url.searchParams.get("text") || "";
    } else {
      return null;
    }

    phone = phone.replace(/\D/g, "");
    if (!phone && url.protocol !== `${APP_PROTOCOL}:`) return null;
    return { originalUrl: trimmed, phone, text, source };
  } catch {
    return null;
  }
}

function toWhatsAppWebSendUrl(payload) {
  const url = new URL("https://web.whatsapp.com/send");
  if (payload.phone) url.searchParams.set("phone", payload.phone);
  if (payload.text) url.searchParams.set("text", payload.text);
  return url.toString();
}

function createWhatsAppView(instance) {
  if (views.has(instance.id)) return views.get(instance.id);
  const view = new BrowserView({
    webPreferences: {
      partition: instance.partition,
      preload: path.join(__dirname, "whatsapp-preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      javascript: true,
      webSecurity: true
    }
  });

  view.webContents.setUserAgent(WHATSAPP_USER_AGENT);
  webContentsToInstance.set(view.webContents.id, instance.id);

  view.webContents.setWindowOpenHandler(({ url }) => {
    const payload = shouldRouteUrl(url);
    if (payload) {
      sendLinkToRouter(payload);
      return { action: "deny" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  view.webContents.on("will-navigate", (event, url) => {
    const payload = shouldRouteUrl(url);
    if (payload && url !== WHATSAPP_HOME && !url.startsWith("https://web.whatsapp.com/")) {
      event.preventDefault();
      sendLinkToRouter(payload);
    }
  });

  view.webContents.on("page-title-updated", (_event, title) => {
    const unreadCount = parseUnreadFromTitle(title);
    const target = getInstance(instance.id);
    if (!target) return;
    const previous = lastUnread.get(instance.id) || 0;
    lastUnread.set(instance.id, unreadCount);
    target.unreadCount = unreadCount;
    target.updatedAt = nowIso();
    if (unreadCount > previous) showInstanceNotification(target);
    broadcastState();
  });

  view.webContents.on("did-fail-load", (_event, code, description) => {
    console.warn(`WhatsApp view failed for ${instance.name}: ${code} ${description}`);
  });

  view.webContents.loadURL(WHATSAPP_HOME, { userAgent: WHATSAPP_USER_AGENT });
  views.set(instance.id, view);
  return view;
}

function detachBrowserViews() {
  if (!mainWindow) return;
  for (const view of views.values()) {
    try {
      mainWindow.removeBrowserView(view);
    } catch {}
  }
}

function attachActiveView() {
  const instance = getInstance(state.activeInstanceId);
  if (!mainWindow || !instance || isModalOpen) return;
  detachBrowserViews();
  const view = createWhatsAppView(instance);
  mainWindow.addBrowserView(view);
  view.setBounds(viewBounds);
  view.setAutoResize({ width: true, height: true });
}

function setActiveView(instanceId) {
  const instance = getInstance(instanceId);
  if (!mainWindow || !instance) return;
  instance.lastActiveAt = nowIso();
  state.activeInstanceId = instance.id;
  mainWindow.setTitle(`WhatsDesk Multi - ${instance.name}`);
  attachActiveView();
  broadcastState();
}

function updateDockBadge() {
  const total = state.instances.reduce((sum, instance) => sum + Number(instance.unreadCount || 0), 0);
  if (process.platform === "darwin") app.dock.setBadge(total ? String(total) : "");
}

function showInstanceNotification(instance) {
  if (state.settings.globalMute || instance.isMuted || !Notification.isSupported()) return;
  const notification = new Notification({
    title: `${instance.name} WhatsApp`,
    body: state.settings.notificationPreview === "generic" ? "New message" : "New WhatsApp message",
    silent: false
  });
  notification.on("click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
    setActiveView(instance.id);
  });
  notification.show();
}

function sendLinkToRouter(payload) {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send("link:route", payload);
}

async function clearInstanceSession(instanceId) {
  const instance = getInstance(instanceId);
  if (!instance) return false;
  const partitionSession = session.fromPartition(instance.partition);
  await partitionSession.clearStorageData();
  await partitionSession.clearCache();
  const view = views.get(instance.id);
  if (view && !view.webContents.isDestroyed()) {
    await view.webContents.loadURL(WHATSAPP_HOME, { userAgent: WHATSAPP_USER_AGENT });
  }
  instance.unreadCount = 0;
  instance.updatedAt = nowIso();
  broadcastState();
  return true;
}

function createApplicationMenu() {
  if (!app.isReady()) return;
  const instances = publicState().instances;
  const instanceItems = instances.length
    ? instances.map((instance, index) => ({
        label: `${instance.name}${instance.unreadCount ? ` (${instance.unreadCount})` : ""}`,
        accelerator: index < 9 ? `CommandOrControl+${index + 1}` : undefined,
        type: "checkbox",
        checked: instance.id === state.activeInstanceId,
        click: () => setActiveView(instance.id)
      }))
    : [{ label: "No instances yet", enabled: false }];

  const template = [
    {
      label: "WhatsDesk Multi",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { label: "Settings", accelerator: "CommandOrControl+,", click: () => mainWindow?.webContents.send("app:shortcut", "settings") },
        { type: "separator" },
        { role: "quit" }
      ]
    },
    {
      label: "File",
      submenu: [
        { label: "Add Instance", accelerator: "CommandOrControl+T", click: () => mainWindow?.webContents.send("app:shortcut", "add-instance") },
        { label: "Open Link Router", accelerator: "CommandOrControl+L", click: () => mainWindow?.webContents.send("app:shortcut", "link-router") },
        { type: "separator" },
        { label: "Reload Instance", accelerator: "CommandOrControl+R", click: () => reloadActive(false) },
        { label: "Hard Reload Instance", accelerator: "CommandOrControl+Shift+R", click: () => reloadActive(true) },
        { type: "separator" },
        { label: "Hide Window", accelerator: "CommandOrControl+W", click: () => mainWindow?.hide() }
      ]
    },
    {
      label: "Instances",
      submenu: [
        ...instanceItems,
        { type: "separator" },
        { label: "Add Instance", accelerator: "CommandOrControl+T", click: () => mainWindow?.webContents.send("app:shortcut", "add-instance") }
      ]
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function reloadActive(hard) {
  const active = getInstance(state.activeInstanceId);
  if (!active) return;
  const view = views.get(active.id);
  if (!view) return;
  if (hard) view.webContents.reloadIgnoringCache();
  else view.webContents.reload();
}

function updateTray() {
  if (!state.settings.showMenuBarIcon) {
    if (tray) tray.destroy();
    tray = null;
    return;
  }
  if (!tray) {
    const image = nativeImage.createEmpty();
    tray = new Tray(image);
    tray.setToolTip("WhatsDesk Multi");
  }
  const menu = Menu.buildFromTemplate([
    ...publicState().instances.map((instance) => ({
      label: `${instance.name}${instance.unreadCount ? ` (${instance.unreadCount})` : ""}`,
      click: () => {
        mainWindow?.show();
        setActiveView(instance.id);
      }
    })),
    { type: "separator" },
    {
      label: state.settings.globalMute ? "Unmute All" : "Mute All",
      click: () => {
        state.settings.globalMute = !state.settings.globalMute;
        broadcastState();
      }
    },
    { label: "Show", click: () => mainWindow?.show() },
    { label: "Quit", click: () => app.quit() }
  ]);
  tray.setContextMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 650,
    title: "WhatsDesk Multi",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, "index.html"));
  mainWindow.on("resize", () => mainWindow.webContents.send("app:shortcut", "measure-view"));
  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

app.setAsDefaultProtocolClient(APP_PROTOCOL);

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

app.on("second-instance", (_event, argv) => {
  const protocolUrl = argv.find((arg) => arg.startsWith(`${APP_PROTOCOL}://`));
  if (protocolUrl) sendLinkToRouter(parseWhatsAppLink(protocolUrl, "protocol"));
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on("open-url", (event, url) => {
  event.preventDefault();
  const payload = parseWhatsAppLink(url, "protocol");
  if (payload) sendLinkToRouter(payload);
});

app.whenReady().then(() => {
  loadStore();
  loadCrmStore();
  startReminderScheduler();
  createApplicationMenu();
  createWindow();
  updateTray();
  app.setLoginItemSettings({ openAtLogin: Boolean(state.settings.launchAtLogin) });
});

app.on("before-quit", () => {
  app.isQuitting = true;
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else mainWindow?.show();
});

ipcMain.handle("app:ready", () => {
  if (state.activeInstanceId) setActiveView(state.activeInstanceId);
  return publicState();
});

ipcMain.handle("state:list", () => publicState());

ipcMain.handle("instance:create", (_event, payload) => {
  const instance = normalizeInstance(payload || {});
  state.instances.push(instance);
  setActiveView(instance.id);
  return publicState();
});

ipcMain.handle("instance:update", (_event, id, updates) => {
  const instance = getInstance(id);
  if (!instance) return publicState();
  Object.assign(instance, updates, { id, partition: instance.partition, updatedAt: nowIso() });
  broadcastState();
  return publicState();
});

ipcMain.handle("instance:delete", async (_event, id, clearSession) => {
  const instance = getInstance(id);
  if (!instance) return publicState();
  if (clearSession) await clearInstanceSession(id);
  state.instances = state.instances.filter((item) => item.id !== id);
  const view = views.get(id);
  if (view) {
    try {
      mainWindow.removeBrowserView(view);
      view.webContents.destroy();
    } catch {}
    views.delete(id);
  }
  if (state.activeInstanceId === id) state.activeInstanceId = state.instances[0]?.id || null;
  if (state.activeInstanceId) setActiveView(state.activeInstanceId);
  else broadcastState();
  return publicState();
});

ipcMain.handle("instance:activate", (_event, id) => {
  setActiveView(id);
  return publicState();
});

ipcMain.handle("instance:reload", (_event, id, hard) => {
  const view = views.get(id);
  if (view) {
    if (hard) view.webContents.reloadIgnoringCache();
    else view.webContents.reload();
  }
  return true;
});

ipcMain.handle("instance:clear-session", async (_event, id) => clearInstanceSession(id));

ipcMain.handle("link:parse", (_event, url, source) => parseWhatsAppLink(url, source));

ipcMain.handle("link:open", async (_event, payload) => {
  const instance = getInstance(payload.selectedInstanceId);
  if (!instance) return false;
  setActiveView(instance.id);
  const view = createWhatsAppView(instance);
  await view.webContents.loadURL(toWhatsAppWebSendUrl(payload), { userAgent: WHATSAPP_USER_AGENT });
  return true;
});

ipcMain.handle("settings:update", (_event, updates) => {
  state.settings = { ...state.settings, ...updates };
  app.setLoginItemSettings({ openAtLogin: Boolean(state.settings.launchAtLogin) });
  broadcastState();
  return publicState();
});

ipcMain.handle("crm:get-active", () => {
  const instance = getInstance(state.activeInstanceId);
  if (!instance) return null;
  const latest = crmState.contacts
    .filter((contact) => contact.instanceId === instance.id && !isBadCrmDisplayName(contact.displayName))
    .sort((a, b) => String(b.lastSeenAt || b.updatedAt).localeCompare(String(a.lastSeenAt || a.updatedAt)))[0];
  return latest ? crmContactPayload(latest.id) : null;
});

ipcMain.handle("crm:refresh-detection", () => {
  const view = views.get(state.activeInstanceId);
  if (!view) return false;
  view.webContents.send("whatsapp:scan-contact-details");
  return true;
});

ipcMain.handle("crm:update-contact", (_event, contactId, updates) => {
  const contact = crmState.contacts.find((item) => item.id === contactId);
  if (!contact) return null;
  const now = nowIso();
  for (const [key, value] of Object.entries(updates || {})) {
    if (key in contact) contact[key] = value;
  }
  if (contact.crmStatus === "auto_created") contact.crmStatus = "user_confirmed";
  contact.updatedAt = now;
  addCrmActivity(contact.id, contact.instanceId, "contact_confirmed", "Contact edited", Object.keys(updates || {}).join(", "));
  saveCrmStore();
  return crmContactPayload(contact.id);
});

ipcMain.handle("crm:add-label", (_event, contactId, name) => {
  const contact = crmState.contacts.find((item) => item.id === contactId);
  if (!contact || !name) return null;
  ensureDefaultLabels();
  const cleanName = String(name).trim();
  let label = crmState.labels.find((item) => item.name.toLowerCase() === cleanName.toLowerCase());
  if (!label) {
    label = { id: uuid(), workspaceId: "local", name: cleanName, color: "#dcfce7", createdAt: nowIso(), updatedAt: nowIso() };
    crmState.labels.push(label);
  }
  if (!contact.labels.includes(label.name)) {
    contact.labels.push(label.name);
    contact.crmStatus = "user_confirmed";
    contact.updatedAt = nowIso();
    addCrmActivity(contact.id, contact.instanceId, "label_added", `Label added: ${label.name}`);
  }
  saveCrmStore();
  return crmContactPayload(contact.id);
});

ipcMain.handle("crm:remove-label", (_event, contactId, name) => {
  const contact = crmState.contacts.find((item) => item.id === contactId);
  if (!contact) return null;
  contact.labels = contact.labels.filter((label) => label !== name);
  contact.updatedAt = nowIso();
  addCrmActivity(contact.id, contact.instanceId, "label_removed", `Label removed: ${name}`);
  saveCrmStore();
  return crmContactPayload(contact.id);
});

ipcMain.handle("crm:add-note", (_event, contactId, body, pinned = false) => {
  const contact = crmState.contacts.find((item) => item.id === contactId);
  if (!contact || !String(body || "").trim()) return null;
  const now = nowIso();
  crmState.notes.push({ id: uuid(), workspaceId: "local", contactId, instanceId: contact.instanceId, body: String(body), createdBy: "local_user", pinned: Boolean(pinned), createdAt: now, updatedAt: now });
  contact.crmStatus = "user_confirmed";
  contact.updatedAt = now;
  addCrmActivity(contact.id, contact.instanceId, "note_created", "Note added");
  saveCrmStore();
  return crmContactPayload(contact.id);
});

ipcMain.handle("crm:update-note", (_event, noteId, body) => {
  const note = crmState.notes.find((item) => item.id === noteId);
  if (!note) return null;
  note.body = String(body || "");
  note.updatedAt = nowIso();
  addCrmActivity(note.contactId, note.instanceId, "note_updated", "Note updated");
  saveCrmStore();
  return crmContactPayload(note.contactId);
});

ipcMain.handle("crm:delete-note", (_event, noteId) => {
  const note = crmState.notes.find((item) => item.id === noteId);
  if (!note) return null;
  crmState.notes = crmState.notes.filter((item) => item.id !== noteId);
  addCrmActivity(note.contactId, note.instanceId, "note_deleted", "Note deleted");
  saveCrmStore();
  return crmContactPayload(note.contactId);
});

ipcMain.handle("crm:upsert-custom-field", (_event, contactId, fieldKey, fieldValue) => {
  const contact = crmState.contacts.find((item) => item.id === contactId);
  if (!contact) return null;
  const now = nowIso();
  let field = crmState.customFields.find((item) => item.contactId === contactId && item.fieldKey === fieldKey);
  if (!field) {
    field = { id: uuid(), workspaceId: "local", contactId, fieldKey, fieldValue: "", fieldType: "text", createdAt: now, updatedAt: now };
    crmState.customFields.push(field);
  }
  field.fieldValue = String(fieldValue || "");
  field.updatedAt = now;
  contact.crmStatus = "user_confirmed";
  contact.updatedAt = now;
  if (["source", "location", "budget", "nextAction", "companyName", "email"].includes(fieldKey)) contact[fieldKey] = field.fieldValue;
  addCrmActivity(contact.id, contact.instanceId, "custom_field_updated", `${fieldKey} updated`);
  saveCrmStore();
  return crmContactPayload(contact.id);
});

ipcMain.handle("crm:create-followup", (_event, contactId, payload) => {
  const contact = crmState.contacts.find((item) => item.id === contactId);
  if (!contact) return null;
  const now = nowIso();
  crmState.followups.push({
    id: uuid(),
    workspaceId: "local",
    contactId,
    instanceId: contact.instanceId,
    title: payload.title || contact.nextAction || "Follow up",
    dueAt: payload.dueAt || now,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    status: "pending",
    reminderEnabled: payload.reminderEnabled !== false,
    reminderMinutesBefore: Number(payload.reminderMinutesBefore || 0),
    notes: payload.notes || "",
    createdAt: now,
    updatedAt: now
  });
  contact.crmStatus = "user_confirmed";
  contact.updatedAt = now;
  addCrmActivity(contact.id, contact.instanceId, "followup_created", "Follow-up created");
  saveCrmStore();
  return crmContactPayload(contact.id);
});

ipcMain.handle("crm:complete-followup", (_event, followupId) => {
  const followup = crmState.followups.find((item) => item.id === followupId);
  if (!followup) return null;
  followup.status = "completed";
  followup.completedAt = nowIso();
  followup.updatedAt = followup.completedAt;
  addCrmActivity(followup.contactId, followup.instanceId, "followup_completed", `Completed: ${followup.title}`);
  saveCrmStore();
  return crmContactPayload(followup.contactId);
});

ipcMain.handle("crm:manual-contact", (_event, payload) => {
  const instance = getInstance(payload.instanceId || state.activeInstanceId);
  if (!instance) return null;
  return resolveCrmContactFromActiveChat({
    instanceId: instance.id,
    sessionPartition: instance.partition,
    displayName: payload.displayName || "Manual Contact",
    phoneNumber: payload.phoneNumber,
    chatType: payload.chatType || "unknown",
    chatKey: payload.chatKey || `${slug(payload.phoneNumber || payload.displayName || "manual")}-${nowIso().slice(0, 10)}`,
    identityConfidence: payload.phoneNumber ? "medium" : "low",
    detectedAt: nowIso()
  });
});

ipcMain.on("whatsapp:active-chat-changed", (event, payload) => {
  const instanceId = webContentsToInstance.get(event.sender.id);
  const instance = getInstance(instanceId);
  if (!instance || !payload || !payload.displayName) return;
  const resolved = resolveCrmContactFromActiveChat({
    ...payload,
    instanceId: instance.id,
    sessionPartition: instance.partition
  });
  sendCrmContact(resolved);
});

ipcMain.on("view:set-bounds", (_event, bounds) => {
  viewBounds = {
    x: Math.max(0, Math.round(bounds.x || 0)),
    y: Math.max(0, Math.round(bounds.y || 0)),
    width: Math.max(100, Math.round(bounds.width || 100)),
    height: Math.max(100, Math.round(bounds.height || 100))
  };
  const active = views.get(state.activeInstanceId);
  if (active && !isModalOpen) active.setBounds(viewBounds);
});

ipcMain.on("view:modal-open", (_event, open) => {
  isModalOpen = Boolean(open);
  if (isModalOpen) {
    detachBrowserViews();
  } else {
    attachActiveView();
  }
});
