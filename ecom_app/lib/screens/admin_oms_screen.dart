import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/order.dart';
import '../services/api_service.dart';
import 'admin_order_details_screen.dart';

class AdminOmsScreen extends StatefulWidget {
  const AdminOmsScreen({super.key});

  @override
  State<AdminOmsScreen> createState() => _AdminOmsScreenState();
}

class _AdminOmsScreenState extends State<AdminOmsScreen> with SingleTickerProviderStateMixin {
  final ApiService _apiService = ApiService();
  late TabController _tabController;
  List<Order> _allOrders = [];
  bool _isLoading = true;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadOmsOrders();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadOmsOrders() async {
    setState(() => _isLoading = true);
    try {
      final orders = await _apiService.fetchAllOrders();
      setState(() {
        _allOrders = orders;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading OMS orders: $e')),
        );
      }
      setState(() => _isLoading = false);
    }
  }

  List<Order> _getFilteredOrders(int tabIndex) {
    List<Order> filtered = _allOrders;

    // Filter by tab
    if (tabIndex == 1) {
      filtered = filtered.where((o) => o.consignmentId == null).toList();
    } else if (tabIndex == 2) {
      filtered = filtered.where((o) => o.consignmentId != null).toList();
    }

    // Filter by search
    if (_searchQuery.isNotEmpty) {
      filtered = filtered.where((o) =>
          o.orderNumber.toString().contains(_searchQuery) ||
          o.customerName.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          o.customerPhone.contains(_searchQuery)).toList();
    }

    return filtered;
  }

  Future<void> _launchTracking(String consignmentId, String phone) async {
    final url = Uri.parse(
        'https://merchant.pathao.com/tracking?consignment_id=$consignmentId&phone=$phone');
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not launch tracking URL')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final primaryColor = const Color(0xFF6D28D9);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Order Management System', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadOmsOrders,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(110),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: TextField(
                  onChanged: (val) => setState(() => _searchQuery = val),
                  decoration: InputDecoration(
                    hintText: 'Search by Order ID or Name...',
                    prefixIcon: const Icon(Icons.search),
                    filled: true,
                    fillColor: isDarkMode ? Colors.white10 : Colors.grey.shade100,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),
              TabBar(
                controller: _tabController,
                indicatorColor: primaryColor,
                labelColor: primaryColor,
                unselectedLabelColor: Colors.grey,
                tabs: const [
                  Tab(text: 'All'),
                  Tab(text: 'Pending OMS'),
                  Tab(text: 'In Transit'),
                ],
              ),
            ],
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildOrderList(0, isDarkMode, primaryColor),
                _buildOrderList(1, isDarkMode, primaryColor),
                _buildOrderList(2, isDarkMode, primaryColor),
              ],
            ),
    );
  }

  Widget _buildOrderList(int tabIndex, bool isDarkMode, Color primaryColor) {
    final orders = _getFilteredOrders(tabIndex);

    if (orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text('No orders found', style: TextStyle(color: Colors.grey.shade500)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadOmsOrders,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: orders.length,
        itemBuilder: (context, index) {
          final order = orders[index];
          return _buildOrderCard(order, isDarkMode, primaryColor);
        },
      ),
    );
  }

  Widget _buildOrderCard(Order order, bool isDarkMode, Color primaryColor) {
    final hasConsignment = order.consignmentId != null;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: InkWell(
        onTap: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => AdminOrderDetailsScreen(order: order),
            ),
          );
          _loadOmsOrders();
        },
        borderRadius: BorderRadius.circular(16),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '#${order.orderNumber}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                          ),
                          Text(
                            order.createdAt != null
                                ? DateFormat('dd MMM, hh:mm a').format(order.createdAt!)
                                : '',
                            style: const TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                        ],
                      ),
                      _buildStatusBadge(order.status),
                    ],
                  ),
                  const Divider(height: 24),
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 18,
                        backgroundColor: primaryColor.withValues(alpha: 0.1),
                        child: Text(
                          order.customerName.isNotEmpty ? order.customerName[0].toUpperCase() : '?',
                          style: TextStyle(color: primaryColor, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(order.customerName, style: const TextStyle(fontWeight: FontWeight.w500)),
                            Text(order.customerPhone, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                          ],
                        ),
                      ),
                      Text(
                        '৳${order.totalAmount.toInt()}',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: primaryColor),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (hasConsignment)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.withValues(alpha: 0.05),
                  border: Border(top: BorderSide(color: Colors.grey.withValues(alpha: 0.1))),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.local_shipping, size: 18, color: Colors.blue),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('PATHAO: ${order.consignmentId}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                          Text('STATUS: ${order.pathaoStatus ?? 'Unknown'}', style: TextStyle(fontSize: 10, color: Colors.grey.shade600)),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: () => _launchTracking(order.consignmentId!, order.customerPhone),
                      style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                      child: const Text('TRACK', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              )
            else
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  border: Border(top: BorderSide(color: Colors.grey.withValues(alpha: 0.1))),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, size: 16, color: Colors.orange),
                    const SizedBox(width: 8),
                    const Text('Not sent to logistics yet', style: TextStyle(fontSize: 12, color: Colors.orange)),
                    const Spacer(),
                    TextButton.icon(
                      onPressed: () async {
                        await Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => AdminOrderDetailsScreen(order: order),
                          ),
                        );
                        _loadOmsOrders();
                      },
                      icon: const Icon(Icons.send_rounded, size: 14),
                      label: const Text('PROCESS', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFFFF6B2C),
                        visualDensity: VisualDensity.compact,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    switch (status.toLowerCase()) {
      case 'delivered': color = Colors.green; break;
      case 'pending': color = Colors.orange; break;
      case 'shipped': color = Colors.purple; break;
      case 'confirmed': color = Colors.blue; break;
      case 'cancelled': color = Colors.red; break;
      default: color = Colors.grey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }
}
