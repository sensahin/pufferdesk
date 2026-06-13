(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.search = window.PufferDesk.search || {};

	window.PufferDesk.search.createSearchEngine = function createSearchEngine(config = {}, options = {}) {
		const appIds = window.PufferDesk.apps && window.PufferDesk.apps.ids ? window.PufferDesk.apps.ids : {};
		const commandIds = window.PufferDesk.shell && window.PufferDesk.shell.commands ? window.PufferDesk.shell.commands : {};
		const contextConstants = window.PufferDesk.shell && window.PufferDesk.shell.contextMenuConstants
			? window.PufferDesk.shell.contextMenuConstants
			: {};
		const contextTargets = contextConstants.targets || {};
		const commands = options.commands || window.PufferDesk.menuCommands || null;
		const contentSearchStore = options.contentSearchStore || null;
		const documentStore = options.documentStore || null;
		const launcher = options.launcher || window.PufferDesk.appLauncher || null;
		const appNavigation = window.PufferDesk.apps && window.PufferDesk.apps.appNavigation ? window.PufferDesk.apps.appNavigation : null;
		const labels = config.menu && config.menu.labels && typeof config.menu.labels === 'object' ? config.menu.labels : {};
		const settingsLabels = config.settings && config.settings.labels && typeof config.settings.labels === 'object' ? config.settings.labels : {};
		const appMap = new Map((Array.isArray(config.apps) ? config.apps : []).map((app) => [app.id, app]));
		let documentCache = null;
		let documentLoadRequest = null;

		function normalizeText(value) {
			return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
		}

		function normalizeLabel(value) {
			return String(value || '').replace(/\s+/g, ' ').trim();
		}

		function getLabel(key, fallback = '') {
			const value = labels[key];

			return typeof value === 'string' && value ? value : fallback || key;
		}

		function getSettingsLabel(path, fallback = '') {
			const value = String(path || '').split('.').reduce((current, key) => (
				current && Object.prototype.hasOwnProperty.call(current, key) ? current[key] : undefined
			), settingsLabels);

			return typeof value === 'string' && value ? value : fallback || path;
		}

		function getResultTypeLabel(type) {
			return getLabel(`search_type_${type}`, type);
		}

		function getDefaultDetail() {
			return {
				kind: contextTargets.DESKTOP || 'desktop'
			};
		}

		function canExecute(result) {
			if (!result || !result.command || !commands || typeof commands.canExecute !== 'function') {
				return Boolean(result);
			}

			return commands.canExecute(result, result.detail || getDefaultDetail());
		}

		function execute(result) {
			if (!result) {
				return false;
			}

			if (result.command && commands && typeof commands.execute === 'function') {
				return commands.execute(result, result.detail || getDefaultDetail());
			}

			if (result.type === 'app' && launcher && typeof launcher.openApp === 'function') {
				launcher.openApp(result.target || result.id);
				return true;
			}

			if (result.type === 'folder' && launcher && typeof launcher.openFolder === 'function') {
				launcher.openFolder(result.target || result.id);
				return true;
			}

			if (result.type === 'document' && launcher && typeof launcher.openDocumentById === 'function') {
				launcher.openDocumentById(result.target || result.id);
				return true;
			}

			return false;
		}

		function getRecentItems() {
			return window.PufferDesk.menuBar && typeof window.PufferDesk.menuBar.getRecentItems === 'function'
				? window.PufferDesk.menuBar.getRecentItems(config)
				: [];
		}

		function getRecentBoosts() {
			const boosts = new Map();

			getRecentItems().slice(0, 20).forEach((item, index) => {
				const type = typeof item.type === 'string' ? item.type : '';
				const id = String(item.target || item.id || '').trim();

				if (!type || !id) {
					return;
				}

				boosts.set(`${type}:${id}`, Math.max(0, 80 - (index * 3)));
			});

			return boosts;
		}

		function getResultKey(result) {
			return [
				result.type || 'result',
				result.target || result.panel || result.url || result.id || result.label
			].join(':');
		}

		function getSearchText(result) {
			return normalizeText([
				result.label,
				result.subtitle,
				result.path,
				result.snippet,
				result.id,
				result.target,
				result.panel,
				Array.isArray(result.keywords) ? result.keywords.join(' ') : ''
			].filter(Boolean).join(' '));
		}

		function hasOrderedCharacters(text, query) {
			let position = 0;

			for (const character of query) {
				position = text.indexOf(character, position);
				if (position === -1) {
					return false;
				}
				position += 1;
			}

			return true;
		}

		function scoreResult(result, query, recentBoosts) {
			const needle = normalizeText(query);
			const label = normalizeText(result.label);
			const text = result.searchText || getSearchText(result);
			const recentBoost = recentBoosts.get(getResultKey(result)) || 0;
			const typeBoosts = {
				app: 35,
				app_route: 30,
				setting: 28,
				command: 24,
				folder: 20,
				document: 18,
				wp_post: 16,
				wp_page: 16,
				wp_attachment: 16,
				recent: 36
			};
			let score = recentBoost + (typeBoosts[result.type] || 0);

			if (!needle) {
				return score;
			}

			if (label === needle) {
				score += 1000;
			} else if (label.startsWith(needle)) {
				score += 850;
			} else if (label.includes(needle)) {
				score += 650;
			} else if (text.includes(needle)) {
				score += 420;
			} else if (hasOrderedCharacters(text, needle)) {
				score += 160;
			} else {
				return 0;
			}

			return score;
		}

		function normalizeResult(result, defaults = {}) {
			const label = normalizeLabel(result && result.label);
			const type = result && result.type ? result.type : defaults.type || 'result';
			const subtitle = normalizeLabel(result && result.subtitle) || getResultTypeLabel(type);
			const next = Object.assign({}, defaults, result, {
				label,
				subtitle,
				type
			});

			next.searchText = getSearchText(next);

			return label ? next : null;
		}

		function collectAppResults() {
			const locations = config.appLocations && typeof config.appLocations === 'object' ? config.appLocations : {};

			return (Array.isArray(config.apps) ? config.apps : []).filter((app) => (
				app
				&& app.id
				&& app.label
				&& locations[app.id] !== 'hidden'
			)).map((app) => normalizeResult({
				command: commandIds.OPEN_APP,
				icon: app.icon,
				id: app.id,
				keywords: [app.id, app.group, app.kind, app.native].filter(Boolean),
				label: app.label,
				target: app.id,
				title: app.label,
				type: 'app'
			})).filter(Boolean);
		}

		function collectAppRouteResults() {
			const locations = config.appLocations && typeof config.appLocations === 'object' ? config.appLocations : {};

			if (!appNavigation || typeof appNavigation.getRoutes !== 'function') {
				return [];
			}

			return (Array.isArray(config.apps) ? config.apps : []).filter((app) => (
				app
				&& app.id
				&& app.label
				&& locations[app.id] !== 'hidden'
			)).flatMap((app) => appNavigation.getRoutes(app).map((route) => normalizeResult({
				command: commandIds.APP_OPEN_ROUTE,
				icon: app.icon,
				id: `app-route-${route.id}`,
				keywords: [app.id, app.label, app.group, route.parent, route.slug].filter(Boolean),
				label: route.label,
				payload: {
					appId: app.id,
					routeId: route.id
				},
				subtitle: app.label,
				target: app.id,
				title: route.title || route.label,
				type: 'app_route',
				url: route.url
			}))).filter(Boolean);
		}

		function collectFolderResults() {
			const folders = (Array.isArray(config.folders) ? config.folders : [])
				.concat(Array.isArray(config.desktopFolders) ? config.desktopFolders : []);
			const seen = new Set();

			return folders.map((folder) => {
				const id = String(folder && folder.id || '').trim();

				if (!id || seen.has(id)) {
					return null;
				}

				seen.add(id);
				return normalizeResult({
					command: commandIds.OPEN_FOLDER,
					icon: folder.icon || 'dashicons-category',
					id,
					keywords: [folder.kind, folder.special, folder.path].filter(Boolean),
					label: folder.label || getLabel('folder', 'Folder'),
					path: folder.path || '',
					target: id,
					title: folder.label || id,
					type: 'folder'
				});
			}).filter(Boolean);
		}

		function collectSettingsResults() {
			const sidebar = settingsLabels.sidebar && typeof settingsLabels.sidebar === 'object' ? settingsLabels.sidebar : {};
			const items = Array.isArray(sidebar.items) ? sidebar.items : [];
			const profileTitle = getSettingsLabel('profile.sectionLabel', '');
			const settingsApp = appMap.get(appIds.OS_SETTINGS) || {};
			const results = items.filter((item) => item && item.visible !== false && !item.disabled).map((item) => normalizeResult({
				command: commandIds.SETTINGS_OPEN_PANEL,
				icon: item.icon || settingsApp.icon || 'dashicons-admin-settings',
				id: `settings-${item.id}`,
				keywords: [item.id, getLabel('system_settings', 'System Settings')],
				label: item.label || item.id,
				panel: item.id,
				target: appIds.OS_SETTINGS,
				type: 'setting'
			})).filter(Boolean);

			if (profileTitle) {
				results.push(normalizeResult({
					command: commandIds.SETTINGS_OPEN_PANEL,
					icon: 'dashicons-admin-users',
					id: 'settings-profile',
					keywords: ['profile', 'account', 'user'],
					label: profileTitle,
					panel: 'profile',
					target: appIds.OS_SETTINGS,
					type: 'setting'
				}));
			}

			return results;
		}

		function getCommandDescriptors() {
			return [
				{
					command: commandIds.DOCUMENT_NEW_STICKY_NOTE,
					icon: window.PufferDesk.documents && typeof window.PufferDesk.documents.getStickyNoteDocumentIcon === 'function'
						? window.PufferDesk.documents.getStickyNoteDocumentIcon()
						: 'dashicons-media-text',
					id: 'new-sticky-note',
					keywords: ['sticky', 'note', 'document'],
					label: getLabel('new_sticky_note', 'New Sticky Note')
				},
				{
					command: commandIds.FOLDER_CREATE,
					icon: 'dashicons-category',
					id: 'new-folder',
					keywords: ['folder', 'directory'],
					label: getLabel('new_folder', 'New Folder')
				},
				{
					command: commandIds.HELP_KEYBOARD_SHORTCUTS,
					icon: 'dashicons-keyboard',
					id: 'keyboard-shortcuts',
					keywords: ['help', 'shortcuts', 'keys'],
					label: getLabel('keyboard_shortcuts', 'Keyboard Shortcuts')
				},
				{
					command: commandIds.WINDOW_SHOW_ALL,
					icon: 'dashicons-visibility',
					id: 'show-all-windows',
					keywords: ['windows', 'show'],
					label: getLabel('show_all_windows', 'Show All')
				},
				{
					command: commandIds.SHELL_RESTART,
					icon: 'dashicons-update',
					id: 'restart-pufferdesk',
					keywords: ['reload', 'refresh', 'shell'],
					label: getSettingsLabel('system.restartLabel', getLabel('start_restart', 'Restart'))
				},
				{
					command: commandIds.SHELL_SWITCH_CLASSIC,
					icon: 'dashicons-admin-site-alt3',
					id: 'switch-classic-admin',
					keywords: ['classic', 'wordpress', 'admin'],
					label: getSettingsLabel('system.classicLabel', 'Switch to Classic Admin...'),
					target: config.classicUrl || ''
				},
				{
					command: commandIds.SOUND_TOGGLE_MUTE,
					icon: 'dashicons-controls-volumeon',
					id: 'sound-toggle-mute',
					keywords: ['audio', 'volume', 'mute', 'unmute'],
					label: getLabel('sound_mute', 'Mute')
				}
			];
		}

		function collectCommandResults() {
			return getCommandDescriptors().map((descriptor) => normalizeResult(Object.assign({}, descriptor, {
				subtitle: getResultTypeLabel('command'),
				type: 'command'
			}))).filter(Boolean);
		}

		function normalizeRecentItem(item) {
			const type = item && typeof item.type === 'string' ? item.type : '';
			const id = String(item && (item.target || item.id) || '').trim();
			const label = normalizeLabel(item && (item.label || item.title));

			if (!id || !label || !['app', 'folder', 'document'].includes(type)) {
				return null;
			}

			if (type === 'app' && !appMap.has(id)) {
				return null;
			}

			return normalizeResult({
				command: item.command || (type === 'app' ? commandIds.OPEN_APP : type === 'folder' ? commandIds.OPEN_FOLDER : commandIds.DOCUMENT_OPEN),
				icon: item.icon || (type === 'folder' ? 'dashicons-category' : type === 'document' ? 'dashicons-media-document' : 'dashicons-admin-generic'),
				id: `recent-${type}-${id}`,
				keywords: ['recent'],
				label,
				subtitle: getLabel('recent_item', 'Recent Item'),
				target: id,
				title: item.title || label,
				type
			});
		}

		function collectSuggestionResults() {
			return getRecentItems().slice(0, 8).map(normalizeRecentItem).filter(Boolean)
				.concat(collectCommandResults().slice(0, 4));
		}

		function getStickyKind() {
			return documentStore && documentStore.kinds ? documentStore.kinds.sticky : '';
		}

		function getDocumentIcon() {
			return window.PufferDesk.documents && typeof window.PufferDesk.documents.getStickyNoteDocumentIcon === 'function'
				? window.PufferDesk.documents.getStickyNoteDocumentIcon()
				: 'dashicons-media-text';
		}

		function loadDocuments() {
			if (!documentStore || typeof documentStore.list !== 'function') {
				return Promise.resolve([]);
			}

			if (documentCache) {
				return Promise.resolve(documentCache);
			}

			if (documentLoadRequest) {
				return documentLoadRequest;
			}

			documentLoadRequest = documentStore.list(getStickyKind(), {
				includeAllFolders: true
			}).then((documents) => {
				documentCache = Array.isArray(documents) ? documents : [];
				return documentCache;
			}).catch(() => {
				documentCache = [];
				return documentCache;
			}).finally(() => {
				documentLoadRequest = null;
			});

			return documentLoadRequest;
		}

		function collectDocumentResults(documents) {
			return (Array.isArray(documents) ? documents : []).map((documentData) => {
				const id = Number.parseInt(documentData && documentData.id, 10);
				const content = normalizeLabel(documentData && documentData.content);
				const snippet = content ? content.slice(0, 120) : '';

				if (!id) {
					return null;
				}

				return normalizeResult({
					command: commandIds.DOCUMENT_OPEN,
					icon: getDocumentIcon(),
					id: `document-${id}`,
					keywords: [documentData.kind, documentData.parentPath, documentData.path].filter(Boolean),
					label: documentData.title || getLabel('sticky_note', 'Sticky Note'),
					path: documentData.path || documentData.parentPath || '',
					snippet,
					subtitle: getLabel('sticky_note', getResultTypeLabel('document')),
					target: String(id),
					type: 'document'
				});
			}).filter(Boolean);
		}

		function loadContentResults(query, searchOptions = {}) {
			if (!contentSearchStore || typeof contentSearchStore.search !== 'function') {
				return Promise.resolve([]);
			}

			return contentSearchStore.search(query, searchOptions).catch(() => []);
		}

		function mergeAndRank(results, query, options = {}) {
			const recentBoosts = getRecentBoosts();
			const byKey = new Map();
			const limit = Number.parseInt(options.limit, 10);
			const max = Number.isFinite(limit) && limit > 0 ? limit : 18;

			results.forEach((result) => {
				const normalized = normalizeResult(result);
				if (!normalized || !canExecute(normalized)) {
					return;
				}

				const score = scoreResult(normalized, query, recentBoosts);
				if (!score && query) {
					return;
				}

				const key = getResultKey(normalized);
				const previous = byKey.get(key);
				const next = Object.assign({}, normalized, {
					score
				});

				if (!previous || previous.score < score) {
					byKey.set(key, next);
				}
			});

			return Array.from(byKey.values())
				.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
				.slice(0, max);
		}

		function search(query, searchOptions = {}) {
			const needle = normalizeText(query);
			const baseResults = collectAppResults()
				.concat(collectAppRouteResults())
				.concat(collectFolderResults())
				.concat(collectSettingsResults())
				.concat(collectCommandResults());

			if (!needle) {
				return Promise.resolve(mergeAndRank(collectSuggestionResults(), '', searchOptions));
			}

			return Promise.all([
				loadDocuments(),
				loadContentResults(query, searchOptions)
			]).then(([documents, contentResults]) => mergeAndRank(
				baseResults
					.concat(collectDocumentResults(documents))
					.concat(Array.isArray(contentResults) ? contentResults : []),
				needle,
				searchOptions
			));
		}

		if (window.PufferDesk.events && typeof window.PufferDesk.events.on === 'function') {
			const eventNames = window.PufferDesk.events.names || {};
			if (eventNames.DOCUMENTS_CHANGED) {
				window.PufferDesk.events.on(eventNames.DOCUMENTS_CHANGED, () => {
					documentCache = null;
				});
			}
		}

		return {
			execute,
			search
		};
	};
})();
