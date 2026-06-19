import wordpress from '@wordpress/eslint-plugin';

export default [
	{
		ignores: [
			'assets/dist/**',
			'node_modules/**',
			'release/**',
			'vendor/**'
		]
	},
	...wordpress.configs.recommended,
	...wordpress.configs.jsdoc,
	{
		files: [ 'assets/js/**/*.js' ],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'script',
			globals: {
				AbortController: 'readonly',
				Audio: 'readonly',
				CustomEvent: 'readonly',
				FormData: 'readonly',
				Image: 'readonly',
				IntersectionObserver: 'readonly',
				ResizeObserver: 'readonly',
				URL: 'readonly',
				URLSearchParams: 'readonly',
				clearInterval: 'readonly',
				clearTimeout: 'readonly',
				confirm: 'readonly',
				document: 'readonly',
				fetch: 'readonly',
				localStorage: 'readonly',
				navigator: 'readonly',
				requestAnimationFrame: 'readonly',
				sessionStorage: 'readonly',
				setInterval: 'readonly',
				setTimeout: 'readonly',
				window: 'readonly'
			}
		},
		rules: {
			'jsdoc/require-jsdoc': 'off',
			'jsdoc/require-param': 'off',
			'jsdoc/require-returns': 'off',
			'@wordpress/no-global-active-element': 'off',
			'@wordpress/no-global-get-selection': 'off',
			'@wordpress/no-unused-vars-before-return': 'off',
			'no-nested-ternary': 'off',
			'no-shadow': 'off',
			'no-unused-vars': [
				'warn',
				{
					args: 'after-used',
					argsIgnorePattern: '^_',
					caughtErrors: 'none',
					varsIgnorePattern: '^_'
				}
			],
			'no-alert': 'off',
			'no-console': 'off',
			'prettier/prettier': 'off'
		}
	},
	{
		files: [
			'scripts/**/*.mjs',
			'tests/**/*.js',
			'tests/**/*.mjs'
		],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: {
				console: 'readonly',
				process: 'readonly'
			}
		},
		rules: {
			'no-alert': 'off',
			'no-console': 'off',
			'no-unused-vars': [
				'warn',
				{
					args: 'after-used',
					argsIgnorePattern: '^_',
					caughtErrors: 'none',
					varsIgnorePattern: '^_'
				}
			],
			'prettier/prettier': 'off'
		}
	}
];
