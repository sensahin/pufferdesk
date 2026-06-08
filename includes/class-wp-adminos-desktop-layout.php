<?php
/**
 * Desktop layout attribute helpers.
 *
 * @package WPAdminOS
 */

defined( 'ABSPATH' ) || exit;

/**
 * Converts saved workspace layout data into safe first-paint attributes.
 */
final class WP_AdminOS_Desktop_Layout {
	/**
	 * Render saved desktop icon attributes.
	 *
	 * @param string              $icon_id Desktop icon persistence ID.
	 * @param array<string,mixed> $workspace_state Workspace state.
	 */
	public static function render_icon_attributes( $icon_id, $workspace_state ) {
		foreach ( self::get_icon_attributes( $icon_id, $workspace_state ) as $name => $value ) {
			printf(
				"\n\t\t\t%s=\"%s\"",
				esc_attr( $name ),
				esc_attr( $value )
			);
		}
	}

	/**
	 * Whether every icon in a template layer has saved coordinates.
	 *
	 * @param array<int,array<string,mixed>> $items Items rendered in this icon layer.
	 * @param array<string,mixed>            $workspace_state Workspace state.
	 * @param string                         $prefix Persistence ID prefix.
	 * @return bool
	 */
	public static function layer_has_saved_icon_positions( $items, $workspace_state, $prefix ) {
		if ( empty( $items ) ) {
			return false;
		}

		$icons = self::get_desktop_icon_map( $workspace_state );
		foreach ( $items as $item ) {
			if ( ! is_array( $item ) || empty( $item['id'] ) ) {
				return false;
			}

			$icon_id = sanitize_key( $prefix ) . ':' . sanitize_key( (string) $item['id'] );
			if ( ! self::has_icon_position( isset( $icons[ $icon_id ] ) ? $icons[ $icon_id ] : array() ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Whether a saved icon record has usable coordinates.
	 *
	 * @param array<string,mixed> $icon Saved icon record.
	 * @return bool
	 */
	private static function has_icon_position( $icon ) {
		$state = isset( $icon['state'] ) && is_array( $icon['state'] ) ? $icon['state'] : array();

		return isset( $state['left'], $state['top'] ) && is_numeric( $state['left'] ) && is_numeric( $state['top'] );
	}

	/**
	 * Build saved desktop icon attributes.
	 *
	 * @param string              $icon_id Desktop icon persistence ID.
	 * @param array<string,mixed> $workspace_state Workspace state.
	 * @return array<string,string>
	 */
	private static function get_icon_attributes( $icon_id, $workspace_state ) {
		$icons = self::get_desktop_icon_map( $workspace_state );
		$state = isset( $icons[ $icon_id ]['state'] ) && is_array( $icons[ $icon_id ]['state'] ) ? $icons[ $icon_id ]['state'] : array();
		$left  = isset( $state['left'] ) ? absint( $state['left'] ) : null;
		$top   = isset( $state['top'] ) ? absint( $state['top'] ) : null;

		if ( null === $left || null === $top ) {
			return array();
		}

		return array(
			'data-aos-layout-restored' => '1',
			'style'                    => sprintf( 'left:%dpx;top:%dpx;', $left, $top ),
		);
	}

	/**
	 * Build saved desktop icon records keyed by icon ID.
	 *
	 * @param array<string,mixed> $workspace_state Workspace state.
	 * @return array<string,array<string,mixed>>
	 */
	private static function get_desktop_icon_map( $workspace_state ) {
		$map   = array();
		$icons = isset( $workspace_state['desktopIcons'] ) && is_array( $workspace_state['desktopIcons'] ) ? $workspace_state['desktopIcons'] : array();

		foreach ( $icons as $icon ) {
			if ( ! is_array( $icon ) || empty( $icon['id'] ) ) {
				continue;
			}

			$map[ sanitize_text_field( (string) $icon['id'] ) ] = $icon;
		}

		return $map;
	}
}
