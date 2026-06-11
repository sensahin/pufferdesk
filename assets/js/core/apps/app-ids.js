(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	function getContractIds(key) {
		const config = window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function'
			? window.PufferDesk.config.get()
			: {};
		const contracts = config.contracts && typeof config.contracts === 'object' ? config.contracts : {};

		return contracts[key] && typeof contracts[key] === 'object' ? contracts[key] : {};
	}

	window.PufferDesk.apps.ids = Object.freeze(Object.assign({}, getContractIds('appIds')));
	window.PufferDesk.apps.nativeIds = Object.freeze(Object.assign({}, getContractIds('nativeAppIds')));
})();
