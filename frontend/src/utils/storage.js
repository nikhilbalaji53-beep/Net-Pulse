export function getStoredJSON(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    if (!value || value === 'undefined' || value === 'null') {
      return fallback;
    }
    return JSON.parse(value);
  } catch (error) {
    console.warn(`Invalid stored JSON for ${key}, clearing key`, error);
    try {
      localStorage.removeItem(key);
    } catch (_) {}
    return fallback;
  }
}

export function setStoredJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to store JSON for ${key}`, error);
  }
}
