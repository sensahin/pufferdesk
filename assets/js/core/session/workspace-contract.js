(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.session = window.PufferDesk.session || {};

	function clone(value) {
		if (!value || typeof value !== 'object') {
			return value;
		}

		try {
			return JSON.parse(JSON.stringify(value));
		} catch (error) {
			return Array.isArray(value) ? value.slice() : Object.assign({}, value);
		}
	}

	function getWorkspaceContract() {
		const config = window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function'
			? window.PufferDesk.config.get()
			: {};
		const contracts = config.contracts && typeof config.contracts === 'object' ? config.contracts : {};

		return contracts.workspace && typeof contracts.workspace === 'object' ? contracts.workspace : {};
	}

	const contract = getWorkspaceContract();

	window.PufferDesk.session.workspace = Object.freeze({
		desktopIconPrefixes: Object.freeze(Object.assign({}, contract.desktopIconPrefixes || {})),
		sections: Object.freeze(Object.assign({}, contract.sections || {})),
		windowKinds: Object.freeze(Object.assign({}, contract.windowKinds || {})),
		getDefaultState() {
			return clone(contract.defaultState || {});
		}
	});
})();
