(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.dragDrop = window.PufferDesk.dragDrop || {};

	window.PufferDesk.dragDrop.createDropTargetRegistry = function createDropTargetRegistry(options = {}) {
		const models = window.PufferDesk.dragDrop.models;
		const events = options.events || window.PufferDesk.events || null;
		const containers = new Map();
		const resolvers = new Set();

		function emit(name, detail = {}) {
			if (events && typeof events.emit === 'function') {
				events.emit(name, detail);
			}
		}

		function normalizeContainer(container = {}) {
			const raw = container && typeof container === 'object' ? container : {};
			const id = models.normalizeContainerId(raw.id || models.createContainerId(raw.type || raw.kind || '', raw.targetId || raw.folderId || ''));

			if (!id) {
				return null;
			}

			return {
				accepts: typeof raw.accepts === 'function' ? raw.accepts : () => false,
				canContainFolders: Boolean(raw.canContainFolders),
				canMoveOut: typeof raw.canMoveOut === 'function' ? raw.canMoveOut : () => true,
				canReorder: Boolean(raw.canReorder),
				element: raw.element || null,
				id,
				label: String(raw.label || '').trim(),
				maxDepth: Number.isFinite(Number.parseInt(raw.maxDepth, 10)) ? Math.max(0, Number.parseInt(raw.maxDepth, 10)) : null,
				metadata: Object.assign({}, raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {}),
				persistence: String(raw.persistence || raw.persistenceStrategy || '').trim(),
				type: String(raw.type || models.parseContainerId(id).type || '').trim()
			};
		}

		function register(container) {
			const normalized = normalizeContainer(container);

			if (!normalized) {
				return null;
			}

			containers.set(normalized.id, normalized);
			emit('dragdrop:container:registered', {
				container: normalized
			});

			return normalized;
		}

		function unregister(containerId) {
			const id = models.normalizeContainerId(containerId);
			const removed = id ? containers.get(id) : null;

			if (!id || !removed) {
				return false;
			}

			containers.delete(id);
			emit('dragdrop:container:unregistered', {
				container: removed
			});

			return true;
		}

		function registerResolver(resolver) {
			if (typeof resolver !== 'function') {
				return () => {};
			}

			resolvers.add(resolver);

			return () => {
				resolvers.delete(resolver);
			};
		}

		function resolveDynamicContainer(id) {
			for (const resolver of resolvers) {
				const resolved = normalizeContainer(resolver(id, registry));
				if (resolved) {
					return resolved;
				}
			}

			return null;
		}

		function get(containerId) {
			const id = models.normalizeContainerId(containerId);

			if (!id) {
				return null;
			}

			return containers.get(id) || resolveDynamicContainer(id);
		}

		function has(containerId) {
			return Boolean(get(containerId));
		}

		function list() {
			return Array.from(containers.values());
		}

		const registry = {
			get,
			has,
			list,
			normalizeContainer,
			register,
			registerResolver,
			unregister
		};

		return registry;
	};
})();
