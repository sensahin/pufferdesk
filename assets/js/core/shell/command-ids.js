(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	function getContractIds() {
		const config = window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function'
			? window.PufferDesk.config.get()
			: {};
		const contracts = config.contracts && typeof config.contracts === 'object' ? config.contracts : {};

		return contracts.commandIds && typeof contracts.commandIds === 'object' ? contracts.commandIds : {};
	}

	window.PufferDesk.shell.commands = Object.freeze(Object.assign({}, getContractIds()));
})();
