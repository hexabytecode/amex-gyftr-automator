import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function scoutPayment() {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  const findings: any = {
    payment: {}
  };

  try {
    // Load config
    const configPath = path.join(process.cwd(), 'config', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    console.log('🔍 Step 1: Opening product page...');
    await page.goto('https://www.gyftr.com/amexrewardmultiplier/amazon-gift-vouchers', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(3000);

    console.log('🎯 Step 2: Adding ₹250 to cart...');
    const button250 = page.locator('button').filter({ hasText: '250' }).first();
    await button250.click();
    await page.waitForTimeout(1000);

    const addButton = page.locator('button.btn.btn-primary:has-text("ADD")').first();
    await addButton.click();
    await page.waitForTimeout(2000);

    console.log('🛒 Step 3: Going to cart...');
    await page.locator('a[href="/amexrewardmultiplier/cart"]').first().click();
    await page.waitForURL('**/cart', { timeout: 10000 });
    await page.waitForTimeout(2000);

    console.log('💳 Step 4: Clicking PAY NOW...');
    await page.locator('button:has-text("PAY NOW")').first().click();
    await page.waitForTimeout(3000);

    console.log('📝 Step 5: Filling login form...');
    await page.locator('input[name="mobile"], input[type="tel"]').first().fill(config.userDetails.mobile);
    await page.locator('input[name="email"], input[type="email"]').first().fill(config.userDetails.email);

    console.log('📲 Step 6: Clicking Get OTP...');
    await page.locator('button').filter({ hasText: /get otp/i }).first().click();
    await page.waitForTimeout(3000);

    console.log('\n⏸️  PAUSED: Please check your phone for OTP');
    const loginOtp = await promptUser('Enter Login OTP: ');

    console.log('🔐 Step 7: Submitting OTP...');
    await page.locator('input[name="otp"], input[placeholder*="OTP"]').first().fill(loginOtp);
    await page.locator('button').filter({ hasText: /submit|verify/i }).first().click();
    await page.waitForTimeout(5000);

    console.log('\n💳 Step 8: Inspecting payment page...\n');

    // Find card list/items
    const cardItems = page.locator('[class*="card"], [class*="payment"]');
    const cardCount = await cardItems.count();
    console.log(`✓ Found ${cardCount} potential card elements`);

    if (cardCount > 0) {
      const firstCard = cardItems.first();
      const cardInfo = await firstCard.evaluate(el => ({
        className: el.className,
        innerHTML: el.innerHTML.substring(0, 200)
      }));
      console.log('✓ Card element sample:', cardInfo);
      findings.payment.cardSelector = '[class*="card"]';
    }

    // Find CVV input
    const cvvInput = page.locator('input[name*="cvv" i], input[placeholder*="cvv" i]').first();
    if (await cvvInput.count() > 0) {
      const cvvInfo = await cvvInput.evaluate(el => ({
        name: (el as HTMLInputElement).name,
        placeholder: (el as HTMLInputElement).placeholder,
        className: el.className
      }));
      console.log('✓ CVV input:', cvvInfo);
      findings.payment.cvvInput = `input[name="${cvvInfo.name}"]`;
    }

    // Find Continue/Pay button
    const continueBtn = page.locator('button').filter({ hasText: /continue|pay/i }).first();
    if (await continueBtn.count() > 0) {
      const continueInfo = await continueBtn.evaluate(el => ({
        text: el.textContent,
        className: el.className
      }));
      console.log('✓ Continue button:', continueInfo);
      findings.payment.continueButton = `button:has-text("${continueInfo.text?.trim()}")`;
    }

    console.log('\n💰 Step 9: Selecting card and entering CVV...');
    console.log('⚠️  MANUAL ACTION REQUIRED: Please select your card and enter CVV');
    console.log('Then click Continue to trigger payment OTP');
    await promptUser('Press Enter after clicking Continue...');

    await page.waitForTimeout(3000);

    // Find payment OTP input
    const paymentOtpInput = page.locator('input[name*="otp" i], input[placeholder*="otp" i]').first();
    if (await paymentOtpInput.count() > 0) {
      const paymentOtpInfo = await paymentOtpInput.evaluate(el => ({
        name: (el as HTMLInputElement).name,
        placeholder: (el as HTMLInputElement).placeholder,
        className: el.className
      }));
      console.log('✓ Payment OTP input:', paymentOtpInfo);
      findings.payment.otpInputPayment = `input[name="${paymentOtpInfo.name}"]`;
    }

    const submitOtpBtn = page.locator('button').filter({ hasText: /submit|pay/i }).first();
    if (await submitOtpBtn.count() > 0) {
      const submitOtpInfo = await submitOtpBtn.evaluate(el => ({
        text: el.textContent,
        className: el.className
      }));
      console.log('✓ Submit OTP button:', submitOtpInfo);
      findings.payment.submitOtpButton = `button:has-text("${submitOtpInfo.text?.trim()}")`;
    }

    console.log('\n⏸️  PAUSED: Check for payment OTP');
    const paymentOtp = await promptUser('Enter Payment OTP (or "skip" to skip): ');

    if (paymentOtp.toLowerCase() !== 'skip') {
      console.log('🔐 Step 10: Submitting payment OTP...');
      await page.locator('input[name*="otp" i]').first().fill(paymentOtp);
      await page.locator('button').filter({ hasText: /submit|pay/i }).first().click();
      await page.waitForTimeout(5000);

      console.log('\n✅ Step 11: Looking for success indicators...');
      const successElement = page.locator('[class*="success"], .payment-success').first();
      if (await successElement.count() > 0) {
        const successInfo = await successElement.evaluate(el => ({
          className: el.className,
          text: el.textContent?.substring(0, 100)
        }));
        console.log('✓ Success indicator:', successInfo);
        findings.payment.successIndicator = `[class*="success"]`;
      }
    }

    console.log('\n\n📋 Payment Page Selectors Found:');
    console.log(JSON.stringify(findings, null, 2));

    // Update selectors.json
    const selectorsPath = path.join(process.cwd(), 'config', 'selectors.json');
    const existingSelectors = JSON.parse(fs.readFileSync(selectorsPath, 'utf-8'));
    existingSelectors.payment = { ...existingSelectors.payment, ...findings.payment };
    fs.writeFileSync(selectorsPath, JSON.stringify(existingSelectors, null, 2));
    console.log('\n✅ Updated config/selectors.json with payment findings!');

    console.log('\n⏸️  Browser will stay open for 30s for manual inspection...\n');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ Error during scouting:', error);
  } finally {
    console.log('\n👋 Closing browser...');
    await browser.close();
  }
}

scoutPayment().catch(console.error);
