(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};

	function formatTemplate(template, values = []) {
		let index = 0;

		return String(template || '').replace(/%d|%s/g, () => String(values[index++] ?? ''));
	}

	window.PufferDesk.config = {
		get() {
			return window.pufferDesk || {};
		},

		getApps() {
			const config = this.get();
			return Array.isArray(config.apps) ? config.apps : [];
		},

		getThemes() {
			const config = this.get();
			return Array.isArray(config.themes) ? config.themes : [];
		},

		getWidgets() {
			const config = this.get();
			return Array.isArray(config.widgets) ? config.widgets : [];
		},

		getLabels() {
			const config = this.get();

			return config.menu && config.menu.labels && typeof config.menu.labels === 'object'
				? config.menu.labels
				: {};
		},

		getContracts() {
			const config = this.get();

			return config.contracts && typeof config.contracts === 'object' ? config.contracts : {};
		},

		getContractList(key, fallback = []) {
			const contracts = this.getContracts();
			const value = contracts[key];

			return Array.isArray(value) && value.length ? value : fallback;
		},

		getContractMap(key, fallback = {}) {
			const contracts = this.getContracts();
			const value = contracts[key];

			return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
		},

		getRouterContract() {
			const contracts = this.getContracts();

			return contracts.router && typeof contracts.router === 'object' ? contracts.router : {};
		},

		getRouterQueryKey(key) {
			const router = this.getRouterContract();
			const query = router.query && typeof router.query === 'object' ? router.query : {};
			const value = query[key];

			return typeof value === 'string' && value ? value : '';
		},

		getRouterValue(key) {
			const router = this.getRouterContract();
			const values = router.values && typeof router.values === 'object' ? router.values : {};
			const value = values[key];

			return typeof value === 'string' && value ? value : '';
		},

		getSettingDomain(domainId) {
			const config = this.get();
			const settings = config.settings && typeof config.settings === 'object' ? config.settings : {};
			const domains = Array.isArray(settings.domains) ? settings.domains : [];
			const id = String(domainId || '');

			return domains.find((domain) => domain && domain.id === id) || {};
		},

		getSettingDomainIds() {
			const contracts = this.getContracts();

			return contracts.settingsDomainIds && typeof contracts.settingsDomainIds === 'object'
				? contracts.settingsDomainIds
				: {};
		},

		getSettingAction(domainKey) {
			const ids = this.getSettingDomainIds();
			const domainId = ids[domainKey] || String(domainKey || '');
			const domain = this.getSettingDomain(domainId);

			return domain && typeof domain.action === 'string' ? domain.action : '';
		},

		getSettingDefault(domainId) {
			const domain = this.getSettingDomain(domainId);

			return domain && typeof domain.default === 'object'
				? JSON.parse(JSON.stringify(domain.default))
				: domain.default;
		},

		getSettingOptions(domainId) {
			const domain = this.getSettingDomain(domainId);

			return domain && domain.options && typeof domain.options === 'object' ? domain.options : {};
		},

		getLabel(key, fallback = '') {
			const labels = this.getLabels();
			const value = labels[key];

			return typeof value === 'string' && value ? value : fallback;
		},

		formatLabel(key, fallback = '', values = []) {
			const template = this.getLabel(key, fallback);

			return this.formatTemplate(template, values);
		},

		formatTemplate,

		formatFromLabels(labels, key, fallback = '', values = []) {
			const source = labels && typeof labels === 'object' ? labels : {};
			const value = source[key];
			const template = typeof value === 'string' && value ? value : fallback;

			return formatTemplate(template, values);
		}
	};
})();
