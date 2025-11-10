export interface Config {
  targetAmount: number; // Target amount in rupees (e.g., 1000, 1500, 5000)
  availableDenominations: number[]; // Available denominations (e.g., [250, 500, 1000, 1500, 5000, 10000])
  userDetails: {
    mobile: string;
    email: string;
  };
  cardDetails: {
    last4Digits: string; // Last 4 digits of the card to select
    cardName?: string; // Optional card nickname for logging
  };
}

export interface VoucherCombination {
  denomination: number;
  quantity: number;
}

export interface CartResult {
  success: boolean;
  totalAmount: number;
  vouchers: VoucherCombination[];
  error?: string;
}

export interface LoginResult {
  success: boolean;
  error?: string;
}

export interface PaymentResult {
  success: boolean;
  error?: string;
}

export interface AutomationResult {
  success: boolean;
  message: string;
  details?: {
    cartTotal?: number;
    vouchers?: VoucherCombination[];
  };
  error?: string;
}
