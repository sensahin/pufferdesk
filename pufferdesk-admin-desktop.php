<?php
/**
 * Plugin Name:       PufferDesk - Admin Desktop
 * Description:       A safe, opt-out desktop-style workspace for WordPress admin with a dock, desktop folders, and windowed admin apps.
 * Version:           0.1.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Senol Sahin
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       pufferdesk-admin-desktop
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

define( 'PUFFERDESK_VERSION', '0.1.0' );
define( 'PUFFERDESK_FILE', __FILE__ );
define( 'PUFFERDESK_DIR', plugin_dir_path( __FILE__ ) );
define( 'PUFFERDESK_URL', plugin_dir_url( __FILE__ ) );

require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-user-preferences.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-router.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-icon-renderer.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-app-registry.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-widget-registry.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-widget-layout.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-desktop-layout.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-theme-registry.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-wallpaper-registry.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-workspace-state.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-assets.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-shell-renderer.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-settings-controller.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-workspace-controller.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-plugin.php';

/**
 * Access the active PufferDesk plugin instance.
 *
 * @return PufferDesk_Plugin
 */
function pufferdesk() {
	return PufferDesk_Plugin::init();
}

pufferdesk();
