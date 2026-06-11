<?php
/**
 * Icon descriptors and rendering.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Normalizes app/folder icons into a future-friendly shape.
 */
final class PufferDesk_Icon_Renderer {
	const TYPE_DASHICON = 'dashicon';
	const TYPE_IMAGE    = 'image';
	const TYPE_THEME    = 'theme';
	const APPEARANCE_BRAND      = 'brand';
	const APPEARANCE_MONOCHROME = 'monochrome';
	const DEFAULT_DASHICON = 'dashicons-admin-generic';

	/**
	 * Icon descriptor type IDs.
	 *
	 * @return array<string,string>
	 */
	public static function get_type_ids() {
		return array(
			'DASHICON' => self::TYPE_DASHICON,
			'IMAGE'    => self::TYPE_IMAGE,
			'THEME'    => self::TYPE_THEME,
		);
	}

	/**
	 * Browser-facing icon descriptor contract.
	 *
	 * @return array<string,mixed>
	 */
	public static function client_contract() {
		return array(
			'defaultDashicon' => self::DEFAULT_DASHICON,
			'appearances'     => self::get_appearance_ids(),
			'types'           => self::get_type_ids(),
		);
	}

	/**
	 * Icon appearance IDs.
	 *
	 * @return array<string,string>
	 */
	public static function get_appearance_ids() {
		return array(
			'BRAND'      => self::APPEARANCE_BRAND,
			'MONOCHROME' => self::APPEARANCE_MONOCHROME,
		);
	}

	/**
	 * Normalize a Dashicon string or structured icon descriptor.
	 *
	 * @param mixed $icon Raw icon.
	 * @return array<string,string>
	 */
	public static function normalize( $icon ) {
		if ( is_array( $icon ) ) {
			$type = isset( $icon['type'] ) ? sanitize_key( $icon['type'] ) : self::TYPE_DASHICON;

			if ( self::TYPE_IMAGE === $type ) {
				$url = self::get_image_url( $icon );
				if ( '' !== $url ) {
					return array(
						'type'       => self::TYPE_IMAGE,
						'url'        => $url,
						'alt'        => isset( $icon['alt'] ) ? sanitize_text_field( $icon['alt'] ) : '',
						'appearance' => self::normalize_appearance( isset( $icon['appearance'] ) ? $icon['appearance'] : '' ),
					);
				}
			}

			if ( self::TYPE_THEME === $type ) {
				$name = isset( $icon['name'] ) ? sanitize_file_name( $icon['name'] ) : '';
				if ( self::is_theme_icon_name( $name ) ) {
					return array(
						'type'       => self::TYPE_THEME,
						'name'       => $name,
						'fallback'   => self::get_dashicon_value( isset( $icon['fallback'] ) ? $icon['fallback'] : '' ),
						'alt'        => isset( $icon['alt'] ) ? sanitize_text_field( $icon['alt'] ) : '',
						'appearance' => self::normalize_appearance( isset( $icon['appearance'] ) ? $icon['appearance'] : '' ),
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

		if ( self::TYPE_IMAGE === $icon['type'] && ! empty( $icon['url'] ) ) {
			$url = trim( (string) $icon['url'] );
			if ( self::APPEARANCE_MONOCHROME === self::get_icon_appearance( $icon ) && self::is_data_image_url( $url ) ) {
				printf(
					'<span class="%s" style="--pdk-icon-mask-image: url(\'%s\');" aria-hidden="true"></span>',
					esc_attr( self::get_class_names( $icon, 'pdk-icon-mask' ) ),
					esc_attr( $url )
				);
				return;
			}

			if ( self::is_data_image_url( $url ) ) {
				printf(
					'<img class="%s" src="%s" alt="%s" aria-hidden="true" loading="lazy" decoding="async" />',
					esc_attr( self::get_class_names( $icon, 'pdk-icon-image' ) ),
					esc_attr( $url ),
					esc_attr( $icon['alt'] )
				);
				return;
			}

			if ( '' !== esc_url( $url ) ) {
				printf(
					'<img class="%s" src="%s" alt="%s" aria-hidden="true" loading="lazy" decoding="async" />',
					esc_attr( self::get_class_names( $icon, 'pdk-icon-image' ) ),
					esc_url( $url ),
					esc_attr( $icon['alt'] )
				);
				return;
			}

			$icon = self::normalize_dashicon( '' );
		}

		printf(
			'<span class="%s" aria-hidden="true"></span>',
			esc_attr( self::get_class_names( $icon, 'dashicons' ) )
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

		if ( self::TYPE_THEME !== $icon['type'] ) {
			return $icon;
		}

		$url = self::get_theme_icon_url( $icon, $theme );
		if ( '' !== $url ) {
			return array(
				'type'       => self::TYPE_IMAGE,
				'url'        => $url,
				'alt'        => $icon['alt'],
				'appearance' => $icon['appearance'],
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
			'type'       => self::TYPE_DASHICON,
			'value'      => $value,
			'appearance' => self::APPEARANCE_MONOCHROME,
		);
	}

	/**
	 * Normalize icon appearance.
	 *
	 * @param mixed  $appearance Raw appearance.
	 * @param string $fallback Fallback appearance.
	 * @return string
	 */
	private static function normalize_appearance( $appearance, $fallback = self::APPEARANCE_BRAND ) {
		$appearance = sanitize_key( (string) $appearance );

		return in_array( $appearance, array( self::APPEARANCE_BRAND, self::APPEARANCE_MONOCHROME ), true ) ? $appearance : $fallback;
	}

	/**
	 * Read a normalized icon appearance.
	 *
	 * @param array<string,string> $icon Icon descriptor.
	 * @return string
	 */
	private static function get_icon_appearance( $icon ) {
		return self::normalize_appearance( isset( $icon['appearance'] ) ? $icon['appearance'] : '' );
	}

	/**
	 * Build shared icon class names.
	 *
	 * @param array<string,string> $icon Icon descriptor.
	 * @param string               $base_class Base class.
	 * @return string
	 */
	private static function get_class_names( $icon, $base_class ) {
		$appearance = self::get_icon_appearance( $icon );
		$classes    = array( $base_class, 'pdk-icon' );

		if ( 'dashicons' === $base_class ) {
			$classes[] = isset( $icon['value'] ) ? $icon['value'] : self::DEFAULT_DASHICON;
			$classes[] = 'pdk-icon-glyph';
		}

		$classes[] = self::APPEARANCE_MONOCHROME === $appearance ? 'pdk-icon-adaptive' : 'pdk-icon-brand';

		return implode( ' ', array_filter( array_unique( $classes ) ) );
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
			$value = self::DEFAULT_DASHICON;
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
			$url = trim( (string) $icon['url'] );
			if ( self::is_data_image_url( $url ) ) {
				return $url;
			}

			return esc_url_raw( $url );
		}

		if ( empty( $icon['src'] ) ) {
			return '';
		}

		$path = PufferDesk_Path_Normalizer::normalize_media_path( $icon['src'] );
		if ( '' === $path ) {
			return '';
		}

		return self::get_local_media_url( $path );
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

		$path = PufferDesk_Path_Normalizer::normalize_media_path( trailingslashit( $theme['media']['icon_pack']['path'] ) . $icon['name'] );
		if ( '' === $path || ! file_exists( PUFFERDESK_DIR . 'assets/media/' . $path ) ) {
			return '';
		}

		return self::get_local_media_url( $path );
	}

	/**
	 * Build a local media URL with a file-based cache version.
	 *
	 * @param string $path Normalized media path.
	 * @return string
	 */
	private static function get_local_media_url( $path ) {
		$file = PUFFERDESK_DIR . 'assets/media/' . $path;

		if ( '' === $path || ! file_exists( $file ) ) {
			return '';
		}

		$version = filemtime( $file );
		if ( false === $version ) {
			$version = PUFFERDESK_VERSION;
		}

		return add_query_arg(
			'ver',
			(string) $version,
			PUFFERDESK_URL . 'assets/media/' . $path
		);
	}

	/**
	 * Check whether a data URI is a narrow image-only icon.
	 *
	 * @param string $url Image URL.
	 * @return bool
	 */
	private static function is_data_image_url( $url ) {
		return (bool) preg_match( '#^data:image/(?:png|gif|jpe?g|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$#', $url );
	}

}
