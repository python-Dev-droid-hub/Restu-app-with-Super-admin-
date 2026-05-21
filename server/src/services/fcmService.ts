import { logger } from '@/utils/logger';

let messaging: { send: (msg: unknown) => Promise<string> } | null = null;
let initAttempted = false;

async function getMessaging() {
  if (initAttempted) return messaging;
  initAttempted = true;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    logger.info('[FCM] Firebase credentials not configured — push disabled');
    return null;
  }

  try {
    const admin = await import('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
    messaging = admin.messaging();
    logger.info('[FCM] Firebase Admin initialized');
  } catch (error) {
    logger.warn('[FCM] firebase-admin not available or failed to init', error);
    messaging = null;
  }

  return messaging;
}

export interface FcmPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendFcmToToken(
  token: string,
  payload: FcmPayload,
  retries = 2
): Promise<boolean> {
  const fcm = await getMessaging();
  if (!fcm || !token) return false;

  const data: Record<string, string> = {};
  if (payload.data) {
    for (const [key, value] of Object.entries(payload.data)) {
      data[key] = value == null ? '' : String(value);
    }
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await fcm.send({
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data,
        android: { priority: 'high' as const },
        apns: { payload: { aps: { sound: 'default' } } },
      });
      return true;
    } catch (error) {
      logger.warn(`[FCM] send attempt ${attempt + 1} failed`, error);
      if (attempt === retries) return false;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }

  return false;
}
