<?php
/**
 * Icon descriptors and rendering.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * Normalizes app/folder icons into a future-friendly shape.
 */
final class Admin_OS_Mode_Icon_Renderer {
	/**
	 * Normalize a Dashicon string or structured icon descriptor.
	 *
	 * @param mixed $icon Raw icon.
	 * @return array<string,string>
	 */
	public static function normalize( $icon ) {
		if ( is_array( $icon ) ) {
			$type = isset( $icon['type'] ) ? sanitize_key( $icon['type'] ) : 'dashicon';

			if ( 'image' === $type ) {
				$url = self::get_image_url( $icon );
				if ( '' !== $url ) {
					return array(
						'type' => 'image',
						'url'  => $url,
						'alt'  => isset( $icon['alt'] ) ? sanitize_text_field( $icon['alt'] ) : '',
					);
				}
			}

			if ( 'theme' === $type ) {
				$name = isset( $icon['name'] ) ? sanitize_file_name( $icon['name'] ) : '';
				if ( self::is_theme_icon_name( $name ) ) {
					return array(
						'type'     => 'theme',
						'name'     => $name,
						'fallback' => self::get_dashicon_value( isset( $icon['fallback'] ) ? $icon['fallback'] : '' ),
						'alt'      => isset( $icon['alt'] ) ? sanitize_text_field( $icon['alt'] ) : '',
					);
				}
			}

			$value = '';
			if ( isset( $icon['value'] ) ) {
				$value = $icon['value'];
			} elseif ( isset( $icon['dashicon'] ) ) {
				$value = $icon['dashicon'];
			}

			return self::normalize_dashicon( $value );
		}

		return self::normalize_dashicon( $icon );
	}

	/**
	 * Render a normalized icon descriptor.
	 *
	 * @param mixed $icon Raw or normalized icon.
	 * @param mixed $theme Current theme data.
	 */
	public static function render( $icon, $theme = array() ) {
		$icon = self::resolve( $icon, $theme );

		if ( 'image' === $icon['type'] && ! empty( $icon['url'] ) ) {
			printf(
				'<img class="aos-icon-image" src="%s" alt="%s" aria-hidden="true" loading="lazy" decoding="async" />',
				esc_url( $icon['url'] ),
				esc_attr( $icon['alt'] )
			);
			return;
		}

		printf(
			'<span class="dashicons %s" aria-hidden="true"></span>',
			esc_attr( $icon['value'] )
		);
	}

	/**
	 * Resolve a normalized icon for the active theme.
	 *
	 * @param mixed $icon Raw or normalized icon.
	 * @param mixed $theme Current theme data.
	 * @return array<string,string>
	 */
	public static function resolve( $icon, $theme = array() ) {
		$icon = self::normalize( $icon );

		if ( 'theme' !== $icon['type'] ) {
			return $icon;
		}

		$url = self::get_theme_icon_url( $icon, $theme );
		if ( '' !== $url ) {
			return array(
				'type' => 'image',
				'url'  => $url,
				'alt'  => $icon['alt'],
			);
		}

		return self::normalize_dashicon( $icon['fallback'] );
	}

	/**
	 * Normalize a Dashicon class.
	 *
	 * @param mixed $value Raw class.
	 * @return array<string,string>
	 */
	private static function normalize_dashicon( $value ) {
		$value = self::get_dashicon_value( $value );

		return array(
			'type'  => 'dashicon',
			'value' => $value,
		);
	}

	/**
	 * Sanitize a Dashicon value.
	 *
	 * @param mixed $value Raw class.
	 * @return string
	 */
	private static function get_dashicon_value( $value ) {
		$value = sanitize_html_class( (string) $value );
		if ( '' === $value ) {
			$value = 'dashicons-admin-generic';
		}

		return $value;
	}

	/**
	 * Check whether a theme icon name points to a supported image file.
	 *
	 * @param string $name Icon file name.
	 * @return bool
	 */
	private static function is_theme_icon_name( $name ) {
		return (bool) preg_match( '/\.(svg|png|webp|jpe?g|gif)$/i', $name );
	}

	/**
	 * Resolve an image icon URL from a descriptor.
	 *
	 * @param array<string,mixed> $icon Icon descriptor.
	 * @return string
	 */
	private static function get_image_url( $icon ) {
		if ( ! empty( $icon['url'] ) ) {
			return esc_url_raw( $icon['url'] );
		}

		if ( empty( $icon['src'] ) ) {
			return '';
		}

		$path = self::normalize_media_path( $icon['src'] );
		if ( '' === $path ) {
			return '';
		}

		return ADMIN_OS_MODE_URL . 'assets/media/' . $path;
	}

	/**
	 * Resolve a theme icon URL when the active icon pack has the file.
	 *
	 * @param array<string,string> $icon Theme icon descriptor.
	 * @param mixed                $theme Current theme data.
	 * @return string
	 */
	private static function get_theme_icon_url( $icon, $theme ) {
		if ( empty( $icon['name'] ) || ! is_array( $theme ) || empty( $theme['media']['icon_pack']['path'] ) ) {
			return '';
		}

		$path = self::normalize_media_path( trailingslashit( $theme['media']['icon_pack']['path'] ) . $icon['name'] );
		if ( '' === $path || ! file_exists( ADMIN_OS_MODE_DIR . 'assets/media/' . $path ) ) {
			return '';
		}

		return ADMIN_OS_MODE_URL . 'assets/media/' . $path;
	}

	/**
	 * Normalize a relative path below assets/media.
	 *
	 * @param string $path Raw media path.
	 * @return string
	 */
	private static function normalize_media_path( $path ) {
		$path  = str_replace( '\\', '/', (string) $path );
		$path  = preg_replace( '#^assets/media/#', '', ltrim( $path, '/' ) );
		$parts = array_filter( explode( '/', $path ) );

		$normalized = array();
		foreach ( $parts as $part ) {
			if ( '.' === $part || '..' === $part ) {
				continue;
			}

			$part = sanitize_file_name( $part );
			if ( '' !== $part ) {
				$normalized[] = $part;
			}
		}

		return implode( '/', $normalized );
	}
}
