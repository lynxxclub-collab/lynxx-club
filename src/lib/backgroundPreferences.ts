import { BackgroundEffect } from './backgroundRemoval';

const STORAGE_KEYS = {
  favorites: 'virtualBg_favorites',
  recent: 'virtualBg_recent',
  lastUsed: 'virtualBg_lastUsed',
  customImages: 'virtualBg_customImages',
};

const MAX_RECENT = 5;
const MAX_CUSTOM_IMAGES = 5;

export interface SavedBackgroundPreferences {
  favorites: BackgroundEffect[];
  recentlyUsed: BackgroundEffect[];
  lastUsed?: BackgroundEffect;
  customImages: string[]; // Base64 encoded
}

function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

// Effect comparison helper
function effectsEqual(a: BackgroundEffect, b: BackgroundEffect): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'none') return true;
  if (a.type === 'blur') return a.blurAmount === b.blurAmount;
  if (a.type === 'color' || a.type === 'image') return a.value === b.value;
  if (a.type === 'animated') return a.animationType === b.animationType;
  return false;
}

// Favorites
export function getFavoriteBackgrounds(): BackgroundEffect[] {
  return getStorageItem<BackgroundEffect[]>(STORAGE_KEYS.favorites, []);
}

export function addFavoriteBackground(effect: BackgroundEffect): void {
  const favorites = getFavoriteBackgrounds();
  if (!favorites.some(f => effectsEqual(f, effect))) {
    favorites.push(effect);
    setStorageItem(STORAGE_KEYS.favorites, favorites);
  }
}

export function removeFavoriteBackground(effect: BackgroundEffect): void {
  const favorites = getFavoriteBackgrounds();
  const filtered = favorites.filter(f => !effectsEqual(f, effect));
  setStorageItem(STORAGE_KEYS.favorites, filtered);
}

export function isFavorite(effect: BackgroundEffect): boolean {
  const favorites = getFavoriteBackgrounds();
  return favorites.some(f => effectsEqual(f, effect));
}

// Recently Used
export function getRecentBackgrounds(): BackgroundEffect[] {
  return getStorageItem<BackgroundEffect[]>(STORAGE_KEYS.recent, []);
}

export function addRecentBackground(effect: BackgroundEffect): void {
  if (effect.type === 'none') return;
  
  let recent = getRecentBackgrounds();
  // Remove if already exists
  recent = recent.filter(r => !effectsEqual(r, effect));
  // Add to front
  recent.unshift(effect);
  // Limit size
  recent = recent.slice(0, MAX_RECENT);
  setStorageItem(STORAGE_KEYS.recent, recent);
}

// Last Used
export function getLastUsedBackground(): BackgroundEffect | undefined {
  return getStorageItem<BackgroundEffect | undefined>(STORAGE_KEYS.lastUsed, undefined);
}

export function setLastUsedBackground(effect: BackgroundEffect): void {
  setStorageItem(STORAGE_KEYS.lastUsed, effect);
}

// Custom Images (base64)
export function getCustomImages(): string[] {
  return getStorageItem<string[]>(STORAGE_KEYS.customImages, []);
}

export function saveCustomImage(base64: string): boolean {
  const images = getCustomImages();
  if (images.length >= MAX_CUSTOM_IMAGES) {
    return false;
  }
  if (!images.includes(base64)) {
    images.push(base64);
    setStorageItem(STORAGE_KEYS.customImages, images);
  }
  return true;
}

export function removeCustomImage(base64: string): void {
  const images = getCustomImages();
  const filtered = images.filter(img => img !== base64);
  setStorageItem(STORAGE_KEYS.customImages, filtered);
}

// Convert file to base64 for storage
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Clear all preferences
export function clearBackgroundPreferences(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}
