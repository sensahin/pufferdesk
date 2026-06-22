=== PufferDesk - Turn your admin into a desktop ===
Contributors: senols
Tags: desktop, dashboard, admin, ui, productivity
Requires at least: 6.0
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 0.1.3
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Turn your WordPress admin into a desktop workspace.

== Description ==

PufferDesk adds a desktop-like environment to the WordPress dashboard.

It runs entirely inside the WordPress admin area and is designed to provide an alternative workspace for managing sites.

Features include:

- Desktop workspace
- Windows
- Folders
- Search
- Sticky Notes
- Dock
- Context menus
- Notifications
- Widgets
- Keyboard shortcuts
- Native Users app

== Source Code ==

The release zip ships compiled assets under `assets/dist/`. Readable source files and build scripts are maintained at https://github.com/sensahin/pufferdesk, and `assets/dist/SOURCES.md` lists the source files used to build the compiled assets.
Release packaging also checks package size budgets, rejects machine-specific files, and keeps source-only development assets out of the zip.

== Installation ==

1. Upload the plugin folder to `/wp-content/plugins/`.
2. Activate PufferDesk from the Plugins screen.
3. Open PufferDesk from the WordPress admin menu or admin bar.

== Frequently Asked Questions ==

= Does this replace WordPress admin screens? =

No. PufferDesk wraps existing admin screens where possible so WordPress and plugin compatibility stay intact.

= Can I return to Classic Admin? =

Yes. Use the Classic Admin option in PufferDesk, or open `/wp-admin/index.php?pufferdesk_classic=1`.

= Will my existing plugins still work? =

Most should. PufferDesk opens existing WordPress admin screens inside windows, so plugin admin pages usually continue to run as normal.

= Can each user customize their own workspace? =

Yes. Theme, layout, window positions, launcher placement, widgets, folders, and other workspace preferences are saved per WordPress user.

= What if an admin screen does not behave well in a window? =

PufferDesk shows a note with a Classic Admin action when a screen cannot be safely displayed in a window. The normal WordPress admin remains available as a fallback.
Developers can mark custom apps or routes as Classic Admin-only with iframe compatibility metadata or the `pufferdesk_admin_screen_iframe_compatibility` filter.

== Changelog ==

= 0.1.3 =

* Improves handling for admin screens that cannot safely initialize inside PufferDesk windows.
* Fixes Classic Admin fallback links for iframe compatibility notices.
* Cleans Plugin Check findings in source smoke tests and release packaging hygiene.

= 0.1.2 =

* Refines light-mode sidebar colors in Settings and Folder windows.
* Performs internal code cleanup and trims unused release assets.
* Adds a WordPress.org Live Preview blueprint for opening PufferDesk in WordPress Playground.

= 0.1.1 =

* Adds workspace, settings, users, and visual polish improvements.

= 0.1.0 =

* Initial release.
