(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};

	const defaultPlacements = ['top', 'right', 'bottom', 'left'];

	function getPlacements() {
		const config = window.PufferDesk.config;

		return config && typeof config.getContractList === 'function'
			? config.getContractList('tooltipPlacements', defaultPlacements)
			: defaultPlacements;
	}

	function normalizePlacement(placement) {
		return getPlacements().includes(placement) ? placement : 'top';
	}

	function normalizeSurface(surface) {
		const value = typeof surface === 'string' ? surface.trim() : '';

		return /^[a-z0-9_-]+$/i.test(value) ? value : '';
	}

	function getDirectTooltip(target) {
		if (!target || !target.children) {
			return null;
		}

		return Array.from(target.children).find((child) => child.classList && child.classList.contains('pdk-tooltip')) || null;
	}

	function getTooltipLabel(label) {
		return typeof label === 'string' ? label : String(label || '');
	}

	function create(label, options = {}) {
		const tooltip = document.createElement('span');
		const surface = normalizeSurface(options.surface);
		const classes = [ 'pdk-tooltip' ];

		if (surface) {
			classes.push(`pdk-${surface}-tooltip`);
		}

		if (typeof options.className === 'string' && options.className) {
			classes.push(options.className);
		}

		tooltip.className = classes.join(' ');
		tooltip.dataset.pdkTooltipPlacement = normalizePlacement(options.placement);
		tooltip.setAttribute('aria-hidden', 'true');
		tooltip.textContent = getTooltipLabel(label);

		return tooltip;
	}

	function setTriggerAttributes(target, label, options = {}) {
		if (!target || !target.dataset || !target.classList) {
			return;
		}

		const surface = normalizeSurface(options.surface);

		target.classList.add('pdk-tooltip-trigger');
		target.dataset.pdkTooltip = getTooltipLabel(label);
		target.dataset.pdkTooltipPlacement = normalizePlacement(options.placement);
		if (surface) {
			target.dataset.pdkTooltipSurface = surface;
		}
		if (surface === 'dock' || options.dockCompat === true) {
			target.dataset.pdkDockTooltip = getTooltipLabel(label);
		}
	}

	function attach(target, label, options = {}) {
		if (!target) {
			return null;
		}

		setTriggerAttributes(target, label, options);

		const tooltip = getDirectTooltip(target) || create(label, options);
		const surface = normalizeSurface(options.surface);

		tooltip.textContent = getTooltipLabel(label);
		tooltip.dataset.pdkTooltipPlacement = normalizePlacement(options.placement);
		tooltip.classList.add('pdk-tooltip');
		if (surface) {
			tooltip.classList.add(`pdk-${surface}-tooltip`);
		}
		if (!tooltip.parentNode) {
			target.appendChild(tooltip);
		}

		return tooltip;
	}

	window.PufferDesk.tooltips = {
		attach,
		create,
		setTriggerAttributes
	};
})();
