class DashboardStats {
  final int totalOrders;
  final double totalRevenue;
  final int totalProducts;
  final int totalCoupons;
  final int liveVisitors;

  DashboardStats({
    required this.totalOrders,
    required this.totalRevenue,
    required this.totalProducts,
    required this.totalCoupons,
    required this.liveVisitors,
  });

  factory DashboardStats.fromJson(
    Map<String, dynamic> json,
    int visitors, {
    int couponsCount = 0,
  }) {
    return DashboardStats(
      totalOrders: json['totalOrders'] ?? 0,
      totalRevenue: (json['totalRevenue'] ?? 0).toDouble(),
      totalProducts: json['totalProducts'] ?? 0,
      totalCoupons: couponsCount,
      liveVisitors: visitors,
    );
  }
}

class DailyRevenue {
  final String date;
  final double revenue;
  final int orders;

  DailyRevenue({
    required this.date,
    required this.revenue,
    required this.orders,
  });

  factory DailyRevenue.fromJson(Map<String, dynamic> json) {
    return DailyRevenue(
      date: json['date'] ?? '',
      revenue: (json['revenue'] ?? 0).toDouble(),
      orders: json['orders'] ?? 0,
    );
  }
}
