import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function scoutLogin() {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  const findings: any = {
    login: {}
  };

  try {
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
    const viewCartBtn = page.locator('a[href="/amexrewardmultiplier/cart"]').first();
    await viewCartBtn.click();
    await page.waitForURL('**/cart', { timeout: 10000 });
    await page.waitForTimeout(2000);

    console.log('💳 Step 4: Clicking PAY NOW to open login modal...');
    const payNowBtn = page.locator('button:has-text("PAY NOW")').first();
    await payNowBtn.click();
    await page.waitForTimeout(3000);

    console.log('\n🔐 Step 5: Inspecting login modal...\n');

    // Find modal
    const modal = page.locator('#login, [role="dialog"], [class*="modal"]').first();
    if (await modal.count() > 0) {
      const modalInfo = await modal.evaluate(el => ({
        id: el.id,
        className: el.className
      }));
      console.log('✓ Modal found:', modalInfo);
      findings.login.modalId = modalInfo.id || modalInfo.className;
    }

    // Find mobile input
    const mobileInput = page.locator('input[type="tel"], input[name*="mobile" i], input[placeholder*="mobile" i]').first();
    if (await mobileInput.count() > 0) {
      const mobileInfo = await mobileInput.evaluate(el => ({
        name: (el as HTMLInputElement).name,
        type: (el as HTMLInputElement).type,
        placeholder: (el as HTMLInputElement).placeholder,
        className: el.className
      }));
      console.log('✓ Mobile input:', mobileInfo);
      findings.login.mobileInput = `input[name="${mobileInfo.name}"]`;
    }

    // Find email input
    const emailInput = page.locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]').first();
    if (await emailInput.count() > 0) {
      const emailInfo = await emailInput.evaluate(el => ({
        name: (el as HTMLInputElement).name,
        type: (el as HTMLInputElement).type,
        placeholder: (el as HTMLInputElement).placeholder,
        className: el.className
      }));
      console.log('✓ Email input:', emailInfo);
      findings.login.emailInput = `input[name="${emailInfo.name}"]`;
    }

    // Find Get OTP button
    const getOtpBtn = page.locator('button').filter({ hasText: /get otp/i }).first();
    if (await getOtpBtn.count() > 0) {
      const otpBtnInfo = await getOtpBtn.evaluate(el => ({
        text: el.textContent,
        className: el.className,
        id: el.id
      }));
      console.log('✓ Get OTP button:', otpBtnInfo);
      findings.login.getOtpButton = `button:has-text("${otpBtnInfo.text?.trim()}")`;
    }

    // Find OTP input (might appear after clicking Get OTP)
    const otpInput = page.locator('input[name*="otp" i], input[placeholder*="otp" i]').first();
    if (await otpInput.count() > 0) {
      const otpInputInfo = await otpInput.evaluate(el => ({
        name: (el as HTMLInputElement).name,
        placeholder: (el as HTMLInputElement).placeholder,
        className: el.className
      }));
      console.log('✓ OTP input:', otpInputInfo);
      findings.login.otpInput = `input[name="${otpInputInfo.name}"]`;
    } else {
      console.log('⚠ OTP input not visible yet (appears after Get OTP)');
      findings.login.otpInput = 'input[name="otp"], input[placeholder*="OTP"]';
    }

    // Find Submit button
    const submitBtn = page.locator('button').filter({ hasText: /submit|verify/i }).first();
    if (await submitBtn.count() > 0) {
      const submitInfo = await submitBtn.evaluate(el => ({
        text: el.textContent,
        className: el.className
      }));
      console.log('✓ Submit button:', submitInfo);
      findings.login.submitButton = `button:has-text("${submitInfo.text?.trim()}")`;
    }

    console.log('\n\n📋 Login Modal Selectors Found:');
    console.log(JSON.stringify(findings, null, 2));

    // Update selectors.json
    const selectorsPath = path.join(process.cwd(), 'config', 'selectors.json');
    const existingSelectors = JSON.parse(fs.readFileSync(selectorsPath, 'utf-8'));
    existingSelectors.login = { ...existingSelectors.login, ...findings.login };
    fs.writeFileSync(selectorsPath, JSON.stringify(existingSelectors, null, 2));
    console.log('\n✅ Updated config/selectors.json with login findings!');

    console.log('\n⏸️  Browser will stay open for 30s for manual inspection...\n');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('\n❌ Error during scouting:', error);
  } finally {
    console.log('\n👋 Closing browser...');
    await browser.close();
  }
}

scoutLogin().catch(console.error);
