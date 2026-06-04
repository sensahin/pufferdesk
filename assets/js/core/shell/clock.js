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
			day: 'numeric',
			hour: '2-digit',
			hourCycle: 'h23',
			minute: '2-digit',
			month: 'short',
			weekday: 'short'
		});

		const updateClock = () => {
			const parts = formatter.formatToParts(new Date()).reduce((next, part) => {
				next[part.type] = part.value;
				return next;
			}, {});

			clock.textContent = `${parts.weekday || ''} ${parts.month || ''} ${parts.day || ''} ${parts.hour || ''}:${parts.minute || ''}`.replace(/\s+/g, ' ').trim();
		};

		updateClock();
		window.setInterval(updateClock, 30000);
	};
})();
