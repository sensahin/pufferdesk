<?php
/**
 * Shell menu bar.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Template variables.
 *
 * @var string $site_name
 * @var array<string,mixed> $shell
 * @var array<string,string> $labels
 * @var array<string,string> $notification_labels
 */
$pufferdesk_site_name    = isset( $site_name ) && '' !== $site_name ? $site_name : get_bloginfo( 'name' );
$pufferdesk_labels       = isset( $labels ) && is_array( $labels ) ? $labels : PufferDesk_Runtime_Config::get_shell_template_labels();
$pufferdesk_notifications = isset( $notification_labels ) && is_array( $notification_labels ) ? $notification_labels : PufferDesk_Notification_Registry::get_default_labels();
$pufferdesk_get_label    = static function ( $key ) use ( $pufferdesk_labels ) {
	return isset( $pufferdesk_labels[ $key ] ) && '' !== $pufferdesk_labels[ $key ] ? (string) $pufferdesk_labels[ $key ] : $key;
};
$pufferdesk_shell        = wp_parse_args(
	isset( $shell ) && is_array( $shell ) ? $shell : array(),
	array(
		'top_bar'     => 'menu-bar',
		'system_menu' => 'mark',
		'app_menu'    => 'global',
		'status_area' => 'menu-bar',
	)
);
$pufferdesk_show_mark    = 'mark' === $pufferdesk_shell['system_menu'];
$pufferdesk_show_menus   = 'global' === $pufferdesk_shell['app_menu'];
$pufferdesk_show_status  = 'menu-bar' === $pufferdesk_shell['status_area'];
$pufferdesk_show_search  = 'menu-bar' === $pufferdesk_shell['top_bar'];
$pufferdesk_menu_classes = array( 'pdk-menu-bar' );
if ( ! $pufferdesk_show_menus ) {
	$pufferdesk_menu_classes[] = 'pdk-menu-bar-no-app-menu';
}
if ( ! $pufferdesk_show_search ) {
	$pufferdesk_menu_classes[] = 'pdk-menu-bar-no-search';
}
if ( ! $pufferdesk_show_status ) {
	$pufferdesk_menu_classes[] = 'pdk-menu-bar-no-status';
}
?>
<div class="<?php echo esc_attr( implode( ' ', $pufferdesk_menu_classes ) ); ?>" data-pdk-shell-surface="top-bar">
	<div class="pdk-brand">
		<?php if ( $pufferdesk_show_mark ) : ?>
			<button type="button" class="pdk-system-mark" data-pdk-system-menu aria-label="<?php echo esc_attr( $pufferdesk_get_label( 'open_system_menu' ) ); ?>">
				<svg class="pdk-system-mark-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
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
	<?php if ( $pufferdesk_show_menus ) : ?>
		<nav class="pdk-menu-items" aria-label="<?php echo esc_attr( $pufferdesk_get_label( 'menu_items' ) ); ?>" data-pdk-menu-items>
			<button type="button"><?php echo esc_html( $pufferdesk_site_name ); ?></button>
			<button type="button"><?php echo esc_html( $pufferdesk_get_label( PufferDesk_App_Menu_Normalizer::GROUP_FILE ) ); ?></button>
			<button type="button"><?php echo esc_html( $pufferdesk_get_label( PufferDesk_App_Menu_Normalizer::GROUP_EDIT ) ); ?></button>
			<button type="button"><?php echo esc_html( $pufferdesk_get_label( PufferDesk_App_Menu_Normalizer::GROUP_VIEW ) ); ?></button>
			<button type="button"><?php echo esc_html( $pufferdesk_get_label( PufferDesk_App_Menu_Normalizer::GROUP_GO ) ); ?></button>
			<button type="button"><?php echo esc_html( $pufferdesk_get_label( PufferDesk_App_Menu_Normalizer::GROUP_WINDOW ) ); ?></button>
			<button type="button"><?php echo esc_html( $pufferdesk_get_label( PufferDesk_App_Menu_Normalizer::GROUP_HELP ) ); ?></button>
		</nav>
	<?php endif; ?>
	<?php if ( $pufferdesk_show_status ) : ?>
		<div class="pdk-status-area" aria-label="<?php echo esc_attr( $pufferdesk_get_label( 'status' ) ); ?>">
			<?php if ( $pufferdesk_show_search ) : ?>
				<label class="pdk-search pdk-search-status" for="pdk-search-input">
					<svg class="pdk-search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
						<circle cx="11" cy="11" r="6.5" />
						<path d="m16 16 4 4" />
					</svg>
					<input id="pdk-search-input" type="search" placeholder="<?php echo esc_attr( $pufferdesk_get_label( 'search_apps' ) ); ?>" autocomplete="off" data-pdk-search />
				</label>
			<?php endif; ?>
			<span class="pdk-sound-status-slot" data-pdk-sound-status></span>
			<button type="button" class="pdk-notification-button" data-pdk-notification-toggle aria-label="<?php echo esc_attr( $pufferdesk_notifications['open'] ); ?>">
				<svg class="pdk-notification-button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
					<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
					<path d="M13.73 21a2 2 0 0 1-3.46 0" />
				</svg>
			</button>
			<div class="pdk-clock" data-pdk-clock><?php echo esc_html( date_i18n( 'D M j H:i' ) ); ?></div>
		</div>
	<?php elseif ( $pufferdesk_show_search ) : ?>
		<label class="pdk-search" for="pdk-search-input">
			<svg class="pdk-search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
				<circle cx="11" cy="11" r="6.5" />
				<path d="m16 16 4 4" />
			</svg>
			<input id="pdk-search-input" type="search" placeholder="<?php echo esc_attr( $pufferdesk_get_label( 'search_apps' ) ); ?>" autocomplete="off" data-pdk-search />
		</label>
	<?php endif; ?>
</div>
