# AGENTS.md

Guidance for AI coding agents and contributors working on Admin OS Mode.

This project is not a throwaway MVP. Treat it as a long-term WordPress plugin foundation for multiple OS-style admin experiences. Every change should keep the codebase modular, manageable, extensible, and release-safe.

## Project Purpose

Admin OS Mode wraps the existing WordPress admin in a desktop-style workspace. It should preserve WordPress compatibility by embedding existing admin screens where practical, while adding an OS shell with themes, windows, apps, widgets, desktop surfaces, a neutral public default, and optional OS-style theme families such as Aqua-style, Redmond-style, Linux desktop, and nostalgic retro systems.

The foundation matters more than short-term visual hacks.

## Core Rules

Always:

- Keep changes modular, small, and aligned with the existing structure.
- Prefer registries, templates, and theme overrides over hard-coded one-off behavior.
- Preserve Classic Admin as a reliable fallback.
- Preserve per-user preferences and per-user/per-theme layout behavior.
- Use WordPress-safe PHP: capability checks, nonces for state changes, sanitization on input, escaping on output.
- Keep readable source assets in `assets/css/` and `assets/js/`; regenerate `assets/dist/` for release assets.
- Update docs when architecture, build behavior, public filters, or extension contracts change.
- Remove replaced code, stale files, unused references, dead branches, and abandoned legacy paths.
- Run the required validation commands before committing.

Never:

- Do not turn this into a pile of duplicate one-off files.
- Do not leave dead leftover code, unused legacy modules, stale comments, or unreferenced assets.
- Do not bypass registries for apps, widgets, or themes unless there is a strong architectural reason.
- Do not mix OS-specific styling into core CSS.
- Do not put core behavior into theme files.
- Do not remove or weaken the Classic Admin escape path.
- Do not introduce external dependencies casually.
- Do not ship minified assets without keeping readable source files and source references.
- Do not ship Apple-owned, Microsoft-owned, Canonical-owned, or other third-party platform icons, wallpapers, logos, app artwork, trade dress, or bundled platform font files. OS theme assets must be original, licensed for redistribution, or otherwise release-safe.
- Do not commit `node_modules/`, `release/`, `.DS_Store`, local credentials, or machine-specific state.

## Directory Map

Root:

- `admin-os-mode.php`: plugin header, constants, class loading, singleton bootstrap.
- `README.md`: user-facing plugin/readme documentation.
- `AGENTS.md`: this contributor/agent instruction file.
- `package.json`: build, check, and package scripts.
- `scripts/`: build and packaging tools.
- `assets/dist/`: generated release assets. Do not edit by hand.
- `release/`: generated zip package. Ignored by git.

PHP services in `includes/`:

- `class-admin-os-mode-plugin.php`: main orchestrator and WordPress hook wiring.
- `class-admin-os-mode-router.php`: mode toggles, shell URL, iframe/classic routing.
- `class-admin-os-mode-user-preferences.php`: per-user mode/theme preferences.
- `class-admin-os-mode-app-registry.php`: app/folder registry and app normalization.
- `class-admin-os-mode-widget-registry.php`: desktop widget registry and widget normalization.
- `class-admin-os-mode-widget-layout.php`: shared widget layout attributes for templates.
- `class-admin-os-mode-theme-registry.php`: theme family/version/parent inheritance.
- `class-admin-os-mode-dashboard-data.php`: dashboard stats and recent content.
- `class-admin-os-mode-assets.php`: CSS/JS enqueueing and runtime config.
- `class-admin-os-mode-shell-renderer.php`: template rendering and theme override resolution.
- `class-admin-os-mode-settings-controller.php`: AJAX settings persistence.
- `class-admin-os-mode-icon-renderer.php`: icon descriptor normalization and rendering.

Templates in `templates/`:

- `templates/shell/`: shell, menu bar, desktop, dock.
- `templates/windows/`: reusable window chrome.
- `templates/apps/`: native app content.
- `templates/desktop/`: desktop icons and desktop object surfaces.
- `templates/widgets/`: widget layer and widget templates.
- `templates/controls/`: reserved for reusable controls.
- `templates/themes/{theme_id}/...`: theme/version-specific overrides.
- `templates/themes/{family}/...`: OS-family overrides.

CSS:

- `assets/css/core/admin-chrome.css`: WordPress admin chrome suppression.
- `assets/css/core/shell.css`: global shell variables, menu bar, shared primitives.
- `assets/css/core/desktop.css`: desktop and desktop icons.
- `assets/css/core/widgets.css`: desktop widgets.
- `assets/css/core/windows.css`: reusable window chrome.
- `assets/css/core/apps.css`: built-in app surfaces.
- `assets/css/core/dock.css`: dock.
- `assets/css/core/responsive.css`: responsive rules.
- `assets/css/themes/{family}/base.css`: OS-family visual base.
- `assets/css/themes/{family}/{version}.css`: OS-version visual skin.

JavaScript:

- `assets/js/core/boot.js`: shell boot order.
- `assets/js/core/config.js`: runtime payload accessor.
- `assets/js/core/dom.js`: shared DOM helpers.
- `assets/js/core/services/`: browser storage and AJAX clients.
- `assets/js/core/session/`: shared workspace session sections.
- `assets/js/core/windows/`: windows, window factory, window state serialization.
- `assets/js/core/widgets/`: widget binding, live updates, widget layout persistence.
- `assets/js/core/apps/`: app launcher and native apps.
- `assets/js/core/shell/`: search, menu bar clock, global shell controls.

Media:

- `assets/media/themes/{family}/{version}/wallpapers/`
- `assets/media/themes/{family}/{version}/icons/`
- `assets/media/themes/{family}/{version}/cursors/`
- `assets/media/shared/icons/`

## Extension Contracts

Apps:

- Register apps through `Admin_OS_Mode_App_Registry` or the `admin_os_mode_apps` filter.
- Apps should define `id`, `label`, `cap`, `group`, `icon`, and either iframe data (`url`) or native data (`kind => native`, `native`).
- Keep app IDs stable. Layout/session behavior depends on stable IDs.

Widgets:

- Register widgets through `Admin_OS_Mode_Widget_Registry` or the `admin_os_mode_widgets` filter.
- Widgets should define `id`, `label`, `cap`, `icon`, `kind`, `native`, `template`, `default_position`, `default_size`, and optional `refresh_interval`.
- Widget `default_position` may use `left` or `right`, plus `top` or `bottom`; use one horizontal anchor and one vertical anchor.
- Keep widget IDs stable. Widget layout persistence depends on stable IDs.
- Add widget templates under `templates/widgets/`.
- Use `Admin_OS_Mode_Widget_Layout::render_attributes()` for widget positioning and size attributes.
- Use `templates/widgets/generic.php` as the fallback, not as a dumping ground.

Themes:

- Themes are organized by family and version.
- Use parent/child theme inheritance for common OS-family styling.
- Put visual language in theme CSS. Put behavior in core JS/PHP.
- Declare media through theme fields, not hard-coded paths in templates or app code. Supported fields are `wallpaper`, `icon_pack`, and `cursor_pack`; they normalize to local `assets/media/` descriptors with `path` and `url`.
- Keep OS media original, licensed for redistribution, or otherwise release-safe.
- Template override resolution order is:
  1. `templates/themes/{theme_id}/{template}`
  2. `templates/themes/{family}/{template}`
  3. `templates/{template}`

Icons:

- Legacy Dashicon strings are allowed for compatibility.
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
	'src'  => 'themes/adminos/default/icons/posts.svg',
);

'icon' => array(
	'type'     => 'theme',
	'name'     => 'posts.svg',
	'fallback' => 'dashicons-admin-post',
);
```

Session:

- Use `assets/js/core/session/session-store.js` for persisted shell layout.
- Store layout by named section, such as `windows` and `widgets`.
- Do not overwrite the whole session blob from one module.
- New desktop object types should add their own section instead of hijacking `windows` or `widgets`.

## WordPress Coding Standards

PHP:

- Guard all PHP files with `defined( 'ABSPATH' ) || exit;`.
- Prefix public functions, hooks, filters, and IDs with `admin_os_mode` or `Admin_OS_Mode`.
- Use capabilities before rendering privileged actions or performing mutations.
- Use nonces for AJAX/state-changing requests.
- Sanitize input with WordPress functions such as `sanitize_key`, `sanitize_text_field`, `absint`, and `esc_url_raw`.
- Escape output with `esc_html`, `esc_attr`, `esc_url`, or `wp_json_encode` as appropriate.
- Use translation functions with the `admin-os-mode` text domain for user-facing strings.
- Prefer WordPress APIs over raw globals or direct database access.
- Avoid PHP notices/warnings on missing array keys.

JavaScript:

- Keep modules purpose-specific.
- Use existing namespaces under `window.AdminOSMode`.
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
- Do not add visual polish by hard-coding OS-specific values into core component files.

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

- `assets/dist/css/admin-os-mode-core.min.css`
- `assets/dist/css/themes/{family}/{version}.min.css`
- `assets/dist/js/admin-os-mode.min.js`
- `assets/dist/SOURCES.md`

Do not edit generated dist files by hand. Change source files, then run `npm run build`.

## WordPress Local Validation

Local WordPress path:

```bash
/Users/senolsahin/Sites/new
```

Plugin path:

```bash
/Users/senolsahin/Sites/new/wp-content/plugins/admin-os-mode
```

WP-CLI needs the MAMP MySQL socket:

```bash
php -d mysqli.default_socket=/Applications/MAMP/tmp/mysql/mysql.sock /usr/local/bin/wp --path=/Users/senolsahin/Sites/new <command>
```

WP-CLI may print PHP deprecation warnings from WP-CLI internals on newer PHP versions. If the command exits successfully and the warning is from the WP-CLI phar/vendor code, do not treat it as a plugin failure.

Recommended Plugin Check command:

```bash
PLUGIN_DIR=/Users/senolsahin/Sites/new/wp-content/plugins/admin-os-mode
find "$PLUGIN_DIR" -name .DS_Store -delete
find "$PLUGIN_DIR" -type d -exec chmod u-w {} +
php -d mysqli.default_socket=/Applications/MAMP/tmp/mysql/mysql.sock /usr/local/bin/wp --path=/Users/senolsahin/Sites/new plugin check admin-os-mode --exclude-directories=.github,release,node_modules --exclude-files=.gitignore,.gitattributes,.DS_Store,AGENTS.md
STATUS=$?
find "$PLUGIN_DIR" -type d -exec chmod u+w {} +
find "$PLUGIN_DIR" -name .DS_Store -delete
exit $STATUS
```

Use this pattern because Finder can recreate `.DS_Store`, and Plugin Check should not scan ignored development/release directories.

## Release and GitHub

The GitHub repository is private:

```bash
https://github.com/sensahin/admin-os-mode.git
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
- New OS-specific skin belongs in `assets/css/themes/{family}/`.
- New image/icon/wallpaper assets belong in `assets/media/`.

Prefer data-driven registration over hard-coded conditionals. If future OS families or versions will need to change something, make it a registry field, theme field, template override, or scoped CSS variable.

## Cleanup Standard

Every change must leave the codebase cleaner or at least no messier.

If you replace a module, remove the old module and update all references.
If you rename a path, update build scripts, enqueue logic, docs, and dist source manifests.
If you remove a feature, remove its CSS, JS, templates, registry entries, and docs.
If a helper is no longer used, delete it.
If a comment describes behavior that changed, update or delete it.

No dead legacy code. No abandoned experiments. No duplicate implementations.

## When Unsure

If a change affects routing, saved user layout, theme inheritance, release packaging, security, or WordPress compatibility, stop and inspect the relevant existing classes before editing.

If a quick visual hack would weaken the foundation, do the foundation work first.

If the right direction is unclear, document the tradeoff and ask the project owner before committing a broad architectural change.
