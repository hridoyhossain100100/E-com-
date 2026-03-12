import admin from './firebaseAdmin';

export async function sendPushNotification(title: string, body: string, data?: any, token?: string) {
  const message: any = {
    notification: {
      title,
      body,
    },
    data: data || {},
    android: {
      priority: 'high',
      notification: {
        sound: 'order_alert',
        channelId: 'high_importance_channel',
      },
    },
  };

  if (token) {
    message.token = token;
  } else {
    message.topic = 'admin_orders';
  }

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent push notification:', response);
    return response;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}
