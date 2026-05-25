const { ipcRenderer } = require("electron");

let lastKey = "";
let timer;
let lastClickedChatRow = null;

function clean(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function isBadLabel(text) {
  const value = clean(text).toLowerCase();
  return !value ||
    value.length < 2 ||
    value.startsWith("wds-") ||
    value.includes("ic-") ||
    /search|menu|profile|video|voice|call|add|filter|new chat|settings|status|channels|communities|archived|unread|favorites|groups|type a message|emoji|attach|microphone|today|yesterday/i.test(value);
}

function normalizePhone(text) {
  const value = clean(text);
  const matches = value.match(/(?:\+|00)?\d[\d\s().-]{6,}\d/g) || [];
  for (const match of matches) {
    const digits = match.replace(/\D/g, "");
    if (digits.length >= 7 && digits.length <= 15) {
      return `+${digits.replace(/^00/, "")}`;
    }
  }
  return "";
}

function hash(input) {
  let value = 0;
  const text = String(input || "");
  for (let index = 0; index < text.length; index += 1) {
    value = ((value << 5) - value + text.charCodeAt(index)) | 0;
  }
  return Math.abs(value).toString(36);
}

function visibleText(node) {
  if (!node) return "";
  const style = window.getComputedStyle(node);
  if (style.visibility === "hidden" || style.display === "none") return "";
  return clean(node.textContent);
}

function textCandidates(root) {
  if (!root) return [];
  const values = [];
  root.querySelectorAll("[title], [aria-label]").forEach((node) => {
    values.push(node.getAttribute("title"));
    values.push(node.getAttribute("aria-label"));
  });
  root.querySelectorAll("span, div, h1, h2, h3").forEach((node) => {
    const text = visibleText(node);
    if (text && text.length < 120) values.push(text);
  });
  return values.map(clean).filter(Boolean).filter((text, index, list) => list.indexOf(text) === index);
}

function scoreHeader(header) {
  const text = clean(header.textContent);
  let score = 0;
  if (header.closest("#main")) score += 8;
  if (header.querySelector("img")) score += 2;
  if (header.querySelector('[aria-label*="Search" i]')) score += 2;
  if (header.querySelector('[aria-label*="menu" i], [aria-label*="Menu" i]')) score += 1;
  if (/last seen|online|typing|business account/i.test(text)) score += 2;
  if (/WhatsApp$/.test(text)) score -= 4;
  return score;
}

function activeChatHeader() {
  const mainHeader = document.querySelector("#main header");
  if (mainHeader) return mainHeader;
  return Array.from(document.querySelectorAll("header"))
    .sort((a, b) => scoreHeader(b) - scoreHeader(a))[0] || null;
}

function findHeaderName() {
  const header = activeChatHeader();
  const candidates = textCandidates(header)
    .filter((text) => text.length > 1 && text.length < 90)
    .filter((text) => !/last seen|online|typing|click here|end-to-end encrypted|business account/i.test(text))
    .filter((text) => !normalizePhone(text))
    .filter((text) => !isBadLabel(text));
  return candidates[0] || "";
}

function selectedChatElement() {
  const selected =
    document.querySelector('[aria-selected="true"]') ||
    document.querySelector('[data-testid="cell-frame-container"][aria-selected="true"]') ||
    document.querySelector('[role="gridcell"][aria-selected="true"]') ||
    document.querySelector('[aria-current="true"]');
  return selected || lastClickedChatRow;
}

function findChatRowFromClick(target) {
  return target.closest('[data-testid="cell-frame-container"], [role="listitem"], [role="gridcell"], [aria-selected]');
}

function findSelectedChatName() {
  const selected = selectedChatElement();
  if (!selected) return "";
  const candidates = textCandidates(selected)
    .filter((text) => text.length > 1 && text.length < 90)
    .filter((text) => !/\d{1,2}:\d{2}|\/\d{4}|last seen|typing|online/i.test(text))
    .filter((text) => !isBadLabel(text));
  const phoneCandidate = candidates.find((text) => normalizePhone(text));
  return phoneCandidate || candidates[0] || "";
}

function findSelectedChatPreview() {
  const selected = selectedChatElement();
  if (!selected) return "";
  const selectedName = findSelectedChatName();
  return clean(selected.textContent).replace(selectedName, "").slice(0, 180);
}

function contactInfoRoots() {
  return Array.from(document.querySelectorAll('[role="complementary"], aside, [aria-label*="Contact info" i], [aria-label*="Business info" i], [data-testid*="drawer" i]'))
    .filter((node) => clean(node.textContent).length > 20);
}

function findVisiblePhone() {
  const header = activeChatHeader();
  const selectedName = findSelectedChatName();
  const roots = [header, selectedChatElement(), ...contactInfoRoots()].filter(Boolean);
  for (const root of roots) {
    const phone = normalizePhone(textCandidates(root).join(" "));
    if (phone) return phone;
  }
  return normalizePhone(selectedName);
}

function findBusinessText() {
  const roots = contactInfoRoots();
  for (const root of roots) {
    const text = clean(root.textContent);
    if (/business account|catalog|hours|address|email|website/i.test(text)) return text.slice(0, 500);
  }
  return "";
}

function detectActiveChat() {
  const headerName = findHeaderName();
  const selectedName = findSelectedChatName();
  const displayName = !isBadLabel(headerName) ? headerName : selectedName;
  if (!displayName || displayName === "WhatsApp" || isBadLabel(displayName)) return null;

  const phone = findVisiblePhone();
  const selectedPreview = findSelectedChatPreview();
  const businessText = findBusinessText();
  const chatType = phone ? "individual" : displayName.toLowerCase().includes("group") ? "group" : "unknown";
  const confidence = phone ? "medium" : displayName ? "low" : "low";
  const chatKey = phone || `wa-${hash(`${displayName}|${selectedPreview}`)}`;

  return {
    chatKey,
    chatType,
    displayName,
    phoneNumber: phone,
    normalizedPhoneNumber: phone,
    businessText,
    lastMessagePreview: selectedPreview,
    lastMessageAt: null,
    identityConfidence: confidence,
    detectedAt: new Date().toISOString()
  };
}

function emitIfChanged(force = false) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const chat = detectActiveChat();
    if (!chat) return;
    const key = `${chat.chatKey}|${chat.displayName}|${chat.phoneNumber}|${chat.lastMessagePreview}|${chat.businessText}`;
    if (!force && key === lastKey) return;
    lastKey = key;
    ipcRenderer.send("whatsapp:active-chat-changed", chat);
  }, 350);
}

window.addEventListener("DOMContentLoaded", () => {
  emitIfChanged(true);
  const observer = new MutationObserver(() => emitIfChanged(false));
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["title", "aria-label", "aria-selected", "class"]
  });
  document.addEventListener("click", (event) => {
    const row = findChatRowFromClick(event.target);
    if (row) lastClickedChatRow = row;
    emitIfChanged(true);
  }, true);
  ipcRenderer.on("whatsapp:scan-contact-details", () => emitIfChanged(true));
});
