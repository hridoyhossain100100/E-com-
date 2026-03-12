class Coupon {
  final String id;
  final String code;
  final int discountPercent;
  final int maxDiscount;
  final int usageLimit;
  final int usedCount;
  final DateTime? expiresAt;
  final bool isActive;

  Coupon({
    required this.id,
    required this.code,
    required this.discountPercent,
    required this.maxDiscount,
    required this.usageLimit,
    required this.usedCount,
    this.expiresAt,
    required this.isActive,
  });

  factory Coupon.fromJson(Map<String, dynamic> json) {
    return Coupon(
      id: json['_id'] ?? '',
      code: json['code'] ?? '',
      discountPercent: json['discountPercent'] ?? 0,
      maxDiscount: json['maxDiscount'] ?? 0,
      usageLimit: json['usageLimit'] ?? 0,
      usedCount: json['usedCount'] ?? 0,
      expiresAt: json['expiresAt'] != null
          ? DateTime.parse(json['expiresAt'])
          : null,
      isActive: json['isActive'] ?? true,
    );
  }
}
