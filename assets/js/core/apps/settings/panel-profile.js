(function () {
	'use strict';

	window.PufferDesk = window.PufferDesk || {};
	window.PufferDesk.apps = window.PufferDesk.apps || {};
	window.PufferDesk.apps.settings = window.PufferDesk.apps.settings || {};

	window.PufferDesk.apps.settings.createProfilePanel = function createProfilePanel(ctx) {
		const dom = ctx.dom;
		const user = ctx.getUserProfile();
		const name = user.name || ctx.t('profile.defaultName');
		const role = user.role || user.subtitle || ctx.t('profile.defaultRole');
		const profileUrl = user.profileUrl || '';
		const panel = dom.createElement('div', 'pdk-settings-pane-panel pdk-settings-profile-panel');
		const hero = dom.createElement('div', 'pdk-settings-profile-hero');
		const accountSection = ctx.createSection('', 'pdk-settings-profile-list');

		panel.dataset.pdkSettingsPanel = 'profile';
		hero.appendChild(ctx.createEditableProfileAvatar(user, name, profileUrl));
		hero.appendChild(dom.createElement('h2', '', name));
		if (user.email) {
			hero.appendChild(dom.createElement('p', '', user.email));
		}

		accountSection.appendChild(ctx.createProfileActionRow({
			command: (window.PufferDesk.shell && window.PufferDesk.shell.commands ? window.PufferDesk.shell.commands.USER_OPEN_PROFILE : ''),
			description: ctx.t('profile.personalInfoDescription'),
			icon: 'dashicons-id',
			label: ctx.t('profile.personalInfoLabel'),
			target: String(ctx.config.userId || ''),
			tone: 'gray',
			windowTitle: ctx.t('profile.profileTitle')
		}));
		accountSection.appendChild(ctx.createProfileActionRow({
			description: ctx.t('profile.rolePermissionsDescription'),
			icon: 'dashicons-shield',
			label: ctx.t('profile.rolePermissionsLabel'),
			tone: 'gray',
			value: role
		}));

		panel.append(hero, accountSection, createProfileSignOutButton(ctx));

		return panel;
	};

	function createProfileSignOutButton(ctx) {
		const footer = ctx.dom.createElement('div', 'pdk-settings-profile-footer');
		const button = document.createElement('button');
		const commandIds = (window.PufferDesk.shell && window.PufferDesk.shell.commands) || {};

		button.type = 'button';
		button.className = 'pdk-settings-profile-sign-out';
		button.textContent = ctx.t('profile.signOutLabel');
		button.addEventListener('click', () => {
			ctx.executeMenuCommand(commandIds.USER_LOGOUT, {
				icon: 'dashicons-migrate',
				label: ctx.t('profile.signOutLabel'),
				url: ctx.config.logoutUrl || ''
			});
		});

		footer.appendChild(button);

		return footer;
	}
})();
