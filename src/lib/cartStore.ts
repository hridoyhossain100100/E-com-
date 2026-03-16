import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartItem {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl: string;
}

interface CartState {
    items: CartItem[];
    addItem: (item: Omit<CartItem, "quantity">) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    totalItems: number;
    totalPrice: number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set) => ({
            items: [],
            totalItems: 0,
            totalPrice: 0,

            addItem: (newItem) => {
                set((state) => {
                    const existingItemIndex = state.items.findIndex(
                        (i) => i.productId === newItem.productId
                    );

                    let newItems;
                    if (existingItemIndex > -1) {
                        newItems = [...state.items];
                        newItems[existingItemIndex].quantity += 1;
                    } else {
                        newItems = [...state.items, { ...newItem, quantity: 1 }];
                    }

                    return {
                        items: newItems,
                        totalItems: newItems.reduce((acc, item) => acc + item.quantity, 0),
                        totalPrice: newItems.reduce((acc, item) => acc + item.price * item.quantity, 0),
                    };
                });
            },

            removeItem: (productId) => {
                set((state) => {
                    const newItems = state.items.filter((i) => i.productId !== productId);
                    return {
                        items: newItems,
                        totalItems: newItems.reduce((acc, item) => acc + item.quantity, 0),
                        totalPrice: newItems.reduce((acc, item) => acc + item.price * item.quantity, 0),
                    };
                });
            },

            updateQuantity: (productId, quantity) => {
                set((state) => {
                    if (quantity <= 0) {
                        const newItems = state.items.filter((i) => i.productId !== productId);
                        return {
                            items: newItems,
                            totalItems: newItems.reduce((acc, item) => acc + item.quantity, 0),
                            totalPrice: newItems.reduce((acc, item) => acc + item.price * item.quantity, 0),
                        };
                    }

                    const newItems = state.items.map((i) =>
                        i.productId === productId ? { ...i, quantity } : i
                    );

                    return {
                        items: newItems,
                        totalItems: newItems.reduce((acc, item) => acc + item.quantity, 0),
                        totalPrice: newItems.reduce((acc, item) => acc + item.price * item.quantity, 0),
                    };
                });
            },

            clearCart: () => {
                set({ items: [], totalItems: 0, totalPrice: 0 });
            },
        }),
        {
            name: "cart-storage", // name of the item in the storage (must be unique)
            storage: createJSONStorage(() => localStorage),
        }
    )
);
