<?php
/**
 * Relative path normalization helpers.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Normalizes plugin-local relative paths while preserving semantic folders.
 */
final class PufferDesk_Path_Normalizer {
	/**
	 * Normalize a relative path.
	 *
	 * @param mixed  $path         Raw path.
	 * @param string $strip_prefix Optional prefix to strip before normalizing.
	 * @return string
	 */
	public static function normalize_relative_path( $path, $strip_prefix = '' ) {
		$path = str_replace( '\\', '/', (string) $path );
		$path = ltrim( $path, '/' );

		if ( '' !== $strip_prefix ) {
			$path = preg_replace( '#^' . preg_quote( $strip_prefix, '#' ) . '#', '', $path );
		}

		$parts      = array_filter( explode( '/', $path ) );
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

	/**
	 * Normalize a relative path below assets/media.
	 *
	 * @param mixed $path Raw media path.
	 * @return string
	 */
	public static function normalize_media_path( $path ) {
		return self::normalize_relative_path( $path, 'assets/media/' );
	}
}
