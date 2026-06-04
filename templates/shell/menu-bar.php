<?php
/**
 * Shell menu bar.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

?>
<header class="aos-menu-bar">
	<div class="aos-brand">
		<span class="aos-traffic" aria-hidden="true">
			<span></span><span></span><span></span>
		</span>
		<strong><?php echo esc_html__( 'Admin OS', 'admin-os-mode' ); ?></strong>
	</div>
	<nav class="aos-menu-items" aria-label="<?php esc_attr_e( 'Admin OS menus', 'admin-os-mode' ); ?>" data-aos-menu-items>
		<button type="button" data-aos-open-window="welcome"><?php esc_html_e( 'Workspace', 'admin-os-mode' ); ?></button>
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
	<div class="aos-clock" data-aos-clock><?php echo esc_html( current_time( 'H:i' ) ); ?></div>
</header>
