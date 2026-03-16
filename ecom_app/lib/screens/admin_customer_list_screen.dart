import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../widgets/admin_drawer.dart';
import 'package:intl/intl.dart';

class AdminCustomerListScreen extends StatefulWidget {
  const AdminCustomerListScreen({super.key});

  @override
  State<AdminCustomerListScreen> createState() =>
      _AdminCustomerListScreenState();
}

class _AdminCustomerListScreenState extends State<AdminCustomerListScreen> {
  final ApiService _apiService = ApiService();
  List<Map<String, dynamic>> _customers = [];
  bool _isLoading = true;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadCustomers();
  }

  Future<void> _loadCustomers() async {
    setState(() => _isLoading = true);
    try {
      final orders = await _apiService.fetchAllOrdersList();

      // Aggregate customers from orders
      final Map<String, Map<String, dynamic>> customerMap = {};

      for (var order in orders) {
        final phone = order['customerPhone'] ?? 'Unknown';
        if (!customerMap.containsKey(phone)) {
          customerMap[phone] = {
            'name': order['customerName'] ?? 'Unknown',
            'phone': phone,
            'address': order['customerAddress'] ?? 'No Address',
            'orderCount': 0,
            'totalSpent': 0.0,
            'lastOrder': order['createdAt'],
          };
        }

        customerMap[phone]!['orderCount']++;
        customerMap[phone]!['totalSpent'] += (order['totalAmount'] ?? 0)
            .toDouble();

        DateTime currentLastOrder = DateTime.parse(
          customerMap[phone]!['lastOrder'],
        );
        DateTime orderDate = DateTime.parse(order['createdAt']);
        if (orderDate.isAfter(currentLastOrder)) {
          customerMap[phone]!['lastOrder'] = order['createdAt'];
        }
      }

      setState(() {
        _customers = customerMap.values.toList();
        _customers.sort((a, b) => b['totalSpent'].compareTo(a['totalSpent']));
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error loading customers: $e')));
      }
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredCustomers = _customers.where((c) {
      final name = c['name'].toLowerCase();
      final phone = c['phone'].toLowerCase();
      final query = _searchQuery.toLowerCase();
      return name.contains(query) || phone.contains(query);
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFF0F111A),
      appBar: AppBar(
        title: const Text(
          'Customers',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        backgroundColor: const Color(0xFF161925),
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      drawer: const AdminDrawer(),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              onChanged: (value) => setState(() => _searchQuery = value),
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Search by name or phone...',
                hintStyle: const TextStyle(color: Colors.white54),
                prefixIcon: const Icon(Icons.search, color: Colors.white54),
                filled: true,
                fillColor: const Color(0xFF1C1F2E),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: Color(0xFFFF6B2C)),
                  )
                : filteredCustomers.isEmpty
                ? const Center(
                    child: Text(
                      'No customers found',
                      style: TextStyle(color: Colors.white54),
                    ),
                  )
                : ListView.builder(
                    itemCount: filteredCustomers.length,
                    itemBuilder: (context, index) {
                      final customer = filteredCustomers[index];
                      final lastOrderDate = DateTime.parse(
                        customer['lastOrder'],
                      );

                      return Container(
                        margin: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFF161925),
                          borderRadius: BorderRadius.circular(15),
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.05),
                          ),
                        ),
                        child: ListTile(
                          contentPadding: const EdgeInsets.all(16),
                          leading: CircleAvatar(
                            backgroundColor: const Color(
                              0xFFFF6B2C,
                            ).withValues(alpha: 0.1),
                            child: Text(
                              customer['name'][0].toUpperCase(),
                              style: const TextStyle(
                                color: Color(0xFFFF6B2C),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          title: Text(
                            customer['name'],
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 4),
                              Text(
                                customer['phone'],
                                style: const TextStyle(
                                  color: Colors.white70,
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                customer['address'],
                                style: const TextStyle(
                                  color: Colors.white54,
                                  fontSize: 12,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                '৳${customer['totalSpent'].toStringAsFixed(0)}',
                                style: const TextStyle(
                                  color: Color(0xFFFF6B2C),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              Text(
                                '${customer['orderCount']} Orders',
                                style: const TextStyle(
                                  color: Colors.white54,
                                  fontSize: 11,
                                ),
                              ),
                              Text(
                                DateFormat('MMM d, y').format(lastOrderDate),
                                style: const TextStyle(
                                  color: Colors.white38,
                                  fontSize: 10,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
