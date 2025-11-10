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

async function scoutFlow() {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  const findings: any = {
    product: {},
    cart: {},
    login: {},
    payment: {}
  };

  try {
    // Load config for credentials
    const configPath = path.join(process.cwd(), 'config', 'config.json');
    let config: any = {};
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      console.log('⚠️  No config.json found, will skip filling credentials');
    }

    console.log('🔍 STEP 1: PRODUCT PAGE - Opening page...');
    await page.goto('https://www.gyftr.com/amexrewardmultiplier/amazon-gift-vouchers', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(3000);

    console.log('\n📦 STEP 2: PRODUCT PAGE - Finding denomination and ADD button...');
    // Find the row containing 250 denomination
    const row250 = page.locator('.vg-gread-row').filter({ has: page.locator('.fv', { hasText: '250' }) }).first();

    if (await row250.count() > 0) {
      console.log('✓ Found ₹250 row');

      console.log('\n➕ STEP 3: PRODUCT PAGE - Looking for ADD button...');
      const addButton = row250.locator('button.btn.btn-primary').filter({ hasText: /ADD/i }).first();

      if (await addButton.count() > 0) {
        const addBtnInfo = await addButton.evaluate(el => ({
          text: el.textContent?.trim(),
          className: el.className
        }));
        console.log('✓ ADD button:', addBtnInfo);
        findings.product.addButton = 'button.btn.btn-primary:has-text("ADD")';
        findings.product.denominationSelector = '.fv';

        await addButton.click();
        await page.waitForTimeout(2000);

        console.log('\n🔢 STEP 4: PRODUCT PAGE - Looking for quantity controls...');
        const incButton = page.locator('span.inc.button').first();
        const decButton = page.locator('span.dec.button').first();

        if (await incButton.count() > 0) {
          console.log('✓ Found quantity controls');
          findings.product.incrementButton = 'span.inc.button';
          findings.product.decrementButton = 'span.dec.button';
        }
      }
    }

    console.log('\n🛒 STEP 5: PRODUCT PAGE - Looking for View Cart button...');
    const viewCartBtn = page.locator('a').filter({ hasText: /view cart/i }).first();
    if (await viewCartBtn.count() > 0) {
      const cartBtnInfo = await viewCartBtn.evaluate(el => ({
        text: el.textContent,
        href: (el as HTMLAnchorElement).href,
        className: el.className
      }));
      console.log('✓ View Cart button:', cartBtnInfo);
      findings.product.viewCartLink = `a[href="/amexrewardmultiplier/cart"]`;

      console.log('\n📄 STEP 6: CART PAGE - Navigating to cart...');
      await viewCartBtn.click();
      await page.waitForURL('**/cart', { timeout: 10000 });
      await page.waitForTimeout(2000);
      console.log('✓ Navigated to:', page.url());

      console.log('\n💳 STEP 7: CART PAGE - Looking for PAY NOW button...');
      const payNowBtn = page.locator('button').filter({ hasText: /pay now/i }).first();
      if (await payNowBtn.count() > 0) {
        const payBtnInfo = await payNowBtn.evaluate(el => ({
          text: el.textContent,
          className: el.className
        }));
        console.log('✓ PAY NOW button:', payBtnInfo);
        findings.cart.payNowButton = `button:has-text("PAY NOW")`;

        console.log('\n🔐 STEP 8: LOGIN MODAL - Clicking PAY NOW...');
        await payNowBtn.click();
        await page.waitForTimeout(3000);

        console.log('\n📝 STEP 9: LOGIN MODAL - Inspecting modal...');
        const modal = page.locator('#login, [role="dialog"], [class*="modal"]').first();
        if (await modal.count() > 0) {
          const modalInfo = await modal.evaluate(el => ({
            id: el.id,
            className: el.className
          }));
          console.log('✓ Modal found:', modalInfo);
          findings.login.modalId = modalInfo.id || '#login';

          // Find mobile input
          const mobileInput = page.locator('input[type="tel"], input[name*="mobile" i]').first();
          if (await mobileInput.count() > 0) {
            const mobileInfo = await mobileInput.evaluate(el => ({
              name: (el as HTMLInputElement).name,
              type: (el as HTMLInputElement).type,
              placeholder: (el as HTMLInputElement).placeholder
            }));
            console.log('✓ Mobile input:', mobileInfo);
            findings.login.mobileInput = `input[name="${mobileInfo.name}"]`;
          }

          // Find email input
          const emailInput = page.locator('input[type="email"], input[name*="email" i]').first();
          if (await emailInput.count() > 0) {
            const emailInfo = await emailInput.evaluate(el => ({
              name: (el as HTMLInputElement).name,
              type: (el as HTMLInputElement).type,
              placeholder: (el as HTMLInputElement).placeholder
            }));
            console.log('✓ Email input:', emailInfo);
            findings.login.emailInput = `input[name="${emailInfo.name}"]`;
          }

          // Find Get OTP button
          const getOtpBtn = page.locator('button').filter({ hasText: /get otp/i }).first();
          if (await getOtpBtn.count() > 0) {
            const otpBtnInfo = await getOtpBtn.evaluate(el => ({
              text: el.textContent?.trim(),
              className: el.className
            }));
            console.log('✓ Get OTP button:', otpBtnInfo);
            findings.login.getOtpButton = `button:has-text("${otpBtnInfo.text}")`;
          }

          // Check for OTP input (might not be visible yet)
          const otpInput = page.locator('input[name*="otp" i], input[placeholder*="otp" i]').first();
          if (await otpInput.count() > 0) {
            const otpInputInfo = await otpInput.evaluate(el => ({
              name: (el as HTMLInputElement).name,
              placeholder: (el as HTMLInputElement).placeholder
            }));
            console.log('✓ OTP input:', otpInputInfo);
            findings.login.otpInput = `input[name="${otpInputInfo.name}"]`;
          } else {
            console.log('⚠️  OTP input not visible (appears after Get OTP clicked)');
            findings.login.otpInput = 'input[name="otp"]';
          }

          // Find Submit button
          const submitBtn = page.locator('button').filter({ hasText: /submit|verify/i }).first();
          if (await submitBtn.count() > 0) {
            const submitInfo = await submitBtn.evaluate(el => ({
              text: el.textContent?.trim(),
              className: el.className
            }));
            console.log('✓ Submit button:', submitInfo);
            findings.login.submitButton = `button:has-text("${submitInfo.text}")`;
          }

          console.log('\n⏸️  PAUSED: Do you want to continue to payment page? (requires OTP)');
          const continueToPayment = await promptUser('Continue to payment page scout? (y/n): ');

          if (continueToPayment.toLowerCase() === 'y' && config.userDetails) {
            console.log('\n📲 STEP 10: LOGIN - Filling credentials...');
            await mobileInput.fill(config.userDetails.mobile);
            await emailInput.fill(config.userDetails.email);
            await getOtpBtn.click();
            await page.waitForTimeout(3000);

            const loginOtp = await promptUser('Enter Login OTP: ');
            await page.locator('input[name="otp"]').first().fill(loginOtp);
            await submitBtn.click();
            await page.waitForTimeout(5000);

            console.log('\n💰 STEP 11: PAYMENT PAGE - Inspecting payment page...');

            // Find card elements
            const cardElements = page.locator('[class*="card"]');
            const cardCount = await cardElements.count();
            console.log(`✓ Found ${cardCount} potential card elements`);
            if (cardCount > 0) {
              findings.payment.cardSelector = '[class*="card"]';
            }

            // Find CVV input
            const cvvInput = page.locator('input[name*="cvv" i], input[placeholder*="cvv" i]').first();
            if (await cvvInput.count() > 0) {
              const cvvInfo = await cvvInput.evaluate(el => ({
                name: (el as HTMLInputElement).name,
                placeholder: (el as HTMLInputElement).placeholder
              }));
              console.log('✓ CVV input:', cvvInfo);
              findings.payment.cvvInput = `input[name="${cvvInfo.name}"]`;
            }

            // Find Continue/Pay button
            const continueBtn = page.locator('button').filter({ hasText: /continue|pay/i }).first();
            if (await continueBtn.count() > 0) {
              const continueInfo = await continueBtn.evaluate(el => ({
                text: el.textContent?.trim(),
                className: el.className
              }));
              console.log('✓ Continue button:', continueInfo);
              findings.payment.continueButton = `button:has-text("${continueInfo.text}")`;
            }

            console.log('\n✅ Payment page scouting complete!');
            console.log('Note: Payment OTP and success page selectors need manual testing');
          }
        }
      }
    }

    console.log('\n\n📋 ALL SELECTORS FOUND:');
    console.log(JSON.stringify(findings, null, 2));

    // Update selectors.json
    const selectorsPath = path.join(process.cwd(), 'config', 'selectors.json');
    const existingSelectors = JSON.parse(fs.readFileSync(selectorsPath, 'utf-8'));

    // Merge findings with existing selectors
    Object.keys(findings).forEach(section => {
      existingSelectors[section] = { ...existingSelectors[section], ...findings[section] };
    });

    fs.writeFileSync(selectorsPath, JSON.stringify(existingSelectors, null, 2));
    console.log('\n✅ Updated config/selectors.json with all findings!');

    console.log('\n⏸️  Browser will stay open for 30s for manual inspection...\n');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ Error during scouting:', error);
  } finally {
    console.log('\n👋 Closing browser...');
    await browser.close();
  }
}

scoutFlow().catch(console.error);
