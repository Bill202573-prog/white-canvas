import { useEffect, useRef } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * Invisible component that auto-subscribes the guardian to push notifications.
 * No UI is rendered — subscription happens silently on mount.
 * If the user has denied permission at browser level, nothing happens.
 */
export function PushAutoSubscribe() {
  const { isSupported, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const attempted = useRef(false);

  useEffect(() => {
    if (!isSupported || isSubscribed || isLoading || attempted.current) return;
    attempted.current = true;

    // Only auto-subscribe if permission is already granted or default (will prompt once)
    if (Notification.permission !== 'denied') {
      subscribe().catch(() => {});
    }
  }, [isSupported, isSubscribed, isLoading, subscribe]);

  return null;
}
