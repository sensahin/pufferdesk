(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.windows = window.WPAdminOS.windows || {};

	window.WPAdminOS.windows.createWindowFactory = function createWindowFactory(callbacks = {}) {
		const defaultWindowChrome = {
			controls: {
				labels: {
					close: 'Close',
					maximize: 'Maximize',
					minimize: 'Minimize'
				},
				order: ['close', 'minimize', 'maximize'],
				placement: 'left',
				style: 'traffic'
			},
			title: {
				alignment: 'left',
				show_icon: true
			}
		};
		const controlDefinitions = {
			close: {
				action: 'aosClose',
				modifier: 'close'
			},
			minimize: {
				action: 'aosMinimize',
				modifier: 'minimize'
			},
			maximize: {
				action: 'aosMaximize',
				modifier: 'maximize'
			}
		};

		function getRuntimeWindowChrome() {
			const config = window.WPAdminOS.config && typeof window.WPAdminOS.config.get === 'function'
				? window.WPAdminOS.config.get()
				: {};

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
					placement: ['left', 'right'].includes(controls.placement) ? controls.placement : defaultWindowChrome.controls.placement,
					style: ['traffic', 'caption', 'toolbar', 'hidden'].includes(controls.style) ? controls.style : defaultWindowChrome.controls.style
				},
				title: {
					alignment: ['left', 'center', 'right'].includes(title.alignment) ? title.alignment : defaultWindowChrome.title.alignment,
					show_icon: Object.prototype.hasOwnProperty.call(title, 'show_icon') ? Boolean(title.show_icon) : defaultWindowChrome.title.show_icon
				}
			};
		}

		function createWindowControl(control, label, disabled = false) {
			const definition = controlDefinitions[control] || controlDefinitions.close;
			const button = document.createElement('button');
			const labelElement = document.createElement('span');

			button.type = 'button';
			button.className = `aos-window-control aos-window-control-${definition.modifier}`;
			button.dataset[definition.action] = '';
			button.setAttribute('aria-label', label);
			button.disabled = disabled;
			if (disabled) {
				button.setAttribute('aria-disabled', 'true');
			}
			labelElement.className = 'aos-window-control-label';
			labelElement.textContent = label;
			button.appendChild(labelElement);

			return button;
		}

		function bindWindowControl(button, control, titlebar, appId) {
			button.addEventListener('click', () => {
				const win = titlebar.closest('.aos-window');
				if (control === 'close' && typeof callbacks.onClose === 'function') {
					callbacks.onClose(win, appId);
				}
				if (control === 'minimize' && typeof callbacks.onMinimize === 'function') {
					callbacks.onMinimize(win, appId);
				}
				if (control === 'maximize' && typeof callbacks.onMaximize === 'function') {
					callbacks.onMaximize(win, appId);
				}
			});
		}

		function createTitlebarLabel(options = {}, chrome) {
			if (!options.titlebarLabel) {
				return null;
			}

			const label = document.createElement('span');
			label.className = 'aos-window-titlebar-label';
			if (chrome.title.show_icon && options.titlebarIcon && window.WPAdminOS.dom && typeof window.WPAdminOS.dom.createIcon === 'function') {
				const icon = document.createElement('span');
				icon.className = 'aos-window-titlebar-label-icon';
				icon.appendChild(window.WPAdminOS.dom.createIcon(options.titlebarIcon));
				label.appendChild(icon);
			}

			const text = document.createElement('span');
			text.className = 'aos-window-titlebar-label-text';
			text.textContent = options.titlebarLabel;
			label.appendChild(text);

			return label;
		}

		function createTitlebar(appId, options = {}) {
			const chrome = normalizeWindowChrome(options.windowChrome || getRuntimeWindowChrome());
			const disabledControls = Array.isArray(options.disabledControls) ? options.disabledControls : [];
			const titlebar = document.createElement('div');
			titlebar.className = 'aos-window-titlebar';
			titlebar.dataset.aosDragHandle = '';
			titlebar.dataset.aosWindowControlsPlacement = chrome.controls.placement;
			titlebar.dataset.aosWindowControlsStyle = chrome.controls.style;
			titlebar.dataset.aosWindowTitleAlignment = chrome.title.alignment;

			const controls = document.createElement('div');
			controls.className = 'aos-window-controls';
			chrome.controls.order.forEach((control) => {
				const button = createWindowControl(control, chrome.controls.labels[control], disabledControls.includes(control));
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

		function createWindowElement(options, withIframeParam) {
			const chrome = normalizeWindowChrome(options.windowChrome || getRuntimeWindowChrome());
			const win = document.createElement('section');
			win.className = 'aos-window aos-app-window';
			win.dataset.aosAppWindow = options.appId || '';
			win.dataset.aosContext = 'window';
			win.dataset.aosContextId = options.appId || options.windowKind || 'window';
			win.dataset.aosContextLabel = options.title || '';
			win.dataset.aosResizeMode = options.resizeMode || 'both';
			win.dataset.aosWindowKind = options.windowKind || (options.appId ? 'app' : 'window');
			win.dataset.aosWindowTitle = options.title || '';
			win.dataset.aosWindowControlsPlacement = chrome.controls.placement;
			win.dataset.aosWindowControlsStyle = chrome.controls.style;
			win.dataset.aosWindowTitleAlignment = chrome.title.alignment;
			win.dataset.aosWindowTitleIcon = chrome.title.show_icon ? '1' : '0';
			if (options.url) {
				win.dataset.aosWindowUrl = options.url;
			}
			if (options.contextMenu === false) {
				win.dataset.aosContextMenuDisabled = '1';
			}
			if (options.persist === false) {
				win.dataset.aosPersist = '0';
			}
			if (options.menu && typeof options.menu === 'object') {
				win.aosMenu = options.menu;
			}
			win.setAttribute('aria-label', `${options.title} window`);
			win.style.width = options.width || '860px';
			win.style.height = options.height || '620px';
			win.style.left = options.left || '180px';
			win.style.top = options.top || '42px';
			win.style.transform = 'none';

			win.appendChild(createTitlebar(options.appId, Object.assign({}, options, { windowChrome: chrome })));

			const body = document.createElement('div');
			body.className = options.bodyClass || 'aos-window-body';

			if (options.url) {
				const iframe = document.createElement('iframe');
				iframe.className = 'aos-app-frame';
				iframe.src = withIframeParam(options.url);
				iframe.title = options.title;
				body.appendChild(iframe);
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
