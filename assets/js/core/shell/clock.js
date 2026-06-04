(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.shell = window.AdminOSMode.shell || {};

	window.AdminOSMode.shell.bindClock = function bindClock(shell) {
		const clock = shell.querySelector('[data-aos-clock]');

		if (!clock) {
			return;
		}

		const formatter = new Intl.DateTimeFormat(undefined, {
			hour: '2-digit',
			minute: '2-digit'
		});

		const updateClock = () => {
			clock.textContent = formatter.format(new Date());
		};

		updateClock();
		window.setInterval(updateClock, 30000);
	};
})();
