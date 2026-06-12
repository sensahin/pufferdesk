(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	const fallback = Object.freeze({
		areas: Object.freeze({}),
		itemTypes: Object.freeze({}),
		keys: Object.freeze({}),
		nonItemDataTargets: Object.freeze([]),
		targets: Object.freeze({}),
		targetTypes: Object.freeze({})
	});

	function getContract() {
		const config = window.PufferDesk.config;
		const contracts = config && typeof config.getContracts === 'function' ? config.getContracts() : {};

		return contracts.contextMenu && typeof contracts.contextMenu === 'object' ? contracts.contextMenu : {};
	}

	function objectContract(key) {
		const value = getContract()[key];

		return Object.freeze(Object.assign({}, fallback[key], value && typeof value === 'object' && !Array.isArray(value) ? value : {}));
	}

	function listContract(key) {
		const value = getContract()[key];

		return Object.freeze(Array.isArray(value) && value.length ? value.slice() : fallback[key].slice());
	}

	window.PufferDesk.shell.contextMenuConstants = Object.freeze({
		get areas() {
			return objectContract('areas');
		},
		get itemTypes() {
			return objectContract('itemTypes');
		},
		get keys() {
			return objectContract('keys');
		},
		get nonItemDataTargets() {
			return listContract('nonItemDataTargets');
		},
		get targets() {
			return objectContract('targets');
		},
		get targetTypes() {
			return objectContract('targetTypes');
		}
	});
})();
