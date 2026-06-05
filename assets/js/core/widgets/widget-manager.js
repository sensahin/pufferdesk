(function () {
	'use strict';

	window.AdminOSMode = window.AdminOSMode || {};
	window.AdminOSMode.widgets = window.AdminOSMode.widgets || {};

	window.AdminOSMode.widgets.createWidgetManager = function createWidgetManager(shell, options = {}) {
		const dom = window.AdminOSMode.dom;
		const desktop = shell.querySelector('.aos-desktop');
		const layer = shell.querySelector('.aos-widget-layer');
		const sessionStore = window.AdminOSMode.session.createSessionStore(options.storageKey || '');
		let restoreInProgress = false;
		let saveTimer = null;

		function readNumber(value) {
			const parsed = Number.parseFloat(value);
			return Number.isFinite(parsed) ? parsed : null;
		}

		function clamp(value, min, max) {
			return Math.min(Math.max(min, value), Math.max(min, max));
		}

		function getRelativeRect(widget) {
			const desktopRect = desktop.getBoundingClientRect();
			const rect = widget.getBoundingClientRect();

			return {
				left: Math.round(rect.left - desktopRect.left),
				top: Math.round(rect.top - desktopRect.top),
				width: Math.round(rect.width),
				height: Math.round(rect.height)
			};
		}

		function getWidgetDefaults(widget) {
			const width = readNumber(widget.dataset.aosWidgetWidth) ?? widget.offsetWidth;
			const height = readNumber(widget.dataset.aosWidgetHeight) ?? widget.offsetHeight;
			const left = readNumber(widget.dataset.aosWidgetLeft);
			const right = readNumber(widget.dataset.aosWidgetRight);
			const top = readNumber(widget.dataset.aosWidgetTop);
			const bottom = readNumber(widget.dataset.aosWidgetBottom);
			let defaultLeft = left;
			let defaultTop = top;

			if (defaultLeft === null && right !== null && desktop) {
				defaultLeft = desktop.clientWidth - width - right;
			}

			if (defaultTop === null && bottom !== null && desktop) {
				defaultTop = desktop.clientHeight - height - bottom;
			}

			return {
				left: defaultLeft ?? 24,
				top: defaultTop ?? 24,
				width,
				height
			};
		}

		function readWidgetState(widget) {
			const rect = getRelativeRect(widget);

			return {
				left: readNumber(widget.style.left) ?? rect.left,
				top: readNumber(widget.style.top) ?? rect.top,
				width: readNumber(widget.style.width) ?? rect.width,
				height: readNumber(widget.style.height) ?? rect.height,
				hidden: widget.hidden
			};
		}

		function applyWidgetState(widget, state) {
			const defaults = getWidgetDefaults(widget);
			const next = Object.assign({}, defaults, state && typeof state === 'object' ? state : {});
			const maxLeft = desktop ? desktop.clientWidth - next.width : next.left;
			const maxTop = desktop ? desktop.clientHeight - next.height - 84 : next.top;

			widget.style.left = `${clamp(next.left, 0, maxLeft)}px`;
			widget.style.top = `${clamp(next.top, 0, maxTop)}px`;
			widget.style.width = `${Math.max(120, next.width)}px`;
			widget.style.height = `${Math.max(80, next.height)}px`;
			widget.hidden = Boolean(next.hidden);
		}

		function makeDraggable(widget) {
			const handle = widget.querySelector('[data-aos-widget-drag-handle]');

			if (!handle || !desktop) {
				return;
			}

			handle.addEventListener('pointerdown', (event) => {
				if (event.target.closest('button, a, input, select, textarea')) {
					return;
				}

				event.preventDefault();

				const desktopRect = desktop.getBoundingClientRect();
				const rect = widget.getBoundingClientRect();
				const startX = event.clientX;
				const startY = event.clientY;
				const startLeft = rect.left - desktopRect.left;
				const startTop = rect.top - desktopRect.top;

				widget.classList.add('is-dragging');
				widget.style.left = `${startLeft}px`;
				widget.style.top = `${startTop}px`;
				handle.setPointerCapture(event.pointerId);

				const move = (moveEvent) => {
					const nextLeft = startLeft + moveEvent.clientX - startX;
					const nextTop = startTop + moveEvent.clientY - startY;
					const maxLeft = desktop.clientWidth - widget.offsetWidth;
					const maxTop = desktop.clientHeight - widget.offsetHeight - 84;

					widget.style.left = `${clamp(nextLeft, 0, maxLeft)}px`;
					widget.style.top = `${clamp(nextTop, 0, maxTop)}px`;
				};

				const up = () => {
					handle.removeEventListener('pointermove', move);
					handle.removeEventListener('pointerup', up);
					handle.removeEventListener('pointercancel', up);
					widget.classList.remove('is-dragging');
					scheduleSave();
				};

				handle.addEventListener('pointermove', move);
				handle.addEventListener('pointerup', up);
				handle.addEventListener('pointercancel', up);
			});
		}

		function serializeWidgets() {
			if (!layer) {
				return [];
			}

			return Array.from(layer.querySelectorAll('[data-aos-widget]'))
				.map((widget) => {
					const id = widget.dataset.aosWidget;
					if (!id) {
						return null;
					}

					return {
						id,
						state: readWidgetState(widget)
					};
				})
				.filter(Boolean);
		}

		function saveSession() {
			if (!options.storageKey || restoreInProgress) {
				return;
			}

			sessionStore.saveSection('widgets', serializeWidgets());
		}

		function scheduleSave() {
			if (!options.storageKey || restoreInProgress) {
				return;
			}

			window.clearTimeout(saveTimer);
			saveTimer = window.setTimeout(saveSession, 160);
		}

		function bindClockWidget(widget) {
			const timeNode = widget.querySelector('[data-aos-widget-clock]');
			const dateNode = widget.querySelector('[data-aos-widget-clock-date]');

			if (!timeNode || widget.dataset.aosWidgetClockBound === '1') {
				return;
			}

			widget.dataset.aosWidgetClockBound = '1';

			const timeFormatter = new Intl.DateTimeFormat(undefined, {
				hour: 'numeric',
				minute: '2-digit'
			});
			const dateFormatter = new Intl.DateTimeFormat(undefined, {
				weekday: 'short',
				month: 'short',
				day: 'numeric'
			});
			const refreshInterval = Math.max(readNumber(widget.dataset.aosWidgetRefresh) ?? 30000, 1000);

			const update = () => {
				const now = new Date();
				timeNode.textContent = timeFormatter.format(now);
				timeNode.dateTime = now.toISOString();

				if (dateNode) {
					dateNode.textContent = dateFormatter.format(now);
					dateNode.dateTime = now.toISOString().slice(0, 10);
				}
			};

			update();
			window.setInterval(update, refreshInterval);
		}

		function bindWidget(widget) {
			if (widget.dataset.aosWidgetBound === '1') {
				return;
			}

			widget.dataset.aosWidgetBound = '1';
			applyWidgetState(widget, null);
			makeDraggable(widget);

			if (widget.dataset.aosWidgetNative === 'clock') {
				bindClockWidget(widget);
			}
		}

		function bindExistingWidgets() {
			if (!layer) {
				return;
			}

			layer.querySelectorAll('[data-aos-widget]').forEach(bindWidget);
		}

		function restoreSession() {
			if (!layer) {
				return;
			}

			const widgets = sessionStore.getSection('widgets', []);
			if (!Array.isArray(widgets)) {
				return;
			}

			restoreInProgress = true;

			widgets.forEach((item) => {
				if (!item || typeof item !== 'object' || !item.id) {
					return;
				}

				const widget = layer.querySelector(`[data-aos-widget="${dom.escapeAttribute(item.id)}"]`);
				if (widget) {
					applyWidgetState(widget, item.state);
				}
			});

			restoreInProgress = false;
		}

		function getWidget(widgetId) {
			if (!layer || !widgetId) {
				return null;
			}

			return layer.querySelector(`[data-aos-widget="${dom.escapeAttribute(widgetId)}"]`);
		}

		function hideWidget(widgetOrId) {
			const widget = typeof widgetOrId === 'string' ? getWidget(widgetOrId) : widgetOrId;
			if (!widget) {
				return;
			}

			widget.hidden = true;
			scheduleSave();
		}

		window.addEventListener('beforeunload', saveSession);

		return {
			bindExistingWidgets,
			getWidget,
			hideWidget,
			restoreSession,
			saveSession
		};
	};
})();
