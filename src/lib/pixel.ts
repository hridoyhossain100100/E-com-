interface WindowWithFbq extends Window {
    fbq?: (...args: unknown[]) => void;
}

export const fbq = (...args: unknown[]) => {
    if (typeof window !== 'undefined' && (window as WindowWithFbq).fbq) {
        (window as WindowWithFbq).fbq!(...args);
    }
};

// Event: ViewContent (When a user views a product page)
export const trackViewContent = (product: { id: string; name: string; price: number; category: string }) => {
    fbq('track', 'ViewContent', {
        content_ids: [product.id],
        content_name: product.name,
        content_type: 'product',
        content_category: product.category,
        value: product.price,
        currency: 'BDT' // Change to match your store's currency if needed
    });
};

// Event: AddToCart (When a user clicks "Add to Cart" or "Proceed to Checkout")
export const trackAddToCart = (product: { id: string; name: string; price: number; category: string }) => {
    fbq('track', 'AddToCart', {
        content_ids: [product.id],
        content_name: product.name,
        content_type: 'product',
        content_category: product.category,
        value: product.price,
        currency: 'BDT'
    });
};

// Event: InitiateCheckout (When a user lands on the Checkout page)
export const trackInitiateCheckout = (cartTotal: number, numItems: number) => {
    fbq('track', 'InitiateCheckout', {
        value: cartTotal,
        currency: 'BDT',
        num_items: numItems
    });
};

// Event: Purchase (When an order is successfully confirmed)
export const trackPurchase = (orderId: string, totalValue: number) => {
    fbq('track', 'Purchase', {
        value: totalValue,
        currency: 'BDT',
        order_id: orderId
    });
};
