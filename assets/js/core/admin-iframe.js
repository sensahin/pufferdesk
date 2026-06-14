(function () {
	'use strict';

	const config = window.pufferDeskIframe && typeof window.pufferDeskIframe === 'object'
		? window.pufferDeskIframe
		: {};
	const queryKey = typeof config.queryKey === 'string' && config.queryKey ? config.queryKey : 'pufferdesk_iframe';
	const queryValue = typeof config.queryValue === 'string' && config.queryValue ? config.queryValue : '1';
	const adminBase = typeof config.adminBase === 'string' && config.adminBase ? config.adminBase : `${window.location.origin}/wp-admin/`;
	let adminUrl = null;

	try {
		adminUrl = new URL(adminBase, window.location.href);
	} catch (error) {
		adminUrl = new URL('/wp-admin/', window.location.origin);
	}

	function isSkippableUrl(value) {
		const url = String(value || '').trim();

		return !url
			|| url.charAt(0) === '#'
			|| /^(?:javascript|mailto|tel|data|blob):/i.test(url);
	}

	function isAdminUrl(url) {
		return url.origin === adminUrl.origin
			&& url.pathname.indexOf(adminUrl.pathname.replace(/\/$/, '')) === 0;
	}

	function getLinkUrl(value) {
		if (isSkippableUrl(value)) {
			return null;
		}

		try {
			return new URL(value, window.location.href);
		} catch (error) {
			return null;
		}
	}

	function shouldLeaveIframe(url) {
		return url
			&& (url.protocol === 'http:' || url.protocol === 'https:')
			&& !isAdminUrl(url);
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

	function withIframeParam(value) {
		if (isSkippableUrl(value)) {
			return '';
		}

		try {
			const url = new URL(value, window.location.href);
			if (!isAdminUrl(url)) {
				return '';
			}

			url.searchParams.set(queryKey, queryValue);
			return url.toString();
		} catch (error) {
			return '';
		}
	}

	function ensureHiddenInput(form) {
		let input = form.querySelector(`input[type="hidden"][name="${window.CSS && window.CSS.escape ? window.CSS.escape(queryKey) : queryKey}"]`);

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
		const linkUrl = getLinkUrl(href);
		const target = String(link.getAttribute('target') || '').trim().toLowerCase();
		if (target && target !== '_self') {
			if (shouldLeaveIframe(linkUrl)) {
				ensureExternalLink(link);
			}
			return;
		}

		if (shouldLeaveIframe(linkUrl)) {
			ensureExternalLink(link);
			return;
		}

		const next = withIframeParam(href);
		if (next) {
			link.setAttribute('href', next);
		}
	}

	function rewriteForm(form) {
		if (!form) {
			return;
		}

		const next = withIframeParam(form.getAttribute('action') || window.location.href);
		if (next) {
			form.setAttribute('action', next);
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

	document.addEventListener('click', (event) => {
		const link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
		if (link) {
			rewriteLink(link);
		}
	}, true);

	document.addEventListener('submit', (event) => {
		rewriteForm(event.target);
	}, true);

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', rewriteDocument, { once: true });
	} else {
		rewriteDocument();
	}

	if (typeof window.MutationObserver === 'function') {
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
