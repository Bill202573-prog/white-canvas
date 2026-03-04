import { useEffect } from 'react';

/**
 * Hook to update the PWA badge count on Android devices.
 * Uses the Badging API (navigator.setAppBadge) which is supported
 * primarily on Chrome for Android and Windows.
 */
export function useBadgeNotification(count: number) {
  useEffect(() => {
    // Check if the Badging API is supported
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        // Set the badge with the count
        (navigator as any).setAppBadge(count).catch((error: Error) => {
          console.log('Error setting app badge:', error);
        });
      } else {
        // Clear the badge
        (navigator as any).clearAppBadge?.().catch((error: Error) => {
          console.log('Error clearing app badge:', error);
        });
      }
    }
  }, [count]);
}

/**
 * Check if the Badging API is supported in the current browser
 */
export function isBadgingSupported(): boolean {
  return 'setAppBadge' in navigator;
}
