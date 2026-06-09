(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};

	const defaults = {
		auto_hide: 'fullscreen',
		show_background: false,
		recent_count: 10
	};
	const allowedAutoHide = ['always', 'desktop', 'fullscreen', 'never'];
	const recentLimit = 50;
	let hideTimer = null;

	function normalizeBoolean(value) {
		if (typeof value === 'boolean') {
			return value;
		}

		if (typeof value === 'number') {
			return value === 1;
		}

		return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
	}

	function normalizeCount(value) {
		const parsed = Number.parseInt(value, 10);

		return Number.isFinite(parsed) ? Math.max(0, Math.min(recentLimit, parsed)) : defaults.recent_count;
	}

	function normalize(preferences = {}) {
		const autoHide = String(preferences.auto_hide || '');

		return {
			auto_hide: allowedAutoHide.includes(autoHide) ? autoHide : defaults.auto_hide,
			show_background: Object.prototype.hasOwnProperty.call(preferences, 'show_background')
				? normalizeBoolean(preferences.show_background)
				: defaults.show_background,
			recent_count: normalizeCount(preferences.recent_count)
		};
	}

	function isFullscreen(shell) {
		return shell.dataset.pdkFullscreenWindow === '1';
	}

	function shouldAutoHide(shell, preferences) {
		const current = normalize(preferences);

		if (current.auto_hide === 'never') {
			return false;
		}
		if (current.auto_hide === 'always') {
			return true;
		}
		if (current.auto_hide === 'fullscreen') {
			return isFullscreen(shell);
		}

		return !isFullscreen(shell);
	}

	function setRevealed(shell, revealed) {
		shell.dataset.pdkMenuBarRevealed = revealed ? '1' : '0';
	}

	function syncHiddenState(shell, preferences) {
		const hidden = shouldAutoHide(shell, preferences);
		shell.dataset.pdkMenuBarHidden = hidden ? '1' : '0';
		if (!hidden) {
			setRevealed(shell, false);
		}

		shell.dispatchEvent(new window.CustomEvent('pufferDesk:menu-bar-layout-change', {
			detail: {
				hidden
			}
		}));
	}

	function apply(shell, preferences = {}) {
		if (!shell) {
			return normalize(preferences);
		}

		const current = normalize(preferences);
		shell.dataset.pdkMenuBarAutoHide = current.auto_hide;
		shell.dataset.pdkMenuBarBackground = current.show_background ? '1' : '0';
		shell.dataset.pdkMenuBarRecentCount = String(current.recent_count);
		syncHiddenState(shell, current);
		shell.dispatchEvent(new window.CustomEvent('pufferDesk:menu-bar-change', {
			detail: current
		}));

		return current;
	}

	function bindAutoHide(shell) {
		const menuBar = shell ? shell.querySelector('.pdk-menu-bar') : null;

		if (!shell || !menuBar || shell.dataset.pdkMenuBarBound === '1') {
			return;
		}

		shell.dataset.pdkMenuBarBound = '1';

		const reveal = () => {
			if (shell.dataset.pdkMenuBarHidden === '1') {
				window.clearTimeout(hideTimer);
				setRevealed(shell, true);
			}
		};
		const conceal = () => {
			if (shell.dataset.pdkMenuBarHidden === '1') {
				hideTimer = window.setTimeout(() => setRevealed(shell, false), 220);
			}
		};

		document.addEventListener('pointermove', (event) => {
			if (shell.dataset.pdkMenuBarHidden !== '1') {
				return;
			}

			if (event.clientY <= 4) {
				reveal();
			} else if (!menuBar.contains(event.target) && event.clientY > menuBar.offsetHeight + 10) {
				conceal();
			}
		}, { passive: true });
		menuBar.addEventListener('pointerenter', reveal);
		menuBar.addEventListener('pointerleave', conceal);
		shell.addEventListener('pufferDesk:fullscreen-window-change', () => {
			apply(shell, {
				auto_hide: shell.dataset.pdkMenuBarAutoHide,
				show_background: shell.dataset.pdkMenuBarBackground === '1',
				recent_count: shell.dataset.pdkMenuBarRecentCount
			});
		});
	}

	function getSessionStore(config = {}) {
		if (
			!config.storageKey ||
			!window.PufferDesk.session ||
			!window.PufferDesk.session.createSessionStore
		) {
			return null;
		}

		return window.PufferDesk.session.createSessionStore(config.storageKey);
	}

	function normalizeRecentItem(item = {}) {
		const type = typeof item.type === 'string' ? item.type : 'app';
		const id = typeof item.id === 'string' ? item.id : '';
		const label = typeof item.label === 'string' ? item.label : '';

		if (!id || !label) {
			return null;
		}

		return {
			command: typeof item.command === 'string' ? item.command : 'open-app',
			icon: item.icon || '',
			id,
			label,
			target: typeof item.target === 'string' ? item.target : id,
			title: typeof item.title === 'string' ? item.title : label,
			type,
			url: typeof item.url === 'string' ? item.url : ''
		};
	}

	function getRecentItems(config = {}) {
		const store = getSessionStore(config);
		const items = store ? store.getSection('recentItems', []) : [];

		return Array.isArray(items) ? items.map(normalizeRecentItem).filter(Boolean) : [];
	}

	function getConfigApp(config = {}, appId = '') {
		const apps = Array.isArray(config.apps) ? config.apps : [];

		return apps.find((app) => app && app.id === appId) || null;
	}

	function getConfigLabel(config = {}, key = '', fallback = '') {
		const labels = config.menu && config.menu.labels && typeof config.menu.labels === 'object'
			? config.menu.labels
			: {};
		const value = labels[key];

		return typeof value === 'string' && value ? value : fallback;
	}

	function getRecentDisplayItem(config = {}, item = {}) {
		const appId = item.type === 'app' ? item.target || item.id : '';
		const app = appId ? getConfigApp(config, appId) : null;

		if (app) {
			return Object.assign({}, item, {
				icon: app.icon || item.icon,
				label: app.label || item.label,
				target: app.id,
				title: app.label || item.title || item.label
			});
		}

		if (item.type === 'folder' && (item.target || item.id) === 'trash') {
			const trashLabel = getConfigLabel(config, 'trash', item.label || 'Trash');

			return Object.assign({}, item, {
				label: trashLabel,
				title: trashLabel
			});
		}

		return item;
	}

	function saveRecentItems(config = {}, items = []) {
		const store = getSessionStore(config);
		if (store) {
			store.saveSection('recentItems', items.slice(0, recentLimit));
		}
	}

	function addRecentItem(config = {}, item = {}) {
		const normalized = normalizeRecentItem(item);
		if (!normalized) {
			return [];
		}

		const key = `${normalized.type}:${normalized.id}`;
		const next = getRecentItems(config)
			.filter((current) => `${current.type}:${current.id}` !== key);
		next.unshift(normalized);
		saveRecentItems(config, next);
		window.dispatchEvent(new window.CustomEvent('pufferDesk:recent-items-change', {
			detail: {
				items: next
			}
		}));

		return next;
	}

	function clearRecentItems(config = {}) {
		saveRecentItems(config, []);
		window.dispatchEvent(new window.CustomEvent('pufferDesk:recent-items-change', {
			detail: {
				items: []
			}
		}));

		return [];
	}

	function getRecentMenuItems(config = {}, count = defaults.recent_count) {
		return getRecentItems(config)
			.slice(0, normalizeCount(count))
			.map((item) => {
				const displayItem = getRecentDisplayItem(config, item);

				return {
					command: displayItem.command,
					icon: displayItem.icon,
					id: `recent-${displayItem.type}-${displayItem.id}`.replace(/[^a-z0-9_-]/gi, '-'),
					label: displayItem.label,
					target: displayItem.target,
					title: displayItem.title,
					url: displayItem.url
				};
			});
	}

	window.PufferDesk.menuBar = {
		addRecentItem,
		apply,
		bindAutoHide,
		clearRecentItems,
		defaults,
		getRecentItems,
		getRecentMenuItems,
		normalize
	};
})();
