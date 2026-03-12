class Order {
  final String? id;
  final List<OrderItem> products;
  final int? orderNumber;
  final double totalAmount;
  final String customerName;
  final String customerPhone;
  final String customerAddress;
  final String? couponCode;
  final double discountAmount;
  final String paymentMethod;
  final String shippingZone;
  final double shippingCost;
  final String status;
  final String? consignmentId;
  final String? pathaoStatus;
  final DateTime? createdAt;

  Order({
    this.id,
    required this.products,
    this.orderNumber,
    required this.totalAmount,
    required this.customerName,
    required this.customerPhone,
    required this.customerAddress,
    this.couponCode,
    this.discountAmount = 0,
    this.paymentMethod = 'cod',
    this.shippingZone = 'dhaka',
    this.shippingCost = 60,
    this.status = 'pending',
    this.consignmentId,
    this.pathaoStatus,
    this.createdAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['_id'],
      orderNumber: json['orderNumber'],
      products:
          (json['products'] as List?)
              ?.map((p) => OrderItem.fromJson(p))
              .toList() ??
          [],
      totalAmount: (json['totalAmount'] ?? 0).toDouble(),
      customerName: json['customerName'] ?? '',
      customerPhone: json['customerPhone'] ?? '',
      customerAddress: json['customerAddress'] ?? '',
      couponCode: json['couponCode'],
      discountAmount: (json['discountAmount'] ?? 0).toDouble(),
      paymentMethod: json['paymentMethod'] ?? 'cod',
      shippingZone: json['shippingZone'] ?? 'dhaka',
      shippingCost: (json['shippingCost'] ?? 0).toDouble(),
      status: json['status'] ?? 'pending',
      consignmentId: json['consignmentId'],
      pathaoStatus: json['pathaoStatus'],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'products': products.map((x) => x.toJson()).toList(),
      'customerName': customerName,
      'customerPhone': customerPhone,
      'customerAddress': customerAddress,
      'couponCode': couponCode,
      'discountAmount': discountAmount,
      'paymentMethod': paymentMethod,
      'shippingZone': shippingZone,
      'shippingCost': shippingCost,
      'consignmentId': consignmentId,
      'pathaoStatus': pathaoStatus,
    };
  }
}

class OrderItem {
  final String productId;
  final String? name;
  final double? price;
  final int quantity;

  OrderItem({
    required this.productId,
    this.name,
    this.price,
    required this.quantity,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      productId: json['productId'] ?? '',
      name: json['name'],
      price: (json['price'] ?? 0).toDouble(),
      quantity: json['quantity'] ?? 1,
    );
  }

  Map<String, dynamic> toJson() {
    return {'productId': productId, 'quantity': quantity};
  }
}
