import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AdminDrawer extends StatelessWidget {
  const AdminDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final apiService = ApiService();
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return Drawer(
      backgroundColor: isDarkMode ? const Color(0xFF11111E) : Colors.white,
      child: Column(
        children: [
          _buildHeader(context),
          Expanded(
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                _buildDrawerItem(
                  context,
                  icon: Icons.dashboard_outlined,
                  label: 'Dashboard',
                  route: '/dashboard',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.shopping_basket_outlined,
                  label: 'Orders',
                  route: '/order-list',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.local_shipping_outlined,
                  label: 'OMS Management',
                  route: '/oms',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.inventory_2_outlined,
                  label: 'Products',
                  route: '/product-list',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.local_offer_outlined,
                  label: 'Coupons',
                  route: '/coupon-list',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.star_outline,
                  label: 'Reviews',
                  route: '/review-list',
                ),
                const Divider(indent: 20, endIndent: 20),
                _buildDrawerItem(
                  context,
                  icon: Icons.people_outline,
                  label: 'Customers',
                  route: '/customer-list',
                ),
                _buildDrawerItem(
                  context,
                  icon: Icons.settings_outlined,
                  label: 'Settings',
                  route: '/settings',
                ),
                const Divider(color: Colors.white24, height: 32),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: OutlinedButton.icon(
              onPressed: () async {
                await apiService.logout();
                Navigator.of(context).pushReplacementNamed('/login');
              },
              icon: const Icon(Icons.logout, color: Colors.red),
              label: const Text('Logout', style: TextStyle(color: Colors.red)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Colors.red),
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 60, 20, 30),
      decoration: const BoxDecoration(color: Color(0xFF6D28D9)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const CircleAvatar(
            radius: 30,
            backgroundColor: Colors.white,
            child: Icon(Icons.person, size: 30, color: Color(0xFF6D28D9)),
          ),
          const SizedBox(height: 16),
          const Text(
            'Larkon Admin',
            style: TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            'Administrator',
            style: TextStyle(
              color: Colors.white.withOpacity(0.7),
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawerItem(
    BuildContext context, {
    required IconData icon,
    required String label,
    required String route,
  }) {
    final currentRoute = ModalRoute.of(context)?.settings.name;
    final isSelected = currentRoute == route;

    return ListTile(
      leading: Icon(
        icon,
        color: isSelected ? const Color(0xFF6D28D9) : Colors.grey,
      ),
      title: Text(
        label,
        style: TextStyle(
          color: isSelected ? const Color(0xFF6D28D9) : null,
          fontWeight: isSelected ? FontWeight.bold : null,
        ),
      ),
      onTap: () {
        Navigator.pop(context); // Close drawer
        if (!isSelected) {
          Navigator.pushNamed(context, route);
        }
      },
      selected: isSelected,
      selectedTileColor: const Color(0xFF6D28D9).withOpacity(0.05),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 20),
    );
  }
}
