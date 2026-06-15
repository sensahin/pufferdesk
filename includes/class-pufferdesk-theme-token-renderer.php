<?php
/**
 * Theme token CSS variable rendering.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Converts normalized theme metadata into shell CSS variables.
 */
final class PufferDesk_Theme_Token_Renderer {
	/**
	 * Build inline shell style data for a theme and user layout preferences.
	 *
	 * @param array<string,mixed> $theme        Normalized theme.
	 * @param array<string,mixed> $wallpaper    Resolved wallpaper config.
	 * @param array<string,mixed> $desktop_dock Desktop and launcher preferences.
	 * @return array{style:string,mode_rules:array<int,string>}
	 */
	public static function get_shell_styles( $theme, $wallpaper, $desktop_dock ) {
		$style_parts = array_merge(
			self::get_wallpaper_style_parts( $wallpaper ),
			self::get_nested_style_parts(
				isset( $theme['typography'] ) && is_array( $theme['typography'] ) ? $theme['typography'] : array(),
				self::get_typography_variable_map()
			),
			self::get_nested_style_parts(
				isset( $theme['tokens'] ) && is_array( $theme['tokens'] ) ? $theme['tokens'] : array(),
				self::get_token_variable_map()
			),
			self::get_dock_style_parts( $desktop_dock )
		);

		return array(
			'style'      => implode( ';', $style_parts ),
			'mode_rules' => self::get_mode_token_style_rules( $theme ),
		);
	}

	/**
	 * Get CSS rules for appearance-scoped mode tokens.
	 *
	 * @param array<string,mixed> $theme Normalized theme.
	 * @return array<int,string>
	 */
	public static function get_mode_token_style_rules( $theme ) {
		$rules       = array();
		$mode_tokens = isset( $theme['mode_tokens'] ) && is_array( $theme['mode_tokens'] ) ? $theme['mode_tokens'] : array();
		$theme_id    = isset( $theme['id'] ) ? sanitize_key( (string) $theme['id'] ) : '';

		if ( '' === $theme_id ) {
			return $rules;
		}

		foreach ( array( 'light', 'dark' ) as $mode ) {
			if ( empty( $mode_tokens[ $mode ] ) || ! is_array( $mode_tokens[ $mode ] ) ) {
				continue;
			}

			$style_parts = self::get_nested_style_parts( $mode_tokens[ $mode ], self::get_token_variable_map() );
			if ( empty( $style_parts ) ) {
				continue;
			}

			$rules[] = '.pdk-shell[data-pdk-theme=' . $theme_id . '][data-pdk-effective-appearance=' . $mode . ']{' . implode( ';', $style_parts ) . '}';
		}

		return $rules;
	}

	/**
	 * Build wallpaper CSS variable declarations.
	 *
	 * @param array<string,mixed> $wallpaper Resolved wallpaper config.
	 * @return array<int,string>
	 */
	private static function get_wallpaper_style_parts( $wallpaper ) {
		$style_parts = array();

		if ( empty( $wallpaper['css_variables'] ) || ! is_array( $wallpaper['css_variables'] ) ) {
			return $style_parts;
		}

		foreach ( $wallpaper['css_variables'] as $name => $value ) {
			if ( ! preg_match( '/^--pdk-wallpaper-(image|size|position|repeat)$/', (string) $name ) ) {
				continue;
			}

			$value = self::sanitize_css_value( $value );
			if ( '' !== $value ) {
				$style_parts[] = $name . ':' . $value;
			}
		}

		return $style_parts;
	}

	/**
	 * Build nested CSS variable declarations from theme metadata.
	 *
	 * @param array<string,mixed>                $values       Theme values by section.
	 * @param array<string,array<string,string>> $variable_map CSS variable map by section.
	 * @return array<int,string>
	 */
	private static function get_nested_style_parts( $values, $variable_map ) {
		$style_parts = array();

		foreach ( $variable_map as $section => $variables ) {
			if ( empty( $values[ $section ] ) || ! is_array( $values[ $section ] ) ) {
				continue;
			}

			foreach ( $variables as $key => $variable ) {
				if ( ! array_key_exists( $key, $values[ $section ] ) ) {
					continue;
				}

				$value = self::sanitize_css_value( $values[ $section ][ $key ] );
				if ( '' !== $value ) {
					$style_parts[] = $variable . ':' . $value;
				}
			}
		}

		return $style_parts;
	}

	/**
	 * Build Dock CSS variable declarations from user preferences.
	 *
	 * @param array<string,mixed> $desktop_dock Desktop and launcher preferences.
	 * @return array<int,string>
	 */
	private static function get_dock_style_parts( $desktop_dock ) {
		$dock_size          = max( 28, min( 72, (int) ( isset( $desktop_dock['dock_size'] ) ? $desktop_dock['dock_size'] : 48 ) ) );
		$dock_magnification = max( 0, min( 24, (int) ( isset( $desktop_dock['dock_magnification'] ) ? $desktop_dock['dock_magnification'] : 0 ) ) );
		$dock_icon_size     = max( 18, (int) round( $dock_size * 0.56 ) );
		$dock_lift          = $dock_magnification > 0 ? (int) round( 4 + $dock_magnification / 3 ) : 0;
		$dock_scale         = $dock_magnification > 0 ? number_format( 1 + $dock_magnification / 55, 3, '.', '' ) : '1';

		return array(
			'--pdk-dock-item-size:' . $dock_size . 'px',
			'--pdk-dock-icon-size:' . $dock_icon_size . 'px',
			'--pdk-dock-tile-size:' . $dock_size . 'px',
			'--pdk-dock-hover-lift:' . $dock_lift . 'px',
			'--pdk-dock-hover-scale:' . $dock_scale,
		);
	}

	/**
	 * Strip delimiters that would break a CSS declaration.
	 *
	 * @param mixed $value Raw CSS value.
	 * @return string
	 */
	private static function sanitize_css_value( $value ) {
		return str_replace( ';', '', (string) $value );
	}

	/**
	 * Map typography metadata keys to CSS variables.
	 *
	 * @return array<string,array<string,string>>
	 */
	private static function get_typography_variable_map() {
		return array(
			'fonts'          => array(
				'ui'      => '--pdk-font-ui',
				'display' => '--pdk-font-display',
				'mono'    => '--pdk-font-mono',
			),
			'scale'          => array(
				'micro'                 => '--pdk-text-micro',
				'small'                 => '--pdk-text-small',
				'fine_print'            => '--pdk-text-fine-print',
				'footer'                => '--pdk-text-footer',
				'meta'                  => '--pdk-text-meta',
				'caption'               => '--pdk-text-caption',
				'menu'                  => '--pdk-text-menu',
				'body'                  => '--pdk-text-body',
				'control'               => '--pdk-text-control',
				'dialog_title'          => '--pdk-text-dialog-title',
				'context_menu'          => '--pdk-text-context-menu',
				'context_menu_shortcut' => '--pdk-text-context-menu-shortcut',
				'label'                 => '--pdk-text-label',
				'section_title'         => '--pdk-text-section-title',
				'settings_caption'      => '--pdk-theme-settings-text-caption',
				'settings_body'         => '--pdk-theme-settings-text-body',
				'settings_label'        => '--pdk-theme-settings-text-label',
				'settings_heading'      => '--pdk-theme-settings-text-heading',
				'settings_title'        => '--pdk-theme-settings-text-title',
				'profile_title'         => '--pdk-text-profile-title',
				'heading'               => '--pdk-text-heading',
				'about_title'           => '--pdk-text-about-title',
				'stat_value'            => '--pdk-text-stat-value',
				'display_title'         => '--pdk-text-display-title',
				'avatar'                => '--pdk-text-avatar',
				'widget_clock'          => '--pdk-text-widget-clock',
			),
			'line_heights'   => array(
				'tight'   => '--pdk-line-height-tight',
				'caption' => '--pdk-line-height-caption',
				'body'    => '--pdk-line-height-body',
				'display' => '--pdk-line-height-display',
			),
			'weights'        => array(
				'regular'      => '--pdk-weight-regular',
				'fine_print'   => '--pdk-weight-fine-print',
				'meta'         => '--pdk-weight-meta',
				'medium'       => '--pdk-weight-medium',
				'semibold'     => '--pdk-weight-semibold',
				'strong'       => '--pdk-weight-strong',
				'bold'         => '--pdk-weight-bold',
				'heading'      => '--pdk-weight-heading',
				'display'      => '--pdk-weight-display',
				'widget_clock' => '--pdk-weight-widget-clock',
			),
			'letter_spacing' => array(
				'default' => '--pdk-letter-spacing-default',
				'tight'   => '--pdk-letter-spacing-tight',
			),
		);
	}

	/**
	 * Map theme token metadata keys to CSS variables.
	 *
	 * @return array<string,array<string,string>>
	 */
	private static function get_token_variable_map() {
		return array(
			'color'            => array(
				'ink'        => '--pdk-ink',
				'muted'      => '--pdk-muted',
				'desktop_bg' => '--pdk-desktop-bg',
				'accent'     => '--pdk-accent',
				'accent_ink' => '--pdk-accent-ink',
				'highlight'  => '--pdk-highlight',
			),
			'material'         => array(
				'clear_bg'          => '--pdk-material-clear-bg',
				'clear_border'      => '--pdk-material-clear-border',
				'clear_filter'      => '--pdk-material-clear-filter',
				'clear_shadow'      => '--pdk-material-clear-shadow',
				'regular_bg'        => '--pdk-material-regular-bg',
				'regular_border'    => '--pdk-material-regular-border',
				'regular_filter'    => '--pdk-material-regular-filter',
				'regular_shadow'    => '--pdk-material-regular-shadow',
				'tinted_bg'         => '--pdk-material-tinted-bg',
				'tinted_border'     => '--pdk-material-tinted-border',
				'solid_bg'          => '--pdk-material-solid-bg',
				'solid_border'      => '--pdk-material-solid-border',
				'card_shadow'       => '--pdk-material-card-shadow',
				'control_bg'        => '--pdk-material-control-bg',
				'control_hover_bg'  => '--pdk-material-control-hover-bg',
				'control_active_bg' => '--pdk-material-control-active-bg',
				'control_border'    => '--pdk-material-control-border',
				'control_filter'    => '--pdk-material-control-filter',
				'bar_bg'            => '--pdk-material-bar-bg',
				'bar_border'        => '--pdk-material-bar-border',
				'bar_filter'        => '--pdk-material-bar-filter',
				'bar_shadow'        => '--pdk-material-bar-shadow',
				'popover_bg'        => '--pdk-material-popover-bg',
				'popover_border'    => '--pdk-material-popover-border',
				'popover_filter'    => '--pdk-material-popover-filter',
				'popover_shadow'    => '--pdk-material-popover-shadow',
				'dialog_bg'         => '--pdk-material-dialog-bg',
				'dialog_border'     => '--pdk-material-dialog-border',
				'dialog_filter'     => '--pdk-material-dialog-filter',
				'dialog_shadow'     => '--pdk-material-dialog-shadow',
			),
			'spacing'          => array(
				'window_safe_edge'    => '--pdk-window-safe-edge',
				'dock_screen_edge'    => '--pdk-dock-screen-edge',
				'dock_hover_lift'     => '--pdk-dock-hover-lift',
				'dock_icon_size'      => '--pdk-dock-icon-size',
				'dock_item_size'      => '--pdk-dock-item-size',
				'dock_tile_size'      => '--pdk-dock-tile-size',
				'scrollbar_size'      => '--pdk-scrollbar-size',
				'app_badge_size'      => '--pdk-app-badge-size',
				'app_badge_padding_x' => '--pdk-app-badge-padding-x',
				'app_badge_max_width' => '--pdk-app-badge-max-width',
			),
			'radius'           => array(
				'window'           => '--pdk-window-radius',
				'window_maximized' => '--pdk-window-maximized-radius',
				'menu_popover'     => '--pdk-menu-popover-radius',
			),
			'border'           => array(
				'line'       => '--pdk-line',
				'window_bar' => '--pdk-window-bar-border',
				'tile'       => '--pdk-tile-border',
				'dock'       => '--pdk-dock-border',
			),
			'shadow'           => array(
				'default'      => '--pdk-shadow',
				'card'         => '--pdk-card-shadow',
				'dialog'       => '--pdk-dialog-shadow',
				'menu_popover' => '--pdk-menu-popover-shadow',
			),
			'context_menu'     => array(
				'bg'               => '--pdk-menu-popover-bg',
				'border'           => '--pdk-menu-popover-border',
				'filter'           => '--pdk-menu-popover-filter',
				'shadow'           => '--pdk-menu-popover-shadow',
				'radius'           => '--pdk-menu-popover-radius',
				'ink'              => '--pdk-menu-popover-ink',
				'muted'            => '--pdk-menu-popover-muted',
				'separator'        => '--pdk-menu-popover-separator',
				'hover_bg'         => '--pdk-menu-item-hover-bg',
				'hover_ink'        => '--pdk-menu-item-hover-ink',
				'disabled'         => '--pdk-menu-item-disabled',
				'selection_bg'     => '--pdk-menu-selection-bg',
				'selection_border' => '--pdk-menu-selection-border',
				'selection_shadow' => '--pdk-menu-selection-shadow',
				'sheen'            => '--pdk-menu-popover-sheen',
				'sheen_opacity'    => '--pdk-menu-popover-sheen-opacity',
				'padding'          => '--pdk-context-menu-padding',
				'item_radius'      => '--pdk-context-menu-item-radius',
				'item_height'      => '--pdk-context-menu-item-height',
				'item_gap'         => '--pdk-context-menu-item-gap',
				'item_padding_x'   => '--pdk-context-menu-item-padding-x',
				'icon_size'        => '--pdk-context-menu-icon-size',
				'separator_margin' => '--pdk-context-menu-separator-margin',
			),
			'settings_surface' => array(
				'window_bg'                  => '--pdk-settings-window-bg',
				'body_bg'                    => '--pdk-settings-body-bg',
				'main_bg'                    => '--pdk-settings-main-bg',
				'card_bg'                    => '--pdk-settings-card-bg',
				'card_border'                => '--pdk-settings-card-border',
				'sidebar_bg'                 => '--pdk-settings-sidebar-bg',
				'sidebar_border'             => '--pdk-settings-sidebar-border',
				'sidebar_filter'             => '--pdk-settings-sidebar-filter',
				'sidebar_shadow'             => '--pdk-settings-sidebar-shadow',
				'sidebar_radius'             => '--pdk-settings-sidebar-panel-radius',
				'sidebar_reflection_filter'  => '--pdk-settings-sidebar-reflection-filter',
				'sidebar_reflection_mask'    => '--pdk-settings-sidebar-reflection-mask',
				'sidebar_reflection_opacity' => '--pdk-settings-sidebar-reflection-opacity',
				'sidebar_gloss'              => '--pdk-settings-sidebar-gloss',
				'search_bg'                  => '--pdk-settings-search-bg',
				'search_border'              => '--pdk-settings-search-border',
				'search_shadow'              => '--pdk-settings-search-shadow',
				'search_filter'              => '--pdk-settings-search-filter',
				'control_radius'             => '--pdk-settings-control-radius',
				'section_bg'                 => '--pdk-settings-section-bg',
				'section_hover_bg'           => '--pdk-settings-section-hover-bg',
				'section_active_bg'          => '--pdk-settings-section-active-bg',
				'sidebar_active_bg'          => '--pdk-settings-sidebar-active-bg',
				'sidebar_active_ink'         => '--pdk-settings-sidebar-active-ink',
				'sidebar_hover_bg'           => '--pdk-settings-sidebar-hover-bg',
				'titlebar_bg'                => '--pdk-settings-titlebar-bg',
				'titlebar_back_disabled'     => '--pdk-settings-titlebar-back-disabled',
			),
			'window_chrome'    => array(
				'surface_bg'                  => '--pdk-panel',
				'surface_border'              => '--pdk-line',
				'surface_shadow'              => '--pdk-shadow',
				'bar_bg'                      => '--pdk-window-bar-bg',
				'bar_border'                  => '--pdk-window-bar-border',
				'regular_bg'                  => '--pdk-material-regular-bg',
				'regular_border'              => '--pdk-material-regular-border',
				'regular_filter'              => '--pdk-material-regular-filter',
				'regular_shadow'              => '--pdk-material-regular-shadow',
				'liquid_window_bg'            => '--pdk-liquid-glass-window-bg',
				'liquid_window_border'        => '--pdk-liquid-glass-window-border',
				'liquid_window_filter'        => '--pdk-liquid-glass-window-filter',
				'liquid_window_shadow'        => '--pdk-liquid-glass-window-shadow',
				'folder_window_border'        => '--pdk-folder-window-border',
				'folder_window_shadow'        => '--pdk-folder-window-shadow',
				'file_explorer_window_radius' => '--pdk-file-explorer-window-radius',
				),
				'explorer'         => array(
					'surface_bg'                => '--pdk-explorer-surface-bg',
					'titlebar_bg'               => '--pdk-explorer-titlebar-bg',
					'toolbar_bg'                => '--pdk-explorer-toolbar-bg',
					'addressbar_bg'             => '--pdk-explorer-addressbar-bg',
					'command_bg'                => '--pdk-explorer-command-bg',
					'sidebar_bg'                => '--pdk-explorer-sidebar-bg',
					'sidebar_border'            => '--pdk-explorer-sidebar-border',
					'sidebar_heading'           => '--pdk-explorer-sidebar-heading',
					'sidebar_selected_bg'       => '--pdk-explorer-sidebar-selected-bg',
					'sidebar_selected_border'   => '--pdk-explorer-sidebar-selected-border',
					'row_hover_bg'              => '--pdk-explorer-row-hover-bg',
					'field_bg'                  => '--pdk-explorer-field-bg',
					'field_border'              => '--pdk-explorer-field-border',
					'search_bg'                 => '--pdk-explorer-search-bg',
					'hover_bg'                  => '--pdk-explorer-hover-bg',
					'selection_bg'              => '--pdk-explorer-selection-bg',
					'selection_border'          => '--pdk-explorer-selection-border',
					'tab_bg'                    => '--pdk-explorer-tab-bg',
					'tab_inactive_bg'           => '--pdk-explorer-tab-inactive-bg',
					'tab_border'                => '--pdk-explorer-tab-border',
					'tab_shadow'                => '--pdk-explorer-tab-shadow',
					'statusbar_bg'              => '--pdk-explorer-statusbar-bg',
				'finder_divider'            => '--pdk-finder-divider',
				'finder_sidebar_active_bg'  => '--pdk-finder-sidebar-active-bg',
				'finder_sidebar_active_ink' => '--pdk-finder-sidebar-active-ink',
				'finder_tabbar_bg'          => '--pdk-finder-tabbar-bg',
				'finder_tabbar_border'      => '--pdk-finder-tabbar-border',
				'finder_tab_bg'             => '--pdk-finder-tab-bg',
				'finder_tab_hover_bg'       => '--pdk-finder-tab-hover-bg',
				'finder_tab_active_bg'      => '--pdk-finder-tab-active-bg',
				'finder_tab_active_border'  => '--pdk-finder-tab-active-border',
				'finder_tab_close_bg'       => '--pdk-finder-tab-close-bg',
				'finder_tab_close_hover_bg' => '--pdk-finder-tab-close-hover-bg',
				'finder_tab_add_bg'         => '--pdk-finder-tab-add-bg',
				'finder_tab_add_hover_bg'   => '--pdk-finder-tab-add-hover-bg',
				'finder_tab_add_border'     => '--pdk-finder-tab-add-border',
			),
		);
	}
}
