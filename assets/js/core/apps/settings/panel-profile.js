(function () {
	'use strict';

	window.WPAdminOS = window.WPAdminOS || {};
	window.WPAdminOS.apps = window.WPAdminOS.apps || {};
	window.WPAdminOS.apps.settings = window.WPAdminOS.apps.settings || {};

	window.WPAdminOS.apps.settings.createProfilePanel = function createProfilePanel(ctx) {
		const dom = ctx.dom;
		const user = ctx.getUserProfile();
		const name = user.name || ctx.t('profile.defaultName', 'Admin');
		const role = user.role || user.subtitle || ctx.t('profile.defaultRole', 'WordPress User');
		const profileUrl = user.profileUrl || '';
		const panel = dom.createElement('div', 'aos-settings-pane-panel aos-settings-profile-panel');
		const hero = dom.createElement('div', 'aos-settings-profile-hero');
		const accountSection = ctx.createSection('', 'aos-settings-profile-list');

		panel.dataset.aosSettingsPanel = 'profile';
		hero.appendChild(ctx.createEditableProfileAvatar(user, name, profileUrl));
		hero.appendChild(dom.createElement('h2', '', name));
		if (user.email) {
			hero.appendChild(dom.createElement('p', '', user.email));
		}

		accountSection.appendChild(ctx.createProfileActionRow({
			description: ctx.t('profile.personalInfoDescription', 'Name, contact, website, and bio'),
			icon: 'dashicons-id',
			label: ctx.t('profile.personalInfoLabel', 'Personal Information'),
			tone: 'gray',
			url: profileUrl,
			windowTitle: ctx.t('profile.profileTitle', 'WordPress Profile')
		}));
		accountSection.appendChild(ctx.createProfileActionRow({
			description: ctx.t('profile.rolePermissionsDescription', 'Current access level'),
			icon: 'dashicons-shield',
			label: ctx.t('profile.rolePermissionsLabel', 'Role & Permissions'),
			tone: 'gray',
			value: role
		}));

		panel.append(hero, accountSection, createProfileSignOutButton(ctx));

		return panel;
	};

	function createProfileSignOutButton(ctx) {
		const footer = ctx.dom.createElement('div', 'aos-settings-profile-footer');
		const button = document.createElement('button');

		button.type = 'button';
		button.className = 'aos-settings-profile-sign-out';
		button.textContent = ctx.t('profile.signOutLabel', 'Sign Out...');
		button.addEventListener('click', () => {
			ctx.executeMenuCommand('user.logout', {
				icon: 'dashicons-migrate',
				label: ctx.t('profile.signOutLabel', 'Sign Out...'),
				url: ctx.config.logoutUrl || ''
			});
		});

		footer.appendChild(button);

		return footer;
	}
})();
