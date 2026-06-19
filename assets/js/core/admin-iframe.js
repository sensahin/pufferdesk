(function () {
	'use strict';

	const config = window.pufferDeskIframe && typeof window.pufferDeskIframe === 'object'
		? window.pufferDeskIframe
		: {};
	const queryKey = typeof config.queryKey === 'string' && config.queryKey ? config.queryKey : 'pufferdesk_iframe';
	const queryValue = typeof config.queryValue === 'string' && config.queryValue ? config.queryValue : '1';
	const classicKey = typeof config.classicKey === 'string' && config.classicKey ? config.classicKey : 'pufferdesk_classic';
	const pageKey = typeof config.pageKey === 'string' && config.pageKey ? config.pageKey : 'page';
	const pageSlug = typeof config.pageSlug === 'string' && config.pageSlug ? config.pageSlug : 'pufferdesk';
	const adminBase = typeof config.adminBase === 'string' && config.adminBase ? config.adminBase : `${window.location.origin}/wp-admin/`;
	let adminUrl = null;
	let readySent = false;

	if (document.documentElement) {
		document.documentElement.classList.add('pufferdesk-iframe-document', 'pufferdesk-iframe-booting');
	}

	try {
		adminUrl = new URL(adminBase, window.location.href);
	} catch (error) {
		adminUrl = new URL('/wp-admin/', window.location.origin);
	}

	function notifyParent(type, detail = {}) {
		if (window.parent === window) {
			return;
		}

		try {
			window.parent.postMessage(Object.assign({
				href: window.location.href,
				source: 'pufferdesk-admin-iframe',
				type: `pufferdesk:iframe-${type}`
			}, detail), window.location.origin);
		} catch (error) {}
	}

	function getLatestConfig() {
		return window.pufferDeskIframe && typeof window.pufferDeskIframe === 'object'
			? window.pufferDeskIframe
			: config;
	}

	function getAdminContext() {
		const latest = getLatestConfig();
		const context = latest.context && typeof latest.context === 'object' && !Array.isArray(latest.context)
			? latest.context
			: {};

		return context;
	}

	function isSkippableUrl(value) {
		const url = String(value || '').trim();

		return !url
			|| url.charAt(0) === '#'
			|| /^(?:javascript|mailto|tel|data|blob):/i.test(url);
	}

	function getUrl(value) {
		if (isSkippableUrl(value)) {
			return null;
		}

		try {
			return new URL(value, window.location.href);
		} catch (error) {
			return null;
		}
	}

	function isAdminUrl(url) {
		const adminPath = adminUrl.pathname.replace(/\/$/, '');

		return Boolean(url)
			&& url.origin === adminUrl.origin
			&& url.pathname.indexOf(adminPath) === 0;
	}

	function isShellUrl(url) {
		return isAdminUrl(url) && url.searchParams.get(pageKey) === pageSlug;
	}

	function hasIframeParam(url) {
		return isAdminUrl(url) && url.searchParams.get(queryKey) === queryValue;
	}

	function shouldLeaveIframe(url) {
		return url
			&& (url.protocol === 'http:' || url.protocol === 'https:')
			&& !isAdminUrl(url);
	}

	function getClassicDashboardUrl() {
		const url = new URL('index.php', adminUrl);

		url.searchParams.set(classicKey, queryValue);
		url.searchParams.set(queryKey, queryValue);

		return url.toString();
	}

	function ensureExternalLink(link) {
		const relValues = String(link.getAttribute('rel') || '')
			.split(/\s+/)
			.filter(Boolean);
		const relSet = new Set(relValues);

		relSet.add('noopener');
		relSet.add('noreferrer');

		link.setAttribute('target', '_blank');
		link.setAttribute('rel', Array.from(relSet).join(' '));
	}

	function forceSelfTarget(element) {
		const target = String(element.getAttribute('target') || '').trim().toLowerCase();

		if (target && target !== '_self') {
			element.removeAttribute('target');
		}
	}

	function withIframeParam(value) {
		const url = getUrl(value);

		if (!isAdminUrl(url)) {
			return '';
		}

		if (isShellUrl(url)) {
			return getClassicDashboardUrl();
		}

		url.searchParams.set(queryKey, queryValue);
		return url.toString();
	}

	function ensureHiddenInput(form) {
		let input = Array.from(form.querySelectorAll('input[type="hidden"]')).find((field) => field.name === queryKey);

		if (!input) {
			input = document.createElement('input');
			input.type = 'hidden';
			input.name = queryKey;
			form.appendChild(input);
		}

		input.value = queryValue;
	}

	function rewriteLink(link) {
		if (!link || link.hasAttribute('download')) {
			return;
		}

		const href = link.getAttribute('href') || '';
		const linkUrl = getUrl(href);

		if (shouldLeaveIframe(linkUrl)) {
			ensureExternalLink(link);
			return;
		}

		const next = withIframeParam(href);
		if (next) {
			link.setAttribute('href', next);
			forceSelfTarget(link);
		}
	}

	function rewriteForm(form) {
		if (!form) {
			return;
		}

		const next = withIframeParam(form.getAttribute('action') || window.location.href);
		if (next) {
			form.setAttribute('action', next);
			forceSelfTarget(form);
			ensureHiddenInput(form);
		}
	}

	function rewriteNode(node) {
		if (!node || node.nodeType !== 1) {
			return;
		}

		if (node.matches('a[href]')) {
			rewriteLink(node);
		} else if (node.matches('form')) {
			rewriteForm(node);
		}

		node.querySelectorAll('a[href]').forEach(rewriteLink);
		node.querySelectorAll('form').forEach(rewriteForm);
	}

	function rewriteDocument() {
		if (document.documentElement) {
			document.documentElement.classList.add('pufferdesk-iframe-document');
		}
		if (document.body) {
			document.body.classList.add('pufferdesk-iframe');
		}
		rewriteNode(document.body || document.documentElement);
	}

	function chromeSuppressed() {
		if (!document.body || !document.body.classList.contains('pufferdesk-iframe')) {
			return false;
		}

		const chromeElements = [
			document.getElementById('wpadminbar'),
			document.getElementById('adminmenumain'),
			document.getElementById('adminmenu'),
			document.getElementById('adminmenuback'),
			document.getElementById('adminmenuwrap'),
			document.getElementById('wpfooter')
		].filter(Boolean);

		return chromeElements.every((element) => window.getComputedStyle(element).display === 'none');
	}

	function documentIsSafe() {
		const current = getUrl(window.location.href);

		return Boolean(current)
			&& isAdminUrl(current)
			&& hasIframeParam(current)
			&& !isShellUrl(current)
			&& chromeSuppressed();
	}

	function scheduleReadyCheck(attempt = 0) {
		if (readySent) {
			return;
		}

		if (documentIsSafe()) {
			readySent = true;
			if (document.documentElement) {
				document.documentElement.classList.remove('pufferdesk-iframe-booting');
			}
			notifyParent('ready', {
				context: getAdminContext()
			});
			return;
		}

		if (attempt >= 24) {
			notifyParent('error');
			return;
		}

		window.setTimeout(() => scheduleReadyCheck(attempt + 1), 50);
	}

	function notifyNavigationStartAfterSubmit(event) {
		window.setTimeout(() => {
			if (!event.defaultPrevented) {
				notifyParent('navigation-start');
			}
		}, 0);
	}

	document.addEventListener('click', (event) => {
		const link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
		if (link) {
			rewriteLink(link);
		}
	}, true);

	document.addEventListener('submit', (event) => {
		rewriteForm(event.target);
		notifyNavigationStartAfterSubmit(event);
	}, true);

	window.addEventListener('beforeunload', () => {
		notifyParent('beforeunload');
	});
	window.addEventListener('pagehide', () => {
		notifyParent('beforeunload');
	});

	const nativeOpen = window.open ? window.open.bind(window) : null;
	if (nativeOpen) {
		window.open = function pufferDeskOpen(value, target, features) {
			const url = getUrl(value);

			if (isAdminUrl(url)) {
				const next = withIframeParam(url.toString());
				if (next) {
					notifyParent('navigation-start');
					window.location.href = next;
					return null;
				}
			}

			if (shouldLeaveIframe(url)) {
				const featureText = String(features || '');
				const nextFeatures = featureText
					? `${featureText},noopener,noreferrer`
					: 'noopener,noreferrer';
				return nativeOpen(url.toString(), '_blank', nextFeatures);
			}

			return nativeOpen(value, target, features);
		};
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => {
			rewriteDocument();
			scheduleReadyCheck();
		}, { once: true });
	} else {
		rewriteDocument();
		scheduleReadyCheck();
	}

	if (typeof window.MutationObserver === 'function' && document.documentElement) {
		const observer = new window.MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				mutation.addedNodes.forEach(rewriteNode);
			});
		});

		observer.observe(document.documentElement, {
			childList: true,
			subtree: true
		});
	}
})();
