(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	window.PufferDesk.apps.createFolderWindowState = function createFolderWindowState(options = {}) {
		const getFolder = typeof options.getFolder === 'function' ? options.getFolder : () => null;
		const folderWindowHistory = new WeakMap();
		let folderTabSequence = 0;

		function createTab(folderId, tabOptions = {}) {
			const tabId = tabOptions.id || `folder-tab-${Date.now()}-${++folderTabSequence}`;
			const entries = Array.isArray(tabOptions.entries) && tabOptions.entries.length
				? tabOptions.entries.filter((entry) => getFolder(entry))
				: [folderId];
			const index = Number.isInteger(tabOptions.index)
				? Math.max(0, Math.min(tabOptions.index, entries.length - 1))
				: Math.max(0, entries.length - 1);
			const activeFolderId = entries[index] || folderId;

			return {
				entries: entries.length ? entries : [folderId],
				folderId: activeFolderId,
				id: tabId,
				index
			};
		}

		function getState(win, fallbackFolderId = '') {
			let state = win ? folderWindowHistory.get(win) : null;

			if (!state) {
				state = {
					activeTabId: '',
					tabs: []
				};
				if (win) {
					folderWindowHistory.set(win, state);
				}
			}

			if (!state.tabs.length && fallbackFolderId) {
				const tab = createTab(fallbackFolderId);
				state.tabs.push(tab);
				state.activeTabId = tab.id;
			}

			if (!state.activeTabId && state.tabs[0]) {
				state.activeTabId = state.tabs[0].id;
			}

			return state;
		}

		function getActiveTab(win, fallbackFolderId = '') {
			const state = getState(win, fallbackFolderId);
			let tab = state.tabs.find((item) => item.id === state.activeTabId) || state.tabs[0] || null;

			if (!tab && fallbackFolderId) {
				tab = createTab(fallbackFolderId);
				state.tabs.push(tab);
				state.activeTabId = tab.id;
			}

			return tab;
		}

		function findTab(win, folderId) {
			const state = win ? folderWindowHistory.get(win) : null;

			return state && Array.isArray(state.tabs)
				? state.tabs.find((tab) => tab.folderId === folderId) || null
				: null;
		}

		function setTabs(win, rawTabs = [], activeTabId = '', fallbackFolderId = '') {
			const state = getState(win);
			const tabs = [];
			const seen = new Set();

			(Array.isArray(rawTabs) ? rawTabs : []).forEach((tab) => {
				if (!tab || typeof tab !== 'object') {
					return;
				}

				const folderId = typeof tab.folderId === 'string' && getFolder(tab.folderId) ? tab.folderId : '';
				const entries = Array.isArray(tab.entries) ? tab.entries.filter((entry) => getFolder(entry)) : [];
				const effectiveFolderId = folderId || entries[Number.isInteger(tab.index) ? tab.index : entries.length - 1] || fallbackFolderId;
				if (!effectiveFolderId || !getFolder(effectiveFolderId)) {
					return;
				}

				const normalized = createTab(effectiveFolderId, {
					entries: entries.length ? entries : [effectiveFolderId],
					id: typeof tab.id === 'string' && tab.id && !seen.has(tab.id) ? tab.id : '',
					index: Number.isInteger(tab.index) ? tab.index : entries.length - 1
				});

				seen.add(normalized.id);
				tabs.push(normalized);
			});

			if (!tabs.length && fallbackFolderId && getFolder(fallbackFolderId)) {
				tabs.push(createTab(fallbackFolderId));
			}

			state.tabs = tabs;
			state.activeTabId = tabs.some((tab) => tab.id === activeTabId)
				? activeTabId
				: tabs[0] ? tabs[0].id : '';

			return state;
		}

		function getWindowState(win) {
			const tab = getActiveTab(win);

			if (!tab) {
				return {
					entries: [],
					index: -1
				};
			}

			return tab;
		}

		function updateHistory(win, folderId, historyOptions = {}) {
			const tab = getActiveTab(win, folderId);

			if (!tab) {
				return null;
			}

			if (historyOptions.reset || tab.index < 0) {
				tab.entries = [folderId];
				tab.folderId = folderId;
				tab.index = 0;
				return tab;
			}

			if (historyOptions.replace) {
				tab.entries[tab.index] = folderId;
				tab.folderId = folderId;
				return tab;
			}

			if (tab.entries[tab.index] === folderId) {
				tab.folderId = folderId;
				return tab;
			}

			tab.entries = tab.entries.slice(0, tab.index + 1);
			tab.entries.push(folderId);
			tab.folderId = folderId;
			tab.index = tab.entries.length - 1;

			return tab;
		}

		function getHistoryState(win) {
			const state = win ? getWindowState(win) : null;

			return {
				canBack: Boolean(state && state.index > 0),
				canForward: Boolean(state && state.index >= 0 && state.index < state.entries.length - 1)
			};
		}

		function serialize(win, fallbackFolderId = '') {
			const state = getState(win, fallbackFolderId);

			return {
				activeTabId: state.activeTabId || '',
				tabs: state.tabs.map((tab) => ({
					entries: tab.entries.slice(),
					folderId: tab.folderId,
					id: tab.id,
					index: tab.index
				}))
			};
		}

		function windowHasFolderTab(win, folderId) {
			const state = win ? folderWindowHistory.get(win) : null;

			return Boolean(state && Array.isArray(state.tabs) && state.tabs.some((tab) => tab.folderId === folderId));
		}

		return {
			createTab,
			findTab,
			getActiveTab,
			getHistoryState,
			getState,
			getWindowState,
			serialize,
			setTabs,
			updateHistory,
			windowHasFolderTab
		};
	};
})();
