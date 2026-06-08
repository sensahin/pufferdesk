<?php
/**
 * Shell menu bar.
 *
 * @package WPAdminOS
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var string $site_name
 * @var array<string,mixed> $shell
 */
$wp_adminos_site_name    = isset( $site_name ) && '' !== $site_name ? $site_name : get_bloginfo( 'name' );
$wp_adminos_shell        = wp_parse_args(
	isset( $shell ) && is_array( $shell ) ? $shell : array(),
	array(
		'top_bar'     => 'menu-bar',
		'system_menu' => 'mark',
		'app_menu'    => 'global',
		'status_area' => 'menu-bar',
	)
);
$wp_adminos_show_mark    = 'mark' === $wp_adminos_shell['system_menu'];
$wp_adminos_show_menus   = 'global' === $wp_adminos_shell['app_menu'];
$wp_adminos_show_status  = 'menu-bar' === $wp_adminos_shell['status_area'];
$wp_adminos_show_search  = 'menu-bar' === $wp_adminos_shell['top_bar'];
$wp_adminos_menu_classes = array( 'aos-menu-bar' );
if ( ! $wp_adminos_show_menus ) {
	$wp_adminos_menu_classes[] = 'aos-menu-bar-no-app-menu';
}
if ( ! $wp_adminos_show_search ) {
	$wp_adminos_menu_classes[] = 'aos-menu-bar-no-search';
}
if ( ! $wp_adminos_show_status ) {
	$wp_adminos_menu_classes[] = 'aos-menu-bar-no-status';
}
?>
<header class="<?php echo esc_attr( implode( ' ', $wp_adminos_menu_classes ) ); ?>" data-aos-shell-surface="top-bar">
	<div class="aos-brand">
		<?php if ( $wp_adminos_show_mark ) : ?>
			<button type="button" class="aos-system-mark" data-aos-system-menu aria-label="<?php esc_attr_e( 'Open WP adminOS menu', 'wp-adminos' ); ?>">
				<svg class="aos-system-mark-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
					<circle cx="12" cy="12" r="3" />
					<path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5" />
					<path d="M12 7.5V9" />
					<path d="M7.5 12H9" />
					<path d="M16.5 12H15" />
					<path d="M12 16.5V15" />
					<path d="m8 8 1.88 1.88" />
					<path d="M14.12 9.88 16 8" />
					<path d="m8 16 1.88-1.88" />
					<path d="M14.12 14.12 16 16" />
				</svg>
			</button>
		<?php endif; ?>
	</div>
	<?php if ( $wp_adminos_show_menus ) : ?>
		<nav class="aos-menu-items" aria-label="<?php esc_attr_e( 'WP adminOS menus', 'wp-adminos' ); ?>" data-aos-menu-items>
			<button type="button"><?php echo esc_html( $wp_adminos_site_name ); ?></button>
			<button type="button"><?php esc_html_e( 'File', 'wp-adminos' ); ?></button>
			<button type="button"><?php esc_html_e( 'Edit', 'wp-adminos' ); ?></button>
			<button type="button"><?php esc_html_e( 'View', 'wp-adminos' ); ?></button>
			<button type="button"><?php esc_html_e( 'Go', 'wp-adminos' ); ?></button>
			<button type="button"><?php esc_html_e( 'Window', 'wp-adminos' ); ?></button>
			<button type="button"><?php esc_html_e( 'Help', 'wp-adminos' ); ?></button>
		</nav>
	<?php endif; ?>
	<?php if ( $wp_adminos_show_search ) : ?>
		<label class="aos-search" for="aos-search-input">
			<span class="dashicons dashicons-search" aria-hidden="true"></span>
			<input id="aos-search-input" type="search" placeholder="<?php esc_attr_e( 'Search apps', 'wp-adminos' ); ?>" autocomplete="off" data-aos-search />
		</label>
	<?php endif; ?>
	<?php if ( $wp_adminos_show_status ) : ?>
		<div class="aos-clock" data-aos-clock><?php echo esc_html( date_i18n( 'D M j H:i' ) ); ?></div>
	<?php endif; ?>
</header>
