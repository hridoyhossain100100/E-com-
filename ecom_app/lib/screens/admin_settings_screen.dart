import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../widgets/admin_drawer.dart';

class AdminSettingsScreen extends StatefulWidget {
  const AdminSettingsScreen({super.key});

  @override
  State<AdminSettingsScreen> createState() => _AdminSettingsScreenState();
}

class _AdminSettingsScreenState extends State<AdminSettingsScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  bool _isSaving = false;

  // Settings Sections
  Map<String, dynamic> _branding = {};
  Map<String, dynamic> _contact = {};
  Map<String, dynamic> _seo = {};
  Map<String, dynamic> _appearance = {};

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    setState(() => _isLoading = true);
    try {
      final settings = await _apiService.fetchSettings();
      setState(() {
        _branding = settings['storeBranding'] ?? {};
        _contact = settings['contactInfo'] ?? {};
        _seo = settings['seo'] ?? {};
        _appearance = settings['appearance'] ?? {};
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error loading settings: $e')));
      }
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveSetting(String key, dynamic value) async {
    setState(() => _isSaving = true);
    try {
      await _apiService.updateSetting(key, value);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Settings saved successfully!'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error saving settings: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F111A),
      appBar: AppBar(
        title: const Text(
          'Store Settings',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        backgroundColor: const Color(0xFF161925),
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          if (_isSaving)
            const Center(
              child: Padding(
                padding: EdgeInsets.only(right: 16.0),
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Color(0xFFFF6B2C),
                  ),
                ),
              ),
            ),
        ],
      ),
      drawer: const AdminDrawer(),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFFFF6B2C)),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _buildSection(
                    title: 'Store Branding',
                    icon: Icons.store,
                    color: Colors.deepPurple,
                    children: [
                      _buildTextField(
                        'Store Name',
                        _branding['storeName'] ?? '',
                        (val) => _branding['storeName'] = val,
                      ),
                      _buildTextField(
                        'Store Tagline',
                        _branding['storeTagline'] ?? '',
                        (val) => _branding['storeTagline'] = val,
                      ),
                      _buildTextField(
                        'Logo URL',
                        _branding['logoUrl'] ?? '',
                        (val) => _branding['logoUrl'] = val,
                      ),
                      _buildTextField(
                        'Favicon URL',
                        _branding['faviconUrl'] ?? '',
                        (val) => _branding['faviconUrl'] = val,
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: () =>
                            _saveSetting('storeBranding', _branding),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFF6B2C),
                        ),
                        child: const Text(
                          'Save Branding',
                          style: TextStyle(color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  _buildSection(
                    title: 'Contact Information',
                    icon: Icons.contact_phone,
                    color: Colors.teal,
                    children: [
                      _buildTextField(
                        'Phone Number',
                        _contact['phone'] ?? '',
                        (val) => _contact['phone'] = val,
                      ),
                      _buildTextField(
                        'Email',
                        _contact['email'] ?? '',
                        (val) => _contact['email'] = val,
                      ),
                      _buildTextField(
                        'Address',
                        _contact['address'] ?? '',
                        (val) => _contact['address'] = val,
                        maxLines: 2,
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: () => _saveSetting('contactInfo', _contact),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFF6B2C),
                        ),
                        child: const Text(
                          'Save Contact Info',
                          style: TextStyle(color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  _buildSection(
                    title: 'SEO Settings',
                    icon: Icons.public,
                    color: Colors.blue,
                    children: [
                      _buildTextField(
                        'Site Title',
                        _seo['siteTitle'] ?? '',
                        (val) => _seo['siteTitle'] = val,
                      ),
                      _buildTextField(
                        'Site URL',
                        _seo['siteUrl'] ?? '',
                        (val) => _seo['siteUrl'] = val,
                      ),
                      _buildTextField(
                        'Keywords',
                        _seo['keywords'] ?? '',
                        (val) => _seo['keywords'] = val,
                      ),
                      _buildTextField(
                        'Meta Description',
                        _seo['metaDescription'] ?? '',
                        (val) => _seo['metaDescription'] = val,
                        maxLines: 3,
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: () => _saveSetting('seo', _seo),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFF6B2C),
                        ),
                        child: const Text(
                          'Save SEO',
                          style: TextStyle(color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  _buildSection(
                    title: 'Appearance',
                    icon: Icons.palette,
                    color: Colors.orange,
                    children: [
                      _buildTextField(
                        'Products Per Row',
                        _appearance['productsPerRow']?.toString() ?? '4',
                        (val) => _appearance['productsPerRow'] =
                            int.tryParse(val) ?? 4,
                      ),
                      _buildTextField(
                        'Default Theme',
                        _appearance['defaultTheme'] ?? 'dark',
                        (val) => _appearance['defaultTheme'] = val,
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: () =>
                            _saveSetting('appearance', _appearance),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFF6B2C),
                        ),
                        child: const Text(
                          'Save Appearance',
                          style: TextStyle(color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildSection({
    required String title,
    required IconData icon,
    required Color color,
    required List<Widget> children,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF161925),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          ...children,
        ],
      ),
    );
  }

  Widget _buildTextField(
    String label,
    String initialValue,
    Function(String) onChanged, {
    int maxLines = 1,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Colors.white54,
              fontSize: 13,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          TextFormField(
            initialValue: initialValue,
            onChanged: onChanged,
            maxLines: maxLines,
            style: const TextStyle(color: Colors.white, fontSize: 14),
            decoration: InputDecoration(
              filled: true,
              fillColor: const Color(0xFF1C1F2E),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 12,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
