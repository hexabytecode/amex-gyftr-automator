import { chromium } from 'playwright';

async function scoutInteractive() {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🔍 Step 1: Opening page...');
    await page.goto('https://www.gyftr.com/amexrewardmultiplier/amazon-gift-vouchers', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(5000);

    // Find denomination buttons
    console.log('\n📊 Step 2: Finding denomination buttons...');
    const denomButtons = await page.locator('button').all();
    console.log(`Found ${denomButtons.length} buttons total`);

    // Look for buttons with rupee amounts
    for (let i = 0; i < denomButtons.length; i++) {
      const text = await denomButtons[i].textContent();
      if (text?.includes('₹') || text?.match(/\d{3,}/)) {
        const selector = await denomButtons[i].evaluate(el => {
          const classes = el.className;
          const id = el.id;
          return { text: el.textContent, classes, id };
        });
        console.log(`  Denomination button found:`, selector);
      }
    }

    console.log('\n🎯 Step 3: Clicking on ₹250 button...');
    // Try to find and click 250 denomination
    const button250 = page.locator('button').filter({ hasText: '250' }).first();
    if (await button250.count() > 0) {
      await button250.click();
      await page.waitForTimeout(2000);

      // Check for quantity controls
      console.log('\n🔢 Step 4: Looking for quantity controls...');
      const minusBtn = page.locator('button').filter({ hasText: '-' }).first();
      const plusBtn = page.locator('button').filter({ hasText: '+' }).first();

      if (await minusBtn.count() > 0) {
        const qtyControls = await minusBtn.evaluate(el => {
          const parent = el.parentElement;
          return {
            parentClass: parent?.className,
            minusBtn: el.className,
            structure: parent?.innerHTML
          };
        });
        console.log('  Quantity controls found:', qtyControls);
      }

      // Click plus to add another
      if (await plusBtn.count() > 0) {
        console.log('  Clicking [+] to increase quantity...');
        await plusBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    console.log('\n🛒 Step 5: Looking for View Cart button...');
    const viewCartBtn = page.locator('button, a').filter({ hasText: /view cart/i }).first();
    if (await viewCartBtn.count() > 0) {
      const cartBtnDetails = await viewCartBtn.evaluate(el => ({
        text: el.textContent,
        className: el.className,
        tagName: el.tagName
      }));
      console.log('  View Cart button:', cartBtnDetails);

      console.log('\n📄 Step 6: Navigating to cart page...');
      await viewCartBtn.click();
      await page.waitForURL('**/cart', { timeout: 10000 });
      await page.waitForTimeout(2000);

      console.log('  Current URL:', page.url());

      // Look for cart items
      console.log('\n📦 Step 7: Analyzing cart structure...');
      const cartItems = await page.locator('[class*="cart"], [class*="item"]').all();
      console.log(`  Found ${cartItems.length} potential cart item elements`);

      // Look for PAY NOW button
      console.log('\n💳 Step 8: Looking for PAY NOW button...');
      const payNowBtn = page.locator('button, a').filter({ hasText: /pay now/i }).first();
      if (await payNowBtn.count() > 0) {
        const payBtnDetails = await payNowBtn.evaluate(el => ({
          text: el.textContent,
          className: el.className,
          id: el.id
        }));
        console.log('  PAY NOW button:', payBtnDetails);

        console.log('\n🔐 Step 9: Clicking PAY NOW to trigger login popup...');
        await payNowBtn.click();
        await page.waitForTimeout(3000);

        // Look for login popup
        console.log('\n🔍 Step 10: Analyzing login popup...');
        const modal = page.locator('[role="dialog"], [class*="modal"], [class*="popup"]').first();
        if (await modal.count() > 0) {
          const modalDetails = await modal.evaluate(el => ({
            className: el.className,
            innerHTML: el.innerHTML.substring(0, 500)
          }));
          console.log('  Login modal found:', modalDetails);

          // Find input fields
          const mobileInput = page.locator('input[type="tel"], input[name*="mobile"], input[placeholder*="mobile" i]').first();
          const emailInput = page.locator('input[type="email"], input[name*="email"], input[placeholder*="email" i]').first();

          if (await mobileInput.count() > 0) {
            const mobileDetails = await mobileInput.evaluate(el => ({
              name: (el as HTMLInputElement).name,
              placeholder: (el as HTMLInputElement).placeholder,
              className: el.className
            }));
            console.log('  Mobile input:', mobileDetails);
          }

          if (await emailInput.count() > 0) {
            const emailDetails = await emailInput.evaluate(el => ({
              name: (el as HTMLInputElement).name,
              placeholder: (el as HTMLInputElement).placeholder,
              className: el.className
            }));
            console.log('  Email input:', emailDetails);
          }

          const getOtpBtn = page.locator('button').filter({ hasText: /get otp/i }).first();
          if (await getOtpBtn.count() > 0) {
            const otpBtnDetails = await getOtpBtn.evaluate(el => ({
              text: el.textContent,
              className: el.className
            }));
            console.log('  Get OTP button:', otpBtnDetails);
          }
        }
      }
    }

    console.log('\n\n✅ Scouting complete! Check the logs above for selector details.');
    console.log('🔍 Browser will stay open for manual inspection. Press Ctrl+C to close.\n');

    await page.waitForTimeout(300000); // Keep open for 5 minutes

  } catch (error) {
    console.error('\n❌ Error during scouting:', error);
  } finally {
    console.log('\n👋 Closing browser...');
    await browser.close();
  }
}

scoutInteractive().catch(console.error);
