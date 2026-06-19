<?php
/**
 * Plugin Name:       PufferDesk
 * Description:       Turn your WordPress admin into a desktop.
 * Version:           0.1.1
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Senol Sahin
 * License:           GPLv2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       pufferdesk
 * Domain Path:       /languages
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

define( 'PUFFERDESK_VERSION', '0.1.1' );
define( 'PUFFERDESK_FILE', __FILE__ );
define( 'PUFFERDESK_DIR', plugin_dir_path( __FILE__ ) );
define( 'PUFFERDESK_URL', plugin_dir_url( __FILE__ ) );

require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-product-labels.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-user-preferences.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-router.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-path-normalizer.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-admin-screen-availability.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-admin-bar-menu-provider.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-icon-renderer.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-tooltip-renderer.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-app-ids.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-command-ids.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-client-storage-keys.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-context-menu-contracts.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-window-chrome-contracts.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-app-badge-normalizer.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-app-badge-renderer.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-app-menu-normalizer.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-app-normalizer.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-admin-menu-app-provider.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-admin-context-resolver.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-app-registry.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-widget-registry.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-widget-layout.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-desktop-layout.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-theme-registry.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-theme-token-renderer.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-wallpaper-registry.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-workspace-state.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-virtual-filesystem.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-content-search-service.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-content-search-controller.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-document-post-type.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-document-service.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-document-controller.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-onboarding-note.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-notification-normalizer.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-notification-registry.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-notification-controller.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-sound-registry.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-asset-manifest.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-shell-context.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-users-controller.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-settings-registry.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-runtime-config.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-assets.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-shell-renderer.php';
require_once PUFFERDESK_DIR . 'includes/class-pufferdesk-admin-controller.php';
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
