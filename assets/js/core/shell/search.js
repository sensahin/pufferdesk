(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.shell = window.PufferDesk.shell || {};

	window.PufferDesk.shell.bindSearch = function bindSearch(shell, launcher, config = {}, options = {}) {
		const dom = window.PufferDesk.dom;
		const searchInputs = Array.from(shell.querySelectorAll('[data-pdk-search]'));
		const transientSurfaces = window.PufferDesk.shell.transientSurfaces || null;
		const searchEngine = options.searchEngine || (window.PufferDesk.search && typeof window.PufferDesk.search.createSearchEngine === 'function'
			? window.PufferDesk.search.createSearchEngine(config, {
				commands: options.commands || window.PufferDesk.menuCommands || null,
				documentStore: options.documentStore || null,
				launcher
			})
			: null);
		const labels = config.menu && config.menu.labels && typeof config.menu.labels === 'object' ? config.menu.labels : {};
		let panel = null;
		let panelInput = null;
		let resultsList = null;
		let activeTrigger = null;
		let activeResults = [];
		let activeIndex = -1;
		let searchRequestId = 0;

		if (!searchInputs.length || !dom || !searchEngine || typeof searchEngine.search !== 'function') {
			return;
		}

		function getLabel(key, fallback = '') {
			const value = labels[key];

			return typeof value === 'string' && value ? value : fallback || key;
		}

		function announceSearchFocus() {
			if (transientSurfaces && typeof transientSurfaces.announce === 'function') {
				transientSurfaces.announce('search');
			}
		}

		function isSearchTrigger(element) {
			return Boolean(element && element.matches && (element.matches('[data-pdk-search]') || element.matches('.pdk-start-search-input')));
		}

		function getResultGroupLabel(type) {
			return getLabel(`search_group_${type}`, getLabel(`search_type_${type}`, type));
		}

		function createPanel() {
			const nextPanel = dom.createElement('section', 'pdk-search-panel');
			const inner = dom.createElement('div', 'pdk-search-panel-inner');
			const field = dom.createElement('label', 'pdk-search-panel-field');
			const icon = dom.createElement('span', 'pdk-search-panel-icon');
			const input = document.createElement('input');
			const list = dom.createElement('div', 'pdk-search-results');

			nextPanel.hidden = true;
			nextPanel.dataset.pdkSearchPanel = '';
			nextPanel.setAttribute('role', 'dialog');
			nextPanel.setAttribute('aria-label', getLabel('search', 'Search'));
			icon.appendChild(dom.createDashicon('dashicons-search'));
			input.type = 'search';
			input.className = 'pdk-search-panel-input';
			input.autocomplete = 'off';
			input.spellcheck = false;
			input.placeholder = getLabel('searchPlaceholder', getLabel('search', 'Search'));
			input.setAttribute('aria-label', getLabel('start_search_label', getLabel('search_apps', 'Search apps')));
			list.setAttribute('role', 'listbox');
			field.append(icon, input);
			inner.append(field, list);
			nextPanel.appendChild(inner);
			shell.appendChild(nextPanel);

			panel = nextPanel;
			panelInput = input;
			resultsList = list;
			bindPanelEvents();
		}

		function clearTriggerValues() {
			searchInputs.forEach((input) => {
				input.value = '';
			});
			const startInput = shell.querySelector('.pdk-start-search-input');
			if (startInput) {
				startInput.value = '';
			}
		}

		function setActiveIndex(index) {
			const max = activeResults.length - 1;
			activeIndex = max >= 0 ? Math.max(0, Math.min(max, index)) : -1;
			if (!resultsList) {
				return;
			}

			Array.from(resultsList.querySelectorAll('[data-pdk-search-result]')).forEach((button) => {
				const selected = Number.parseInt(button.dataset.pdkSearchResult, 10) === activeIndex;
				button.classList.toggle('is-active', selected);
				button.setAttribute('aria-selected', selected ? 'true' : 'false');
				if (selected) {
					button.scrollIntoView({ block: 'nearest' });
				}
			});
		}

		function createEmptyState(query) {
			const empty = dom.createElement('div', 'pdk-search-empty');

			empty.textContent = query ? getLabel('search_no_results', 'No results found') : getLabel('quick_actions', 'Quick Actions');

			return empty;
		}

		function createResultButton(result, index) {
			const button = document.createElement('button');
			const icon = dom.createElement('span', 'pdk-search-result-icon');
			const text = dom.createElement('span', 'pdk-search-result-text');
			const label = dom.createElement('span', 'pdk-search-result-label', result.label);
			const meta = dom.createElement('span', 'pdk-search-result-meta', result.subtitle || '');

			button.type = 'button';
			button.className = 'pdk-search-result';
			button.dataset.pdkSearchResult = String(index);
			button.setAttribute('role', 'option');
			button.setAttribute('aria-selected', 'false');
			button.setAttribute('aria-label', result.label);
			icon.appendChild(dom.createIcon(result.icon || 'dashicons-search'));
			text.append(label, meta);
			button.append(icon, text);
			if (result.snippet) {
				button.appendChild(dom.createElement('span', 'pdk-search-result-snippet', result.snippet));
			}
			button.addEventListener('click', () => {
				executeResult(index);
			});

			return button;
		}

		function renderResults(query, results) {
			const fragment = document.createDocumentFragment();
			const grouped = new Map();

			activeResults = Array.isArray(results) ? results : [];
			activeResults.forEach((result) => {
				const group = result.type || 'result';
				if (!grouped.has(group)) {
					grouped.set(group, []);
				}
				grouped.get(group).push(result);
			});

			resultsList.replaceChildren();
			if (!activeResults.length) {
				resultsList.appendChild(createEmptyState(query));
				setActiveIndex(-1);
				return;
			}

			grouped.forEach((items, group) => {
				const section = dom.createElement('section', 'pdk-search-result-group');
				const heading = dom.createElement('div', 'pdk-search-result-heading', getResultGroupLabel(group));

				section.appendChild(heading);
				items.forEach((result) => {
					section.appendChild(createResultButton(result, activeResults.indexOf(result)));
				});
				fragment.appendChild(section);
			});

			resultsList.appendChild(fragment);
			setActiveIndex(0);
		}

		function updateResults() {
			const query = panelInput ? panelInput.value.trim() : '';
			const requestId = searchRequestId + 1;

			searchRequestId = requestId;
			if (!resultsList) {
				return;
			}

			resultsList.dataset.pdkSearchLoading = '1';
			searchEngine.search(query, { limit: 18 }).then((results) => {
				if (requestId !== searchRequestId) {
					return;
				}

				resultsList.dataset.pdkSearchLoading = '0';
				renderResults(query, results);
			}).catch(() => {
				if (requestId !== searchRequestId) {
					return;
				}

				resultsList.dataset.pdkSearchLoading = '0';
				renderResults(query, []);
			});
		}

		function executeResult(index = activeIndex) {
			const result = activeResults[index];

			if (!result || typeof searchEngine.execute !== 'function') {
				return false;
			}

			if (searchEngine.execute(result)) {
				closeSearch({ clear: true });
				return true;
			}

			return false;
		}

		function openSearch(trigger = null) {
			if (!panel) {
				createPanel();
			}
			if (trigger && trigger !== panelInput) {
				activeTrigger = trigger;
				panelInput.value = trigger.value || '';
			}

			announceSearchFocus();
			panel.hidden = false;
			panel.classList.add('is-open');
			shell.dataset.pdkSearchOpen = '1';
			updateResults();
			window.requestAnimationFrame(() => {
				panelInput.focus();
				if (typeof panelInput.select === 'function') {
					panelInput.select();
				}
			});
		}

		function closeSearch(options = {}) {
			if (!panel || panel.hidden) {
				return;
			}

			panel.hidden = true;
			panel.classList.remove('is-open');
			delete shell.dataset.pdkSearchOpen;
			activeResults = [];
			activeIndex = -1;
			if (options.clear) {
				panelInput.value = '';
				clearTriggerValues();
			}
			if (options.restoreFocus && activeTrigger && document.contains(activeTrigger)) {
				activeTrigger.focus();
			}
		}

		function bindPanelEvents() {
			panelInput.addEventListener('input', updateResults);
			panelInput.addEventListener('keydown', (event) => {
				if (event.key === 'Escape') {
					event.preventDefault();
					closeSearch({ restoreFocus: true });
					return;
				}
				if (event.key === 'ArrowDown') {
					event.preventDefault();
					setActiveIndex(activeIndex + 1);
					return;
				}
				if (event.key === 'ArrowUp') {
					event.preventDefault();
					setActiveIndex(activeIndex - 1);
					return;
				}
				if (event.key === 'Enter') {
					event.preventDefault();
					executeResult();
				}
			});
		}

		shell.addEventListener('focusin', (event) => {
			if (isSearchTrigger(event.target)) {
				openSearch(event.target);
			}
		});

		shell.addEventListener('input', (event) => {
			if (isSearchTrigger(event.target)) {
				openSearch(event.target);
			}
		});

		shell.addEventListener('keydown', (event) => {
			if (!isSearchTrigger(event.target)) {
				return;
			}

			if (event.key === 'Enter' || event.key === 'ArrowDown') {
				event.preventDefault();
				openSearch(event.target);
			}
			if (event.key === 'Escape') {
				closeSearch();
			}
		});

		document.addEventListener('pointerdown', (event) => {
			if (!panel || panel.hidden) {
				return;
			}

			if (panel.contains(event.target) || isSearchTrigger(event.target)) {
				return;
			}

			closeSearch();
		});

		window.addEventListener('resize', () => closeSearch());
		if (transientSurfaces && typeof transientSurfaces.closeOnOther === 'function') {
			transientSurfaces.closeOnOther('search', () => closeSearch());
		}
	};
})();
