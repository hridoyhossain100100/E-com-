import 'dart:async';
import 'dart:convert';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import './api_service.dart';
import '../main.dart'; // Import navigatorKey

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();

  // Create highly important channel for Android
  static const AndroidNotificationChannel channel = AndroidNotificationChannel(
    'high_importance_channel', // id
    'High Importance Notifications', // title
    description: 'This channel is used for important notifications.', // description
    importance: Importance.max,
    sound: RawResourceAndroidNotificationSound('order_alert'),
    playSound: true,
  );

  Future<void> initialize() async {
    // 1. Basic connectivity test
    try {
      if (kDebugMode) {
        debugPrint("FCM_DEBUG: Starting connectivity test to ${ApiService.baseUrl}/test-connection");
      }
      final testRes = await http.get(Uri.parse('${ApiService.baseUrl}/test-connection'));
      if (kDebugMode) {
        debugPrint("FCM_DEBUG: Connectivity test result: ${testRes.statusCode} - ${testRes.body}");
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint("FCM_DEBUG: Connectivity test failed: $e");
      }
    }

    // 2. Initialize Local Notifications
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    
    const InitializationSettings initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
    );

    await _localNotifications.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        if (response.payload != null) {
          final data = _parsePayload(response.payload!);
          _handleNotificationTap(data);
        }
      },
    );

    // 3. Create the Android Notification Channel
    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);

    // 4. Request Firebase permissions
    NotificationSettings settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      if (kDebugMode) {
        debugPrint('User granted permission');
      }
    }

    // 5. Subscribe to topic
    await _fcm.subscribeToTopic('admin_orders');

    // 6. Get/Save Token
    String? token = await _fcm.getToken();
    if (token != null) {
      if (kDebugMode) {
        debugPrint("FCM_DEBUG: Initial FCM Token found: $token");
      }
      await ApiService().saveFcmToken(token);
    }

    // 7. Handle token refresh
    _fcm.onTokenRefresh.listen((newToken) async {
      if (kDebugMode) {
        debugPrint("FCM Token Refreshed: $newToken");
      }
      await ApiService().saveFcmToken(newToken);
    });

    // 8. Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      RemoteNotification? notification = message.notification;
      AndroidNotification? android = message.notification?.android;

      if (notification != null && android != null && !kIsWeb) {
        _localNotifications.show(
          notification.hashCode,
          notification.title,
          notification.body,
          NotificationDetails(
            android: AndroidNotificationDetails(
              channel.id,
              channel.name,
              channelDescription: channel.description,
              icon: android.smallIcon,
              importance: Importance.max,
              priority: Priority.high,
              sound: RawResourceAndroidNotificationSound('order_alert'),
              playSound: true,
            ),
          ),
          payload: jsonEncode(message.data),
        );
      }
    });

    // 9. Handle background clicks
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      if (kDebugMode) {
        debugPrint("App opened from notification: ${message.notification?.title}");
      }
      _handleNotificationTap(message.data);
    });

    // 10. Check for initial message (if app was terminated)
    RemoteMessage? initialMessage = await _fcm.getInitialMessage();
    if (initialMessage != null) {
      _handleNotificationTap(initialMessage.data);
    }
  }

  Map<String, dynamic> _parsePayload(String payload) {
    try {
      return jsonDecode(payload) as Map<String, dynamic>;
    } catch (e) {
      return {};
    }
  }

  void _handleNotificationTap(Map<String, dynamic> data) {
    final String? orderId = data['orderId'];
    if (orderId != null) {
      navigatorKey.currentState?.pushNamed(
        '/order-details',
        arguments: {'orderId': orderId},
      );
    }
  }

  static Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
    await Firebase.initializeApp();
    if (kDebugMode) {
      debugPrint("Handling a background message: ${message.messageId}");
    }
  }
}
