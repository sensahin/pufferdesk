import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PUFFERDESK_TEST_BASE_URL || 'http://localhost:8888';

export default defineConfig({
	testDir: './tests/e2e',
	timeout: 30000,
	expect: {
		timeout: 5000
	},
	use: {
		baseURL,
		ignoreHTTPSErrors: true,
		trace: 'on-first-retry'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
