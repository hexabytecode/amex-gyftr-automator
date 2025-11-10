# Implementation Plan - Gyftr Amex Automator

## Website Flow (Confirmed)

### 1. Product Page: Add to Cart
URL: `https://www.gyftr.com/amexrewardmultiplier/amazon-gift-vouchers`

**Steps:**
1. Click denomination button (e.g., ₹250, ₹500, ₹1000)
2. Click "ADD" button that appears
3. Item added to cart - button transforms to quantity controls `[-] 1 [+]`
4. Use `[+]` or `[-]` to adjust quantity (auto-updates cart)
5. Repeat for other denominations
6. Click "View Cart" button

**Selectors:**
- Denomination: `button:has-text('250')` (dynamic)
- ADD button: `button.btn.btn-primary.fs-16.py-0.px-4.rounded-pill:has-text('ADD')`
- Quantity +: `span.inc.button`
- Quantity -: `span.dec.button`
- View Cart: `a.btn.btn-primary-2.btn-block[href='/amexrewardmultiplier/cart']`

### 2. Cart Page: Review & Checkout
URL: `https://www.gyftr.com/amexrewardmultiplier/cart`

**Steps:**
1. Review cart items
2. Click "PAY NOW" button
3. Login modal appears (`#login`)

**Selectors:**
- PAY NOW: `button.btn.btn-primary-2.btn-block:has-text('PAY NOW')`
- Modal trigger: `a[data-target='#login']`

### 3. Login Modal: OTP Authentication
**Steps:**
1. Enter mobile number
2. Enter email
3. Click "Get OTP"
4. **[USER INPUT]** Wait for OTP via SMS
5. Enter OTP in terminal (prompted)
6. Click "Submit"
7. Redirect to payment page

**Selectors:**
- Modal: `#login`
- Mobile: `input[name='mobile']` or `input[type='tel']`
- Email: `input[name='email']` or `input[type='email']`
- Get OTP btn: `button:has-text('Get OTP')`
- OTP input: `input[name='otp']`
- Submit: `button:has-text('Submit')`

### 4. Payment Page: Card Selection
**Steps:**
1. Select card by last 4 digits
2. Enter 4-digit CVV
3. Click "Continue"
4. **[USER INPUT]** Wait for payment OTP (email or SMS)
5. Enter OTP in terminal (prompted)
6. Submit payment
7. Redirect to success page

**Selectors:**
- TBD (need to scout payment page separately)

---

## Module Breakdown

### Module 1: Cart Management (`cart-manager.ts`)
**Responsibilities:**
- Calculate voucher combinations to reach target amount
- Add items to cart (denomination + quantity)
- Verify cart total matches target
- Handle errors (out of stock, denomination unavailable)

**Algorithm:**
```
1. Sort available denominations (descending)
2. Calculate combination to reach target:
   - Greedy approach: largest denominations first
   - If exact match not possible → FAIL & notify
3. For each denomination:
   - Click denomination button
   - Click ADD button
   - Use [+] button to set quantity
4. Click View Cart
5. Verify cart total (optional)
```

### Module 2: Login Handler (`login-handler.ts`)
**Responsibilities:**
- Fill mobile & email
- Click Get OTP
- Prompt user for OTP input via terminal
- Submit OTP
- Wait for redirect

### Module 3: Payment Handler (`payment-handler.ts`)
**Responsibilities:**
- Select card by last 4 digits
- Enter CVV
- Click Continue
- Prompt user for payment OTP via terminal
- Submit payment OTP
- Verify success

### Module 4: Config Loader (`config-loader.ts`)
**Responsibilities:**
- Load `config.json` (user details, target amount, card info)
- Load `selectors.json` (DOM selectors)
- Validate config

### Module 5: Main Orchestrator (`index.ts`)
**Responsibilities:**
- Initialize Playwright browser
- Call modules in sequence:
  1. Cart Manager
  2. Login Handler
  3. Payment Handler
- Handle errors at each stage
- Log progress

---

## Implementation Order

1. ✅ Project setup (Node, TS, Playwright)
2. ✅ Config structure (`config.json`, `selectors.json`)
3. ✅ Scout website for selectors
4. **Next:** Build & test Cart Management module
5. Build & test Login Handler module
6. Build & test Payment Handler module (needs payment page scouting)
7. Integrate all modules in main orchestrator
8. End-to-end testing

---

## Config Files

### `config.json`
```json
{
  "targetAmount": 1000,
  "availableDenominations": [250, 500, 1000, 1500, 5000, 10000],
  "userDetails": {
    "mobile": "9876543210",
    "email": "user@example.com"
  },
  "cardDetails": {
    "last4Digits": "1234",
    "cardName": "Gold Charge"
  }
}
```

### `selectors.json`
Already created with confirmed selectors.

---

## Open Questions / TODOs

1. ❓ Payment page selectors - need to scout after login
2. ❓ How to identify cards on payment page (by last 4 digits?)
3. ❓ Success page indicator - how to verify payment succeeded?
4. ⚠️ Error handling: What if denomination is out of stock?
5. ⚠️ Cart verification: Should we scrape cart total to confirm?

---

## Next Steps

**Start with Module 1: Cart Management**
- Write denomination combination algorithm
- Implement Playwright actions to add items
- Test on actual website
- Handle edge cases (out of stock, etc.)
