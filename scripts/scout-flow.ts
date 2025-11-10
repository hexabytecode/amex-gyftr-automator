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

function log(emoji: string, message: string, data?: any) {
  console.log(`${emoji} ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

async function scoutFlow() {
  let browser;

  try {
    // Load config files
    log('📂', 'Loading configuration files...');
    const configPath = path.join(process.cwd(), 'config', 'config.json');
    const selectorsPath = path.join(process.cwd(), 'config', 'selectors.json');

    let config: any = {};
    let selectors: any = {};

    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      log('✅', 'Loaded config.json', { url: config.url, testDenomination: config.scout?.testDenomination });
    } catch (error) {
      log('⚠️ ', 'No config.json found, will skip filling credentials');
    }

    try {
      selectors = JSON.parse(fs.readFileSync(selectorsPath, 'utf-8'));
      log('✅', 'Loaded selectors.json');
    } catch (error) {
      log('❌', 'Failed to load selectors.json',  { error: (error as Error).message });
      throw error;
    }

    const findings: any = {
      product: {},
      cart: {},
      login: {},
      payment: {}
    };

    // Initialize browser
    const slowMo = config.scout?.slowMo || 500;
    const timeout = config.scout?.timeout || 60000;
    log('🌐', `Launching browser (slowMo: ${slowMo}ms, timeout: ${timeout}ms)...`);

    browser = await chromium.launch({ headless: false, slowMo });
    const context = await browser.newContext({
      // Start with clean state - no cookies, no session, no storage
      storageState: undefined
    });
    const page = await context.newPage();

    log('🧹', 'Browser started with clean state (no cookies/session)');

    // Navigate to product page
    const url = config.url || 'https://www.gyftr.com/amexrewardmultiplier/amazon-gift-vouchers';
    log('🔍', `STEP 1: PRODUCT PAGE - Opening ${url}...`);

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout
    });
    await page.waitForTimeout(3000);
    log('✅', 'Page loaded successfully');

    // Find and click denomination
    const testDenom = config.scout?.testDenomination || 250;
    log('📦', `STEP 2: PRODUCT PAGE - Finding denomination ₹${testDenom}...`);

    const row = page.locator('.vg-gread-row').filter({
      has: page.locator('.fv', { hasText: testDenom.toString() })
    }).first();

    if (await row.count() === 0) {
      log('❌', `Could not find row for denomination ₹${testDenom}`);
      throw new Error(`Denomination ${testDenom} not found`);
    }

    log('✅', `Found ₹${testDenom} row`);
    findings.product.denominationSelector = '.fv';
    findings.product.rowSelector = '.vg-gread-row';

    // Find and click ADD button
    log('➕', 'STEP 3: PRODUCT PAGE - Looking for ADD button...');
    const addButton = row.locator('button.btn.btn-primary').filter({ hasText: /ADD/i }).first();

    if (await addButton.count() === 0) {
      log('❌', 'ADD button not found');
      throw new Error('ADD button not found');
    }

    const addBtnInfo = await addButton.evaluate(el => ({
      text: el.textContent?.trim(),
      className: el.className
    }));
    log('✅', 'Found ADD button', addBtnInfo);
    findings.product.addButton = 'button.btn.btn-primary:has-text("ADD")';

    await addButton.click();
    await page.waitForTimeout(2000);
    log('✅', 'Clicked ADD button');

    // Find quantity controls
    log('🔢', 'STEP 4: PRODUCT PAGE - Looking for quantity controls...');
    const incButton = page.locator(selectors.product.incrementButton || 'span.inc.button').first();

    if (await incButton.count() > 0) {
      log('✅', 'Found quantity controls (increment/decrement buttons)');
      findings.product.incrementButton = 'span.inc.button';
      findings.product.decrementButton = 'span.dec.button';
      findings.product.quantityContainer = '.define-quantity';
    } else {
      log('⚠️ ', 'Quantity controls not visible');
    }

    // Find View Cart button
    log('🛒', 'STEP 5: PRODUCT PAGE - Looking for View Cart button...');
    const viewCartBtn = page.locator(selectors.product.viewCartLink || 'a').filter({ hasText: /view cart/i }).first();

    if (await viewCartBtn.count() === 0) {
      log('❌', 'View Cart button not found');
      throw new Error('View Cart button not found');
    }

    const cartBtnInfo = await viewCartBtn.evaluate(el => ({
      text: el.textContent,
      href: (el as HTMLAnchorElement).href,
      className: el.className
    }));
    log('✅', 'Found View Cart button', cartBtnInfo);
    findings.product.viewCartLink = 'a[href="/amexrewardmultiplier/cart"]';

    // Navigate to cart
    log('📄', 'STEP 6: CART PAGE - Navigating to cart...');
    await viewCartBtn.click();
    await page.waitForURL('**/cart', { timeout: 10000 });
    await page.waitForTimeout(2000);
    log('✅', `Navigated to: ${page.url()}`);

    // Find PAY NOW button
    log('💳', 'STEP 7: CART PAGE - Looking for PAY NOW button...');
    const payNowBtn = page.locator(selectors.cart.payNowButton || 'button').filter({ hasText: /pay now/i }).first();

    if (await payNowBtn.count() === 0) {
      log('❌', 'PAY NOW button not found');
      throw new Error('PAY NOW button not found');
    }

    const payBtnInfo = await payNowBtn.evaluate(el => ({
      text: el.textContent,
      className: el.className
    }));
    log('✅', 'Found PAY NOW button', payBtnInfo);
    findings.cart.payNowButton = 'button:has-text("PAY NOW")';

    // Click PAY NOW to open login modal
    log('🔐', 'STEP 8: LOGIN MODAL - Clicking PAY NOW...');
    await payNowBtn.click();
    log('✅', 'Clicked PAY NOW');

    // Wait for modal to appear and animate in
    log('📝', 'STEP 9: LOGIN MODAL - Waiting for modal to appear...');
    await page.waitForTimeout(2000);

    const modal = page.locator(selectors.login.modalId || '#login').first();

    // Wait for modal to be visible
    await modal.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      log('⚠️ ', 'Modal did not become visible within 10 seconds');
    });

    if (await modal.count() === 0) {
      log('❌', 'Login modal not found');
      throw new Error('Login modal not found');
    }

    const modalInfo = await modal.evaluate(el => ({
      id: el.id,
      className: el.className
    }));
    log('✅', 'Found modal', modalInfo);
    findings.login.modalId = modalInfo.id || '#login';

    // Find mobile input
    const mobileInput = page.locator(selectors.login.mobileInput || 'input[type="tel"], input[name*="mobile" i]').first();
    if (await mobileInput.count() > 0) {
      const mobileInfo = await mobileInput.evaluate(el => ({
        name: (el as HTMLInputElement).name,
        type: (el as HTMLInputElement).type,
        placeholder: (el as HTMLInputElement).placeholder
      }));
      log('✅', 'Found mobile input', mobileInfo);
      findings.login.mobileInput = `input[name="${mobileInfo.name}"]`;
    } else {
      log('⚠️ ', 'Mobile input not found');
    }

    // Find email input
    const emailInput = page.locator(selectors.login.emailInput || 'input[type="email"], input[name*="email" i]').first();
    if (await emailInput.count() > 0) {
      const emailInfo = await emailInput.evaluate(el => ({
        name: (el as HTMLInputElement).name,
        type: (el as HTMLInputElement).type,
        placeholder: (el as HTMLInputElement).placeholder
      }));
      log('✅', 'Found email input', emailInfo);
      findings.login.emailInput = `input[name="${emailInfo.name}"]`;
    } else {
      log('⚠️ ', 'Email input not found');
    }

    // Find Get OTP button
    const getOtpBtn = page.locator(selectors.login.getOtpButton || 'button').filter({ hasText: /get otp/i }).first();
    if (await getOtpBtn.count() > 0) {
      const otpBtnInfo = await getOtpBtn.evaluate(el => ({
        text: el.textContent?.trim(),
        className: el.className
      }));
      log('✅', 'Found Get OTP button', otpBtnInfo);
      findings.login.getOtpButton = `button:has-text("${otpBtnInfo.text}")`;
    } else {
      log('⚠️ ', 'Get OTP button not found');
    }

    // Check for Submit button (before OTP)
    let submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.count() === 0) {
      submitBtn = page.locator('button').filter({ hasText: /submit|verify|login/i }).first();
    }

    if (await submitBtn.count() > 0) {
      const submitInfo = await submitBtn.evaluate(el => ({
        text: el.textContent?.trim(),
        className: el.className,
        type: (el as HTMLButtonElement).type
      }));
      log('✅', 'Found Submit button', submitInfo);
      findings.login.submitButton = submitInfo.type === 'submit'
        ? 'button[type="submit"]'
        : `button:has-text("${submitInfo.text}")`;
    } else {
      log('⚠️ ', 'Submit button not found initially');
    }

    // Check for OTP input (appears after Get OTP clicked)
    const otpInput = page.locator(selectors.login.otpInput || 'input[name*="otp" i], input[placeholder*="otp" i]').first();
    if (await otpInput.count() > 0) {
      const otpInputInfo = await otpInput.evaluate(el => ({
        name: (el as HTMLInputElement).name,
        placeholder: (el as HTMLInputElement).placeholder
      }));
      log('✅', 'Found OTP input', otpInputInfo);
      findings.login.otpInput = `input[name="${otpInputInfo.name}"]`;
    } else {
      log('ℹ️ ', 'OTP input not visible yet (appears after Get OTP is clicked)');
      findings.login.otpInput = 'input[name="otp"]';
    }

    // Automatically proceed to login and payment page scouting
    log('🔄', 'STEP 10: LOGIN - Proceeding to fill credentials and login...');

    if (!config.userDetails) {
      log('⚠️ ', 'Missing userDetails in config.json - cannot proceed with login');
    } else {
      await mobileInput.fill(config.userDetails.mobile);
      log('✅', `Filled mobile: ${config.userDetails.mobile}`);

      await emailInput.fill(config.userDetails.email);
      log('✅', `Filled email: ${config.userDetails.email}`);

      await getOtpBtn.click();
      await page.waitForTimeout(3000);
      log('✅', 'Clicked Get OTP - waiting for OTP input field...');

      // Wait for OTP input to appear
      const otpInputField = page.locator('input[name="otp"]').first();
      await otpInputField.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
        log('⚠️ ', 'OTP input field did not appear - it might have a different selector');
      });

      log('📱', 'Enter the OTP you received on your mobile/email');
      log('ℹ️ ', '(Leave empty and press Enter to skip payment page scouting)');
      const loginOtp = await promptUser('Enter Login OTP: ');

      if (!loginOtp || loginOtp.trim() === '') {
        log('⏭️ ', 'OTP not provided - skipping payment page scouting');
      } else {
        await otpInputField.fill(loginOtp);
        log('✅', 'Filled OTP');

        await submitBtn.click();
        await page.waitForTimeout(3000);
        log('✅', 'Submitted OTP - waiting for login modal to close...');

        // Wait for modal to close and return to cart page
        await page.locator('#login').waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
          log('⚠️ ', 'Login modal did not close');
        });
        await page.waitForTimeout(2000);
        log('✅', 'Login modal closed - back on cart page');

        // Click PAY NOW again to go to payment page
        log('💳', 'STEP 11: Clicking PAY NOW again to reach payment page...');
        const payNowAgain = page.locator(selectors.cart.payNowButton || 'button').filter({ hasText: /pay now/i }).first();

        if (await payNowAgain.count() > 0) {
          await payNowAgain.click();
          log('✅', 'Clicked PAY NOW button');
        } else {
          log('⚠️ ', 'PAY NOW button not found on cart page');
        }

        // Wait for redirect to Juspay payment page
        await page.waitForURL('**/payment-page/**', { timeout: 15000 }).catch(() => {
          log('⚠️ ', 'Did not redirect to Juspay payment page');
        });
        await page.waitForTimeout(3000);
        log('✅', `Redirected to payment page: ${page.url()}`);

        log('💰', 'STEP 12: PAYMENT PAGE - Discovering payment selectors...');

        // Find card elements using testid pattern
        const cardElements = page.locator('[testid^="pi_card_"]');
        const cardCount = await cardElements.count();
        log('✅', `Found ${cardCount} card elements`);

        if (cardCount > 0) {
          findings.payment.cardSelector = '[testid^="pi_card_"]';

          // Find card with matching last 4 digits
          if (config.cardDetails && config.cardDetails.last4Digits) {
            const targetCard = page.locator(`[testid*="_${config.cardDetails.last4Digits}"]`).first();
            if (await targetCard.count() > 0) {
              log('✅', `Found card matching last 4 digits: ${config.cardDetails.last4Digits}`);
              findings.payment.cardLast4Selector = `[testid*="_${config.cardDetails.last4Digits}"]`;
            }
          }
        } else {
          log('⚠️ ', 'No card elements found');
        }

        // Find CVV input
        const cvvInput = page.locator('input[testid="edt_cvv"]').first();
        if (await cvvInput.count() === 0) {
          // Fallback selector
          const cvvFallback = page.locator('input[placeholder*="CVV" i], input[placeholder*="C V V"]').first();
          if (await cvvFallback.count() > 0) {
            const cvvInfo = await cvvFallback.evaluate(el => ({
              placeholder: (el as HTMLInputElement).placeholder
            }));
            log('✅', 'Found CVV input (fallback)', cvvInfo);
            findings.payment.cvvInput = `input[placeholder="${cvvInfo.placeholder}"]`;
          } else {
            log('⚠️ ', 'CVV input not found');
          }
        } else {
          log('✅', 'Found CVV input');
          findings.payment.cvvInput = 'input[testid="edt_cvv"]';
        }

        // Find Proceed to Pay button
        const proceedBtn = page.locator('[testid*="btn_"]').filter({ hasText: /proceed to pay/i }).first();
        if (await proceedBtn.count() > 0) {
          log('✅', 'Found Proceed to Pay button');
          findings.payment.proceedButton = '[testid*="btn_"]:has-text("Proceed to Pay")';
        } else {
          // Fallback
          const proceedFallback = page.locator('button, div[tabindex]').filter({ hasText: /proceed to pay/i }).first();
          if (await proceedFallback.count() > 0) {
            log('✅', 'Found Proceed to Pay button (fallback)');
            findings.payment.proceedButton = ':has-text("Proceed to Pay")';
          } else {
            log('⚠️ ', 'Proceed to Pay button not found');
          }
        }

        log('✅', 'Payment page scouting complete!');
        log('⚠️ ', 'Note: Payment OTP and success page selectors need actual payment test');
      }
    }

    // Display all findings
    log('📋', 'ALL SELECTORS FOUND:', findings);

    // Update selectors.json
    log('💾', 'Updating config/selectors.json...');
    const existingSelectors = JSON.parse(fs.readFileSync(selectorsPath, 'utf-8'));

    // Merge findings with existing selectors
    Object.keys(findings).forEach(section => {
      if (Object.keys(findings[section]).length > 0) {
        existingSelectors[section] = { ...existingSelectors[section], ...findings[section] };
      }
    });

    fs.writeFileSync(selectorsPath, JSON.stringify(existingSelectors, null, 2));
    log('✅', 'Updated config/selectors.json with all findings!');

    log('⏸️ ', 'Browser will stay open for 30s for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    log('❌', 'ERROR during scouting:', {
      message: (error as Error).message,
      stack: (error as Error).stack?.split('\n').slice(0, 3)
    });
    throw error;
  } finally {
    if (browser) {
      log('👋', 'Closing browser...');
      await browser.close();
    }
  }
}

scoutFlow().catch((error) => {
  console.error('\n💥 Fatal error:', error.message);
  process.exit(1);
});
