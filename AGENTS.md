# AGENTS.md

Guidance for AI coding agents and contributors working on PufferDesk.

This project is not a throwaway MVP. Treat it as a long-term WordPress plugin foundation for multiple OS-style admin experiences. Every change should keep the codebase modular, manageable, extensible, and release-safe.

## Project Purpose

PufferDesk wraps the existing WordPress admin in a desktop-style workspace. It should preserve WordPress compatibility by embedding existing admin screens where practical, while adding an OS shell with themes, windows, apps, widgets, desktop surfaces, one primary PufferDesk identity, and optional theme families such as Redmond-style, Linux desktop, and nostalgic retro systems.

The foundation matters more than short-term visual hacks.

## Core Rules

Always:

- Keep changes modular, small, and aligned with the existing structure.
- Before implementing a feature, behavior, UI state, or visual pattern, search and read the existing codebase for an equivalent or adjacent implementation. Reuse, extend, or refactor the existing contract before creating a new one; if a new implementation is truly needed, document why the existing pattern does not fit.
- Prefer registries, templates, and theme overrides over hard-coded one-off behavior.
- Treat PufferDesk as the bundled product identity. Polish it with familiar desktop patterns, but do not add a redundant platform clone as a second bundled theme.
- Preserve Classic Admin as a reliable fallback.
- Preserve per-user preferences and per-user/per-theme layout behavior.
- Use WordPress-safe PHP: capability checks, nonces for state changes, sanitization on input, escaping on output.
- Keep readable source assets in `assets/css/` and `assets/js/`; regenerate `assets/dist/` for release assets.
- Update docs when architecture, build behavior, public filters, or extension contracts change.
- Remove replaced code, stale files, unused references, dead branches, and abandoned obsolete paths.
- Run the required validation commands before committing.

Never:

- Do not turn this into a pile of duplicate one-off files.
- Do not leave dead leftover code, unused obsolete modules, stale comments, or unreferenced assets.
- Do not bypass registries for apps, widgets, or themes unless there is a strong architectural reason.
- Do not mix theme-specific styling into core CSS.
- Do not put core behavior into theme files.
- Do not remove or weaken the Classic Admin escape path.
- Do not introduce external dependencies casually.
- Do not ship minified assets without keeping readable source files and source references.
- Do not ship Apple-owned, Microsoft-owned, Canonical-owned, or other third-party platform icons, wallpapers, logos, app artwork, trade dress, or bundled platform font files. OS theme assets must be original, licensed for redistribution, or otherwise release-safe.
- Do not commit `node_modules/`, `release/`, `.DS_Store`, undocumented local credentials, production credentials, or machine-specific state. The documented local WordPress login in the validation section is for this private development machine only; `AGENTS.md` is excluded from release packaging.

## Directory Map

Root:

- `pufferdesk-admin-desktop.php`: plugin header, constants, class loading, singleton bootstrap.
- `README.md`: user-facing plugin/readme documentation.
- `AGENTS.md`: this contributor/agent instruction file.
- `package.json`: build, check, and package scripts.
- `scripts/`: build and packaging tools.
- `assets/manifest.json`: canonical core CSS, JavaScript dependency, and dist bundle path manifest shared by PHP enqueueing and build scripts.
- `assets/dist/`: generated release assets. Do not edit by hand.
- `release/`: generated zip package. Ignored by git.

PHP services in `includes/`:

- `class-pufferdesk-plugin.php`: minimal service composition and controller hook delegation.
- `class-pufferdesk-path-normalizer.php`: shared relative template/media/asset path normalization.
- `class-pufferdesk-admin-controller.php`: admin page and admin bar hook registration.
- `class-pufferdesk-router.php`: mode toggles, shell URL, iframe/classic routing.
- `class-pufferdesk-user-preferences.php`: per-user mode/theme preferences.
- `class-pufferdesk-app-registry.php`: app/folder registry and app normalization.
- `class-pufferdesk-app-badge-normalizer.php`: app badge descriptor and WordPress menu count normalization.
- `class-pufferdesk-app-badge-renderer.php`: shared app badge ARIA-label and badge span rendering for shell templates.
- `class-pufferdesk-app-menu-normalizer.php`: schema-driven app menu normalization and default app menus.
- `class-pufferdesk-app-normalizer.php`: app descriptor capability, dock, about, badge, and menu normalization.
- `class-pufferdesk-admin-menu-app-provider.php`: WordPress top-level admin menu to app provider.
- `class-pufferdesk-widget-registry.php`: desktop widget registry and widget normalization.
- `class-pufferdesk-widget-layout.php`: shared widget layout attributes for templates.
- `class-pufferdesk-theme-registry.php`: theme family/version/parent inheritance.
- `class-pufferdesk-theme-token-renderer.php`: theme typography/token/wallpaper/preference CSS-variable emission for shell first paint.
- `class-pufferdesk-wallpaper-registry.php`: shared bundled/theme/upload wallpaper options and CSS-variable resolution.
- `class-pufferdesk-workspace-state.php`: per-user/per-site/per-theme workspace layout persistence and sanitization.
- `class-pufferdesk-shell-context.php`: shared resolved shell state for templates and runtime config.
- `class-pufferdesk-runtime-config.php`: browser runtime payload, menu labels, settings labels, and system actions.
- `class-pufferdesk-notification-normalizer.php`: canonical notification descriptor normalization.
- `class-pufferdesk-notification-registry.php`: notification providers, per-user retained history, user read/dismiss state, source/severity filtering, and client config.
- `class-pufferdesk-notification-controller.php`: AJAX notification refresh, read, dismiss, and mark-all-read actions.
- `class-pufferdesk-settings-registry.php`: settings domain metadata, AJAX actions, defaults, reset domains, and panel ownership.
- `class-pufferdesk-asset-manifest.php`: source/dist asset manifest reader for enqueue order.
- `class-pufferdesk-assets.php`: CSS/JS registration, enqueueing, and admin chrome classes.
- `class-pufferdesk-shell-renderer.php`: template rendering and theme override resolution.
- `class-pufferdesk-settings-controller.php`: AJAX settings persistence.
- `class-pufferdesk-workspace-controller.php`: AJAX workspace layout load/save/reset actions.
- `class-pufferdesk-icon-renderer.php`: icon descriptor normalization and rendering.
- `class-pufferdesk-tooltip-renderer.php`: shared static tooltip trigger attributes and tooltip span rendering.

Templates in `templates/`:

- `templates/shell/`: shell, menu bar, desktop, dock.
- `templates/windows/`: reusable window chrome.
- `templates/desktop/`: desktop icons and desktop object surfaces.
- `templates/widgets/`: widget layer and widget templates.
- `templates/themes/{theme_id}/...`: theme/version-specific overrides.
- `templates/themes/{family}/...`: OS-family overrides.
- Native app content currently renders through purpose-specific JavaScript modules in `assets/js/core/apps/`; add PHP app templates only when server-rendered native app markup exists.

CSS:

- `assets/css/core/admin-chrome.css`: WordPress admin chrome suppression.
- `assets/css/core/shell.css`: global shell variables, menu bar, shared primitives.
- `assets/css/core/context-menu.css`: right-click context menu positioning on top of shared menu primitives.
- `assets/css/core/tooltips.css`: shared tooltip primitive, placement, visibility, and transition behavior.
- `assets/css/core/notifications.css`: shared notification button, center, list, item, and toast layout.
- `assets/css/core/desktop.css`: desktop and desktop icons.
- `assets/css/core/widgets.css`: desktop widgets.
- `assets/css/core/windows.css`: reusable window chrome.
- `assets/css/core/apps.css`: generic app grid and app launcher tiles.
- `assets/css/core/folders.css`: folder windows, Finder-style surfaces, Trash, and folder info panels.
- `assets/css/core/about.css`: PufferDesk and site About windows.
- `assets/css/core/settings.css`: native System Settings surfaces and controls.
- `assets/css/core/explorer.css`: Explorer-style folder/settings shared surfaces.
- `assets/css/core/dock.css`: dock.
- `assets/css/core/responsive.css`: responsive rules.
- `assets/css/themes/{family}/base.css`: optional theme-family visual base when a family truly has shared CSS.
- `assets/css/themes/{family}/{version}.css`: theme-version visual skin.

JavaScript:

- `assets/js/core/boot.js`: shell boot order.
- `assets/js/core/api/`: Desktop API and other stable browser facades.
- `assets/js/core/config.js`: runtime payload accessor.
- `assets/js/core/dom.js`: shared DOM helpers.
- `assets/js/core/events/`: internal event bus.
- `assets/js/core/services/`: browser storage, AJAX clients, tooltip helpers, virtual filesystem helpers, native document requests, geometry helpers, and debounced tasks.
- `assets/js/core/services/tooltips.js`: shared browser tooltip creation and trigger attribute helper.
- `assets/js/core/services/geometry.js`: shared numeric/CSS geometry helpers.
- `assets/js/core/services/debounced-task.js`: shared debounced task scheduling for delayed state saves and mutations.
- `assets/js/core/session/`: shared workspace session sections.
- `assets/js/core/preferences/`: appearance, wallpaper, launcher, and menu bar preference appliers.
- `assets/js/core/windows/`: windows, titlebar actions, shared resize handles, window factory, window state serialization.
- `assets/js/core/widgets/`: widget binding, live updates, widget layout persistence.
- `assets/js/core/notifications/`: notification store, toast presenter, notification center binding, read/dismiss state, and system error notifications.
- `assets/js/core/apps/`: app launcher, reusable app surfaces such as about windows, and native apps.
- `assets/js/core/apps/app-badges.js`: shared browser app badge normalization, ARIA labels, and badge element rendering.
- `assets/js/core/apps/app-preferences.js`: shared app location and login-item normalization, optimistic persistence, rollback, and endpoint actions.
- `assets/js/core/apps/app-window-options.js`: app and native renderer window option resolver used by the launcher.
- `assets/js/core/apps/native-app-opener.js`: native app opening helper used by the launcher.
- `assets/js/core/apps/launcher-renderer.js`: shared launcher/folder/trash item button renderer.
- `assets/js/core/apps/folder-renderer.js`: folder and Trash grid rendering helper.
- `assets/js/core/apps/folder-data.js`: folder/trash data provider used by the app launcher.
- `assets/js/core/apps/folder-window-state.js`: folder window tab/history state helper.
- `assets/js/core/apps/recent-items.js`: recent item persistence helper.
- `assets/js/core/apps/settings/`: System Settings label normalization, shared UI helpers, and panel factory modules.
- `assets/js/core/apps/settings/mutations.js`: shared Settings AJAX mutation/status helper.
- `assets/js/core/shell/`: search, menu bar clock, command registry, top menus, context menus, global shell controls.

Media:

- `assets/media/themes/{family}/{version}/wallpapers/`
- `assets/media/themes/{family}/{version}/icons/`
- `assets/media/themes/{family}/{version}/cursors/`
- `assets/media/shared/icons/`

## Extension Contracts

Apps:

- Register apps through `PufferDesk_App_Registry` or the `pufferdesk_apps` filter.
- Apps should define `id`, `label`, `cap`, `group`, `icon`, and either iframe data (`url`) or native data (`kind => native`, `native`).
- App `cap` values are normalized as WordPress capability keys and default to `read` when missing, empty, or non-scalar. Use `read` only for current-user shell features; privileged WordPress screens or actions must use their exact WordPress capability.
- Apps derived from WordPress top-level admin menu items should inherit the menu item's capability so dock, desktop, launcher, and native admin visibility stay aligned.
- Apps may define `window_persistence` as `workspace` or `none`. Use `workspace` for stable app windows that should reopen with the workspace, and `none` for transient/helper surfaces.
- Apps may define a normalized `badge` with `text`, optional `count`, `tone`, and `aria_label`; WordPress menu count spans are extracted into this shape for top-level menu apps. PHP-rendered surfaces must use `PufferDesk_App_Badge_Renderer`; browser-rendered app surfaces must use `assets/js/core/apps/app-badges.js`.
- Apps may define Dock metadata such as `dock.fixed` and `dock.placement` for system Dock slots. Generic controllers must respect fixed metadata for visibility, ordering, dragging, persistence, and menu options; do not let fixed shell items inherit ordinary app controls unless those actions are explicitly supported.
- Apps may define reusable `about` metadata with `name`, `version`, `copyright`, `rights`, and `icon`; do not hard-code app-specific about windows.
- About metadata must stay GPL-compatible for WordPress distribution. Do not use "All rights reserved" defaults in plugin UI.
- App-specific top menu behavior belongs in the app's `menu` definition, not in hard-coded menu bar conditionals.
- Runtime code should prefer `window.PufferDesk.desktopApi` or `window.PufferDesk.desktop.api` for app/window operations instead of reaching directly into the app launcher or window manager. The facade wraps app opening, URL opening, settings panel opening, window create/focus/minimize/maximize/close/move/show-all, command execution/registration, native renderer registration, and event subscription.
- The window manager emits `window:created`, `window:focused`, `window:closed`, and `window:stateChanged` through `window.PufferDesk.events`. Use this event contract for decoupled module reactions to window lifecycle and state changes instead of patching or directly coupling modules to the window manager.
- Keep the System Settings Apps panel aligned with app location and login-item preferences. It must use `assets/js/core/apps/app-preferences.js`, the existing app preference endpoints, and fixed launcher metadata.
- The fixed PufferDesk mark opens the system menu. Do not wire it directly to an app; system-menu items belong in the `menu.system` runtime definition.
- Keep app IDs stable. Layout/session behavior depends on stable IDs.

Notifications:

- Use `PufferDesk_Notification_Registry` plus the `pufferdesk_notifications` filter for server-provided notifications. Providers should return normalized descriptors with stable `id`, `source`, `type`, `title`, optional `message`, `timestamp`, `priority`, `capability`, `actions`, `persistence`, `icon`, and `toast`. Provider-backed notifications with `user` or `site` persistence are retained per user and pruned by the saved notification history window.
- Browser code should use `window.PufferDesk.desktopApi.notifications` or `window.PufferDesk.notificationStore` for transient runtime notifications, read/dismiss state, and refresh behavior. Do not create one-off toast implementations.
- Notification settings live in the `notifications` settings domain and `PufferDesk_User_Preferences::META_NOTIFICATIONS`. Source toggles, severity, badges, toasts, and quiet mode should flow through this domain.
- Core CSS owns notification structure in `assets/css/core/notifications.css`; theme CSS owns visual variables for the notification button, center, items, and toasts.

Menus:

- Menu definitions use the canonical shape `array( 'groups' => array( ... ) )`.
- Each group should define `id`, `label`, and `items`; supported group IDs are `site`, `app`, `file`, `edit`, `view`, `go`, `window`, and `help`.
- Menu command items should define `label` plus optional `command`, `target`, `url`, `title`, `icon`, `shortcut`, `payload`, and `disabled`.
- `shortcut` is executable data, not decorative text. Use macOS-style strings such as `⌘W`, `⌘M`, `⌘H`, `⌥⌘H`, or a structured descriptor with `key`, `modifiers`, `label`, `allowInTextFields`, and `preventDefault`. The keyboard engine lives in `assets/js/core/shell/shortcuts.js`.
- Commands are registered in `assets/js/core/shell/commands.js`; schema normalization is in `assets/js/core/shell/menu-schema.js`; shared menu item rendering is in `assets/js/core/shell/menu-renderer.js`; top menu rendering is in `assets/js/core/shell/menu.js`.
- Context menus are registered and rendered through `assets/js/core/shell/context-menu.js`. Context targets should use stable `data-pdk-context` and `data-pdk-context-id` attributes rather than one-off event handlers.
- Supported context target types include `desktop`, `app`, `desktop-app`, `dock-app`, `folder`, `desktop-folder`, `trash-item`, `window`, and `widget`.
- Context menu providers should compose common command-backed items with target-specific items. Do not add right-click behavior inside dock, desktop, widget, or window modules unless it is exposing target state to the shared context menu system.
- Before adding menu item icons, shortcuts, badges, separators, destructive styling, or other optional adornments, inspect the existing menu surface and match its established visual schema. Do not make one item visually different from peer items unless that whole menu type already uses the same affordance or the renderer contract explicitly requires it.
- Runtime modules that need custom behavior should register commands through `window.PufferDesk.menuCommands.register()` after boot, staying inside the `window.PufferDesk` namespace.
- Runtime modules that need decoupled notifications should use `window.PufferDesk.events.on()`, `once()`, `off()`, and `emit()` with stable namespaced event names. Do not create one-off globals or cross-module direct calls when an event or command can express the dependency.
- Dropdown rendering must stay generic and schema-driven. App-specific items belong in app `menu` definitions.
- Do not add app-specific menu conditionals to `templates/shell/menu-bar.php` or the menu renderer. Add command-backed data to the registry/schema instead.
- Keep command IDs stable and generic, such as `open-app`, `open-folder`, `open-folder-tab`, `open-url`, `open-about`, `open-system-about`, `open-external-url`, `navigate-url`, `shell.restart`, `shell.switch-classic`, `user.logout`, `session.reset-layout`, `folder.refresh`, `trash.restore`, `trash.delete-immediately`, `trash.empty`, `widget.hide`, `window.focus`, `window.focus-id`, `window.close`, `window.minimize`, `window.reload`, `window.history-back`, `window.history-forward`, `window.hide`, `window.hide-others`, `window.show-all`, and `window.toggle-maximize`.

Widgets:

- Register widgets through `PufferDesk_Widget_Registry` or the `pufferdesk_widgets` filter.
- Widgets should define `id`, `label`, `cap`, `icon`, `kind`, `native`, `template`, `default_position`, `default_size`, and optional `refresh_interval`.
- Widget `cap` values are normalized as WordPress capability keys and default to `read` when missing, empty, or non-scalar. Widgets exposing privileged WordPress data must use the exact capability required for that data.
- Widget `default_position` may use `left` or `right`, plus `top` or `bottom`; use one horizontal anchor and one vertical anchor.
- Keep widget IDs stable. Widget layout persistence depends on stable IDs.
- Add widget templates under `templates/widgets/`.
- Use `PufferDesk_Widget_Layout::render_attributes()` for widget positioning and size attributes.
- Use `templates/widgets/generic.php` as the fallback, not as a dumping ground.
- Keep the System Settings Widgets panel aligned with registered widgets so hidden widgets have a restore path through the existing `widgets` workspace section.

Themes:

- Themes are organized by family and version.
- Use parent/child theme inheritance for common theme-family styling.
- Put visual language in theme CSS. Put behavior in core JS/PHP.
- Use theme `shell` metadata for OS-family shell surfaces. Supported fields include `chrome`, `top_bar`, `launcher`, `system_menu`, `app_menu`, `status_area`, `launcher_search`, `system_menu_icon`, `launcher_separator`, `fixed_app_locations`, and `labels`; these normalize into shell runtime config and shell `data-pdk-*` attributes.
- Use theme `window_chrome` metadata for reusable window chrome. Supported fields include `controls.placement`, `controls.order`, `controls.style`, `controls.labels`, `title.alignment`, and `title.show_icon`; do not hard-code family-specific window controls in JS.
- Use theme `surfaces` metadata for native app layout families. Supported fields include `settings` (`pufferdesk-settings`, `windows-settings`) and `folder` (`finder`, `file-explorer`). Do not make other OS families inherit PufferDesk/Finder-specific Settings, folder toolbar, sidebar, or titlebar layouts by styling alone.
- Use theme `dialogs` metadata for confirmation dialog style and confirmation policy. Supported fields include `style` (`floating`, `system-window`) and `confirmations.{action_id}` with `enabled`, `variant`, `icon`, and `default_action`. For example, `move_folder_to_trash` may be disabled for PufferDesk-style move-to-Trash behavior and enabled for Redmond-style delete confirmations. Keep dialog behavior in the shared shell dialog service and command policy; keep visual skin in theme CSS using `data-pdk-dialog-style` and `data-pdk-dialog-variant`.
- Use theme shell labels for family-specific vocabulary such as Dock versus Taskbar. Do not hard-code launcher labels in settings panels, menus, or context menus when a runtime label exists.
- Use theme `app_labels` and `menu.labels` for family-specific app/menu vocabulary such as Trash versus Recycle Bin. Keep app IDs and command IDs stable.
- Use theme shell labels for family-specific minimize animation option labels when a theme should not expose another OS family's vocabulary. Keep stored option values stable.
- Shell metadata is executable, not decorative. `top_bar`, `launcher`, `system_menu`, `app_menu`, and `status_area` must match rendered shell surfaces and settings capability visibility.
- Use theme `typography` metadata for font stacks, type scale, line heights, weights, and neutral letter spacing. Typography normalizes into shell CSS variables; do not hard-code family-specific fonts or type sizes into component CSS when a token exists.
- Use theme `tokens` metadata for shared colors, material/glass effects, spacing, radii, borders, and shadows. Explicit tokens normalize into shell CSS variables before first paint; do not fill missing tokens from generic defaults because emitted inline variables override concrete theme CSS such as dark-mode colors and family-specific window radii. Use `mode_tokens.light` and `mode_tokens.dark` for appearance-dependent surface values such as context menus, Settings panels/sidebar chrome, reusable window chrome, and Explorer/Finder rows or toolbars; mode tokens emit as scoped CSS rules so material and accessibility overrides can still win through specificity. Core CSS can keep fallback values, but new reusable visual constants should flow through the token contract when future theme families may need to change them. Derived accent values such as soft, medium, active, active gradient, focus ring, and highlight should flow from `--pdk-accent-rgb` and alpha tokens instead of being repeated in every accent variant. Current shared radius tokens include `window`, `window_maximized`, and `menu_popover`.
- Do not bundle Apple-owned, Microsoft-owned, Canonical-owned, or other third-party platform font files. Use system font stacks or original/licensed font assets only.
- Declare media through theme fields, not hard-coded paths in templates or app code. Supported fields are `wallpaper`, `wallpapers`, `icon_pack`, and `cursor_pack`; they normalize to local `assets/media/` descriptors with `path` and `url`.
- Bundled themes should use `media.wallpapers.default` to choose their starting wallpaper from the shared wallpaper catalog. Do not give bundled themes separate wallpaper option lists unless the product intentionally needs a private theme pack.
- External theme packs may still use `wallpapers` for theme-managed wallpaper collections. The canonical shape is `array( 'default' => 'wallpaper-id', 'items' => array( array( 'id' => 'wallpaper-id', 'label' => 'Wallpaper Label', 'path' => 'themes/{family}/{version}/wallpapers/file.jpg' ) ) )`.
- Use `PufferDesk_Wallpaper_Registry` for the shared bundled wallpaper catalog, color backgrounds, theme image wallpapers, upload validation, and `--pdk-wallpaper-*` CSS-variable resolution. Do not read wallpaper URLs directly from templates or app JS.
- Keep OS media original, licensed for redistribution, or otherwise release-safe.
- The public `redmond/modern` theme is Windows-inspired, not a Windows clone. Keep it on the taskbar/Start shell contract, use original CSS/SVG assets, use system font stacks only, and do not add Microsoft-owned logos, wallpapers, icons, font files, or copied trade dress.
- Template override resolution order is:
  1. `templates/themes/{theme_id}/{template}`
  2. `templates/themes/{family}/{template}`
  3. `templates/{template}`
- Bundled themes should prefer shared templates plus theme metadata. Add a theme template override only when a structural difference cannot be expressed by registry data, theme fields, template data, or scoped CSS.

Icons:

- Dashicon strings are allowed as shorthand.
- Prefer theme descriptors with Dashicon fallbacks for built-in apps, folders, and widgets, so OS icon packs can replace the visual asset without changing registry IDs or app definitions.
- Theme icon files resolve from `theme.media.icon_pack.url`; missing files must fall back cleanly to Dashicons in PHP-rendered and JS-rendered surfaces.
- Prefer normalized descriptors for future flexibility:

```php
'icon' => array(
	'type'  => 'dashicon',
	'value' => 'dashicons-admin-post',
);

'icon' => array(
	'type' => 'image',
	'src'  => 'themes/pufferdesk/default/icons/posts.svg',
);

'icon' => array(
	'type'     => 'theme',
	'name'     => 'posts.svg',
	'fallback' => 'dashicons-admin-post',
);
```

Session:

- Use `assets/js/core/session/session-store.js` for persisted shell layout. It should treat WordPress user meta, via `PufferDesk_Workspace_State`, as durable state and browser `localStorage` as cache only.
- Use `assets/js/core/session/reopen-policy.js` for one-time shell reopen behavior; do not clear stored layout just to skip reopening windows for one transition.
- Store layout by named section, such as `windows`, `widgets`, `desktopIcons`, `desktopSort`, and `recentItems`.
- The `windows` section may persist stable `app` and `folder` window records. Keep transient windows such as About, info panels, dialogs, and one-off document helpers out of workspace restoration.
- Workspace saves must include the last accepted server `updatedAt` revision and must not silently overwrite newer server state. Conflict responses should adopt or merge the newer server state.
- Keep the System Settings Workspace panel wired to `PufferDesk_Workspace_State` actions. Current-theme layout reset should not erase unrelated preference domains; full System erase may clear preference domains and all theme workspace states.
- Same-browser workspace sync may use `BroadcastChannel`; do not imply cross-browser live sync unless a remote polling or push mechanism exists.
- Do not overwrite the whole session blob from one module.
- New desktop object types should add their own section instead of hijacking `windows` or `widgets`.
- Keep workspace state scoped by site, user, and theme. Theme-specific layouts are expected because OS families can use different shell geometry.

Settings:

- Settings domains are described by `PufferDesk_Settings_Registry`. Keep domain IDs, AJAX action names, user meta keys, and reset domain IDs stable.
- Existing preference handlers may keep their current payload shape, but new settings domains should declare capability, default, reset behavior, sanitizer owner, and panel ownership in the registry before adding UI.
- The `notifications` domain owns notification source toggles, severity, toast/badge visibility, quiet mode, sound preference, and history retention preference.
- Use the `pufferdesk_settings_domains` filter only to add or describe compatible domains; do not use it to mutate existing core contracts in a way that breaks saved preferences.

## WordPress Coding Standards

PHP:

- Guard all PHP files with `defined( 'ABSPATH' ) || exit;`.
- Prefix public functions, hooks, filters, and IDs with `pufferdesk` or `PufferDesk`.
- Use capabilities before rendering privileged actions or performing mutations.
- Use nonces for AJAX/state-changing requests.
- Sanitize input with WordPress functions such as `sanitize_key`, `sanitize_text_field`, `absint`, and `esc_url_raw`.
- Escape output with `esc_html`, `esc_attr`, `esc_url`, or `wp_json_encode` as appropriate.
- Use translation functions with the `pufferdesk-admin-desktop` text domain for user-facing strings.
- Prefer WordPress APIs over raw globals or direct database access.
- Avoid PHP notices/warnings on missing array keys.

JavaScript:

- Keep modules purpose-specific.
- Use existing namespaces under `window.PufferDesk`.
- Do not create unrelated globals.
- Keep boot wiring in `boot.js`.
- Keep DOM helpers in `dom.js`.
- Keep persistence through `session-store.js` or service modules.
- Avoid browser APIs that break hardened admin/browser contexts unless guarded.

CSS:

- Core CSS defines structural behavior and shared components.
- Theme CSS defines visual skin and OS personality.
- Avoid one-note palettes and unmaintainable selector sprawl.
- Keep selectors semantic and aligned with template structure.
- Do not add visual polish by hard-coding theme-specific values into core component files.
- Divider and separator lines must use neutral divider tokens such as `--pdk-line`, `--pdk-divider`, `--pdk-divider-soft`, or component-specific divider variables. Do not route dividers through accent, wallpaper, tinted-material, or translucent glass border tokens; check Settings, Finder/folder windows, and window titlebars when changing shared border variables.

Accessibility:

- Use meaningful labels for shell regions, windows, widgets, and controls.
- Buttons must be real buttons for actions.
- Links must be real links for navigation.
- Keep keyboard and focus behavior in mind when adding controls.

## Build, Check, Package

Install dependencies:

```bash
npm install
```

Build minified release assets:

```bash
npm run build
```

Run local checks:

```bash
npm run check
```

Create release zip:

```bash
npm run package
```

Generated release assets:

- `assets/dist/css/pufferdesk-core.min.css`
- `assets/dist/css/themes/{family}/{version}.min.css`
- `assets/dist/js/pufferdesk-admin-desktop.min.js`
- `assets/dist/SOURCES.md`

Do not edit generated dist files by hand. Change source files, then run `npm run build`.

## WordPress Local Validation

This local environment is available on the project owner's machine for browser and WP-CLI validation. Treat these credentials as local-only development credentials, not production credentials.

Local admin URLs:

```text
https://newwp:7890/wp-admin/
https://newwp:7890/wp-admin/admin.php?page=pufferdesk-admin-desktop
```

Local admin login:

```text
Username: admin
Password: deneme
```

Local WordPress path:

```bash
/Users/senolsahin/Sites/new
```

Plugin path:

```bash
/Users/senolsahin/Sites/new/wp-content/plugins/pufferdesk-admin-desktop
```

Local database constants from `wp-config.php`:

```text
DB_NAME: wp_newwp_db
DB_USER: wp_newwp_user
DB_PASSWORD: wp_newwp_pw
DB_HOST: localhost
table_prefix: wp_
```

WP-CLI needs the MAMP MySQL socket:

```bash
php -d mysqli.default_socket=/Applications/MAMP/tmp/mysql/mysql.sock /usr/local/bin/wp --path=/Users/senolsahin/Sites/new <command>
```

Use WordPress APIs and WP-CLI before touching the database directly. Direct DB queries are for inspection or last-resort repair only.

Debug flags and logs:

```text
WP_DEBUG: true
SCRIPT_DEBUG: true
WP_DEBUG_DISPLAY: false
WP_DEBUG_LOG: /Users/senolsahin/Sites/new/wp-content/uploads/debug-log-manager/newwp_20260510141169755393_debug.log
```

WP-CLI may print PHP deprecation warnings from WP-CLI internals on newer PHP versions. If the command exits successfully and the warning is from the WP-CLI phar/vendor code, do not treat it as a plugin failure. If WP-CLI fails before loading WordPress because of WP-CLI phar deprecations, retry the same command with `-d error_reporting='E_ALL & ~E_DEPRECATED'`.

Recommended Plugin Check command:

```bash
PLUGIN_DIR=/Users/senolsahin/Sites/new/wp-content/plugins/pufferdesk-admin-desktop
find "$PLUGIN_DIR" -name .DS_Store -delete
find "$PLUGIN_DIR" -type d -exec chmod u-w {} +
php -d mysqli.default_socket=/Applications/MAMP/tmp/mysql/mysql.sock /usr/local/bin/wp --path=/Users/senolsahin/Sites/new plugin check pufferdesk-admin-desktop --exclude-directories=.github,release,node_modules --exclude-files=.gitignore,.gitattributes,.DS_Store,AGENTS.md
STATUS=$?
find "$PLUGIN_DIR" -type d -exec chmod u+w {} +
find "$PLUGIN_DIR" -name .DS_Store -delete
exit $STATUS
```

Use this pattern because Finder can recreate `.DS_Store`, and Plugin Check should not scan ignored development/release directories.

### Browser Smoke Testing

Browser testing is not required for every small text-only or isolated PHP metadata change. Use judgment:

- For small non-visual, non-runtime edits: run `npm run check`; add targeted WP-CLI checks when PHP behavior changed.
- For CSS, JavaScript, template, theme, Settings, menu, window manager, workspace state, asset loading, or runtime config changes: test the local PufferDesk page in a browser.
- For broad architectural or release-impacting changes: run `npm run check`, Plugin Check, `npm run package`, and perform the browser smoke matrix below.

Minimum browser smoke matrix for meaningful UI/runtime changes:

- Log in at `https://newwp:7890/wp-admin/` if needed, then open `https://newwp:7890/wp-admin/admin.php?page=pufferdesk-admin-desktop`.
- Confirm the shell loads without visible PHP errors or blocking console errors.
- Test the current theme and, when theme tokens/chrome changed, both PufferDesk and Redmond in light and dark modes. Restore the user's original theme and appearance afterward.
- Open the system/site menu, top menus, and a desktop/context menu; check readability, hover/disabled states, separators, and z-index.
- Open System Settings; verify the sidebar, General panel, Appearance panel, theme selector, and any panel touched by the change.
- Open at least one folder window; check sidebar, toolbar, content surface, titlebar controls, focus state, and dark/light styling.
- For Dock/taskbar changes, check launcher items, fixed items, badges, running indicators, tooltips, context menus, and minimized windows.
- For window manager changes, check create/open, focus, close, minimize, maximize/restore, drag, resize, and workspace restoration when relevant.
- For state/persistence changes, reload the page and verify saved layout/preferences do not overwrite newer server state or unrelated preference domains.
- Confirm the Classic Admin fallback still works with `/wp-admin/index.php?pufferdesk_classic=1`.
- Do not click destructive Settings actions such as full erase/reset, permanent delete, or content deletion unless the task explicitly requires it.

## Release and GitHub

The GitHub repository is private:

```bash
https://github.com/sensahin/pufferdesk-admin-desktop.git
```

Before committing:

1. Inspect `git status --short`.
2. Confirm there are no unrelated local changes.
3. Run `npm run check`.
4. Run Plugin Check for meaningful PHP/WordPress changes.
5. Run `npm run package` when source assets or release contents changed.
6. Confirm generated `assets/dist/` changed only because source assets changed.
7. Commit with a clear message.
8. Push to `origin main`.
9. Confirm GitHub Actions CI passes.

## Architecture Standards

When adding a feature, decide where it belongs:

- New shell behavior belongs in `assets/js/core/{domain}/`.
- New PHP data contract belongs in an `includes/` registry/service class.
- New visual component markup belongs in `templates/{domain}/`.
- New core component CSS belongs in `assets/css/core/{domain}.css`.
- New theme-specific skin belongs in `assets/css/themes/{family}/`.
- New image/icon/wallpaper assets belong in `assets/media/`.

Prefer data-driven registration over hard-coded conditionals. If future OS families or versions will need to change something, make it a registry field, theme field, or scoped CSS variable first; use a template override only when the shared template cannot represent the structure.

## Feature Integration Checklist

Before treating a new feature, UI behavior, setting, app, widget, menu item, or persistence change as finished, check the affected system from all relevant angles. If an item does not apply, no code is needed; make that decision intentionally instead of ignoring the area.

- Existing patterns: search for equivalent or adjacent implementations first, then reuse, extend, or refactor the existing registry, template, command, menu, selection, dialog, or state contract.
- Themeability: decide whether the change belongs in core structure or theme skin. Use theme metadata, template overrides, CSS variables, and scoped theme CSS when future OS families may need a different presentation.
- Visual adaptiveness: verify dark/light mode, accent colors, material styles, typography tokens, responsive layouts, hover/pressed/selected/disabled states, and high-contrast or reduced-motion implications where relevant.
- Surface alignment: check whether related desktop, Dock, windows, folders, widgets, menus, context menus, dialogs, Settings panels, search, launcher, and toolbar surfaces need matching UI or behavior updates.
- Runtime labels and i18n: move user-facing or theme-family-specific labels into PHP/runtime config or translation paths when they may vary by locale, theme, or shell vocabulary.
- State and persistence: decide whether the feature needs per-user, per-site, per-theme, or per-session state. Use the existing workspace sections, user preferences, revision/conflict handling, and browser sync patterns instead of overwriting broad state blobs.
- Reset and erase flows: check whether Reset Layout, erase content/settings, default state, reopen policy, fresh shell load, multi-browser reloads, and stale saved data need updates.
- Permissions and WordPress safety: verify capabilities, nonces, sanitization, escaping, admin routing, Classic Admin fallback, and iframe/classic compatibility for any privileged or state-changing path.
- Extension contracts and docs: update registries, filters, public data shapes, `AGENTS.md`, README, build scripts, source manifests, and generated assets when the feature changes a contract or release surface.

## Cleanup Standard

Every change must leave the codebase cleaner or at least no messier.

If you replace a module, remove the old module and update all references.
If you rename a path, update build scripts, enqueue logic, docs, and dist source manifests.
If you remove a feature, remove its CSS, JS, templates, registry entries, and docs.
If a helper is no longer used, delete it.
If a comment describes behavior that changed, update or delete it.

No dead code. No abandoned experiments. No duplicate implementations.

## Process Cleanup

Before finishing a task, stop any long-running process, watcher, local server, browser automation tab, or temporary background job started for that task. Re-check for stale processes when browser automation, dev servers, package scripts, WP-CLI, or visual smoke tests were used. Do not kill unrelated user apps, WordPress/MAMP services, Codex infrastructure, or macOS system services unless the project owner explicitly asks for that specific process to be stopped. Report any process intentionally left running.

## When Unsure

If a change affects routing, saved user layout, theme inheritance, release packaging, security, or WordPress compatibility, stop and inspect the relevant existing classes before editing.

If a quick visual hack would weaken the foundation, do the foundation work first.

If the right direction is unclear, document the tradeoff and ask the project owner before committing a broad architectural change.
