(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.windows = window.PufferDesk.windows || {};

	window.PufferDesk.windows.createWindowFactory = function createWindowFactory(callbacks = {}) {
		const contextTargets = window.PufferDesk.shell && window.PufferDesk.shell.contextMenuConstants
			? window.PufferDesk.shell.contextMenuConstants.targets || {}
			: {};
		const workspace = window.PufferDesk.session && window.PufferDesk.session.workspace ? window.PufferDesk.session.workspace : {};
		const windowKinds = workspace.windowKinds || {};
		const fallbackWindowChrome = {
			controls: {
				labels: {},
				order: ['close', 'minimize', 'maximize'],
				placement: 'left',
				style: 'traffic'
			},
			title: {
				alignment: 'left',
				show_icon: true
			}
		};
		const fallbackControlDefinitions = {
			close: {
				action: 'pdkClose',
				modifier: 'close'
			},
			minimize: {
				action: 'pdkMinimize',
				modifier: 'minimize'
			},
			maximize: {
				action: 'pdkMaximize',
				modifier: 'maximize'
			}
		};
		const windowChromeContract = getWindowChromeContract();
		const defaultWindowChrome = getDefaultWindowChrome(windowChromeContract);
		const controlDefinitions = getControlDefinitions(windowChromeContract);
		const controlIdMap = getContractMap(windowChromeContract.controlIds, {
			CLOSE: 'close',
			MAXIMIZE: 'maximize',
			MINIMIZE: 'minimize'
		});
		const controlPlacements = getContractList(windowChromeContract.placements, ['left', 'right']);
		const controlStyles = getContractList(windowChromeContract.styles, ['traffic', 'caption', 'toolbar', 'hidden']);
		const titleAlignments = getContractList(windowChromeContract.titleAlignments, ['left', 'center', 'right']);

		function clone(value) {
			if (!value || typeof value !== 'object') {
				return value;
			}

			try {
				return JSON.parse(JSON.stringify(value));
			} catch (error) {
				return Array.isArray(value) ? value.slice() : Object.assign({}, value);
			}
		}

		function getRuntimeConfig() {
			return window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function'
				? window.PufferDesk.config.get()
				: {};
		}

		function formatWindowLabel(key, fallback = '', values = []) {
			if (window.PufferDesk.config && typeof window.PufferDesk.config.formatLabel === 'function') {
				return window.PufferDesk.config.formatLabel(key, fallback, values);
			}

			let index = 0;
			return String(fallback).replace(/%(\d+)\$[sd]/g, (match, position) => {
				const valueIndex = Number(position) - 1;
				return String(values[valueIndex] ?? '');
			}).replace(/%d|%s/g, () => String(values[index++] ?? ''));
		}

		function getWindowChromeContract() {
			const config = getRuntimeConfig();
			const contracts = config.contracts && typeof config.contracts === 'object' ? config.contracts : {};

			return contracts.windowChrome && typeof contracts.windowChrome === 'object' ? contracts.windowChrome : {};
		}

		function getContractList(value, fallback) {
			return Array.isArray(value) && value.length ? value.slice() : fallback.slice();
		}

		function getContractMap(value, fallback) {
			return value && typeof value === 'object' ? Object.assign({}, fallback, value) : Object.assign({}, fallback);
		}

		function getFallbackControlMap(property) {
			return Object.keys(fallbackControlDefinitions).reduce((map, id) => {
				map[id] = fallbackControlDefinitions[id][property];
				return map;
			}, {});
		}

		function getDefaultWindowChrome(contract) {
			return contract.defaultConfig && typeof contract.defaultConfig === 'object'
				? clone(contract.defaultConfig)
				: clone(fallbackWindowChrome);
		}

		function getControlDefinitions(contract) {
			const ids = getContractList(contract.controls, Object.keys(fallbackControlDefinitions));
			const actions = getContractMap(contract.controlDatasetActions, getFallbackControlMap('action'));
			const modifiers = getContractMap(contract.controlModifiers, getFallbackControlMap('modifier'));

			return ids.reduce((definitions, id) => {
				if (!actions[id] || !modifiers[id]) {
					return definitions;
				}

				definitions[id] = {
					action: actions[id],
					modifier: modifiers[id]
				};

				return definitions;
			}, {});
		}

		function getRuntimeWindowChrome() {
			const config = getRuntimeConfig();

			if (config.windowChrome && typeof config.windowChrome === 'object') {
				return config.windowChrome;
			}

			return config.theme && config.theme.window_chrome && typeof config.theme.window_chrome === 'object'
				? config.theme.window_chrome
				: {};
		}

		function normalizeWindowChrome(chrome = {}) {
			const controls = chrome.controls && typeof chrome.controls === 'object' ? chrome.controls : {};
			const title = chrome.title && typeof chrome.title === 'object' ? chrome.title : {};
			const order = Array.isArray(controls.order)
				? controls.order.filter((control) => Object.prototype.hasOwnProperty.call(controlDefinitions, control))
				: defaultWindowChrome.controls.order;

			return {
				controls: {
					labels: Object.assign({}, defaultWindowChrome.controls.labels, controls.labels && typeof controls.labels === 'object' ? controls.labels : {}),
					order: order.length ? order : defaultWindowChrome.controls.order,
					placement: controlPlacements.includes(controls.placement) ? controls.placement : defaultWindowChrome.controls.placement,
					style: controlStyles.includes(controls.style) ? controls.style : defaultWindowChrome.controls.style
				},
				title: {
					alignment: titleAlignments.includes(title.alignment) ? title.alignment : defaultWindowChrome.title.alignment,
					show_icon: Object.prototype.hasOwnProperty.call(title, 'show_icon') ? Boolean(title.show_icon) : defaultWindowChrome.title.show_icon
				}
			};
		}

		function createWindowControl(control, label, disabled = false) {
			const definition = controlDefinitions[control] || controlDefinitions.close;
			const button = document.createElement('button');
			const labelElement = document.createElement('span');

			button.type = 'button';
			button.className = `pdk-window-control pdk-window-control-${definition.modifier}`;
			button.dataset[definition.action] = '';
			button.setAttribute('aria-label', label);
			button.disabled = disabled;
			if (disabled) {
				button.setAttribute('aria-disabled', 'true');
			}
			labelElement.className = 'pdk-window-control-label';
			labelElement.textContent = label;
			button.appendChild(labelElement);

			return button;
		}

		function bindWindowControl(button, control, titlebar, appId) {
			button.addEventListener('click', () => {
				const win = titlebar.closest('.pdk-window');
				if (control === controlIdMap.CLOSE && typeof callbacks.onClose === 'function') {
					callbacks.onClose(win, appId);
				}
				if (control === controlIdMap.MINIMIZE && typeof callbacks.onMinimize === 'function') {
					callbacks.onMinimize(win, appId);
				}
				if (control === controlIdMap.MAXIMIZE && typeof callbacks.onMaximize === 'function') {
					callbacks.onMaximize(win, appId);
				}
			});
		}

		function createTitlebarLabel(options = {}, chrome) {
			if (!options.titlebarLabel) {
				return null;
			}

			const label = document.createElement('span');
			label.className = 'pdk-window-titlebar-label';
			if (chrome.title.show_icon && options.titlebarIcon && window.PufferDesk.dom && typeof window.PufferDesk.dom.createIcon === 'function') {
				const icon = document.createElement('span');
				icon.className = 'pdk-window-titlebar-label-icon';
				icon.appendChild(window.PufferDesk.dom.createIcon(options.titlebarIcon));
				label.appendChild(icon);
			}

			const text = document.createElement('span');
			text.className = 'pdk-window-titlebar-label-text';
			text.textContent = options.titlebarLabel;
			label.appendChild(text);

			return label;
		}

		function createTitlebar(appId, options = {}) {
			const chrome = normalizeWindowChrome(options.windowChrome || getRuntimeWindowChrome());
			const disabledControls = Array.isArray(options.disabledControls) ? options.disabledControls : [];
			const titlebar = document.createElement('div');
			titlebar.className = 'pdk-window-titlebar';
			titlebar.dataset.pdkContext = contextTargets.WINDOW;
			titlebar.dataset.pdkContextId = options.appId || options.windowKind || contextTargets.WINDOW;
			titlebar.dataset.pdkContextLabel = options.title || options.titlebarLabel || '';
			titlebar.dataset.pdkDragHandle = '';
			titlebar.dataset.pdkWindowControlsPlacement = chrome.controls.placement;
			titlebar.dataset.pdkWindowControlsStyle = chrome.controls.style;
			titlebar.dataset.pdkWindowTitleAlignment = chrome.title.alignment;

			const controls = document.createElement('div');
			controls.className = 'pdk-window-controls';
			chrome.controls.order.forEach((control) => {
				const button = createWindowControl(control, chrome.controls.labels[control] || control, disabledControls.includes(control));
				bindWindowControl(button, control, titlebar, appId);
				controls.appendChild(button);
			});

			const label = createTitlebarLabel(options, chrome);
			if (chrome.controls.placement === 'right') {
				if (label) {
					titlebar.appendChild(label);
				}
				titlebar.appendChild(controls);
			} else {
				titlebar.appendChild(controls);
				if (label) {
					titlebar.appendChild(label);
				}
			}

			return titlebar;
		}

		function getIframeLabels() {
			const config = getRuntimeConfig();
			const iframe = config.iframe && typeof config.iframe === 'object' ? config.iframe : {};
			const labels = iframe.labels && typeof iframe.labels === 'object' ? iframe.labels : {};

			return Object.assign({
				embedBlockedDescription: 'Some plugin screens require the standard WordPress admin page to finish loading.',
				embedBlockedTitle: 'This admin screen cannot be displayed inside PufferDesk.',
				errorDescription: 'PufferDesk kept the page covered because it did not confirm iframe mode.',
				errorTitle: 'This page could not be safely embedded.',
				loadingDescription: '',
				loadingTitle: 'Loading...',
				openClassic: 'Open in Classic Admin',
				retry: 'Retry'
			}, labels);
		}

		function getClassicIframeCompatibility() {
			const config = getRuntimeConfig();
			const appDescriptors = config.contracts && config.contracts.appDescriptors && typeof config.contracts.appDescriptors === 'object'
				? config.contracts.appDescriptors
				: {};
			const compatibility = appDescriptors.iframeCompatibility && typeof appDescriptors.iframeCompatibility === 'object'
				? appDescriptors.iframeCompatibility
				: {};

			return compatibility.CLASSIC || 'classic';
		}

		function createIframeVeil() {
			const labels = getIframeLabels();
			const veil = document.createElement('div');
			const panel = document.createElement('div');
			const progress = document.createElement('span');
			const title = document.createElement('strong');
			const description = document.createElement('span');
			const actions = document.createElement('div');
			const retry = document.createElement('button');
			const openClassic = document.createElement('button');

			veil.className = 'pdk-iframe-veil';
			veil.dataset.pdkIframeVeil = '';
			panel.className = 'pdk-iframe-veil-panel';
			progress.className = 'pdk-iframe-veil-progress';
			progress.setAttribute('aria-hidden', 'true');
			title.className = 'pdk-iframe-veil-title';
			title.dataset.pdkIframeVeilTitle = '';
			title.textContent = labels.loadingTitle;
			description.className = 'pdk-iframe-veil-description';
			description.dataset.pdkIframeVeilDescription = '';
			description.textContent = labels.loadingDescription;
			description.hidden = !labels.loadingDescription;
			actions.className = 'pdk-iframe-veil-actions';

			retry.type = 'button';
			retry.className = 'pdk-iframe-veil-button';
			retry.dataset.pdkIframeRetry = '';
			retry.textContent = labels.retry;
			openClassic.type = 'button';
			openClassic.className = 'pdk-iframe-veil-button pdk-iframe-veil-button-secondary';
			openClassic.dataset.pdkIframeOpenClassic = '';
			openClassic.textContent = labels.openClassic;

			actions.appendChild(retry);
			actions.appendChild(openClassic);
			panel.appendChild(progress);
			panel.appendChild(title);
			panel.appendChild(description);
			panel.appendChild(actions);
			veil.appendChild(panel);

			return veil;
		}

		function createWindowElement(options, withIframeParam) {
			const chrome = normalizeWindowChrome(options.windowChrome || getRuntimeWindowChrome());
			const win = document.createElement('section');
			win.className = 'pdk-window pdk-app-window';
			win.dataset.pdkAppWindow = options.appId || '';
			win.dataset.pdkWindowIdentity = options.windowIdentity || '';
			win.dataset.pdkContext = contextTargets.WINDOW;
			win.dataset.pdkContextId = options.appId || options.windowKind || contextTargets.WINDOW;
			win.dataset.pdkContextLabel = options.title || '';
			win.dataset.pdkResizeMode = options.resizeMode || 'both';
			if (options.surfaceLayout) {
				win.dataset.pdkSurfaceLayout = options.surfaceLayout;
			}
			win.dataset.pdkWindowKind = options.windowKind || (options.appId ? windowKinds.APP : windowKinds.WINDOW);
			win.dataset.pdkWindowTitle = options.title || '';
			win.dataset.pdkWindowControlsPlacement = chrome.controls.placement;
			win.dataset.pdkWindowControlsStyle = chrome.controls.style;
			win.dataset.pdkWindowTitleAlignment = chrome.title.alignment;
			win.dataset.pdkWindowTitleIcon = chrome.title.show_icon ? '1' : '0';
			if (options.url) {
				win.dataset.pdkWindowUrl = options.url;
				win.dataset.pdkIframeState = 'loading';
				if (typeof options.iframeCompatibility === 'string' && options.iframeCompatibility) {
					win.dataset.pdkIframeCompatibility = options.iframeCompatibility;
				}
			}
			if (options.contextMenu === false) {
				win.dataset.pdkContextMenuDisabled = '1';
			}
			if (options.persist === false) {
				win.dataset.pdkPersist = '0';
			}
			if (options.minimizable === false) {
				win.dataset.pdkMinimizable = '0';
			}
			if (options.menu && typeof options.menu === 'object') {
				win.pdkMenu = options.menu;
			}
			win.setAttribute('aria-label', formatWindowLabel('window_title_format', '', [options.title || '']));
			win.style.width = options.width || '860px';
			win.style.height = options.height || '620px';
			win.style.left = options.left || '180px';
			win.style.top = options.top || '42px';
			win.style.transform = 'none';

			win.appendChild(createTitlebar(options.appId, Object.assign({}, options, { windowChrome: chrome })));

			const body = document.createElement('div');
			body.className = options.bodyClass || 'pdk-window-body';

			if (options.url) {
				const iframe = document.createElement('iframe');
				body.classList.add('pdk-window-body-has-frame');
				iframe.className = 'pdk-app-frame';
				iframe.src = options.iframeCompatibility === getClassicIframeCompatibility() ? 'about:blank' : withIframeParam(options.url);
				iframe.setAttribute('sandbox', 'allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts');
				iframe.title = options.title;
				body.appendChild(iframe);
				body.appendChild(createIframeVeil());
			} else if (options.content) {
				body.appendChild(options.content);
			}

			win.appendChild(body);

			return win;
		}

		return {
			createTitlebar,
			createWindowElement
		};
	};
})();
