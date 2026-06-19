import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const adminPath = process.env.PUFFERDESK_TEST_ADMIN_PATH || '/wp-admin/admin.php?page=pufferdesk';
const password = process.env.PUFFERDESK_TEST_PASSWORD;
const username = process.env.PUFFERDESK_TEST_USERNAME;

async function logInToWordPress(page) {
	await page.goto('/wp-login.php');
	await page.locator('#user_login').fill(username);
	await page.locator('#user_pass').fill(password);
	await Promise.all([
		page.waitForURL((url) => !url.pathname.includes('wp-login.php')),
		page.locator('#wp-submit').click()
	]);
}

test.describe('PufferDesk accessibility smoke checks', () => {
	test.skip(!process.env.PUFFERDESK_TEST_BASE_URL, 'Set PUFFERDESK_TEST_BASE_URL to run browser accessibility checks.');
	test.skip(!username || !password, 'Set PUFFERDESK_TEST_USERNAME and PUFFERDESK_TEST_PASSWORD to test the authenticated shell.');

	test('shell has no automatic axe violations on first paint', async ({ page }) => {
		await logInToWordPress(page);
		await page.goto(adminPath);
		await expect(page.locator('[data-pufferdesk-shell]')).toBeVisible();

		const results = await new AxeBuilder({ page })
			.include('[data-pufferdesk-shell]')
			.analyze();

		expect(results.violations).toEqual([]);
	});
});
