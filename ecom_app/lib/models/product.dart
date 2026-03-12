class Product {
  final String id;
  final String name;
  final double price;
  final String description;
  final List<String> imageUrls;
  final String category;
  final int stock;
  final List<ProductVariant> variants;

  Product({
    required this.id,
    required this.name,
    required this.price,
    required this.description,
    required this.imageUrls,
    required this.category,
    required this.stock,
    required this.variants,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['_id'] ?? '',
      name: json['name'] ?? '',
      price: (json['price'] ?? 0).toDouble(),
      description: json['description'] ?? '',
      imageUrls: List<String>.from(json['imageUrls'] ?? []),
      category: json['category'] ?? 'General',
      stock: json['stock'] ?? 0,
      variants: (json['variants'] as List? ?? [])
          .map((v) => ProductVariant.fromJson(v))
          .toList(),
    );
  }
}

class ProductVariant {
  final String id;
  final String label;
  final String size;
  final String color;
  final int stock;
  final double priceAdjust;

  ProductVariant({
    required this.id,
    required this.label,
    required this.size,
    required this.color,
    required this.stock,
    required this.priceAdjust,
  });

  factory ProductVariant.fromJson(Map<String, dynamic> json) {
    return ProductVariant(
      id: json['_id'] ?? '',
      label: json['label'] ?? '',
      size: json['size'] ?? '',
      color: json['color'] ?? '',
      stock: json['stock'] ?? 0,
      priceAdjust: (json['priceAdjust'] ?? 0).toDouble(),
    );
  }
}
