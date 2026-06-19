module.exports = {
	extends: [ '@wordpress/stylelint-config' ],
	ignoreFiles: [
		'assets/dist/**/*.css',
		'node_modules/**/*.css',
		'release/**/*.css'
	],
	rules: {
		'comment-empty-line-before': null,
		'custom-property-pattern': null,
		'declaration-block-no-duplicate-custom-properties': null,
		'function-url-quotes': null,
		'length-zero-no-unit': null,
		'no-descending-specificity': null,
		'no-duplicate-selectors': null,
		'rule-empty-line-before': null,
		'selector-class-pattern': null,
		'value-keyword-case': null
	}
};
