(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.services = window.PufferDesk.services || {};

	window.PufferDesk.services.createDebouncedTask = function createDebouncedTask(callback, options = {}) {
		const wait = Number.parseInt(options.wait, 10) || 160;
		const shouldRun = typeof options.shouldRun === 'function' ? options.shouldRun : () => true;
		let timer = null;

		function canRun() {
			return Boolean(callback && shouldRun());
		}

		function cancel() {
			window.clearTimeout(timer);
			timer = null;
		}

		function run() {
			cancel();

			if (!canRun()) {
				return null;
			}

			return callback();
		}

		function schedule() {
			if (!canRun()) {
				return false;
			}

			window.clearTimeout(timer);
			timer = window.setTimeout(run, wait);

			return true;
		}

		return {
			cancel,
			run,
			schedule
		};
	};
})();
