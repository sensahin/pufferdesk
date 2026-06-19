(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.windows = window.PufferDesk.windows || {};

	window.PufferDesk.windows.createWindowManager = function createWindowManager(shell, options = {}) {
		const dom = window.PufferDesk.dom;
		const createDebouncedTask = window.PufferDesk.services.createDebouncedTask;
		const desktop = shell.querySelector('.pdk-desktop');
		const dock = shell.querySelector('.pdk-dock');
		const menuBar = shell.querySelector('.pdk-menu-bar');
		const sessionStore = window.PufferDesk.session.createSessionStore(options.storageKey || '');
		const menuBarState = window.PufferDesk.menuBar || null;
		const eventBus = window.PufferDesk.events && typeof window.PufferDesk.events.emit === 'function'
			? window.PufferDesk.events
			: null;
		const eventNames = eventBus && eventBus.names ? eventBus.names : {};
		const domEventNames = window.PufferDesk.events && window.PufferDesk.events.domNames ? window.PufferDesk.events.domNames : {};
		const workspaceSections = window.PufferDesk.session && window.PufferDesk.session.workspace
			? window.PufferDesk.session.workspace.sections || {}
			: {};
		const runtimeConfig = window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function'
			? window.PufferDesk.config.get()
			: {};
		const iframeConfig = runtimeConfig.iframe && typeof runtimeConfig.iframe === 'object' ? runtimeConfig.iframe : {};
		const iframeLabels = Object.assign({
			errorDescription: 'PufferDesk kept the page covered because it did not confirm iframe mode.',
			errorTitle: 'This page could not be safely embedded.',
			loadingDescription: '',
			loadingTitle: 'Loading...',
			openClassic: 'Open in Classic Admin',
			retry: 'Retry'
		}, iframeConfig.labels && typeof iframeConfig.labels === 'object' ? iframeConfig.labels : {});
		const iframeReadyTimeoutMs = Number.isFinite(Number(iframeConfig.readyTimeoutMs))
			? Math.max(1000, Number(iframeConfig.readyTimeoutMs))
			: 6000;
		const windowPlacementPrefixes = window.PufferDesk.session && window.PufferDesk.session.workspace
			? window.PufferDesk.session.workspace.windowPlacementPrefixes || {}
			: {};
		const windowKinds = window.PufferDesk.session && window.PufferDesk.session.workspace
			? window.PufferDesk.session.workspace.windowKinds || {}
			: {};
		const iframeQueryKey = window.PufferDesk.config.getRouterQueryKey('iframe');
		const iframeQueryValue = window.PufferDesk.config.getRouterValue('true');
		const classicQueryKey = window.PufferDesk.config.getRouterQueryKey('classic');
		const routerPageQueryKey = window.PufferDesk.config.getRouterQueryKey('page');
		const routerPageSlug = runtimeConfig.contracts
			&& runtimeConfig.contracts.router
			&& typeof runtimeConfig.contracts.router.pageSlug === 'string'
			? runtimeConfig.contracts.router.pageSlug
			: 'pufferdesk';
		let zIndex = 30;
		let windowId = 0;
		let activeWindow = null;
		let restoreInProgress = false;
		let preserveStoredWindowsUntilChange = Boolean(options.preserveStoredWindowsUntilChange);
		let sessionSaveDisabled = false;
		let showDesktopActive = false;
		let showDesktopWindows = new Set();
		let pendingWindowPlacements = {};
		const sessionSaveTask = createDebouncedTask(() => saveSession(), {
			shouldRun: () => Boolean(options.storageKey && !restoreInProgress && !sessionSaveDisabled),
			wait: 160
		});
		const resizeObserver = typeof window.ResizeObserver === 'function'
			? new window.ResizeObserver(() => scheduleSave())
			: null;
		const layout = window.PufferDesk.windows.createWindowLayout(shell, {
			desktop,
			dock,
			isVisibleWindow,
			menuBar
		});
		const windowState = window.PufferDesk.windows.createWindowState(shell, {
			desktop,
			emitWindowStateChanged,
			layout,
			setZIndexFloor
		});
		const windowDock = window.PufferDesk.windows.createWindowDock(shell, {
			constrainWindow,
			desktop,
			dock,
			emitWindowStateChanged,
			focusWindow,
			getActiveWindow: () => activeWindow,
			getTopVisibleWindow,
			getWindowId,
			isVisibleWindow,
			scheduleSave,
			setActiveWindow
		});
		const interactions = window.PufferDesk.windows.createWindowInteractions(shell, {
			desktop,
			emitWindowStateChanged,
			focusWindow,
			layout,
			scheduleSave,
			toggleMaximizeWindow
		});
		const factory = window.PufferDesk.windows.createWindowFactory({
			onMinimize(win) {
				minimizeWindow(win);
			},

			onMaximize(win) {
				toggleMaximizeWindow(win);
			},

			onClose(win, appId) {
				closeWindow(win, appId);
			}
		});

		function getWindowEventDetail(win, detail = {}) {
			const state = win ? readWindowState(win) : null;
			const folderId = win && win.dataset ? win.dataset.pdkFolderWindow || win.dataset.pdkFolderInfoWindow || '' : '';

			return Object.assign({
				active: Boolean(win && activeWindow === win),
				appId: win && win.dataset ? win.dataset.pdkAppWindow || '' : '',
				folderId,
				hidden: Boolean(win && win.classList.contains('is-hidden')),
				kind: win && win.dataset ? win.dataset.pdkWindowKind || (win.dataset.pdkAppWindow ? windowKinds.APP : windowKinds.WINDOW) : '',
				maximized: Boolean(win && win.classList.contains('is-maximized')),
				restoring: restoreInProgress,
				state,
				title: win && win.dataset ? win.dataset.pdkWindowTitle || win.getAttribute('aria-label') || '' : '',
				url: win && win.dataset ? win.dataset.pdkWindowUrl || '' : '',
				windowElement: win || null,
				windowIdentity: win && win.dataset ? win.dataset.pdkWindowIdentity || '' : '',
				windowId: win ? getWindowId(win) : ''
			}, detail);
		}

		function emitWindowEvent(name, win, detail = {}) {
			if (!eventBus || !name) {
				return null;
			}

			return eventBus.emit(name, getWindowEventDetail(win, detail));
		}

		function emitWindowStateChanged(win, change, detail = {}) {
			return emitWindowEvent(eventNames.WINDOW_STATE_CHANGED, win, Object.assign({
				change
			}, detail));
		}

		function withIframeParam(url) {
			if (!iframeQueryKey || !iframeQueryValue) {
				return url;
			}

			try {
				const next = new URL(url, window.location.origin);
				next.searchParams.set(iframeQueryKey, iframeQueryValue);
				return next.toString();
			} catch (error) {
				const joiner = url.indexOf('?') === -1 ? '?' : '&';
				return `${url}${joiner}${window.encodeURIComponent(iframeQueryKey)}=${window.encodeURIComponent(iframeQueryValue)}`;
			}
		}

		function withoutIframeParam(url) {
			if (!url || !iframeQueryKey) {
				return url || '';
			}

			try {
				const next = new URL(url, window.location.origin);
				next.searchParams.delete(iframeQueryKey);
				return next.toString();
			} catch (error) {
				return url;
			}
		}

		function getFrameUrl(frame) {
			if (!frame) {
				return '';
			}

			try {
				const href = frame.contentWindow && frame.contentWindow.location
					? frame.contentWindow.location.href
					: frame.getAttribute('src') || '';
				return href && href !== 'about:blank' ? href : frame.getAttribute('src') || '';
			} catch (error) {
				return frame.getAttribute('src') || '';
			}
		}

		function isWordPressAdminFrameUrl(url) {
			try {
				const next = new URL(url, window.location.origin);
				return next.origin === window.location.origin && next.pathname.indexOf('/wp-admin/') !== -1;
			} catch (error) {
				return false;
			}
		}

		function isShellFrameUrl(url) {
			if (!routerPageQueryKey || !routerPageSlug || !isWordPressAdminFrameUrl(url)) {
				return false;
			}

			try {
				const next = new URL(url, window.location.origin);
				return next.searchParams.get(routerPageQueryKey) === routerPageSlug;
			} catch (error) {
				return false;
			}
		}

		function needsIframeParam(url) {
			if (!iframeQueryKey || !iframeQueryValue || !isWordPressAdminFrameUrl(url)) {
				return false;
			}

			try {
				const next = new URL(url, window.location.origin);
				return next.searchParams.get(iframeQueryKey) !== iframeQueryValue;
			} catch (error) {
				return false;
			}
		}

		function isSafeIframeUrl(url) {
			return isWordPressAdminFrameUrl(url) && !isShellFrameUrl(url) && !needsIframeParam(url);
		}

		function getClassicIframeDashboardUrl() {
			try {
				const shellUrl = new URL(runtimeConfig.shellUrl || '/wp-admin/admin.php', window.location.origin);
				const next = new URL('index.php', shellUrl);
				next.search = '';
				if (classicQueryKey) {
					next.searchParams.set(classicQueryKey, iframeQueryValue || '1');
				}
				if (iframeQueryKey) {
					next.searchParams.set(iframeQueryKey, iframeQueryValue || '1');
				}

				return next.toString();
			} catch (error) {
				return withIframeParam('/wp-admin/index.php');
			}
		}

		function getIframeVeil(win) {
			return win ? win.querySelector('[data-pdk-iframe-veil]') : null;
		}

		function setIframeVeilText(win, state, detail = {}) {
			const veil = getIframeVeil(win);
			if (!veil) {
				return;
			}

			const title = veil.querySelector('[data-pdk-iframe-veil-title]');
			const description = veil.querySelector('[data-pdk-iframe-veil-description]');
			const nextDescription = state === 'error'
				? detail.description || iframeLabels.errorDescription
				: detail.description || iframeLabels.loadingDescription;
			if (title) {
				title.textContent = state === 'error'
					? detail.title || iframeLabels.errorTitle
					: detail.title || iframeLabels.loadingTitle;
			}
			if (description) {
				description.textContent = nextDescription;
				description.hidden = !nextDescription;
			}
		}

		function clearIframeReadyTimer(win) {
			if (win && win.pdkIframeReadyTimer) {
				window.clearTimeout(win.pdkIframeReadyTimer);
				win.pdkIframeReadyTimer = null;
			}
		}

		function startIframeReadyTimer(win) {
			if (!win || win.dataset.pdkIframeState === 'ready') {
				return;
			}

			clearIframeReadyTimer(win);
			win.pdkIframeReadyTimer = window.setTimeout(() => {
				if (win.dataset.pdkIframeState !== 'ready') {
					setIframeState(win, 'error');
				}
			}, iframeReadyTimeoutMs);
		}

		function setIframeState(win, state, detail = {}) {
			if (!win || !state) {
				return;
			}

			win.dataset.pdkIframeState = state;
			setIframeVeilText(win, state, detail);
			if (state === 'ready' || state === 'error') {
				clearIframeReadyTimer(win);
				return;
			}

			if (state === 'loading') {
				startIframeReadyTimer(win);
			}
		}

		function normalizeIframeContext(context) {
			return context && typeof context === 'object' && !Array.isArray(context)
				? context
				: null;
		}

		function setIframeContext(win, context, detail = {}) {
			if (!win) {
				return;
			}

			const normalized = normalizeIframeContext(context);
			win.pdkIframeContext = normalized;
			if (normalized && typeof normalized.confidence === 'string') {
				win.dataset.pdkIframeContextConfidence = normalized.confidence;
			} else {
				delete win.dataset.pdkIframeContextConfidence;
			}

			emitWindowEvent(eventNames.IFRAME_CONTEXT_CHANGED, win, {
				context: normalized,
				href: detail.href || (win.dataset ? win.dataset.pdkWindowUrl || '' : ''),
				phase: detail.phase || (normalized ? 'ready' : 'loading')
			});
		}

		function prepareIframeNavigation(win, detail = {}) {
			const frame = win ? win.querySelector('iframe.pdk-app-frame') : null;
			if (!frame) {
				return false;
			}

			setIframeState(win, 'loading', detail);
			setIframeContext(win, null, {
				phase: 'loading'
			});
			return true;
		}

		function syncIframeUrl(win, frame) {
			const url = getFrameUrl(frame);
			if (!url) {
				return false;
			}

			if (isShellFrameUrl(url)) {
				setIframeState(win, 'loading');
				frame.src = getClassicIframeDashboardUrl();
				return true;
			}

			if (!isWordPressAdminFrameUrl(url)) {
				setIframeState(win, 'error');
				return false;
			}

			if (needsIframeParam(url)) {
				setIframeState(win, 'loading');
				frame.src = withIframeParam(url);
				return true;
			}

			win.dataset.pdkWindowUrl = withoutIframeParam(url);
			scheduleSave();
			return false;
		}

		function retryIframeWindow(win) {
			const frame = win ? win.querySelector('iframe.pdk-app-frame') : null;
			const src = frame ? frame.getAttribute('src') || withIframeParam(win.dataset.pdkWindowUrl || '') : '';

			if (!frame || !src) {
				return;
			}

			prepareIframeNavigation(win);
			frame.setAttribute('src', src);
		}

		function openIframeInClassic(win) {
			const frame = win ? win.querySelector('iframe.pdk-app-frame') : null;
			const url = withoutIframeParam(getFrameUrl(frame) || (win && win.dataset ? win.dataset.pdkWindowUrl : '') || '');

			if (url) {
				window.open(url, '_blank', 'noopener');
			}
		}

		function bindIframeVeilActions(win) {
			const veil = getIframeVeil(win);
			if (!veil || veil.dataset.pdkIframeVeilBound === '1') {
				return;
			}

			veil.dataset.pdkIframeVeilBound = '1';
			veil.querySelectorAll('[data-pdk-iframe-retry]').forEach((button) => {
				button.addEventListener('click', () => retryIframeWindow(win));
			});
			veil.querySelectorAll('[data-pdk-iframe-open-classic]').forEach((button) => {
				button.addEventListener('click', () => openIframeInClassic(win));
			});
		}

		function bindIframeGuard(win) {
			const frame = win.querySelector('iframe.pdk-app-frame');
			if (!frame || frame.dataset.pdkIframeGuardBound === '1') {
				return;
			}

			frame.dataset.pdkIframeGuardBound = '1';
			bindIframeVeilActions(win);
			prepareIframeNavigation(win);
			frame.addEventListener('load', () => {
				if (!syncIframeUrl(win, frame)) {
					startIframeReadyTimer(win);
				}
			});
			frame.addEventListener('error', () => {
				setIframeState(win, 'error');
			});
			if (typeof window.MutationObserver === 'function') {
				const observer = new window.MutationObserver((mutations) => {
					if (mutations.some((mutation) => mutation.type === 'attributes' && mutation.attributeName === 'src')) {
						prepareIframeNavigation(win);
					}
				});

				observer.observe(frame, {
					attributeFilter: ['src'],
					attributes: true
				});
				frame.pdkIframeSrcObserver = observer;
			}
			syncIframeUrl(win, frame);
		}

		function getIframeWindowFromSource(source) {
			if (!desktop || !source) {
				return null;
			}

			return Array.from(desktop.querySelectorAll('iframe.pdk-app-frame')).find((frame) => frame.contentWindow === source) || null;
		}

		function handleIframeMessage(event) {
			if (event.origin !== window.location.origin) {
				return;
			}

			const data = event.data && typeof event.data === 'object' ? event.data : null;
			if (!data || data.source !== 'pufferdesk-admin-iframe') {
				return;
			}

			const frame = getIframeWindowFromSource(event.source);
			const win = frame ? frame.closest('.pdk-window') : null;
			if (!win) {
				return;
			}

			if (data.type === 'pufferdesk:iframe-navigation-start' || data.type === 'pufferdesk:iframe-beforeunload') {
				prepareIframeNavigation(win);
				return;
			}

			if (data.type === 'pufferdesk:iframe-error') {
				setIframeState(win, 'error', {
					description: typeof data.message === 'string' && data.message ? data.message : ''
				});
				setIframeContext(win, null, {
					phase: 'error'
				});
				return;
			}

			if (data.type !== 'pufferdesk:iframe-ready') {
				return;
			}

			const href = typeof data.href === 'string' && data.href ? data.href : getFrameUrl(frame);
			if (!isSafeIframeUrl(href)) {
				if (!syncIframeUrl(win, frame)) {
					setIframeState(win, 'error');
				}
				return;
			}

			win.dataset.pdkWindowUrl = withoutIframeParam(href);
			setIframeContext(win, data.context, {
				href: win.dataset.pdkWindowUrl,
				phase: 'ready'
			});
			setIframeState(win, 'ready');
			scheduleSave();
		}

		function setZIndexFloor(value) {
			zIndex = Math.max(zIndex, value);
		}

		function syncWindowSafeArea() {
			return layout.syncWindowSafeArea();
		}

		function constrainWindow(win) {
			layout.constrainWindow(win);
		}

		function constrainVisibleWindows() {
			layout.constrainVisibleWindows();
		}

		function readWindowState(win) {
			return windowState.readWindowState(win);
		}

		function readWindowPlacementState(win) {
			return windowState.readWindowPlacementState(win);
		}

		function applyWindowState(win, state, stateOptions = {}) {
			windowState.applyWindowState(win, state, stateOptions);
		}

		function serializeWindows() {
			return windowState.serializeWindows();
		}

		function getWindowPlacementSection() {
			return workspaceSections.WINDOW_PLACEMENTS || '';
		}

		function readFiniteNumber(value) {
			const parsed = Number.parseFloat(value);

			return Number.isFinite(parsed) ? parsed : null;
		}

		function normalizeWindowPlacementState(state) {
			if (!state || typeof state !== 'object') {
				return null;
			}

			const left = readFiniteNumber(state.left);
			const top = readFiniteNumber(state.top);
			const width = readFiniteNumber(state.width);
			const height = readFiniteNumber(state.height);

			if (!Number.isFinite(left) || !Number.isFinite(top)) {
				return null;
			}

			const normalized = {
				left: Math.max(0, Math.round(left)),
				top: Math.max(0, Math.round(top))
			};

			if (Number.isFinite(width)) {
				normalized.width = Math.max(240, Math.round(width));
			}
			if (Number.isFinite(height)) {
				normalized.height = Math.max(160, Math.round(height));
			}

			return normalized;
		}

		function normalizeWindowPlacements(placements) {
			const normalized = {};

			if (!placements || typeof placements !== 'object' || Array.isArray(placements)) {
				return normalized;
			}

			Object.keys(placements).forEach((key) => {
				const state = normalizeWindowPlacementState(placements[key]);
				if (key && state) {
					normalized[key] = state;
				}
			});

			return normalized;
		}

		function getWindowPlacementPrefix(kind) {
			if (!kind) {
				return '';
			}

			return windowPlacementPrefixes[kind] || windowPlacementPrefixes[String(kind).toLowerCase()] || '';
		}

		function createWindowPlacementKey(kind, id) {
			const prefix = getWindowPlacementPrefix(kind);
			const value = typeof id === 'string' ? id.trim() : String(id || '').trim();

			return prefix && value ? `${prefix}${value}` : '';
		}

		function getWindowPlacementKeyFromOptions(windowOptions = {}) {
			if (!windowOptions || windowOptions.persist === false) {
				return '';
			}

			if (windowOptions.folderId) {
				return createWindowPlacementKey('FOLDER', windowOptions.folderId);
			}

			if (windowOptions.appId) {
				return createWindowPlacementKey('APP', windowOptions.appId);
			}

			return '';
		}

		function getWindowPlacementKeyFromElement(win) {
			if (!win || !win.dataset || win.dataset.pdkPersist === '0') {
				return '';
			}

			const folderId = win.dataset.pdkFolderWindow || '';
			if (folderId && win.dataset.pdkWindowKind === windowKinds.FOLDER) {
				return createWindowPlacementKey('FOLDER', folderId);
			}

			const appId = win.dataset.pdkAppWindow || '';
			return appId ? createWindowPlacementKey('APP', appId) : '';
		}

		function getSavedWindowPlacements() {
			const section = getWindowPlacementSection();

			return section ? normalizeWindowPlacements(sessionStore.getSection(section, {})) : {};
		}

		function getRememberedWindowPlacement(windowOptions = {}) {
			const key = getWindowPlacementKeyFromOptions(windowOptions);
			const placements = key ? getSavedWindowPlacements() : {};

			return key && placements[key] ? placements[key] : null;
		}

		function collectWindowPlacements() {
			const placements = {};

			if (!desktop) {
				return placements;
			}

			desktop.querySelectorAll('.pdk-window').forEach((win) => {
				const key = getWindowPlacementKeyFromElement(win);
				if (!key || win.classList.contains('is-closed')) {
					return;
				}

				const state = normalizeWindowPlacementState(readWindowPlacementState(win));
				if (state) {
					placements[key] = state;
				}
			});

			return placements;
		}

		function rememberWindowPlacement(win) {
			const key = getWindowPlacementKeyFromElement(win);
			const state = key ? normalizeWindowPlacementState(readWindowPlacementState(win)) : null;

			if (!key || !state) {
				return false;
			}

			pendingWindowPlacements[key] = state;
			return true;
		}

		function minimizeWindow(win) {
			windowDock.minimizeWindow(win);
		}

		function revealWindow(win, revealOptions = {}) {
			windowDock.revealWindow(win, revealOptions);
		}

		function setDockRunning(appId, running) {
			windowDock.setDockRunning(appId, running);
		}

		function syncMinimizedDockItems() {
			windowDock.syncMinimizedDockItems();
		}

		function focusWindow(win) {
			if (!win) {
				return;
			}

			exitShowDesktop(false);
			zIndex += 1;
			win.style.zIndex = String(zIndex);
			revealWindow(win);
			constrainWindow(win);
			setActiveWindow(win);
			emitWindowStateChanged(win, 'focused');
			scheduleSave();
		}

		function moveWindow(win, position = {}, moveOptions = {}) {
			if (!win || !position || typeof position !== 'object') {
				return false;
			}

			const startState = readWindowState(win);
			win.style.transform = 'none';

			if (Number.isFinite(position.left)) {
				win.style.left = `${Math.round(position.left)}px`;
			}
			if (Number.isFinite(position.top)) {
				win.style.top = `${Math.round(position.top)}px`;
			}

			if (moveOptions.focus !== false) {
				focusWindow(win);
			} else {
				constrainWindow(win);
			}

			const nextState = readWindowState(win);
			const changed = startState.left !== nextState.left || startState.top !== nextState.top;

			if (changed && moveOptions.emit !== false) {
				emitWindowStateChanged(win, 'moved');
			}
			if (changed) {
				rememberWindowPlacement(win);
			}
			scheduleSave();

			return changed;
		}

		function hideOtherWindows(referenceWindow) {
			if (!referenceWindow) {
				return;
			}

			shell.querySelectorAll('.pdk-window').forEach((win) => {
				if (win !== referenceWindow && isVisibleWindow(win)) {
					minimizeWindow(win);
				}
			});

			if (isVisibleWindow(referenceWindow)) {
				focusWindow(referenceWindow);
			} else {
				setActiveWindow(getTopVisibleWindow());
			}
			scheduleSave();
		}

		function showAllWindows() {
			shell.querySelectorAll('.pdk-window.is-hidden:not(.is-closed)').forEach((win) => {
				revealWindow(win);
			});

			if (isVisibleWindow(activeWindow)) {
				focusWindow(activeWindow);
			} else {
				setActiveWindow(getTopVisibleWindow());
			}
			scheduleSave();
		}

		function hasHiddenWindows() {
			return Boolean(shell.querySelector('.pdk-window.is-hidden:not(.is-closed)'));
		}

		function toggleMaximizeWindow(win) {
			if (!win) {
				return;
			}

			syncWindowSafeArea();
			win.classList.toggle('is-maximized');
			constrainWindow(win);
			focusWindow(win);
			emitWindowStateChanged(win, win.classList.contains('is-maximized') ? 'maximized' : 'restored');
			scheduleSave();
		}

		function closeWindow(win, appId) {
			if (!win) {
				return;
			}

			windowDock.cancelWindowAnimation(win);
			windowDock.removeMinimizedDockItem(win);
			showDesktopWindows.delete(win);
			rememberWindowPlacement(win);
			const closedState = Object.assign({}, readWindowState(win), {
				closed: true
			});

			emitWindowEvent(eventNames.WINDOW_CLOSED, win, {
				appId: appId || win.dataset.pdkAppWindow || '',
				state: closedState
			});
			emitWindowStateChanged(win, 'closed', {
				state: closedState
			});
			clearIframeReadyTimer(win);
			win.querySelectorAll('iframe.pdk-app-frame').forEach((frame) => {
				if (frame.pdkIframeSrcObserver && typeof frame.pdkIframeSrcObserver.disconnect === 'function') {
					frame.pdkIframeSrcObserver.disconnect();
				}
			});
			const closedAppId = appId || win.dataset.pdkAppWindow || '';
			win.remove();
			if (closedAppId) {
				setDockRunning(closedAppId, hasAppWindows(closedAppId));
			}
			if (activeWindow === win) {
				setActiveWindow(getTopVisibleWindow());
			}
			scheduleSave();
		}

		function getActiveWindowDetail(win) {
			if (!win) {
				return {
					kind: 'desktop'
				};
			}

			const folderId = win.dataset.pdkFolderWindow || win.dataset.pdkFolderInfoWindow || '';
			const id = folderId || win.dataset.pdkAppWindow || getWindowId(win);

			return {
				appId: win.dataset.pdkAppWindow || '',
				folderId,
				id,
				kind: win.dataset.pdkWindowKind || (win.dataset.pdkAppWindow ? windowKinds.APP : windowKinds.WINDOW),
				menu: win.pdkMenu || null,
				title: win.dataset.pdkWindowTitle || win.getAttribute('aria-label') || '',
				toolbarDisplay: win.dataset.pdkFolderToolbarDisplay || '',
				url: win.dataset.pdkWindowUrl || '',
				windowElement: win,
				windowId: getWindowId(win)
			};
		}

		function dispatchActiveWindowChange() {
			shell.dispatchEvent(new window.CustomEvent(domEventNames.ACTIVE_WINDOW_CHANGE, {
				detail: getActiveWindowDetail(activeWindow)
			}));
		}

		function syncFullscreenState(force = false) {
			if (menuBarState && typeof menuBarState.recomputeWindowFullscreenSource === 'function') {
				menuBarState.recomputeWindowFullscreenSource(shell, activeWindow);
				return;
			}

			const fullscreen = Boolean(activeWindow && isVisibleWindow(activeWindow) && activeWindow.classList.contains('is-maximized'));
			const previous = shell.dataset.pdkFullscreenWindow === '1';

			if (!force && fullscreen === previous) {
				return;
			}

			shell.dataset.pdkFullscreenWindow = fullscreen ? '1' : '0';
			shell.dispatchEvent(new window.CustomEvent(domEventNames.FULLSCREEN_WINDOW_CHANGE, {
				detail: {
					fullscreen
				}
			}));
		}

		function setActiveWindow(win) {
			const previousWindow = activeWindow;
			activeWindow = win || null;
			shell.querySelectorAll('.pdk-window.is-active').forEach((item) => {
				item.classList.remove('is-active');
			});
			if (activeWindow) {
				activeWindow.classList.add('is-active');
			}
			dispatchActiveWindowChange();
			syncFullscreenState();
			if (activeWindow && menuBarState && typeof menuBarState.clearFullscreenSources === 'function') {
				menuBarState.clearFullscreenSources(shell, 'sticky-note:');
			}
			if (activeWindow && activeWindow !== previousWindow) {
				emitWindowEvent(eventNames.WINDOW_FOCUSED, activeWindow, {
					previousWindowElement: previousWindow || null,
					previousWindowId: previousWindow ? getWindowId(previousWindow) : ''
				});
			}
		}

		function isVisibleWindow(win) {
			return win
				&& !win.classList.contains('is-hidden')
				&& !win.classList.contains('is-closed')
				&& !win.classList.contains('is-minimizing')
				&& !win.classList.contains('is-show-desktop-hidden');
		}

		function getWindowZIndex(win) {
			const parsed = Number.parseFloat(win.style.zIndex);
			return Number.isFinite(parsed) ? parsed : 0;
		}

		function getTopVisibleWindow() {
			return Array.from(shell.querySelectorAll('.pdk-window'))
				.filter(isVisibleWindow)
				.sort((first, second) => getWindowZIndex(second) - getWindowZIndex(first))[0] || null;
		}

		function getWindowId(win) {
			if (!win.dataset.pdkWindowId) {
				windowId += 1;
				win.dataset.pdkWindowId = `window-${windowId}`;
			}

			return win.dataset.pdkWindowId;
		}

		function getWallpaperClickMode() {
			return shell.dataset.pdkWallpaperClick || 'always';
		}

		function shouldWallpaperClickShowDesktop() {
			const mode = getWallpaperClickMode();

			if (mode === 'never') {
				return false;
			}

			return true;
		}

		function normalizeWindowIdentity(value) {
			return typeof value === 'string' ? value.trim() : String(value || '').trim();
		}

		function getDefaultAppWindowIdentity(appId) {
			const value = normalizeWindowIdentity(appId);

			return value ? `app:${value}` : '';
		}

		function getWindowIdentityFromOptions(windowOptions = {}) {
			const explicit = normalizeWindowIdentity(windowOptions.windowIdentity);

			return explicit || getDefaultAppWindowIdentity(windowOptions.appId);
		}

		function getWindowByIdentity(windowIdentity) {
			const value = normalizeWindowIdentity(windowIdentity);

			return value
				? desktop.querySelector(`.pdk-window[data-pdk-window-identity="${dom.escapeAttribute(value)}"]:not(.is-closed)`)
				: null;
		}

		function hasAppWindows(appId) {
			const value = normalizeWindowIdentity(appId);

			return value
				? Boolean(desktop.querySelector(`.pdk-window[data-pdk-app-window="${dom.escapeAttribute(value)}"]:not(.is-closed)`))
				: false;
		}

		function getAppWindow(appId) {
			return getWindowByIdentity(getDefaultAppWindowIdentity(appId));
		}

		function getAppWindowState(appId) {
			const win = getAppWindow(appId);

			return {
				hidden: Boolean(win && (win.classList.contains('is-hidden') || win.classList.contains('is-minimizing') || win.classList.contains('is-show-desktop-hidden'))),
				open: Boolean(win),
				visible: Boolean(isVisibleWindow(win)),
				windowElement: win
			};
		}

		function enterShowDesktop() {
			const visibleWindows = Array.from(shell.querySelectorAll('.pdk-window')).filter(isVisibleWindow);

			if (!visibleWindows.length) {
				setActiveWindow(null);
				return;
			}

			showDesktopActive = true;
			showDesktopWindows = new Set(visibleWindows);
			shell.dataset.pdkShowingDesktop = '1';
			visibleWindows.forEach((win) => {
				win.classList.add('is-show-desktop-hidden');
				emitWindowStateChanged(win, 'showDesktopHidden');
			});
			setActiveWindow(null);
		}

		function exitShowDesktop(focusTop = true) {
			if (!showDesktopActive) {
				return;
			}

			showDesktopWindows.forEach((win) => {
				win.classList.remove('is-show-desktop-hidden');
				emitWindowStateChanged(win, 'showDesktopRestored');
			});
			showDesktopWindows = new Set();
			showDesktopActive = false;
			shell.dataset.pdkShowingDesktop = '0';

			if (focusTop) {
				setActiveWindow(getTopVisibleWindow());
			}
		}

		function toggleShowDesktop() {
			if (showDesktopActive) {
				exitShowDesktop(true);
				return;
			}

			enterShowDesktop();
		}

		function observeWindow(win) {
			if (resizeObserver) {
				resizeObserver.observe(win);
			}
		}

		function saveSession() {
			if (!options.storageKey || restoreInProgress || sessionSaveDisabled) {
				return;
			}

			const windows = serializeWindows();
			if (preserveStoredWindowsUntilChange && !windows.length) {
				return;
			}

			const session = sessionStore.load();
			const placementSection = getWindowPlacementSection();

			session[workspaceSections.WINDOWS] = windows;
			if (placementSection) {
				session[placementSection] = Object.assign(
					{},
					normalizeWindowPlacements(session[placementSection]),
					pendingWindowPlacements,
					collectWindowPlacements()
				);
				pendingWindowPlacements = {};
			}

			preserveStoredWindowsUntilChange = false;
			sessionStore.save(session);
		}

		function scheduleSave() {
			sessionSaveTask.schedule();
		}

		function bindWindowFrame(win) {
			if (win.dataset.pdkWindowBound === '1') {
				return;
			}

			win.dataset.pdkWindowBound = '1';
			getWindowId(win);
			interactions.makeDraggable(win);
			interactions.ensureResizeHandles(win);
			observeWindow(win);
			bindIframeGuard(win);
			win.addEventListener('pointerdown', () => focusWindow(win));
		}

		function createWindow(windowOptions) {
			const windowIdentity = getWindowIdentityFromOptions(windowOptions);
			const resolvedWindowOptions = windowIdentity
				? Object.assign({}, windowOptions, {
					windowIdentity
				})
				: windowOptions;
			const existing = getWindowByIdentity(windowIdentity);

			if (existing) {
				if (resolvedWindowOptions.state) {
					applyWindowState(existing, resolvedWindowOptions.state);
				}
				if (!resolvedWindowOptions.skipFocus) {
					focusWindow(existing);
				}
				return existing;
			}

			const rememberedPlacement = !resolvedWindowOptions.state ? getRememberedWindowPlacement(resolvedWindowOptions) : null;
			const position = resolvedWindowOptions.centered ? layout.getCenteredPosition(resolvedWindowOptions) : layout.getDefaultPosition(resolvedWindowOptions);
			const win = factory.createWindowElement(Object.assign({}, resolvedWindowOptions, position), withIframeParam);
			desktop.appendChild(win);

			if (rememberedPlacement) {
				applyWindowState(win, rememberedPlacement, {
					emit: false
				});
			} else if (resolvedWindowOptions.state) {
				applyWindowState(win, resolvedWindowOptions.state, {
					emit: false
				});
			}

			bindWindowFrame(win);
			emitWindowEvent(eventNames.WINDOW_CREATED, win, {
				options: resolvedWindowOptions
			});
			emitWindowStateChanged(win, 'created');

			if (!resolvedWindowOptions.skipFocus) {
				focusWindow(win);
				if (!restoreInProgress && windowDock.shouldAnimateOpeningApps() && !(resolvedWindowOptions.state && resolvedWindowOptions.state.hidden)) {
					windowDock.playWindowAnimation(win, 'is-opening', windowDock.getWindowAnimationTarget(win), 180);
				}
			}

			if (resolvedWindowOptions.appId) {
				setDockRunning(resolvedWindowOptions.appId, true);
			}
			syncMinimizedDockItems();

			preserveStoredWindowsUntilChange = false;
			scheduleSave();

			return win;
		}

		function bindExistingWindows() {
			syncWindowSafeArea();
			shell.querySelectorAll('.pdk-window').forEach((win) => {
				bindWindowFrame(win);
				constrainWindow(win);
			});

			shell.querySelectorAll('[data-pdk-close]').forEach((button) => {
				if (button.dataset.pdkActionBound === '1') {
					return;
				}
				button.dataset.pdkActionBound = '1';
				button.addEventListener('click', () => {
					closeWindow(button.closest('.pdk-window'), null);
				});
			});

			shell.querySelectorAll('[data-pdk-minimize]').forEach((button) => {
				if (button.dataset.pdkActionBound === '1') {
					return;
				}
				button.dataset.pdkActionBound = '1';
				button.addEventListener('click', () => {
					minimizeWindow(button.closest('.pdk-window'));
				});
			});

			shell.querySelectorAll('[data-pdk-maximize]').forEach((button) => {
				if (button.dataset.pdkActionBound === '1') {
					return;
				}
				button.dataset.pdkActionBound = '1';
				button.addEventListener('click', () => {
					toggleMaximizeWindow(button.closest('.pdk-window'));
				});
			});
		}

		function getAppRestoreOptions(resolver, appId, restoreItem = {}) {
			if (typeof resolver === 'function') {
				return resolver(appId, restoreItem);
			}

			if (resolver && typeof resolver.getAppOptions === 'function') {
				return resolver.getAppOptions(appId, restoreItem);
			}

			return null;
		}

		function restoreSession(resolver) {
			const windows = sessionStore.getSection(workspaceSections.WINDOWS, []);
			if (!Array.isArray(windows)) {
				return;
			}

			restoreInProgress = true;

			windows.forEach((item) => {
				if (!item || typeof item !== 'object') {
					return;
				}

				if (item.kind === windowKinds.FOLDER) {
					if (item.folderId && resolver && typeof resolver.openFolder === 'function') {
						resolver.openFolder(item.folderId, {
							activeTabId: item.activeTabId || '',
							recordRecent: false,
							skipFocus: true,
							state: item.state,
							tabs: Array.isArray(item.tabs) ? item.tabs : null,
							touch: false
						});
					}
					return;
				}

				if (item.kind !== windowKinds.APP || !item.appId) {
					return;
				}

				const appOptions = getAppRestoreOptions(resolver, item.appId, item);
				if (!appOptions) {
					return;
				}

				createWindow(Object.assign({}, appOptions, {
					state: item.state,
					skipFocus: true
				}));
			});

			restoreInProgress = false;
			setActiveWindow(getTopVisibleWindow());
			syncMinimizedDockItems();
		}

		if (desktop) {
			desktop.addEventListener('click', (event) => {
				if (event.target === desktop) {
					if (shouldWallpaperClickShowDesktop()) {
						toggleShowDesktop();
					} else {
						setActiveWindow(null);
					}
				}
			});
		}

		shell.addEventListener(domEventNames.DESKTOP_DOCK_CHANGE, () => {
			syncMinimizedDockItems();
			constrainVisibleWindows();
			if (!shouldWallpaperClickShowDesktop()) {
				exitShowDesktop(true);
			}
		});

		shell.addEventListener(domEventNames.MENU_BAR_LAYOUT_CHANGE, () => {
			constrainVisibleWindows();
		});

		window.addEventListener('resize', () => {
			constrainVisibleWindows();
			scheduleSave();
		});
		window.addEventListener('message', handleIframeMessage);
		window.addEventListener('beforeunload', saveSession);

		return {
			applyWindowState,
			bindExistingWindows,
			closeWindow,
			createWindow,
			disableSessionSave() {
				sessionSaveDisabled = true;
				sessionSaveTask.cancel();
			},
			focusWindow,
			getActiveWindow() {
				return activeWindow;
			},
			getAppWindowState,
			hasHiddenWindows,
			hideOtherWindows,
			isPreservingStoredWindows() {
				return preserveStoredWindowsUntilChange;
			},
			makeDraggable: interactions.makeDraggable,
			minimizeWindow,
			moveWindow,
			prepareIframeNavigation,
			restoreSession,
			saveSession,
			setDockRunning,
			showAllWindows,
			toggleMaximizeWindow,
			withIframeParam
		};
	};

	window.PufferDesk.createWindowManager = window.PufferDesk.windows.createWindowManager;
})();
