export const STORAGE_KEY = 'instafixSettings';

export function loadSettings() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
