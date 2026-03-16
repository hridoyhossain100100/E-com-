import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import './providers/cart_provider.dart';
import './screens/product_details_screen.dart';
import './screens/cart_screen.dart';
import './screens/login_screen.dart';
import './screens/admin_dashboard_screen.dart';
import './screens/admin_order_list_screen.dart';
import './screens/admin_product_list_screen.dart';
import 'screens/admin_coupon_list_screen.dart';
import 'screens/admin_review_list_screen.dart';
import 'screens/admin_settings_screen.dart';
import 'screens/admin_customer_list_screen.dart';
import 'screens/admin_oms_screen.dart';
import './services/notification_service.dart';
import './screens/admin_order_details_wrapper.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  
  // Initialize notifications
  final notificationService = NotificationService();
  await notificationService.initialize();
  
  // Set background message handler
  FirebaseMessaging.onBackgroundMessage(NotificationService.firebaseMessagingBackgroundHandler);
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [ChangeNotifierProvider(create: (ctx) => CartProvider())],
      child: MaterialApp(
        title: 'MY SHOP APP',
        navigatorKey: navigatorKey,
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF6D28D9),
            primary: const Color(0xFF6D28D9),
            surface: const Color(0xFFF8FAFC),
          ),
          fontFamily: 'Inter',
          appBarTheme: const AppBarTheme(
            backgroundColor: Colors.white,
            elevation: 0,
            scrolledUnderElevation: 0,
            centerTitle: false,
            titleTextStyle: TextStyle(
              color: Color(0xFF1E293B),
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          cardTheme: CardThemeData(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: Colors.grey.shade200),
            ),
          ),
        ),
        darkTheme: ThemeData.dark(useMaterial3: true).copyWith(
          colorScheme: ColorScheme.fromSeed(
            brightness: Brightness.dark,
            seedColor: const Color(0xFF6D28D9),
            primary: const Color(0xFF6D28D9),
            surface: const Color(0xFF11111E),
          ),
          scaffoldBackgroundColor: const Color(0xFF11111E),
          cardColor: const Color(0xFF1E1E2E),
          appBarTheme: const AppBarTheme(
            backgroundColor: Color(0xFF11111E),
            elevation: 0,
            scrolledUnderElevation: 0,
          ),
        ),
        home: const LoginScreen(),
        routes: {
          ProductDetailsScreen.routeName: (ctx) => const ProductDetailsScreen(),
          CartScreen.routeName: (ctx) => const CartScreen(),
          LoginScreen.routeName: (ctx) => const LoginScreen(),
          '/dashboard': (ctx) => const AdminDashboardScreen(),
          '/order-list': (context) => const AdminOrderListScreen(),
          '/product-list': (context) => const AdminProductListScreen(),
          '/coupon-list': (context) => const AdminCouponListScreen(),
          '/review-list': (context) => const AdminReviewListScreen(),
          '/settings': (context) => const AdminSettingsScreen(),
          '/customer-list': (context) => const AdminCustomerListScreen(),
          '/oms': (context) => const AdminOmsScreen(),
          '/order-details': (context) {
            final args = ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
            return AdminOrderDetailsWrapper(orderId: args['orderId']);
          },
        },
      ),
    );
  }
}
