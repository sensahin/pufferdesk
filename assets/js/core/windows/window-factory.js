(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.windows = window.AdminOSMode.windows || {};

	window.AdminOSMode.windows.createWindowFactory = function createWindowFactory(callbacks = {}) {
		const dom = window.AdminOSMode.dom;

		function createTitlebar(title, icon, appId) {
			const titlebar = document.createElement('div');
			titlebar.className = 'aos-window-titlebar';
			titlebar.dataset.aosDragHandle = '';

			const controls = document.createElement('div');
			controls.className = 'aos-window-controls';
			controls.setAttribute('aria-hidden', 'true');
			dom.appendTrafficDots(controls);

			const label = document.createElement('strong');
			if (icon) {
				const iconSpan = dom.createIcon(icon);
				label.appendChild(iconSpan);
			}
			label.appendChild(document.createTextNode(title));

			const actions = document.createElement('div');
			actions.className = 'aos-window-actions';
			actions.appendChild(dom.createIconButton('aosMinimize', 'Minimize', 'dashicons-minus'));
			actions.appendChild(dom.createIconButton('aosMaximize', 'Maximize', 'dashicons-fullscreen-alt'));
			actions.appendChild(dom.createIconButton('aosClose', 'Close', 'dashicons-no-alt'));

			actions.querySelector('[data-aos-minimize]').addEventListener('click', () => {
				const win = titlebar.closest('.aos-window');
				if (typeof callbacks.onMinimize === 'function') {
					callbacks.onMinimize(win, appId);
				}
			});

			actions.querySelector('[data-aos-maximize]').addEventListener('click', () => {
				const win = titlebar.closest('.aos-window');
				if (typeof callbacks.onMaximize === 'function') {
					callbacks.onMaximize(win, appId);
				}
			});

			actions.querySelector('[data-aos-close]').addEventListener('click', () => {
				const win = titlebar.closest('.aos-window');
				if (typeof callbacks.onClose === 'function') {
					callbacks.onClose(win, appId);
				}
			});

			titlebar.appendChild(controls);
			titlebar.appendChild(label);
			titlebar.appendChild(actions);

			return titlebar;
		}

		function createWindowElement(options, withIframeParam) {
			const win = document.createElement('section');
			win.className = 'aos-window aos-app-window';
			win.dataset.aosAppWindow = options.appId || '';
			win.setAttribute('aria-label', `${options.title} window`);
			win.style.width = options.width || '860px';
			win.style.height = options.height || '620px';
			win.style.left = options.left || '180px';
			win.style.top = options.top || '42px';
			win.style.transform = 'none';

			win.appendChild(createTitlebar(options.title, options.icon, options.appId));

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
