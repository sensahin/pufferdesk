<?php
/**
 * Shell menu bar.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var string $site_name
 */
$admin_os_mode_site_name = isset( $site_name ) && '' !== $site_name ? $site_name : get_bloginfo( 'name' );
?>
<header class="aos-menu-bar">
	<div class="aos-brand">
		<button type="button" class="aos-system-mark" data-aos-system-menu aria-label="<?php esc_attr_e( 'Open Admin OS menu', 'admin-os-mode' ); ?>"></button>
	</div>
	<nav class="aos-menu-items" aria-label="<?php esc_attr_e( 'Admin OS menus', 'admin-os-mode' ); ?>" data-aos-menu-items>
		<button type="button"><?php echo esc_html( $admin_os_mode_site_name ); ?></button>
		<button type="button"><?php esc_html_e( 'File', 'admin-os-mode' ); ?></button>
		<button type="button"><?php esc_html_e( 'Edit', 'admin-os-mode' ); ?></button>
		<button type="button"><?php esc_html_e( 'View', 'admin-os-mode' ); ?></button>
		<button type="button"><?php esc_html_e( 'Go', 'admin-os-mode' ); ?></button>
		<button type="button"><?php esc_html_e( 'Window', 'admin-os-mode' ); ?></button>
		<button type="button"><?php esc_html_e( 'Help', 'admin-os-mode' ); ?></button>
	</nav>
	<label class="aos-search" for="aos-search-input">
		<span class="dashicons dashicons-search" aria-hidden="true"></span>
		<input id="aos-search-input" type="search" placeholder="<?php esc_attr_e( 'Search apps', 'admin-os-mode' ); ?>" autocomplete="off" data-aos-search />
	</label>
	<div class="aos-clock" data-aos-clock><?php echo esc_html( date_i18n( 'D M j H:i' ) ); ?></div>
</header>
