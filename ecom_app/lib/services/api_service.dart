import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/product.dart';
import '../models/order.dart';
import '../models/dashboard_stats.dart';
import '../models/coupon.dart';
import '../models/review.dart';

class ApiService {
  // Production Vercel URL for backend API
  static const String _prodUrl = 'https://e-com-one-green.vercel.app/api';
  // Local development URL (10.0.2.2 is required for Android emulators to access localhost)
  static const String _localUrl = 'http://10.0.2.2:3000/api';
  // Toggle this true if you want to test against localhost in debug mode
  static const bool _forceLocal = false;

  static String get baseUrl => (kDebugMode && _forceLocal) ? _localUrl : _prodUrl;
  
  final _storage = const FlutterSecureStorage();

  // Cache the token to avoid frequent disk reads
  String? _adminToken;

  Future<void> _initToken() async {
    _adminToken ??= await _storage.read(key: 'admin_token');
  }

  Map<String, String> _getHeaders() {
    final headers = {'Content-Type': 'application/json'};
    if (_adminToken != null) {
      // Send as both Authorization header and Cookie just in case
      headers['Authorization'] = 'Bearer $_adminToken';
      headers['Cookie'] = 'admin_token=$_adminToken';
    }
    return headers;
  }

  // Helper methods for API calls
  Future<http.Response> _get(String path) async {
    await _initToken();
    return http.get(Uri.parse('$baseUrl$path'), headers: _getHeaders());
  }

  Future<http.Response> _post(String path, Map<String, dynamic> body) async {
    await _initToken();
    return http.post(
      Uri.parse('$baseUrl$path'),
      headers: _getHeaders(),
      body: json.encode(body),
    );
  }

  Future<http.Response> _put(String path, Map<String, dynamic> body) async {
    await _initToken();
    return http.put(
      Uri.parse('$baseUrl$path'),
      headers: _getHeaders(),
      body: json.encode(body),
    );
  }

  Future<http.Response> _delete(String path) async {
    await _initToken();
    return http.delete(Uri.parse('$baseUrl$path'), headers: _getHeaders());
  }

  Future<List<Product>> fetchProducts() async {
    await _initToken();
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/products'),
        headers: _getHeaders(),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => Product.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load products');
      }
    } catch (e) {
      debugPrint('Error fetching products: $e');
      rethrow;
    }
  }

  Future<Product> fetchProductById(String id) async {
    await _initToken();
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/products/$id'),
        headers: _getHeaders(),
      );

      if (response.statusCode == 200) {
        return Product.fromJson(json.decode(response.body));
      } else {
        throw Exception('Failed to load product');
      }
    } catch (e) {
      debugPrint('Error fetching product: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> placeOrder(Order order) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orders'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(order.toJson()),
      );

      if (response.statusCode == 201) {
        return json.decode(response.body);
      } else {
        final error = json.decode(response.body);
        throw Exception(error['message'] ?? 'Failed to place order');
      }
    } catch (e) {
      debugPrint('Error placing order: $e');
      rethrow;
    }
  }

  Future<void> adminLogin(String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/admin/login'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'password': password}),
      );

      if (response.statusCode == 200) {
        // Extract token from Set-Cookie header if present
        String? token;
        final setCookie = response.headers['set-cookie'];
        if (setCookie != null) {
          final regExp = RegExp(r'admin_token=([^;]+)');
          final match = regExp.firstMatch(setCookie);
          if (match != null) {
            token = match.group(1);
          }
        }

        // If not in cookies (maybe backend changed to body?), check body
        if (token == null && response.body.isNotEmpty) {
          try {
            final body = json.decode(response.body);
            token = body['token'];
          } catch (_) {
            // Body is not valid JSON
          }
        }

        if (token != null) {
          _adminToken = token;
          await _storage.write(key: 'admin_token', value: token);
        }
      } else {
        String errorMessage = 'Login failed';
        if (response.body.isNotEmpty) {
          try {
            final error = json.decode(response.body);
            errorMessage = error['message'] ?? 'Login failed';
          } catch (e) {
            errorMessage = 'Login failed with status ${response.statusCode}';
          }
        } else {
          errorMessage = 'Login failed: Empty response from server';
        }
        throw Exception(errorMessage);
      }
    } catch (e) {
      debugPrint('Login error: $e');
      rethrow;
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: 'admin_token');
    _adminToken = null;
  }

  Future<DashboardStats> fetchDashboardStats() async {
    await _initToken();
    try {
      // Fetch general stats
      final statsResponse = await http.get(
        Uri.parse('$baseUrl/orders/stats'),
        headers: _getHeaders(),
      );

      // Fetch visitor count
      final visitorResponse = await http.get(
        Uri.parse('$baseUrl/visitors/count'),
        headers: _getHeaders(),
      );

      if (statsResponse.statusCode == 200 &&
          visitorResponse.statusCode == 200) {
        final statsData = json.decode(statsResponse.body);
        final visitorData = json.decode(visitorResponse.body);

        // We'll fetch coupons separately in the dashboard for real count
        return DashboardStats.fromJson(statsData, visitorData['count'] ?? 0);
      } else {
        throw Exception('Failed to load dashboard stats');
      }
    } catch (e) {
      debugPrint('Error fetching stats: $e');
      rethrow;
    }
  }

  Future<List<DailyRevenue>> fetchChartData() async {
    await _initToken();
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/orders/daily-revenue'),
        headers: _getHeaders(),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((item) => DailyRevenue.fromJson(item)).toList();
      } else {
        throw Exception('Failed to load chart data');
      }
    } catch (e) {
      debugPrint('Error fetching chart data: $e');
      rethrow;
    }
  }

  Future<List<Order>> fetchAllOrders() async {
    await _initToken();
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/orders'),
        headers: _getHeaders(),
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        final List<dynamic> orderList = data['orders'] ?? [];
        return orderList.map((json) => Order.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load orders');
      }
    } catch (e) {
      debugPrint('Error fetching orders: $e');
      rethrow;
    }
  }

  Future<Order> fetchOrderById(String id) async {
    await _initToken();
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/orders/$id'),
        headers: _getHeaders(),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return Order.fromJson(data);
      } else {
        throw Exception('Failed to load order');
      }
    } catch (e) {
      debugPrint('Error fetching order: $e');
      rethrow;
    }
  }

  Future<void> updateOrderStatus(String orderId, String status) async {
    await _initToken();
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/orders/$orderId/status'),
        headers: _getHeaders(),
        body: json.encode({'status': status}),
      );

      if (response.statusCode != 200) {
        final error = json.decode(response.body);
        throw Exception(error['message'] ?? 'Failed to update status');
      }
    } catch (e) {
      debugPrint('Error updating status: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> sendToPathao(
    String orderId,
    Map<String, dynamic> details,
  ) async {
    await _initToken();
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orders/$orderId/pathao'),
        headers: _getHeaders(),
        body: json.encode(details),
      );

      final data = json.decode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        return data;
      } else {
        throw Exception(data['error'] ?? 'Failed to send to Pathao');
      }
    } catch (e) {
      debugPrint('Pathao error: $e');
      rethrow;
    }
  }

  Future<void> deleteProduct(String id) async {
    await _initToken();
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/products/$id'),
        headers: _getHeaders(),
      );

      if (response.statusCode != 200) {
        final error = json.decode(response.body);
        throw Exception(error['message'] ?? 'Failed to delete product');
      }
    } catch (e) {
      debugPrint('Error deleting product: $e');
      rethrow;
    }
  }

  Future<void> updateProduct(String id, Map<String, dynamic> data) async {
    await _initToken();
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/products/$id'),
        headers: _getHeaders(),
        body: json.encode(data),
      );

      if (response.statusCode != 200) {
        final error = json.decode(response.body);
        throw Exception(error['message'] ?? 'Failed to update product');
      }
    } catch (e) {
      debugPrint('Error updating product: $e');
      rethrow;
    }
  }

  Future<void> createProduct(
    Map<String, dynamic> data,
    List<String> imagePaths,
  ) async {
    await _initToken();
    try {
      var request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/products'),
      );

      // Add headers
      _getHeaders().forEach((key, value) {
        request.headers[key] = value;
      });

      // Add fields
      data.forEach((key, value) {
        if (value is List || value is Map) {
          request.fields[key] = json.encode(value);
        } else {
          request.fields[key] = value.toString();
        }
      });

      // Add images
      for (var path in imagePaths) {
        request.files.add(await http.MultipartFile.fromPath('images', path));
      }

      var streamedResponse = await request.send();
      var response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode != 201) {
        final error = json.decode(response.body);
        throw Exception(error['message'] ?? 'Failed to create product');
      }
    } catch (e) {
      debugPrint('Error creating product: $e');
      rethrow;
    }
  }

  // --- Coupons ---
  Future<List<Coupon>> fetchCoupons() async {
    final response = await _get('/coupons');
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((item) => Coupon.fromJson(item)).toList();
    }
    throw Exception('Failed to fetch coupons');
  }

  Future<void> createCoupon(Map<String, dynamic> couponData) async {
    final response = await _post('/coupons', couponData);
    if (response.statusCode != 201) {
      final error = json.decode(response.body);
      throw Exception(error['message'] ?? 'Failed to create coupon');
    }
  }

  Future<void> deleteCoupon(String id) async {
    final response = await _delete('/coupons/$id');
    if (response.statusCode != 200) {
      throw Exception('Failed to delete coupon');
    }
  }

  Future<void> toggleCoupon(String id) async {
    final response = await _put('/coupons/$id/toggle', {});
    if (response.statusCode != 200) {
      throw Exception('Failed to toggle coupon');
    }
  }

  // --- Reviews ---
  Future<List<Review>> fetchAdminReviews() async {
    final response = await _get('/admin/reviews');
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((item) => Review.fromJson(item)).toList();
    }
    throw Exception('Failed to fetch reviews');
  }

  Future<void> deleteAdminReview(String id) async {
    final response = await _delete('/admin/reviews/$id');
    if (response.statusCode != 200) {
      throw Exception('Failed to delete review');
    }
  }

  // --- Settings ---
  Future<Map<String, dynamic>> fetchSettings() async {
    final response = await _get('/settings');
    if (response.statusCode == 200) {
      return json.decode(response.body);
    }
    throw Exception('Failed to fetch settings');
  }

  Future<void> updateSetting(String key, dynamic value) async {
    final response = await _put('/settings/$key', {'value': value});
    if (response.statusCode != 200) {
      throw Exception('Failed to update setting');
    }
  }

  // --- Customers (Calculated from Orders) ---
  Future<List<dynamic>> fetchAllOrdersList() async {
    final response = await _get('/orders?limit=1000');
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['orders'] ?? [];
    }
    return [];
  }

  Future<void> saveFcmToken(String token) async {
    try {
      if (kDebugMode) {
        debugPrint('FCM_DEBUG: Attempting to save token to $baseUrl/admin/save-token');
      }
      final response = await _post('/admin/save-token', {'token': token});
      if (response.statusCode == 200) {
        if (kDebugMode) {
          debugPrint('FCM_DEBUG: Token saved successfully to backend');
        }
      } else {
        if (kDebugMode) {
          debugPrint('FCM_DEBUG: Failed to save token. Status: ${response.statusCode}, Body: ${response.body}');
        }
        throw Exception('Failed to save FCM token');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('FCM_DEBUG: Exception in saveFcmToken: $e');
      }
    }
  }
}
