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
	 * Normalize a legacy dashicon string or structured icon descriptor.
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
	 */
	public static function render( $icon ) {
		$icon = self::normalize( $icon );

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
	 * Normalize a Dashicon class.
	 *
	 * @param mixed $value Raw class.
	 * @return array<string,string>
	 */
	private static function normalize_dashicon( $value ) {
		$value = sanitize_html_class( (string) $value );
		if ( '' === $value ) {
			$value = 'dashicons-admin-generic';
		}

		return array(
			'type'  => 'dashicon',
			'value' => $value,
		);
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
