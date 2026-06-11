<?php
/**
 * Widget layout attribute helpers.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Converts widget registry layout data into safe template attributes.
 */
final class PufferDesk_Widget_Layout {
	/**
	 * Render widget layout attributes for a desktop widget element.
	 *
	 * @param array<string,mixed> $widget Widget data.
	 * @param array<string,mixed> $workspace_state Workspace state.
	 */
	public static function render_attributes( $widget, $workspace_state = array() ) {
		foreach ( self::get_attributes( $widget, $workspace_state ) as $name => $value ) {
			printf(
				"\n\t%s=\"%s\"",
				esc_attr( $name ),
				esc_attr( $value )
			);
		}
	}

	/**
	 * Build widget layout attributes.
	 *
	 * @param array<string,mixed> $widget Widget data.
	 * @param array<string,mixed> $workspace_state Workspace state.
	 * @return array<string,string>
	 */
	private static function get_attributes( $widget, $workspace_state = array() ) {
		$position = isset( $widget['default_position'] ) && is_array( $widget['default_position'] ) ? $widget['default_position'] : array();
		$size     = isset( $widget['default_size'] ) && is_array( $widget['default_size'] ) ? $widget['default_size'] : array();
		$left     = isset( $position['left'] ) ? absint( $position['left'] ) : null;
		$right    = isset( $position['right'] ) ? absint( $position['right'] ) : null;
		$top      = isset( $position['top'] ) ? absint( $position['top'] ) : null;
		$bottom   = isset( $position['bottom'] ) ? absint( $position['bottom'] ) : null;
		$width    = isset( $size['width'] ) ? max( 120, absint( $size['width'] ) ) : PufferDesk_Widget_Registry::DEFAULT_WIDTH;
		$height   = isset( $size['height'] ) ? max( 80, absint( $size['height'] ) ) : PufferDesk_Widget_Registry::DEFAULT_HEIGHT;

		if ( null === $left && null === $right ) {
			$left = 24;
		}

		if ( null === $top && null === $bottom ) {
			$top = 24;
		}

		$attributes = array();
		$style      = array();
		$saved      = self::get_saved_widget_state( $widget, $workspace_state );

		if ( null !== $left ) {
			$attributes['data-pdk-widget-left'] = (string) $left;
			$style[] = sprintf( 'left:%dpx', $left );
		} else {
			$attributes['data-pdk-widget-right'] = (string) $right;
			$style[] = sprintf( 'right:%dpx', $right );
		}

		if ( null !== $top ) {
			$attributes['data-pdk-widget-top'] = (string) $top;
			$style[] = sprintf( 'top:%dpx', $top );
		} else {
			$attributes['data-pdk-widget-bottom'] = (string) $bottom;
			$style[] = sprintf( 'bottom:%dpx', $bottom );
		}

		$attributes['data-pdk-widget-width']  = (string) $width;
		$attributes['data-pdk-widget-height'] = (string) $height;

		if ( ! empty( $saved ) ) {
			$saved_left   = isset( $saved['left'] ) ? absint( $saved['left'] ) : $left;
			$saved_top    = isset( $saved['top'] ) ? absint( $saved['top'] ) : $top;
			$saved_width  = isset( $saved['width'] ) ? max( 120, absint( $saved['width'] ) ) : $width;
			$saved_height = isset( $saved['height'] ) ? max( 80, absint( $saved['height'] ) ) : $height;
			if ( null !== $saved_left && null !== $saved_top ) {
				$style = array(
					sprintf( 'left:%dpx', $saved_left ),
					sprintf( 'top:%dpx', $saved_top ),
				);
			}
			$width  = $saved_width;
			$height = $saved_height;
			$attributes['data-pdk-layout-restored'] = '1';

			if ( ! empty( $saved['hidden'] ) ) {
				$attributes['hidden'] = 'hidden';
			}
		}

		$attributes['style'] = implode( ';', array_merge( $style, array( sprintf( 'width:%dpx', $width ), sprintf( 'height:%dpx', $height ) ) ) ) . ';';

		return $attributes;
	}

	/**
	 * Get a saved widget state by widget ID.
	 *
	 * @param array<string,mixed> $widget Widget data.
	 * @param array<string,mixed> $workspace_state Workspace state.
	 * @return array<string,mixed>
	 */
	private static function get_saved_widget_state( $widget, $workspace_state ) {
		$widget_id = isset( $widget['id'] ) ? sanitize_key( (string) $widget['id'] ) : '';
		$widgets   = isset( $workspace_state[ PufferDesk_Workspace_State::SECTION_WIDGETS ] ) && is_array( $workspace_state[ PufferDesk_Workspace_State::SECTION_WIDGETS ] )
			? $workspace_state[ PufferDesk_Workspace_State::SECTION_WIDGETS ]
			: array();

		if ( '' === $widget_id ) {
			return array();
		}

		foreach ( $widgets as $item ) {
			if ( ! is_array( $item ) || empty( $item['id'] ) || empty( $item['state'] ) || ! is_array( $item['state'] ) ) {
				continue;
			}

			if ( $widget_id === sanitize_key( (string) $item['id'] ) ) {
				return $item['state'];
			}
		}

		return array();
	}
}
