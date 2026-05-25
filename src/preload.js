const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("whatsdesk", {
  ready: () => ipcRenderer.invoke("app:ready"),
  listState: () => ipcRenderer.invoke("state:list"),
  createInstance: (payload) => ipcRenderer.invoke("instance:create", payload),
  updateInstance: (id, updates) => ipcRenderer.invoke("instance:update", id, updates),
  deleteInstance: (id, clearSession) => ipcRenderer.invoke("instance:delete", id, clearSession),
  activateInstance: (id) => ipcRenderer.invoke("instance:activate", id),
  reloadInstance: (id, hard) => ipcRenderer.invoke("instance:reload", id, hard),
  clearSession: (id) => ipcRenderer.invoke("instance:clear-session", id),
  openLink: (payload) => ipcRenderer.invoke("link:open", payload),
  parseLink: (url, source) => ipcRenderer.invoke("link:parse", url, source),
  updateSettings: (updates) => ipcRenderer.invoke("settings:update", updates),
  getActiveCrmContact: () => ipcRenderer.invoke("crm:get-active"),
  refreshCrmDetection: () => ipcRenderer.invoke("crm:refresh-detection"),
  updateCrmContact: (contactId, updates) => ipcRenderer.invoke("crm:update-contact", contactId, updates),
  addCrmLabel: (contactId, name) => ipcRenderer.invoke("crm:add-label", contactId, name),
  removeCrmLabel: (contactId, name) => ipcRenderer.invoke("crm:remove-label", contactId, name),
  addCrmNote: (contactId, body, pinned) => ipcRenderer.invoke("crm:add-note", contactId, body, pinned),
  updateCrmNote: (noteId, body) => ipcRenderer.invoke("crm:update-note", noteId, body),
  deleteCrmNote: (noteId) => ipcRenderer.invoke("crm:delete-note", noteId),
  updateCrmCustomField: (contactId, key, value) => ipcRenderer.invoke("crm:upsert-custom-field", contactId, key, value),
  createCrmFollowUp: (contactId, payload) => ipcRenderer.invoke("crm:create-followup", contactId, payload),
  completeCrmFollowUp: (followupId) => ipcRenderer.invoke("crm:complete-followup", followupId),
  createManualCrmContact: (payload) => ipcRenderer.invoke("crm:manual-contact", payload),
  setViewBounds: (bounds) => ipcRenderer.send("view:set-bounds", bounds),
  setModalOpen: (isOpen) => ipcRenderer.send("view:modal-open", isOpen),
  onState: (callback) => {
    ipcRenderer.on("state:changed", (_event, state) => callback(state));
  },
  onRouteLink: (callback) => {
    ipcRenderer.on("link:route", (_event, payload) => callback(payload));
  },
  onShortcut: (callback) => {
    ipcRenderer.on("app:shortcut", (_event, action) => callback(action));
  },
  onCrmContact: (callback) => {
    ipcRenderer.on("crm:active-contact", (_event, payload) => callback(payload));
  },
  onCrmFollowUpDue: (callback) => {
    ipcRenderer.on("crm:follow-up-due", (_event, payload) => callback(payload));
  }
});
