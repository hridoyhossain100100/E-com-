import admin from './firebaseAdmin';
import type { Message } from 'firebase-admin/messaging';

export async function sendPushNotification(title: string, body: string, data?: Record<string, string>, token?: string) {
  const baseConfig = {
    notification: {
      title,
      body,
    },
    data: data || {},
    android: {
      priority: 'high' as const,
      notification: {
        sound: 'order_alert',
        channelId: 'high_importance_channel',
      },
    },
  };

  const message: Message = token
    ? { ...baseConfig, token }
    : { ...baseConfig, topic: 'admin_orders' };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent push notification:', response);
    return response;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}
