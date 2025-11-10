import { chromium } from 'playwright';

async function scoutWebsite() {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🔍 Opening Gyftr Amazon Gift Vouchers page...');
  await page.goto('https://www.gyftr.com/amexrewardmultiplier/amazon-gift-vouchers');

  console.log('⏳ Waiting for page to load...');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  console.log('\n📊 Analyzing page structure...\n');

  // Check for denomination buttons
  console.log('--- DENOMINATION BUTTONS ---');
  const denomButtons = await page.locator('button, div[class*="denom"], div[class*="amount"]').all();
  console.log(`Found ${denomButtons.length} potential denomination elements`);

  for (let i = 0; i < Math.min(5, denomButtons.length); i++) {
    const text = await denomButtons[i].textContent();
    const className = await denomButtons[i].getAttribute('class');
    console.log(`  ${i + 1}. Text: "${text?.trim()}" | Class: "${className}"`);
  }

  // Check for quantity controls
  console.log('\n--- QUANTITY CONTROLS ---');
  const qtyInputs = await page.locator('input[type="number"], input[name*="qty"], input[name*="quantity"]').all();
  console.log(`Found ${qtyInputs.length} quantity inputs`);

  const incrementButtons = await page.locator('button[class*="increment"], button[class*="plus"], button:has-text("+")').all();
  console.log(`Found ${incrementButtons.length} increment buttons`);

  // Check for Add to Cart
  console.log('\n--- ADD TO CART ---');
  const addToCartButtons = await page.locator('button:has-text("Add"), button:has-text("add"), button[class*="add"]').all();
  console.log(`Found ${addToCartButtons.length} add buttons`);

  for (let i = 0; i < Math.min(3, addToCartButtons.length); i++) {
    const text = await addToCartButtons[i].textContent();
    const className = await addToCartButtons[i].getAttribute('class');
    console.log(`  ${i + 1}. Text: "${text?.trim()}" | Class: "${className}"`);
  }

  // Check for cart icon
  console.log('\n--- CART ICON ---');
  const cartIcons = await page.locator('[class*="cart"], [href*="cart"]').all();
  console.log(`Found ${cartIcons.length} cart-related elements`);

  for (let i = 0; i < Math.min(3, cartIcons.length); i++) {
    const text = await cartIcons[i].textContent();
    const className = await cartIcons[i].getAttribute('class');
    console.log(`  ${i + 1}. Text: "${text?.trim()}" | Class: "${className}"`);
  }

  console.log('\n\n⏸️  Browser will stay open. Please manually:');
  console.log('1. Try adding items to cart');
  console.log('2. View the cart page');
  console.log('3. Note down the selectors for checkout/buy buttons');
  console.log('4. Check login popup structure');
  console.log('\nPress Ctrl+C when done scouting...\n');

  // Keep browser open
  await page.waitForTimeout(300000); // 5 minutes
}

scoutWebsite().catch(console.error);
