# Gyftr Amex Gift Voucher Automator

Automates the purchase of Amazon gift vouchers on Gyftr using Amex reward multiplier.

## Setup

```bash
npm install
```

## Configuration

1. Copy `config/config.example.json` to `config/config.json`:
```bash
cp config/config.example.json config/config.json
```

2. Edit `config/config.json` with your details:
```json
{
  "targetAmount": 1000,
  "availableDenominations": [250, 500, 1000, 1500, 5000, 10000],
  "userDetails": {
    "mobile": "your-mobile",
    "email": "your-email@example.com"
  },
  "cardDetails": {
    "last4Digits": "1234",
    "cardName": "Gold Charge"
  }
}
```

## Scouting (Development)

Run scouts to verify/update selectors:

```bash
# Scout login popup
npm run scout:login

# Scout payment page (requires OTP)
npm run scout:payment
```

## Usage

```bash
npm run dev
```

You'll be prompted to enter OTPs at:
1. Login stage
2. Payment stage

## Project Status

- [x] Initial setup
- [x] Scout scripts created
- [ ] Cart management module
- [ ] Login handler module
- [ ] Payment handler module
- [ ] End-to-end integration

See `IMPLEMENTATION_PLAN.md` for detailed roadmap.
