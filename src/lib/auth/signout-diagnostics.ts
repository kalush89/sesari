/**
 * Diagnostic utilities for troubleshooting sign-out issues
 */

export interface DiagnosticResult {
  timestamp: string;
  cookies: Record<string, string>;
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  userAgent: string;
  url: string;
}

/**
 * Capture current browser state for diagnostics
 */
export function captureBrowserState(): DiagnosticResult {
  const result: DiagnosticResult = {
    timestamp: new Date().toISOString(),
    cookies: {},
    localStorage: {},
    sessionStorage: {},
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
    url: typeof window !== 'undefined' ? window.location.href : 'N/A',
  };

  // Capture cookies
  if (typeof document !== 'undefined') {
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name) {
        result.cookies[name] = value || '';
      }
    });
  }

  // Capture localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          result.localStorage[key] = localStorage.getItem(key) || '';
        }
      }
    } catch (error) {
      console.warn('Failed to read localStorage:', error);
    }
  }

  // Capture sessionStorage
  if (typeof sessionStorage !== 'undefined') {
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          result.sessionStorage[key] = sessionStorage.getItem(key) || '';
        }
      }
    } catch (error) {
      console.warn('Failed to read sessionStorage:', error);
    }
  }

  return result;
}

/**
 * Log diagnostic information to console
 */
export function logDiagnostics(label: string): DiagnosticResult {
  const state = captureBrowserState();
  
  console.group(`🔍 Diagnostics: ${label}`);
  console.log('Timestamp:', state.timestamp);
  console.log('URL:', state.url);
  console.log('Cookies:', state.cookies);
  console.log('LocalStorage:', state.localStorage);
  console.log('SessionStorage:', state.sessionStorage);
  console.groupEnd();
  
  return state;
}

/**
 * Compare two diagnostic states to see what changed
 */
export function compareDiagnostics(before: DiagnosticResult, after: DiagnosticResult) {
  console.group('🔄 State Comparison');
  
  // Compare cookies
  const cookieChanges = findChanges(before.cookies, after.cookies);
  if (cookieChanges.length > 0) {
    console.log('Cookie changes:', cookieChanges);
  }
  
  // Compare localStorage
  const localStorageChanges = findChanges(before.localStorage, after.localStorage);
  if (localStorageChanges.length > 0) {
    console.log('LocalStorage changes:', localStorageChanges);
  }
  
  // Compare sessionStorage
  const sessionStorageChanges = findChanges(before.sessionStorage, after.sessionStorage);
  if (sessionStorageChanges.length > 0) {
    console.log('SessionStorage changes:', sessionStorageChanges);
  }
  
  console.groupEnd();
}

function findChanges(before: Record<string, string>, after: Record<string, string>) {
  const changes: Array<{key: string, before: string, after: string, action: string}> = [];
  
  // Find removed items
  Object.keys(before).forEach(key => {
    if (!(key in after)) {
      changes.push({ key, before: before[key], after: '', action: 'removed' });
    }
  });
  
  // Find added items
  Object.keys(after).forEach(key => {
    if (!(key in before)) {
      changes.push({ key, before: '', after: after[key], action: 'added' });
    }
  });
  
  // Find changed items
  Object.keys(before).forEach(key => {
    if (key in after && before[key] !== after[key]) {
      changes.push({ key, before: before[key], after: after[key], action: 'changed' });
    }
  });
  
  return changes;
}