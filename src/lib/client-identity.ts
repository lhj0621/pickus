"use client";

const CLIENT_ID_KEY = "pickus.clientId";
const AUTHOR_NAME_KEY = "pickus.authorName";

export function getOrCreateClientId(): string {
  const current = window.localStorage.getItem(CLIENT_ID_KEY);
  if (current) {
    return current;
  }

  const clientId = crypto.randomUUID();
  window.localStorage.setItem(CLIENT_ID_KEY, clientId);
  return clientId;
}

export function getSavedAuthorName(): string {
  return window.localStorage.getItem(AUTHOR_NAME_KEY) || "익명";
}

export function saveAuthorName(authorName: string): void {
  window.localStorage.setItem(AUTHOR_NAME_KEY, authorName.trim() || "익명");
}
