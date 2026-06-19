(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};

	const activeInstances = new Set();
	const STATUS_SUCCESS_CLEAR_DELAY = 4000;

	function getDesktopApi() {
		return window.PufferDesk.desktopApi || (window.PufferDesk.desktop && window.PufferDesk.desktop.api) || null;
	}

	function getNativeUsersConfig(config = {}) {
		const nativeAdmin = config.nativeAdmin && typeof config.nativeAdmin === 'object' ? config.nativeAdmin : {};
		const apps = nativeAdmin.apps && typeof nativeAdmin.apps === 'object' ? nativeAdmin.apps : {};
		const appIds = window.PufferDesk.apps.ids || {};

		return apps[appIds.USERS] && typeof apps[appIds.USERS] === 'object' ? apps[appIds.USERS] : {};
	}

	function getLabels(config = {}) {
		const nativeAdmin = config.nativeAdmin && typeof config.nativeAdmin === 'object' ? config.nativeAdmin : {};
		const labels = nativeAdmin.labels && nativeAdmin.labels.users && typeof nativeAdmin.labels.users === 'object'
			? nativeAdmin.labels.users
			: {};

		return Object.assign({
			addUser: 'Add User',
			addUserTitle: 'Add User',
			advancedDetails: 'Advanced Details',
			allRoles: 'All roles',
			bioLabel: 'Bio',
			cancel: 'Cancel',
			close: 'Close',
			createUser: 'Add User',
			detailsTitle: 'User Details',
			displayNameLabel: 'Display name',
			editInWordPress: 'Edit in WordPress',
			editProfile: 'Edit Profile',
			emailLabel: 'Email',
			emptyDescription: 'Try a different search term or role filter.',
			emptyTitle: 'No users found',
			firstNameLabel: 'First name',
			inviteLabel: 'Send the new user an email invitation',
			lastNameLabel: 'Last name',
			loading: 'Loading users...',
			loginLabel: 'Username',
			manualUsername: 'Set username manually',
			nameLabel: 'Name',
			nativeDisabled: 'This native workflow is disabled in Settings.',
			openProfile: 'Open Profile',
			paginationEmpty: 'No users',
			paginationPage: 'Page %1$d of %2$d',
			paginationRange: 'Showing %1$d-%2$d of %3$d',
			permissionDenied: 'You do not have permission to view users.',
			postsLabel: 'Posts',
			nextPage: 'Next',
			previousPage: 'Previous',
			profileTitle: 'Profile',
			registeredLabel: 'Registered',
			roleLabel: 'Role',
			saveProfile: 'Save Profile',
			saving: 'Saving...',
			searchLabel: 'Search users',
			searchPlaceholder: 'Search users',
			serviceError: 'Users could not be loaded.',
			subtitle: 'WordPress account directory',
			usernameHelp: 'Leave blank to generate it from the email address.',
			urlLabel: 'Website',
			userCount: '%d users',
			userCreated: 'User added.',
			usersTitle: 'Users'
		}, labels);
	}

	function getActions(nativeUsers = {}) {
		const actions = nativeUsers.actions && typeof nativeUsers.actions === 'object' ? nativeUsers.actions : {};

		return Object.assign({
			create: '',
			getProfile: '',
			list: '',
			updateProfile: ''
		}, actions);
	}

	function getFeature(nativeUsers = {}, feature) {
		const features = nativeUsers.features && typeof nativeUsers.features === 'object' ? nativeUsers.features : {};

		return features[feature] === true;
	}

	function getFallbackUrl(nativeUsers = {}, feature) {
		const fallbackUrls = nativeUsers.fallbackUrls && typeof nativeUsers.fallbackUrls === 'object' ? nativeUsers.fallbackUrls : {};

		return fallbackUrls[feature] || fallbackUrls.directory || '';
	}

	function format(config, template, values = []) {
		return window.PufferDesk.config && typeof window.PufferDesk.config.formatTemplate === 'function'
			? window.PufferDesk.config.formatTemplate(template, values)
			: String(template || '');
	}

	function normalizeSearch(value) {
		return String(value || '').trim();
	}

	function normalizeUserId(value) {
		return Number.parseInt(value, 10) || 0;
	}

	function normalizeNumber(value, fallback = 0) {
		const number = Number.parseInt(value, 10);

		return Number.isFinite(number) ? number : fallback;
	}

	function normalizePagination(value = {}, fallback = {}) {
		const data = value && typeof value === 'object' ? value : {};
		const base = fallback && typeof fallback === 'object' ? fallback : {};
		const page = Math.max(1, normalizeNumber(data.page, normalizeNumber(base.page, 1)));
		const pages = Math.max(0, normalizeNumber(data.pages, normalizeNumber(base.pages, 0)));
		const total = Math.max(0, normalizeNumber(data.total, normalizeNumber(base.total, 0)));
		const perPage = Math.max(1, normalizeNumber(data.perPage, normalizeNumber(base.perPage, 50)));
		const count = Math.max(0, normalizeNumber(data.count, normalizeNumber(base.count, 0)));
		const from = Math.max(0, normalizeNumber(data.from, normalizeNumber(base.from, 0)));
		const to = Math.max(0, normalizeNumber(data.to, normalizeNumber(base.to, 0)));

		return {
			count,
			from,
			hasNext: data.hasNext === true,
			hasPrev: data.hasPrev === true,
			page,
			pages,
			perPage,
			to,
			total
		};
	}

	function createEmptyState(dom, title, description) {
		const empty = dom.createElement('div', 'pdk-users-empty');

		empty.appendChild(dom.createElement('strong', '', title));
		if (description) {
			empty.appendChild(dom.createElement('span', '', description));
		}

		return empty;
	}

	function createAvatar(user, className) {
		const img = document.createElement('img');
		img.className = className;
		img.alt = '';
		img.loading = 'lazy';
		img.decoding = 'async';
		img.src = user.avatar || '';

		return img;
	}

	function createDetailRow(dom, label, value, className = '') {
		const row = dom.createElement('div', `pdk-users-detail-row ${className}`.trim());

		row.appendChild(dom.createElement('span', 'pdk-users-detail-label', label));
		row.appendChild(dom.createElement('span', 'pdk-users-detail-value', value || '-'));

		return row;
	}

	function getNativeControls() {
		return window.PufferDesk.services && window.PufferDesk.services.nativeControls
			? window.PufferDesk.services.nativeControls
			: null;
	}

	function getModalDialogs() {
		return window.PufferDesk.services && window.PufferDesk.services.modalDialog
			? window.PufferDesk.services.modalDialog
			: null;
	}

	function createButton(label, options = {}) {
		return getNativeControls().createButton(label, options);
	}

	function createField(label, control, description = '') {
		return getNativeControls().createField(label, control, {
			description
		});
	}

	function createForm() {
		return getNativeControls().createForm();
	}

	function createTextInput(value = '', type = 'text') {
		return getNativeControls().createTextInput(value, {
			type
		});
	}

	function createTextarea(value = '', options = {}) {
		return getNativeControls().createTextarea(value, options);
	}

	function createRoleSelect(value = '', options = []) {
		return getNativeControls().createSelect(value, options);
	}

	function createCheckbox(label, checked = false) {
		return getNativeControls().createCheckbox(label, checked);
	}

	function openUrl(url, title = '', icon = 'dashicons-admin-users') {
		const api = getDesktopApi();
		const commands = window.PufferDesk.menuCommands || null;
		const commandIds = window.PufferDesk.shell && window.PufferDesk.shell.commands ? window.PufferDesk.shell.commands : {};

		if (!url) {
			return false;
		}

		if (api && api.apps && typeof api.apps.openUrl === 'function') {
			api.apps.openUrl(url, title, icon);
			return true;
		}

		if (commands && typeof commands.execute === 'function' && commandIds.OPEN_URL) {
			commands.execute({
				command: commandIds.OPEN_URL,
				icon,
				label: title,
				title,
				url
			});
			return true;
		}

		window.location.href = url;
		return true;
	}

	function openUserInWordPress(user, labels = {}) {
		return openUrl(user && user.editUrl ? user.editUrl : '', user && (user.displayName || user.login) || labels.editInWordPress || '', 'dashicons-admin-users');
	}

	function getPrimaryInstance() {
		return Array.from(activeInstances).find((instance) => instance && instance.root && instance.root.isConnected) || null;
	}

	function getRuntimeConfig() {
		return window.PufferDesk.config && typeof window.PufferDesk.config.get === 'function'
			? window.PufferDesk.config.get()
			: {};
	}

	function getWorkflowConfig() {
		return getNativeUsersConfig(getRuntimeConfig());
	}

	function openUsersWorkflowWindow(workflow, payload = {}) {
		const api = getDesktopApi();
		const appIds = window.PufferDesk.apps.ids || {};

		if (!api || !api.apps || typeof api.apps.open !== 'function' || !appIds.USERS) {
			return null;
		}

		return api.apps.open(appIds.USERS, {
			nativeContext: Object.assign({}, payload, {
				nativeAdminFeature: workflow
			})
		});
	}

	function openWorkflowFallback(workflow, payload = {}) {
		const config = getRuntimeConfig();
		const nativeUsers = getNativeUsersConfig(config);
		const labels = getLabels(config);
		const feature = workflow === 'profile' ? 'profile' : 'add';
		const fallback = getFallbackUrl(nativeUsers, feature);

		if (workflow === 'profile' && payload.user && payload.user.editUrl) {
			return openUserInWordPress(payload.user, labels);
		}

		return openUrl(fallback, workflow === 'profile' ? labels.profileTitle : labels.addUser, 'dashicons-admin-users');
	}

	function openWorkflow(workflow, payload = {}) {
		const nativeUsers = getWorkflowConfig();
		const feature = workflow === 'profile' ? 'profile' : 'add';
		const instance = getPrimaryInstance();

		if (!getFeature(nativeUsers, feature)) {
			return openWorkflowFallback(workflow, payload);
		}

		if (instance) {
			return workflow === 'profile'
				? instance.openProfile(payload)
				: instance.openAddUser(payload);
		}

		const win = openUsersWorkflowWindow(feature, payload);
		if (!win) {
			return openWorkflowFallback(workflow, payload);
		}

		return true;
	}

	window.PufferDesk.apps.usersWorkflow = {
		openAddUser(payload = {}) {
			return openWorkflow('add', payload);
		},
		openProfile(payload = {}) {
			return openWorkflow('profile', payload);
		}
	};

	function createUsersApp(context = {}) {
		const config = context.config || getRuntimeConfig();
		const nativeUsers = getNativeUsersConfig(config);
		const actions = getActions(nativeUsers);
		const labels = getLabels(config);
		const dom = window.PufferDesk.dom;
		const api = window.PufferDesk.services && window.PufferDesk.services.api ? window.PufferDesk.services.api : null;
		const root = dom.createElement('div', 'pdk-users-app');
		const header = dom.createElement('header', 'pdk-users-header');
		const titleStack = dom.createElement('div', 'pdk-users-title-stack');
		const toolbar = dom.createElement('div', 'pdk-users-toolbar');
		const toolbarActions = dom.createElement('div', 'pdk-users-toolbar-actions');
		const searchLabel = dom.createElement('label', 'pdk-users-search');
		const searchInput = document.createElement('input');
		const roleSelect = document.createElement('select');
		const count = dom.createElement('span', 'pdk-users-count');
		const body = dom.createElement('div', 'pdk-users-body');
		const list = dom.createElement('div', 'pdk-users-list');
		const detail = dom.createElement('section', 'pdk-users-detail');
		const pager = dom.createElement('div', 'pdk-users-pagination');
		const status = dom.createElement('div', 'pdk-users-status');
		const defaultPagination = normalizePagination({
			page: 1,
			perPage: normalizeNumber(nativeUsers.perPage, 50)
		});
		const queryState = {
			page: defaultPagination.page,
			perPage: defaultPagination.perPage,
			role: '',
			search: ''
		};
		let users = [];
		let roles = [];
		let pagination = defaultPagination;
		let roleOptions = Array.isArray(nativeUsers.roleOptions) ? nativeUsers.roleOptions : [];
		let selectedUserId = 0;
		let activeModal = null;
		let isLoading = false;
		let loadRequestId = 0;
		let searchTask = null;
		let statusClearTimer = 0;

		status.setAttribute('role', 'status');
		status.setAttribute('aria-live', 'polite');
		status.setAttribute('aria-hidden', 'true');
		pager.setAttribute('aria-live', 'polite');
		list.setAttribute('role', 'listbox');
		detail.setAttribute('aria-label', labels.detailsTitle);
		searchInput.type = 'search';
		searchInput.placeholder = labels.searchPlaceholder;
		searchInput.setAttribute('aria-label', labels.searchLabel);
		roleSelect.setAttribute('aria-label', labels.roleLabel);

		titleStack.appendChild(dom.createElement('h2', '', labels.usersTitle));
		titleStack.appendChild(dom.createElement('p', '', labels.subtitle));
		searchLabel.appendChild(dom.createDashicon('dashicons-search'));
		searchLabel.appendChild(searchInput);
		toolbar.append(searchLabel, roleSelect, toolbarActions);
		header.append(titleStack, count);
		body.append(list, detail);
		root.append(header, toolbar, body, pager);

		function clearStatusTimer() {
			if (!statusClearTimer) {
				return;
			}

			window.clearTimeout(statusClearTimer);
			statusClearTimer = 0;
		}

		function setStatus(message, options = {}) {
			const nextMessage = typeof message === 'string' ? message.trim() : String(message || '').trim();

			clearStatusTimer();
			status.textContent = nextMessage;
			status.setAttribute('aria-hidden', nextMessage ? 'false' : 'true');
			status.classList.toggle('has-message', Boolean(nextMessage));
			pager.classList.toggle('has-status', Boolean(nextMessage));

			if (nextMessage && options.autoClear) {
				statusClearTimer = window.setTimeout(() => {
					statusClearTimer = 0;
					if (status.textContent === nextMessage) {
						setStatus('');
					}
				}, options.duration || STATUS_SUCCESS_CLEAR_DELAY);
			}
		}

		function setModalStatus(modal, message, isError = false) {
			if (!modal) {
				return;
			}

			if (typeof modal.setStatus === 'function') {
				modal.setStatus(message, isError);
			}
		}

		function getSelectedUser() {
			return users.find((item) => item.id === selectedUserId) || null;
		}

		function getFormRoleOptions(fallbackRoles = []) {
			const options = Array.isArray(fallbackRoles) && fallbackRoles.length ? fallbackRoles : roleOptions;

			return Array.isArray(options) ? options : [];
		}

		function syncRoleOptions() {
			roleSelect.replaceChildren();
			const allOption = document.createElement('option');
			allOption.value = '';
			allOption.textContent = labels.allRoles;
			roleSelect.appendChild(allOption);
			roles.forEach((role) => {
				const option = document.createElement('option');
				option.value = role.value || '';
				option.textContent = role.count ? `${role.label} (${role.count})` : role.label;
				roleSelect.appendChild(option);
			});
			roleSelect.value = queryState.role;
			if (roleSelect.value !== queryState.role) {
				queryState.role = '';
				roleSelect.value = '';
			}
		}

		function syncToolbarActions() {
			toolbarActions.replaceChildren();

			if (nativeUsers.canCreate) {
				const add = createButton(labels.addUser, {
					variant: 'primary'
				});
				add.addEventListener('click', () => openAddUser());
				toolbarActions.appendChild(add);
			}
		}

		function selectUser(userId) {
			selectedUserId = normalizeUserId(userId);
			renderList();
			renderDetail();
		}

		function renderList() {
			list.replaceChildren();
			count.textContent = format(config, labels.userCount, [pagination.total]);

			if (!users.length) {
				list.appendChild(createEmptyState(dom, labels.emptyTitle, labels.emptyDescription));
				return;
			}

			if (!selectedUserId || !users.some((user) => user.id === selectedUserId)) {
				selectedUserId = users[0].id;
			}

			users.forEach((user) => {
				const button = document.createElement('button');
				const text = dom.createElement('span', 'pdk-users-list-text');
				const meta = dom.createElement('span', 'pdk-users-list-meta');

				button.type = 'button';
				button.className = 'pdk-users-list-item';
				button.setAttribute('role', 'option');
				button.setAttribute('aria-selected', user.id === selectedUserId ? 'true' : 'false');
				button.classList.toggle('is-selected', user.id === selectedUserId);
				button.addEventListener('click', () => selectUser(user.id));
				text.appendChild(dom.createElement('strong', '', user.displayName || user.login || ''));
				meta.appendChild(dom.createElement('span', '', user.email || user.login || ''));
				meta.appendChild(dom.createElement('span', '', user.roleLabel || ''));
				text.appendChild(meta);
				button.append(createAvatar(user, 'pdk-users-list-avatar'), text);
				list.appendChild(button);
			});
		}

		function renderPagination() {
			const meta = dom.createElement('div', 'pdk-users-pagination-meta');
			const range = dom.createElement('span', 'pdk-users-pagination-range');
			const pageLabel = dom.createElement('span', 'pdk-users-pagination-page');
			const actions = dom.createElement('div', 'pdk-users-pagination-actions');
			const previous = createButton(labels.previousPage, {
				className: 'pdk-users-page-button'
			});
			const next = createButton(labels.nextPage, {
				className: 'pdk-users-page-button'
			});

			pager.replaceChildren();
			if (!pagination.total) {
				range.textContent = labels.paginationEmpty;
				pageLabel.textContent = '';
			} else {
				range.textContent = format(config, labels.paginationRange, [pagination.from, pagination.to, pagination.total]);
				pageLabel.textContent = format(config, labels.paginationPage, [pagination.page, Math.max(1, pagination.pages)]);
			}

			previous.disabled = isLoading || !pagination.hasPrev;
			next.disabled = isLoading || !pagination.hasNext;
			previous.addEventListener('click', () => {
				if (!pagination.hasPrev || isLoading) {
					return;
				}
				if (searchTask) {
					searchTask.cancel();
				}
				queryState.search = normalizeSearch(searchInput.value);
				queryState.role = roleSelect.value || '';
				queryState.page = Math.max(1, pagination.page - 1);
				loadUsers();
			});
			next.addEventListener('click', () => {
				if (!pagination.hasNext || isLoading) {
					return;
				}
				if (searchTask) {
					searchTask.cancel();
				}
				queryState.search = normalizeSearch(searchInput.value);
				queryState.role = roleSelect.value || '';
				queryState.page = pagination.page + 1;
				loadUsers();
			});

			meta.append(range, status);
			actions.append(previous, next);
			pager.append(meta, pageLabel, actions);
		}

		function renderDetail() {
			const user = getSelectedUser();
			detail.replaceChildren();

			if (!user) {
				detail.appendChild(createEmptyState(dom, labels.emptyTitle, labels.emptyDescription));
				return;
			}

			const summary = dom.createElement('div', 'pdk-users-detail-summary');
			const title = dom.createElement('div', 'pdk-users-detail-title');
			const actions = dom.createElement('div', 'pdk-users-detail-actions');

			title.appendChild(dom.createElement('h3', '', user.displayName || user.login || ''));
			title.appendChild(dom.createElement('span', '', user.roleLabel || ''));
			summary.append(createAvatar(user, 'pdk-users-detail-avatar'), title);

			if (user.canEdit) {
				const profile = createButton(getFeature(nativeUsers, 'profile') ? labels.editProfile : labels.openProfile, {
					variant: 'primary'
				});
				profile.addEventListener('click', () => openProfile({ user, userId: user.id }));
				actions.appendChild(profile);
			}

			if (user.editUrl) {
				const edit = createButton(labels.editInWordPress);
				edit.addEventListener('click', () => openUserInWordPress(user, labels));
				actions.appendChild(edit);
			}

			detail.append(summary, actions);
			detail.appendChild(createDetailRow(dom, labels.loginLabel, user.login));
			detail.appendChild(createDetailRow(dom, labels.emailLabel, user.email));
			detail.appendChild(createDetailRow(dom, labels.nameLabel, user.name || user.displayName));
			detail.appendChild(createDetailRow(dom, labels.roleLabel, user.roleLabel));
			detail.appendChild(createDetailRow(dom, labels.postsLabel, String(user.postsCount || 0)));
			detail.appendChild(createDetailRow(dom, labels.registeredLabel, user.registeredLabel || user.registered));
			if (user.url) {
				detail.appendChild(createDetailRow(dom, labels.urlLabel, user.url, 'pdk-users-detail-url'));
			}
		}

		function render() {
			renderList();
			renderDetail();
			renderPagination();
			syncToolbarActions();
		}

		function loadUsers(options = {}) {
			const targetUserId = normalizeUserId(options.selectUserId);
			const requestId = ++loadRequestId;

			if (!nativeUsers.canAccess) {
				root.classList.add('is-error');
				list.replaceChildren(createEmptyState(dom, labels.permissionDenied, ''));
				renderPagination();
				setStatus(labels.permissionDenied);
				return Promise.resolve(null);
			}

			if (!api || typeof api.post !== 'function' || !actions.list) {
				root.classList.add('is-error');
				renderPagination();
				setStatus(labels.serviceError);
				return Promise.resolve(null);
			}

			isLoading = true;
			root.classList.add('is-loading');
			renderPagination();
			setStatus(labels.loading);
			return api.post(actions.list, {
				page: String(queryState.page),
				per_page: String(queryState.perPage),
				role: queryState.role,
				search: queryState.search
			}).then((response) => {
				if (requestId !== loadRequestId) {
					return null;
				}

				const data = response && response.data && typeof response.data === 'object' ? response.data : {};

				if (!response || !response.success) {
					throw new Error(data.message || labels.serviceError);
				}

				users = Array.isArray(data.users) ? data.users : [];
				roles = Array.isArray(data.roles) ? data.roles : [];
				pagination = normalizePagination(data.pagination, pagination);
				queryState.page = pagination.page;
				queryState.perPage = pagination.perPage;
				roleOptions = Array.isArray(data.roleOptions) ? data.roleOptions : roleOptions;
				if (targetUserId) {
					selectedUserId = targetUserId;
				}
				root.classList.remove('is-error');
				syncRoleOptions();
				render();
				setStatus(options.message || '', {
					autoClear: Boolean(options.message)
				});

				return data;
			}).catch((error) => {
				if (requestId !== loadRequestId) {
					return null;
				}

				root.classList.add('is-error');
				list.replaceChildren(createEmptyState(dom, labels.serviceError, error && error.message ? error.message : ''));
				detail.replaceChildren();
				setStatus(labels.serviceError);
				return null;
			}).finally(() => {
				if (requestId === loadRequestId) {
					isLoading = false;
					root.classList.remove('is-loading');
					renderPagination();
				}
			});
		}

		function createModal(title) {
			closeModal({ restoreFocus: false });

			activeModal = getModalDialogs().create({
				closeLabel: labels.close,
				mount: root,
				onClose() {
					activeModal = null;
					root.classList.remove('has-modal');
				},
				title
			});
			root.classList.add('has-modal');

			return activeModal;
		}

		function closeModal(options = {}) {
			if (activeModal && typeof activeModal.close === 'function') {
				activeModal.close(options);
			}
			activeModal = null;
			root.classList.remove('has-modal');
		}

		function createUsernamePreview(email, name) {
			const source = String(email || '').split('@')[0] || name || 'user';
			const preview = source.toLowerCase().replace(/[^a-z0-9._-]+/g, '').replace(/^[._-]+|[._-]+$/g, '');

			return preview || 'user';
		}

		function openAddUser() {
			if (!getFeature(nativeUsers, 'add') || !nativeUsers.canCreate) {
				openWorkflowFallback('add');
				return false;
			}

			if (!api || typeof api.post !== 'function' || !actions.create) {
				openWorkflowFallback('add');
				return false;
			}

			const formRoles = getFormRoleOptions();
			const modal = createModal(labels.addUserTitle);
			const form = createForm();
			const email = createTextInput('', 'email');
			const name = createTextInput('');
			const role = createRoleSelect(nativeUsers.defaultRole || '', formRoles);
			const manualUsername = createCheckbox(labels.manualUsername, false);
			const username = createTextInput('');
			const firstName = createTextInput('');
			const lastName = createTextInput('');
			const invite = createCheckbox(labels.inviteLabel, true);
			const advanced = document.createElement('details');
			const summary = document.createElement('summary');
			const submit = createButton(labels.createUser, {
				variant: 'primary'
			});
			const cancel = createButton(labels.cancel);

			email.required = true;
			username.disabled = true;
			username.placeholder = createUsernamePreview(email.value, name.value);
			summary.textContent = labels.advancedDetails;
			advanced.className = 'pdk-form-details';
			advanced.appendChild(summary);
			advanced.appendChild(createField(labels.loginLabel, username, labels.usernameHelp));
			advanced.appendChild(createField(labels.firstNameLabel, firstName));
			advanced.appendChild(createField(labels.lastNameLabel, lastName));
			form.appendChild(createField(labels.emailLabel, email));
			form.appendChild(createField(labels.nameLabel, name));
			if (formRoles.length) {
				form.appendChild(createField(labels.roleLabel, role));
			}
			form.appendChild(invite.wrap);
			form.appendChild(manualUsername.wrap);
			form.appendChild(advanced);
			modal.content.appendChild(form);
			modal.actions.append(cancel, submit);

			function syncUsername() {
				const preview = createUsernamePreview(email.value, name.value);
				username.placeholder = preview;
				if (!manualUsername.input.checked) {
					username.value = preview;
				}
				username.disabled = !manualUsername.input.checked;
			}

			email.addEventListener('input', syncUsername);
			name.addEventListener('input', syncUsername);
			manualUsername.input.addEventListener('change', syncUsername);
			cancel.addEventListener('click', closeModal);
			submit.addEventListener('click', () => form.requestSubmit());
			form.addEventListener('submit', (event) => {
				event.preventDefault();
				setModalStatus(modal, labels.saving);
				submit.disabled = true;
				api.post(actions.create, {
					email: email.value,
					first_name: firstName.value,
					last_name: lastName.value,
					name: name.value,
					role: role.value,
					send_user_notification: invite.input.checked ? '1' : '0',
					username: manualUsername.input.checked ? username.value : ''
				}).then((response) => {
					const data = response && response.data && typeof response.data === 'object' ? response.data : {};
					if (!response || !response.success) {
						throw new Error(data.message || labels.serviceError);
					}

					closeModal();
					return loadUsers({
						message: data.message || labels.userCreated,
						selectUserId: data.user && data.user.id
					});
				}).catch((error) => {
					submit.disabled = false;
					setModalStatus(modal, error && error.message ? error.message : labels.serviceError, true);
				});
			});
			syncUsername();

			return true;
		}

		function renderProfileForm(modal, profile, options = {}) {
			const formRoles = getFormRoleOptions(options.roleOptions);
			const form = createForm();
			const displayName = createTextInput(profile.displayName || profile.login || '');
			const firstName = createTextInput(profile.firstName || '');
			const lastName = createTextInput(profile.lastName || '');
			const email = createTextInput(profile.email || '', 'email');
			const url = createTextInput(profile.url || '', 'url');
			const bio = createTextarea(profile.description || '', {
				rows: 4
			});
			const role = profile.canEditRole ? createRoleSelect((profile.roles && profile.roles[0]) || '', formRoles) : null;
			const submit = createButton(labels.saveProfile, {
				variant: 'primary'
			});
			const cancel = createButton(labels.cancel);
			const wp = profile.editUrl ? createButton(labels.editInWordPress) : null;

			email.required = true;
			form.appendChild(createField(labels.displayNameLabel, displayName));
			form.appendChild(createField(labels.firstNameLabel, firstName));
			form.appendChild(createField(labels.lastNameLabel, lastName));
			form.appendChild(createField(labels.emailLabel, email));
			form.appendChild(createField(labels.urlLabel, url));
			form.appendChild(createField(labels.bioLabel, bio));
			if (role && formRoles.length) {
				form.appendChild(createField(labels.roleLabel, role));
			}
			modal.content.replaceChildren(form);
			modal.actions.replaceChildren();
			modal.actions.append(cancel);
			if (wp) {
				modal.actions.appendChild(wp);
			}
			modal.actions.appendChild(submit);
			cancel.addEventListener('click', closeModal);
			if (wp) {
				wp.addEventListener('click', () => openUserInWordPress(profile, labels));
			}
			submit.addEventListener('click', () => form.requestSubmit());
			if (typeof modal.focusInitial === 'function') {
				modal.focusInitial();
			}
			form.addEventListener('submit', (event) => {
				event.preventDefault();
				setModalStatus(modal, labels.saving);
				submit.disabled = true;
				api.post(actions.updateProfile, {
					description: bio.value,
					display_name: displayName.value,
					email: email.value,
					first_name: firstName.value,
					last_name: lastName.value,
					role: role ? role.value : '',
					url: url.value,
					user_id: profile.id
				}).then((response) => {
					const data = response && response.data && typeof response.data === 'object' ? response.data : {};
					if (!response || !response.success) {
						throw new Error(data.message || labels.serviceError);
					}

					closeModal();
					return loadUsers({
						message: data.message || '',
						selectUserId: profile.id
					});
				}).catch((error) => {
					submit.disabled = false;
					setModalStatus(modal, error && error.message ? error.message : labels.serviceError, true);
				});
			});
		}

		function openProfile(payload = {}) {
			const fallbackUser = payload.user || users.find((user) => user.id === normalizeUserId(payload.userId || payload.target)) || getSelectedUser();
			const userId = normalizeUserId(payload.userId || payload.target || (fallbackUser && fallbackUser.id) || config.userId);

			if (!getFeature(nativeUsers, 'profile') || !nativeUsers.canProfile) {
				openWorkflowFallback('profile', { user: fallbackUser });
				return false;
			}

			if (!api || typeof api.post !== 'function' || !actions.getProfile || !actions.updateProfile || !userId) {
				openWorkflowFallback('profile', { user: fallbackUser });
				return false;
			}

			const modal = createModal(labels.profileTitle);
			modal.content.appendChild(createEmptyState(dom, labels.loading, ''));
			setModalStatus(modal, labels.loading);
			api.post(actions.getProfile, {
				user_id: userId
			}).then((response) => {
				const data = response && response.data && typeof response.data === 'object' ? response.data : {};
				if (!response || !response.success || !data.profile) {
					throw new Error(data.message || labels.serviceError);
				}

				if (Array.isArray(data.roleOptions)) {
					roleOptions = data.roleOptions;
				}
				setModalStatus(modal, '');
				renderProfileForm(modal, data.profile, {
					roleOptions: data.roleOptions
				});
			}).catch((error) => {
				setModalStatus(modal, error && error.message ? error.message : labels.serviceError, true);
				if (fallbackUser && fallbackUser.editUrl) {
					const wp = createButton(labels.editInWordPress);
					modal.actions.replaceChildren(wp);
					wp.addEventListener('click', () => openUserInWordPress(fallbackUser, labels));
				}
			});

			return true;
		}

		function runInitialWorkflow() {
			if (context.nativeAdminFeature === 'add') {
				openAddUser();
				return;
			}

			if (context.nativeAdminFeature === 'profile') {
				openProfile({
					userId: context.userId || context.target
				});
			}
		}

		const instance = {
			openAddUser,
			openProfile,
			refresh: loadUsers,
			root
		};

		activeInstances.add(instance);
		searchTask = window.PufferDesk.services && typeof window.PufferDesk.services.createDebouncedTask === 'function'
			? window.PufferDesk.services.createDebouncedTask(() => {
				queryState.search = normalizeSearch(searchInput.value);
				queryState.page = 1;
				return loadUsers();
			}, {
				wait: 220
			})
			: null;
		searchInput.addEventListener('input', () => {
			if (searchTask) {
				searchTask.schedule();
				return;
			}
			queryState.search = normalizeSearch(searchInput.value);
			queryState.page = 1;
			loadUsers();
		});
		roleSelect.addEventListener('change', () => {
			if (searchTask) {
				searchTask.cancel();
			}
			queryState.search = normalizeSearch(searchInput.value);
			queryState.role = roleSelect.value || '';
			queryState.page = 1;
			loadUsers();
		});
		syncRoleOptions();
		syncToolbarActions();
		setStatus(labels.loading);
		loadUsers().then(() => {
			window.setTimeout(runInitialWorkflow, 0);
		});

		return root;
	}

	if (typeof window.PufferDesk.apps.registerNativeAppRenderer === 'function') {
		const nativeIds = window.PufferDesk.apps.nativeIds || {};
		window.PufferDesk.apps.registerNativeAppRenderer(nativeIds.USERS, (rendererContext = {}) => {
			const labels = getLabels(rendererContext.config || getRuntimeConfig());

			return {
				bodyClass: 'pdk-window-body pdk-users-body',
				content: createUsersApp(rendererContext),
				height: '520px',
				resizeMode: 'both',
				titlebarLabel: labels.usersTitle,
				width: '920px'
			};
		});
	}
})();
