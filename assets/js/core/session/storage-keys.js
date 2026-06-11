(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.session = window.PufferDesk.session || {};

	function getConfig() {
		return window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function'
			? window.PufferDesk.config.get()
			: {};
	}

	function getContract() {
		const config = getConfig();
		const contracts = config.contracts && typeof config.contracts === 'object' ? config.contracts : {};

		return contracts.storageKeys && typeof contracts.storageKeys === 'object' ? contracts.storageKeys : {};
	}

	function getValue(key) {
		const contract = getContract();
		const value = contract[key];

		return typeof value === 'string' ? value : '';
	}

	function normalizeUserId(userId) {
		const id = Number.parseInt(userId, 10);

		return Number.isFinite(id) && id > 0 ? String(id) : '';
	}

	function getWorkspaceUserPrefix(userId) {
		const id = normalizeUserId(userId);
		const prefix = getValue('workspaceStoragePrefix');
		const separator = getValue('workspaceStorageSeparator');

		return id && prefix ? `${prefix}${id}${separator}` : '';
	}

	window.PufferDesk.session.storageKeys = Object.freeze({
		getReopenSkipKey(storageKey) {
			const base = storageKey || getValue('reopenFallbackBase');

			return `${base}${getValue('reopenSkipSuffix')}`;
		},
		getWallpaperMenuContrastKey(preferenceKey, currentUrl = '') {
			return `${getValue('wallpaperMenuContrastPrefix')}${preferenceKey || ''}${getValue('workspaceStorageSeparator')}${currentUrl || ''}`;
		},
		getWorkspaceBroadcastChannel(storageKey) {
			return `${getValue('workspaceBroadcastPrefix')}${storageKey || ''}`;
		},
		getWorkspaceStorageKey(themeId, userId) {
			const userPrefix = getWorkspaceUserPrefix(userId);

			return userPrefix
				? `${userPrefix}${themeId || ''}${getValue('workspaceStorageSuffix')}`
				: '';
		},
		getWorkspaceUserPrefix,
		isWorkspaceSessionKey(key, userId) {
			const prefix = getWorkspaceUserPrefix(userId);
			const suffix = getValue('workspaceStorageSuffix');

			return Boolean(prefix && suffix && key && key.indexOf(prefix) === 0 && key.endsWith(suffix));
		}
	});
})();
