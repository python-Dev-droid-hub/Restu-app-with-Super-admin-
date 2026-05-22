import { useEffect, useState } from 'react';
import { Button, Snackbar } from '@mui/material';
import { hasAuthSession } from '../utils/authStorage';
import {
  bindBrowserNotificationsFromSocket,
  getBrowserNotificationPermission,
  isBrowserNotificationSupported,
  requestBrowserNotificationPermission,
} from '../services/browserNotifications';

/**
 * Enables OS/browser notification popups when the user is logged in and socket events arrive.
 */
export default function BrowserNotificationListener() {
  const [permission, setPermission] = useState(getBrowserNotificationPermission());
  const [promptOpen, setPromptOpen] = useState(false);

  useEffect(() => {
    if (!hasAuthSession() || !isBrowserNotificationSupported()) return;

    setPermission(getBrowserNotificationPermission());

    if (Notification.permission === 'default') {
      setPromptOpen(true);
    } else if (Notification.permission === 'granted') {
      const unbind = bindBrowserNotificationsFromSocket();
      return unbind;
    }
    return undefined;
  }, []);

  const handleEnable = async () => {
    const result = await requestBrowserNotificationPermission();
    setPermission(result);
    setPromptOpen(false);
    if (result === 'granted') {
      bindBrowserNotificationsFromSocket();
    }
  };

  if (!hasAuthSession() || !isBrowserNotificationSupported()) {
    return null;
  }

  if (permission === 'denied') {
    return (
      <Snackbar
        open={promptOpen}
        message="Browser notifications are blocked. Enable them in your browser site settings."
        onClose={() => setPromptOpen(false)}
        action={
          <Button color="inherit" size="small" onClick={() => setPromptOpen(false)}>
            OK
          </Button>
        }
      />
    );
  }

  return (
    <Snackbar
      open={promptOpen && permission === 'default'}
      message="Enable browser notifications for new orders and alerts?"
      action={
        <>
          <Button color="inherit" size="small" onClick={() => setPromptOpen(false)}>
            Later
          </Button>
          <Button color="inherit" size="small" onClick={() => void handleEnable()}>
            Enable
          </Button>
        </>
      }
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    />
  );
}
