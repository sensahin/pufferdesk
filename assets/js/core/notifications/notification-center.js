(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.notifications = window.PufferDesk.notifications || {};

	function createNotificationCenter(shell, store, config = {}) {
		const dom = window.PufferDesk.dom;
		const notificationConfig = config.notifications && typeof config.notifications === 'object' ? config.notifications : {};
		const labels = notificationConfig.labels && typeof notificationConfig.labels === 'object' ? notificationConfig.labels : {};
		const panel = shell ? shell.querySelector('[data-pdk-notification-center]') : null;
		const list = panel ? panel.querySelector('[data-pdk-notification-list]') : null;
		const toggles = shell ? Array.from(shell.querySelectorAll('[data-pdk-notification-toggle]')) : [];
		const markAllButton = panel ? panel.querySelector('[data-pdk-notification-mark-all-read]') : null;
		const refreshButton = panel ? panel.querySelector('[data-pdk-notification-refresh]') : null;
		const closeButton = panel ? panel.querySelector('[data-pdk-notification-close]') : null;
		let open = false;
		let refreshing = false;

		if (!shell || !store || !dom || !panel || !list) {
			return {
				close() {},
				open() {},
				render() {}
			};
		}

		function t(key, fallback) {
			return typeof labels[key] === 'string' && labels[key] ? labels[key] : fallback;
		}

		function formatTime(timestamp) {
			const date = new Date((Number.parseInt(timestamp, 10) || 0) * 1000);
			if (!Number.isFinite(date.getTime())) {
				return '';
			}

			return date.toLocaleString([], {
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit',
				month: 'short'
			});
		}

		function getDesktopApi() {
			return window.PufferDesk.desktopApi || (window.PufferDesk.desktop && window.PufferDesk.desktop.api) || null;
		}

		function executeAction(action = {}, notification = {}) {
			const desktopApi = getDesktopApi();

			if (notification.id && typeof store.markRead === 'function') {
				store.markRead(notification.id);
			}

			if (action.command && desktopApi && desktopApi.commands && typeof desktopApi.commands.execute === 'function') {
				desktopApi.commands.execute({
					command: action.command,
					icon: action.icon || notification.icon || '',
					label: action.label || '',
					payload: Object.assign({}, action.payload || {}, {
						target: action.target || '',
						title: action.title || action.label || '',
						url: action.url || ''
					}),
					target: action.target || '',
					title: action.title || action.label || '',
					url: action.url || ''
				});
				close();
				return;
			}

			if (action.url) {
				if (desktopApi && desktopApi.apps && typeof desktopApi.apps.openUrl === 'function') {
					desktopApi.apps.openUrl(action.url, action.title || action.label || notification.title || '', action.icon || notification.icon || '');
				} else {
					window.location.href = action.url;
				}
				close();
			}
		}

		function createIcon(notification) {
			const icon = dom.createElement('span', `pdk-notification-item-icon pdk-notification-icon-${notification.type || 'info'}`);
			icon.appendChild(dom.createIcon(notification.icon || 'dashicons-bell'));

			return icon;
		}

		function createActionButton(action, notification) {
			const button = document.createElement('button');

			button.type = 'button';
			button.className = `pdk-notification-action${action.destructive ? ' is-destructive' : ''}`;
			button.textContent = action.label;
			button.addEventListener('click', (event) => {
				event.stopPropagation();
				executeAction(action, notification);
			});

			return button;
		}

		function createNotificationItem(notification) {
			const item = dom.createElement('article', `pdk-notification-item pdk-notification-item-${notification.type || 'info'}${notification.read ? ' is-read' : ' is-unread'}`);
			const body = dom.createElement('div', 'pdk-notification-item-body');
			const meta = dom.createElement('div', 'pdk-notification-item-meta');
			const titleRow = dom.createElement('div', 'pdk-notification-item-title-row');
			const title = dom.createElement('strong', 'pdk-notification-item-title', notification.title || t('newNotification', 'New notification'));
			const dismiss = document.createElement('button');

			item.dataset.pdkNotificationId = notification.id || '';
			meta.appendChild(dom.createElement('span', 'pdk-notification-item-source', notification.sourceLabel || notification.source || ''));
			const time = formatTime(notification.timestamp);
			if (time) {
				meta.appendChild(dom.createElement('time', 'pdk-notification-item-time', time));
			}

			titleRow.appendChild(title);
			dismiss.type = 'button';
			dismiss.className = 'pdk-notification-item-dismiss';
			dismiss.setAttribute('aria-label', t('dismiss', 'Dismiss'));
			dismiss.textContent = '\u00d7';
			dismiss.addEventListener('click', (event) => {
				event.stopPropagation();
				store.dismiss(notification.id);
			});
			titleRow.appendChild(dismiss);

			body.append(meta, titleRow);
			if (notification.message) {
				body.appendChild(dom.createElement('p', 'pdk-notification-item-message', notification.message));
			}
			if (Array.isArray(notification.actions) && notification.actions.length) {
				const actions = dom.createElement('div', 'pdk-notification-item-actions');
				notification.actions.forEach((action) => actions.appendChild(createActionButton(action, notification)));
				body.appendChild(actions);
			}

			item.append(createIcon(notification), body);
			item.addEventListener('click', () => {
				if (!notification.read) {
					store.markRead(notification.id);
				}
			});

			return item;
		}

		function updateBadges(snapshot) {
			const count = snapshot.unreadCount || 0;
			const preferences = snapshot.preferences || {};
			const notificationsEnabled = preferences.enabled !== false;

			if (!notificationsEnabled && open) {
				close();
			}

			toggles.forEach((button) => {
				let badge = button.querySelector('.pdk-notification-button-badge');
				button.hidden = !notificationsEnabled;
				button.classList.toggle('has-unread', notificationsEnabled && count > 0);
				button.setAttribute('aria-label', count > 0 ? `${t('open', 'Open Notifications')}, ${count}` : t('open', 'Open Notifications'));

				if (!notificationsEnabled || !preferences.show_badges || count <= 0) {
					if (badge) {
						badge.remove();
					}
					return;
				}

				if (!badge) {
					badge = dom.createElement('span', 'pdk-notification-button-badge');
					badge.setAttribute('aria-hidden', 'true');
					button.appendChild(badge);
				}
				badge.textContent = count > 99 ? '99+' : String(count);
			});
		}

		function render() {
			const snapshot = store.getSnapshot();
			const items = snapshot.items || [];

			updateBadges(snapshot);
			list.innerHTML = '';

			if (markAllButton) {
				markAllButton.disabled = !items.some((notification) => !notification.read);
			}

			if (!items.length) {
				list.appendChild(dom.createElement('p', 'pdk-notification-empty', t('empty', 'No notifications')));
				return;
			}

			items.forEach((notification) => {
				list.appendChild(createNotificationItem(notification));
			});
		}

		function openPanel() {
			const preferences = store.getPreferences ? store.getPreferences() : {};
			if (preferences && preferences.enabled === false) {
				return;
			}

			open = true;
			panel.hidden = false;
			panel.classList.add('is-open');
			toggles.forEach((button) => button.classList.add('is-active'));
			render();
		}

		function close() {
			open = false;
			panel.classList.remove('is-open');
			panel.hidden = true;
			toggles.forEach((button) => button.classList.remove('is-active'));
		}

		function toggle() {
			if (open) {
				close();
				return;
			}

			openPanel();
		}

		toggles.forEach((button) => {
			button.setAttribute('aria-label', t('open', 'Open Notifications'));
			button.addEventListener('click', (event) => {
				event.stopPropagation();
				toggle();
			});
		});

		if (markAllButton) {
			markAllButton.textContent = t('markAllRead', 'Mark All as Read');
			markAllButton.addEventListener('click', () => store.markAllRead());
		}

		if (refreshButton) {
			refreshButton.setAttribute('aria-label', t('refresh', 'Refresh'));
			refreshButton.addEventListener('click', () => {
				if (refreshing || typeof store.refresh !== 'function') {
					return;
				}

				refreshing = true;
				refreshButton.classList.add('is-refreshing');
				refreshButton.disabled = true;
				refreshButton.setAttribute('aria-busy', 'true');

				Promise.resolve(store.refresh()).finally(() => {
					refreshing = false;
					refreshButton.classList.remove('is-refreshing');
					refreshButton.disabled = false;
					refreshButton.removeAttribute('aria-busy');
				});
			});
		}

		if (closeButton) {
			closeButton.setAttribute('aria-label', t('close', 'Close'));
			closeButton.addEventListener('click', close);
		}

		document.addEventListener('keydown', (event) => {
			if (event.key === 'Escape' && open) {
				close();
			}
		});
		document.addEventListener('click', (event) => {
			if (!open || panel.contains(event.target) || toggles.some((button) => button.contains(event.target))) {
				return;
			}

			close();
		});

		store.onChange(render);
		render();

		return {
			close,
			open: openPanel,
			render,
			toggle
		};
	}

	window.PufferDesk.notifications.createCenter = createNotificationCenter;
})();
