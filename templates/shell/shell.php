<?php
/**
 * Main shell template.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Template variables:
 *
 * @var array<string,mixed>             $appearance
 * @var array<string,mixed>             $desktop_dock
 * @var array<string,mixed>             $menu_bar
 * @var array<int,array<string,string>> $apps
 * @var array<int,array<string,string>> $desktop_apps
 * @var array<int,array<string,string>> $desktop_icon_folders
 * @var array<int,array<string,string>> $dock_apps
 * @var array<int,array<string,mixed>>  $widgets
 * @var array<int,array<string,string>> $folders
 * @var string                          $site_name
 * @var array<string,mixed>             $theme
 * @var array<string,mixed>             $wallpaper
 * @var array<string,mixed>             $workspace_state
 */
$pufferdesk_appearance = wp_parse_args(
	is_array( $appearance ) ? $appearance : array(),
	array(
		'mode'              => 'auto',
		'window_material'   => 'clear',
		'accent_color'      => 'blue',
		'icon_widget_style' => 'default',
	)
);

$pufferdesk_desktop_dock = wp_parse_args(
	is_array( $desktop_dock ) ? $desktop_dock : array(),
	array(
		'dock_size'              => 48,
		'dock_magnification'     => 0,
		'dock_position'          => 'bottom',
		'minimize_animation'     => 'genie',
		'minimize_into_app_icon' => false,
		'auto_hide_dock'         => false,
		'animate_opening_apps'   => true,
		'show_open_indicators'   => true,
		'wallpaper_click'        => 'never',
		'show_widgets_desktop'   => true,
		'dim_widgets'            => 'automatic',
	)
);
$pufferdesk_menu_bar     = wp_parse_args(
	is_array( $menu_bar ) ? $menu_bar : array(),
	array(
		'show_background' => false,
		'recent_count'    => 10,
	)
);
$pufferdesk_theme_shell = wp_parse_args(
	isset( $theme['shell'] ) && is_array( $theme['shell'] ) ? $theme['shell'] : array(),
	array(
		'chrome'           => 'global-menu-dock',
		'top_bar'          => 'menu-bar',
		'launcher'         => 'dock',
		'system_menu'      => 'mark',
		'app_menu'         => 'global',
		'status_area'      => 'menu-bar',
		'launcher_search'  => false,
		'system_menu_icon' => 'pufferdesk-mark',
	)
);
$pufferdesk_has_menu_bar  = 'menu-bar' === $pufferdesk_theme_shell['top_bar']
	|| 'global' === $pufferdesk_theme_shell['app_menu']
	|| 'menu-bar' === $pufferdesk_theme_shell['status_area']
	|| 'mark' === $pufferdesk_theme_shell['system_menu'];
$pufferdesk_has_launcher  = 'none' !== $pufferdesk_theme_shell['launcher'];
$pufferdesk_template_labels = PufferDesk_Runtime_Config::get_shell_template_labels( $theme );
$pufferdesk_notification_labels = PufferDesk_Notification_Registry::get_default_labels();
$pufferdesk_window_chrome = wp_parse_args(
	isset( $theme['window_chrome'] ) && is_array( $theme['window_chrome'] ) ? $theme['window_chrome'] : array(),
	array(
		'controls' => array(),
		'title'    => array(),
	)
);
$pufferdesk_window_controls = wp_parse_args(
	isset( $pufferdesk_window_chrome['controls'] ) && is_array( $pufferdesk_window_chrome['controls'] ) ? $pufferdesk_window_chrome['controls'] : array(),
	array(
		'placement' => PufferDesk_Window_Chrome_Contracts::PLACEMENT_LEFT,
		'style'     => PufferDesk_Window_Chrome_Contracts::STYLE_TRAFFIC,
	)
);
$pufferdesk_window_title = wp_parse_args(
	isset( $pufferdesk_window_chrome['title'] ) && is_array( $pufferdesk_window_chrome['title'] ) ? $pufferdesk_window_chrome['title'] : array(),
	array(
		'alignment' => PufferDesk_Window_Chrome_Contracts::TITLE_ALIGNMENT_LEFT,
	)
	);
	$pufferdesk_token_styles      = PufferDesk_Theme_Token_Renderer::get_shell_styles( $theme, $wallpaper, $pufferdesk_desktop_dock );
	$pufferdesk_shell_style       = isset( $pufferdesk_token_styles['style'] ) ? $pufferdesk_token_styles['style'] : '';
	$pufferdesk_effective_appearance = 'dark' === $pufferdesk_appearance['mode'] ? 'dark' : 'light';
$pufferdesk_shell_attributes     = array(
	'class'                           => 'pdk-shell',
	'data-pufferdesk-shell'           => '',
	'data-pdk-theme'                  => $theme['id'],
	'data-pdk-theme-family'           => $theme['family'],
	'data-pdk-theme-version'          => $theme['version'],
	'data-pdk-shell-chrome'           => $pufferdesk_theme_shell['chrome'],
	'data-pdk-shell-top-bar'          => $pufferdesk_theme_shell['top_bar'],
	'data-pdk-shell-launcher'         => $pufferdesk_theme_shell['launcher'],
	'data-pdk-shell-system-menu'      => $pufferdesk_theme_shell['system_menu'],
	'data-pdk-shell-app-menu'         => $pufferdesk_theme_shell['app_menu'],
	'data-pdk-shell-status-area'      => $pufferdesk_theme_shell['status_area'],
	'data-pdk-shell-launcher-search'  => ! empty( $pufferdesk_theme_shell['launcher_search'] ) ? '1' : '0',
	'data-pdk-shell-system-menu-icon' => $pufferdesk_theme_shell['system_menu_icon'],
	'data-pdk-shell-has-menu-bar'     => $pufferdesk_has_menu_bar ? '1' : '0',
	'data-pdk-shell-has-launcher'     => $pufferdesk_has_launcher ? '1' : '0',
	'data-pdk-window-controls-placement' => $pufferdesk_window_controls['placement'],
	'data-pdk-window-controls-style'  => $pufferdesk_window_controls['style'],
	'data-pdk-window-title-alignment' => $pufferdesk_window_title['alignment'],
	'data-pdk-wallpaper-type'         => ! empty( $wallpaper['preference']['type'] ) ? $wallpaper['preference']['type'] : '',
	'data-pdk-wallpaper-id'           => ! empty( $wallpaper['preference']['id'] ) ? $wallpaper['preference']['id'] : '',
	'data-pdk-menu-contrast'          => ! empty( $wallpaper['menu_contrast'] ) ? $wallpaper['menu_contrast'] : 'auto',
	'data-pdk-appearance-mode'        => $pufferdesk_appearance['mode'],
	'data-pdk-effective-appearance'   => $pufferdesk_effective_appearance,
	'data-pdk-window-material'        => $pufferdesk_appearance['window_material'],
	'data-pdk-accent-color'           => $pufferdesk_appearance['accent_color'],
	'data-pdk-icon-widget-style'      => $pufferdesk_appearance['icon_widget_style'],
	'data-pdk-dock-position'          => $pufferdesk_desktop_dock['dock_position'],
	'data-pdk-dock-auto-hide'         => ! empty( $pufferdesk_desktop_dock['auto_hide_dock'] ) ? '1' : '0',
	'data-pdk-dock-animate-apps'      => ! empty( $pufferdesk_desktop_dock['animate_opening_apps'] ) ? '1' : '0',
	'data-pdk-dock-show-indicators'   => ! empty( $pufferdesk_desktop_dock['show_open_indicators'] ) ? '1' : '0',
	'data-pdk-minimize-animation'     => $pufferdesk_desktop_dock['minimize_animation'],
	'data-pdk-minimize-into-app-icon' => ! empty( $pufferdesk_desktop_dock['minimize_into_app_icon'] ) ? '1' : '0',
	'data-pdk-wallpaper-click'        => $pufferdesk_desktop_dock['wallpaper_click'],
	'data-pdk-show-widgets-desktop'   => ! empty( $pufferdesk_desktop_dock['show_widgets_desktop'] ) ? '1' : '0',
	'data-pdk-dim-widgets'            => $pufferdesk_desktop_dock['dim_widgets'],
	'data-pdk-fullscreen-window'      => '0',
	'data-pdk-menu-bar-background'    => ! empty( $pufferdesk_menu_bar['show_background'] ) ? '1' : '0',
	'data-pdk-menu-bar-hidden'        => '0',
	'data-pdk-menu-bar-recent-count'  => (string) max( 0, min( 50, (int) $pufferdesk_menu_bar['recent_count'] ) ),
	'data-pdk-menu-bar-revealed'      => '0',
);
	if ( $pufferdesk_shell_style ) {
		$pufferdesk_shell_attributes['style'] = $pufferdesk_shell_style;
	}
	?>
	<div <?php foreach ( $pufferdesk_shell_attributes as $pufferdesk_attribute => $pufferdesk_value ) : ?><?php echo esc_attr( $pufferdesk_attribute ); ?><?php if ( '' !== $pufferdesk_value ) : ?>="<?php echo esc_attr( $pufferdesk_value ); ?>"<?php endif; ?> <?php endforeach; ?>>
	<?php
	if ( 'auto' === $pufferdesk_appearance['mode'] ) {
		// Resolve Auto appearance before shell surfaces paint.
		wp_print_inline_script_tag(
			'(function(){var shell=document.currentScript&&document.currentScript.parentElement;if(shell&&window.matchMedia){shell.dataset.pdkEffectiveAppearance=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}})();'
		);
	}
	?>
	<?php
	if ( $pufferdesk_has_menu_bar ) {
		$this->render_part(
			'shell/menu-bar.php',
			array(
				'labels'              => $pufferdesk_template_labels,
				'notification_labels' => $pufferdesk_notification_labels,
				'site_name'           => $site_name,
				'shell'               => $pufferdesk_theme_shell,
			)
		);
	}

	$this->render_part(
		'shell/desktop.php',
		array(
			'apps'            => $apps,
			'desktop_apps'    => isset( $desktop_apps ) && is_array( $desktop_apps ) ? $desktop_apps : array(),
			'dock_apps'       => isset( $dock_apps ) && is_array( $dock_apps ) ? $dock_apps : $apps,
			'widgets'         => $widgets,
			'folders'         => isset( $desktop_icon_folders ) && is_array( $desktop_icon_folders ) ? $desktop_icon_folders : $folders,
			'labels'          => $pufferdesk_template_labels,
			'notification_labels' => $pufferdesk_notification_labels,
			'theme'           => $theme,
			'shell'           => $pufferdesk_theme_shell,
			'workspace_state' => isset( $workspace_state ) && is_array( $workspace_state ) ? $workspace_state : array(),
		)
	);
	?>
	<section class="pdk-notification-center" data-pdk-notification-center hidden aria-label="<?php echo esc_attr( $pufferdesk_notification_labels['centerTitle'] ); ?>">
		<header class="pdk-notification-center-header">
			<h2><?php echo esc_html( $pufferdesk_notification_labels['centerTitle'] ); ?></h2>
			<div class="pdk-notification-center-actions">
				<button type="button" class="pdk-notification-center-refresh" data-pdk-notification-refresh aria-label="<?php echo esc_attr( $pufferdesk_notification_labels['refreshPanel'] ); ?>">
					<span class="dashicons dashicons-update" aria-hidden="true"></span>
				</button>
				<button type="button" class="pdk-notification-center-close" data-pdk-notification-close aria-label="<?php echo esc_attr( $pufferdesk_notification_labels['closePanel'] ); ?>">
					<span aria-hidden="true">&times;</span>
				</button>
			</div>
		</header>
		<div class="pdk-notification-center-toolbar">
			<button type="button" data-pdk-notification-mark-all-read><?php echo esc_html( $pufferdesk_notification_labels['markAllRead'] ); ?></button>
		</div>
		<div class="pdk-notification-list" data-pdk-notification-list></div>
	</section>
	<div class="pdk-notification-toasts" data-pdk-notification-toasts aria-live="polite" aria-atomic="false"></div>
</div>
