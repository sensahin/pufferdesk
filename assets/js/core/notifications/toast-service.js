(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.notifications = window.PufferDesk.notifications || {};

	function createToastService(shell, store, config = {}) {
		const dom = window.PufferDesk.dom;
		const notificationConfig = config.notifications && typeof config.notifications === 'object' ? config.notifications : {};
		const labels = notificationConfig.labels && typeof notificationConfig.labels === 'object' ? notificationConfig.labels : {};
		const layer = shell ? shell.querySelector('[data-pdk-notification-toasts]') : null;
		const eventNames = window.PufferDesk.events && window.PufferDesk.events.names ? window.PufferDesk.events.names : {};
		const timers = new Map();

		if (!shell || !store || !layer || !dom) {
			return {
				show() {}
			};
		}

		function t(key) {
			return typeof labels[key] === 'string' && labels[key] ? labels[key] : key;
		}

		function closeToast(toast) {
			if (!toast) {
				return;
			}

			const timer = timers.get(toast);
			if (timer) {
				window.clearTimeout(timer);
				timers.delete(toast);
			}
			toast.classList.add('is-exiting');
			window.setTimeout(() => toast.remove(), 180);
		}

		function createIcon(notification) {
			const icon = dom.createElement('span', `pdk-notification-toast-icon pdk-notification-icon-${notification.type || 'info'}`);
			icon.appendChild(dom.createIcon(notification.icon || 'dashicons-bell'));

			return icon;
		}

		function show(notification = {}) {
			const toast = dom.createElement('article', `pdk-notification-toast pdk-notification-toast-${notification.type || 'info'}`);
			const body = dom.createElement('div', 'pdk-notification-toast-body');
			const close = document.createElement('button');

			toast.setAttribute('role', notification.type === 'error' ? 'alert' : 'status');
			toast.dataset.pdkNotificationId = notification.id || '';
			body.appendChild(dom.createElement('strong', 'pdk-notification-toast-title', notification.title || t('newNotification')));
			if (notification.message) {
				body.appendChild(dom.createElement('span', 'pdk-notification-toast-message', notification.message));
			}

			close.type = 'button';
			close.className = 'pdk-notification-toast-close';
			close.setAttribute('aria-label', t('dismiss'));
			close.textContent = '\u00d7';
			close.addEventListener('click', () => {
				if (notification.id && typeof store.dismiss === 'function') {
					store.dismiss(notification.id);
				}
				closeToast(toast);
			});

			toast.append(createIcon(notification), body, close);
			layer.prepend(toast);

			const timer = window.setTimeout(() => closeToast(toast), notification.type === 'error' ? 9000 : 5600);
			timers.set(toast, timer);

			while (layer.children.length > 4) {
				closeToast(layer.lastElementChild);
			}
		}

		if (window.PufferDesk.events && typeof window.PufferDesk.events.on === 'function') {
			window.PufferDesk.events.on(eventNames.NOTIFICATIONS_TOAST, (event) => {
				if (event && event.detail && event.detail.notification) {
					show(event.detail.notification);
				}
			});
		}

		return {
			show
		};
	}

	window.PufferDesk.notifications.createToastService = createToastService;
})();
