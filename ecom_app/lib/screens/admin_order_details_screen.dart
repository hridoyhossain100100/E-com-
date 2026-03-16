import 'package:flutter/material.dart';

import 'package:url_launcher/url_launcher.dart';
import '../models/order.dart';
import '../services/api_service.dart';

class AdminOrderDetailsScreen extends StatefulWidget {
  final Order order;

  const AdminOrderDetailsScreen({super.key, required this.order});

  @override
  State<AdminOrderDetailsScreen> createState() => _AdminOrderDetailsScreenState();
}

class _AdminOrderDetailsScreenState extends State<AdminOrderDetailsScreen> {
  final ApiService _apiService = ApiService();
  late Order _currentOrder;
  bool _isUpdating = false;
  final List<String> _statuses = [
    'incomplete',
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'returned',
  ];

  @override
  void initState() {
    super.initState();
    _currentOrder = widget.order;
  }

  Future<void> _updateStatus(String newStatus) async {
    setState(() => _isUpdating = true);
    try {
      await _apiService.updateOrderStatus(_currentOrder.id!, newStatus);
      setState(() {
        _currentOrder = Order(
          id: _currentOrder.id,
          products: _currentOrder.products,
          orderNumber: _currentOrder.orderNumber,
          totalAmount: _currentOrder.totalAmount,
          customerName: _currentOrder.customerName,
          customerPhone: _currentOrder.customerPhone,
          customerAddress: _currentOrder.customerAddress,
          couponCode: _currentOrder.couponCode,
          discountAmount: _currentOrder.discountAmount,
          paymentMethod: _currentOrder.paymentMethod,
          shippingZone: _currentOrder.shippingZone,
          shippingCost: _currentOrder.shippingCost,
          status: newStatus,
          consignmentId: _currentOrder.consignmentId,
          pathaoStatus: _currentOrder.pathaoStatus,
          createdAt: _currentOrder.createdAt,
        );
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Order status updated successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error updating status: $e')),
        );
      }
    } finally {
      setState(() => _isUpdating = false);
    }
  }

  Future<void> _sendToPathao() async {
    final nameController = TextEditingController(text: _currentOrder.customerName);
    final phoneController = TextEditingController(text: _currentOrder.customerPhone);
    final addressController = TextEditingController(text: _currentOrder.customerAddress);
    final weightController = TextEditingController(text: '0.5');
    final instructionController = TextEditingController();

    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Send to Pathao'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Recipient Name'),
              ),
              TextField(
                controller: phoneController,
                decoration: const InputDecoration(labelText: 'Recipient Phone'),
                keyboardType: TextInputType.phone,
              ),
              TextField(
                controller: addressController,
                decoration: const InputDecoration(labelText: 'Recipient Address'),
                maxLines: 2,
              ),
              const SizedBox(height: 8),
              const Divider(),
              const SizedBox(height: 8),
              TextField(
                controller: weightController,
                decoration: const InputDecoration(
                  labelText: 'Item Weight (kg)',
                  hintText: 'e.g. 0.5',
                ),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: instructionController,
                decoration: const InputDecoration(
                  labelText: 'Special Instruction',
                  hintText: 'e.g. Handle with care',
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              if (addressController.text.length < 10) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Address must be at least 10 characters for Pathao')),
                );
                return;
              }
              Navigator.pop(context, {
                'recipientName': nameController.text,
                'recipientPhone': phoneController.text,
                'recipientAddress': addressController.text,
                'itemWeight': double.tryParse(weightController.text) ?? 0.5,
                'specialInstruction': instructionController.text,
                'deliveryType': 48, // Normal
                'itemQuantity': _currentOrder.products.length,
                'itemDescription': _currentOrder.products.map((p) => p.name ?? 'Item').join(', '),
                'amountToCollect': _currentOrder.totalAmount,
              });
            },
            child: const Text('Send'),
          ),
        ],
      ),
    );

    if (result != null) {
      setState(() => _isUpdating = true);
      try {
        final response = await _apiService.sendToPathao(_currentOrder.id!, result);
        if (response['success'] == true) {
          // Re-fetch or update local state
          setState(() {
            _currentOrder = Order(
              id: _currentOrder.id,
              products: _currentOrder.products,
              orderNumber: _currentOrder.orderNumber,
              totalAmount: _currentOrder.totalAmount,
              customerName: _currentOrder.customerName,
              customerPhone: _currentOrder.customerPhone,
              customerAddress: _currentOrder.customerAddress,
              couponCode: _currentOrder.couponCode,
              discountAmount: _currentOrder.discountAmount,
              paymentMethod: _currentOrder.paymentMethod,
              shippingZone: _currentOrder.shippingZone,
              shippingCost: response['deliveryFee']?.toDouble() ?? _currentOrder.shippingCost,
              status: 'confirmed',
              consignmentId: response['consignmentId'],
              pathaoStatus: 'Pickup_Pending',
              createdAt: _currentOrder.createdAt,
            );
          });
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Sent to Pathao successfully')),
            );
          }
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Pathao error: $e')),
          );
        }
      } finally {
        setState(() => _isUpdating = false);
      }
    }
  }

  Future<void> _launchTracking() async {
    if (_currentOrder.consignmentId == null) return;
    final url = Uri.parse(
        'https://merchant.pathao.com/tracking?consignment_id=${_currentOrder.consignmentId}&phone=${_currentOrder.customerPhone}');
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
    final accentColor = const Color(0xFF6D28D9);

    return Scaffold(
      appBar: AppBar(
        title: Text('Order #${_currentOrder.orderNumber}'),
        actions: [
          if (_isUpdating)
            const Center(
              child: Padding(
                padding: EdgeInsets.only(right: 16.0),
                child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
              ),
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStatusSection(isDarkMode, accentColor),
            const SizedBox(height: 20),
            _buildCustomerSection(isDarkMode),
            const SizedBox(height: 20),
            _buildOrderItemsSection(isDarkMode),
            const SizedBox(height: 20),
            _buildSummarySection(isDarkMode, accentColor),
            const SizedBox(height: 30),
            _buildOMSSection(isDarkMode),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusSection(bool isDarkMode, Color accentColor) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Order Status', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _statuses.contains(_currentOrder.status.toLowerCase()) 
                      ? _currentOrder.status.toLowerCase() 
                      : 'pending',
                  isExpanded: true,
                  items: _statuses.map((s) => DropdownMenuItem(
                    value: s,
                    child: Text(s.toUpperCase(), style: const TextStyle(fontSize: 14)),
                  )).toList(),
                  onChanged: _isUpdating ? null : (val) => _updateStatus(val!),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCustomerSection(bool isDarkMode) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Customer Information', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const Divider(height: 24),
            _buildInfoRow(Icons.person, 'Name', _currentOrder.customerName),
            const SizedBox(height: 12),
            _buildInfoRow(Icons.phone, 'Phone', _currentOrder.customerPhone),
            const SizedBox(height: 12),
            _buildInfoRow(Icons.location_on, 'Address', _currentOrder.customerAddress),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: Colors.grey),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
              Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildOrderItemsSection(bool isDarkMode) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Order Items', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const Divider(height: 24),
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _currentOrder.products.length,
              separatorBuilder: (ctx, idx) => const Divider(),
              itemBuilder: (ctx, idx) {
                final item = _currentOrder.products[idx];
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4.0),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.grey.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.shopping_bag_outlined, color: Colors.grey),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(item.name ?? 'Product ${idx + 1}', style: const TextStyle(fontWeight: FontWeight.bold)),
                            Text('Qty: ${item.quantity}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                          ],
                        ),
                      ),
                      Text('৳${(item.price ?? 0).toInt() * item.quantity}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummarySection(bool isDarkMode, Color accentColor) {
    final subtotal = _currentOrder.products.fold(0.0, (sum, item) => sum + (item.price ?? 0) * item.quantity);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            _buildSummaryRow('Subtotal', '৳${subtotal.toInt()}'),
            const SizedBox(height: 8),
            _buildSummaryRow('Shipping Fee', '৳${_currentOrder.shippingCost.toInt()}'),
            if (_currentOrder.discountAmount > 0) ...[
              const SizedBox(height: 8),
              _buildSummaryRow('Discount (${_currentOrder.couponCode ?? ''})', '-৳${_currentOrder.discountAmount.toInt()}', isDiscount: true),
            ],
            const Divider(height: 24),
            _buildSummaryRow('Total', '৳${_currentOrder.totalAmount.toInt()}', isTotal: true, accentColor: accentColor),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool isTotal = false, bool isDiscount = false, Color? accentColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(
          fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
          fontSize: isTotal ? 18 : 14,
          color: isDiscount ? Colors.green : null,
        )),
        Text(value, style: TextStyle(
          fontWeight: isTotal ? FontWeight.bold : FontWeight.normal,
          fontSize: isTotal ? 22 : 14,
          color: isTotal ? accentColor : (isDiscount ? Colors.green : null),
        )),
      ],
    );
  }

  Widget _buildOMSSection(bool isDarkMode) {
    if (_currentOrder.consignmentId != null) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.orange.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.orange.withValues(alpha: 0.2)),
        ),
        child: Column(
          children: [
            Row(
              children: [
                Image.network(
                  'https://merchant.pathao.com/images/logo.png',
                  height: 24,
                  errorBuilder: (ctx, err, stack) => const Icon(Icons.delivery_dining, color: Colors.orange),
                ),
                const SizedBox(width: 12),
                const Text('Pathao Logistics', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.orange)),
                const Spacer(),
                _buildStatusBadge(_currentOrder.pathaoStatus ?? 'Pending'),
              ],
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Consignment ID', style: TextStyle(color: Colors.grey, fontSize: 12)),
                    Text(_currentOrder.consignmentId!, style: const TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
                ElevatedButton.icon(
                  onPressed: _launchTracking,
                  icon: const Icon(Icons.track_changes),
                  label: const Text('Track Order'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.orange,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    }

    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: _isUpdating ? null : _sendToPathao,
        icon: const Icon(Icons.local_shipping),
        label: const Text('Send to Pathao OMS'),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFFFF6B2C),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 0,
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.orange.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        status.replaceAll('_', ' ').toUpperCase(),
        style: const TextStyle(color: Colors.orange, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }
}