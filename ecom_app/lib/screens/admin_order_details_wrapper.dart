import 'package:flutter/material.dart';
import '../models/order.dart';
import '../services/api_service.dart';
import 'admin_order_details_screen.dart';

class AdminOrderDetailsWrapper extends StatefulWidget {
  final String orderId;

  const AdminOrderDetailsWrapper({super.key, required this.orderId});

  @override
  State<AdminOrderDetailsWrapper> createState() => _AdminOrderDetailsWrapperState();
}

class _AdminOrderDetailsWrapperState extends State<AdminOrderDetailsWrapper> {
  final ApiService _apiService = ApiService();
  late Future<Order> _orderFuture;

  @override
  void initState() {
    super.initState();
    _orderFuture = _apiService.fetchOrderById(widget.orderId);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Order>(
      future: _orderFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        } else if (snapshot.hasError) {
          return Scaffold(
            appBar: AppBar(title: const Text('Error')),
            body: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 16),
                  Text('Failed to load order: ${snapshot.error}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      setState(() {
                        _orderFuture = _apiService.fetchOrderById(widget.orderId);
                      });
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          );
        } else if (!snapshot.hasData) {
          return const Scaffold(
            body: Center(child: Text('Order not found')),
          );
        }

        return AdminOrderDetailsScreen(order: snapshot.data!);
      },
    );
  }
}
