<?php
/**
 * Plugin Name:       WP adminOS
 * Description:       A safe, opt-out desktop-style workspace for WordPress admin with a dock, desktop folders, and windowed admin apps.
 * Version:           0.1.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Senol Sahin
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       wp-adminos
 *
 * @package WPAdminOS
 */

defined( 'ABSPATH' ) || exit;

define( 'WP_ADMINOS_VERSION', '0.1.0' );
define( 'WP_ADMINOS_FILE', __FILE__ );
define( 'WP_ADMINOS_DIR', plugin_dir_path( __FILE__ ) );
define( 'WP_ADMINOS_URL', plugin_dir_url( __FILE__ ) );

require_once WP_ADMINOS_DIR . 'includes/class-wp-adminos-user-preferences.php';
require_once WP_ADMINOS_DIR . 'includes/class-wp-adminos-router.php';
require_once WP_ADMINOS_DIR . 'includes/class-wp-adminos-icon-renderer.php';
require_once WP_ADMINOS_DIR . 'includes/class-wp-adminos-app-registry.php';
require_once WP_ADMINOS_DIR . 'includes/class-wp-adminos-widget-registry.php';
require_once WP_ADMINOS_DIR . 'includes/class-wp-adminos-widget-layout.php';
require_once WP_ADMINOS_DIR . 'includes/class-wp-adminos-theme-registry.php';
require_once WP_ADMINOS_DIR . 'includes/class-wp-adminos-wallpaper-registry.php';
require_once WP_ADMINOS_DIR . 'includes/class-wp-adminos-workspace-state.php';
require_once WP_ADMINOS_DIR . 'includes/class-wp-adminos-assets.php';
require_once WP_ADMINOS_DIR . 'includes/class-wp-adminos-shell-renderer.php';
require_once WP_ADMINOS_DIR . 'includes/class-wp-adminos-settings-controller.php';
require_once WP_ADMINOS_DIR . 'includes/class-wp-adminos-workspace-controller.php';
require_once WP_ADMINOS_DIR . 'includes/class-wp-adminos-plugin.php';

/**
 * Access the active WP adminOS plugin instance.
 *
 * @return WP_AdminOS_Plugin
 */
function wp_adminos() {
	return WP_AdminOS_Plugin::init();
}

wp_adminos();
