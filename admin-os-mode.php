<?php
/**
 * Plugin Name:       Admin OS Mode
 * Description:       A safe, opt-out desktop-style workspace for WordPress admin with a dock, desktop folders, and windowed admin apps.
 * Version:           0.1.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Senol Sahin
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       admin-os-mode
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

define( 'ADMIN_OS_MODE_VERSION', '0.1.0' );
define( 'ADMIN_OS_MODE_FILE', __FILE__ );
define( 'ADMIN_OS_MODE_DIR', plugin_dir_path( __FILE__ ) );
define( 'ADMIN_OS_MODE_URL', plugin_dir_url( __FILE__ ) );

require_once ADMIN_OS_MODE_DIR . 'includes/class-admin-os-mode-user-preferences.php';
require_once ADMIN_OS_MODE_DIR . 'includes/class-admin-os-mode-router.php';
require_once ADMIN_OS_MODE_DIR . 'includes/class-admin-os-mode-icon-renderer.php';
require_once ADMIN_OS_MODE_DIR . 'includes/class-admin-os-mode-app-registry.php';
require_once ADMIN_OS_MODE_DIR . 'includes/class-admin-os-mode-widget-registry.php';
require_once ADMIN_OS_MODE_DIR . 'includes/class-admin-os-mode-widget-layout.php';
require_once ADMIN_OS_MODE_DIR . 'includes/class-admin-os-mode-theme-registry.php';
require_once ADMIN_OS_MODE_DIR . 'includes/class-admin-os-mode-wallpaper-registry.php';
require_once ADMIN_OS_MODE_DIR . 'includes/class-admin-os-mode-assets.php';
require_once ADMIN_OS_MODE_DIR . 'includes/class-admin-os-mode-shell-renderer.php';
require_once ADMIN_OS_MODE_DIR . 'includes/class-admin-os-mode-settings-controller.php';
require_once ADMIN_OS_MODE_DIR . 'includes/class-admin-os-mode-plugin.php';

/**
 * Access the active Admin OS Mode plugin instance.
 *
 * @return Admin_OS_Mode_Plugin
 */
function admin_os_mode() {
	return Admin_OS_Mode_Plugin::init();
}

admin_os_mode();
