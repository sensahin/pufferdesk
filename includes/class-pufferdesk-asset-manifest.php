<?php
/**
 * Asset manifest reader.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Reads the canonical source asset order shared by WordPress and build tools.
 */
final class PufferDesk_Asset_Manifest {
	const CONFIG_SCRIPT_HANDLE = 'pufferdesk-config';

	/**
	 * Manifest data.
	 *
	 * @var array<string,mixed>|null
	 */
	private $manifest = null;

	/**
	 * Get the minified admin chrome CSS path.
	 *
	 * @return string
	 */
	public function get_dist_admin_chrome_css() {
		$dist = $this->get_dist();

		return isset( $dist['adminChromeCss'] ) ? $dist['adminChromeCss'] : 'assets/dist/css/pufferdesk-admin-chrome.min.css';
	}

	/**
	 * Get the minified core CSS path.
	 *
	 * @return string
	 */
	public function get_dist_core_css() {
		$dist = $this->get_dist();

		return isset( $dist['coreCss'] ) ? $dist['coreCss'] : 'assets/dist/css/pufferdesk-core.min.css';
	}

	/**
	 * Get the minified iframe helper JavaScript path.
	 *
	 * @return string
	 */
	public function get_dist_iframe_script() {
		$dist = $this->get_dist();

		return isset( $dist['iframeScript'] ) ? $dist['iframeScript'] : 'assets/dist/js/pufferdesk-admin-iframe.min.js';
	}

	/**
	 * Get the minified JavaScript bundle path.
	 *
	 * @return string
	 */
	public function get_dist_script() {
		$dist = $this->get_dist();

		return isset( $dist['script'] ) ? $dist['script'] : 'assets/dist/js/pufferdesk.min.js';
	}

	/**
	 * Get the admin chrome CSS source descriptor.
	 *
	 * @return array{handle:string,path:string}
	 */
	public function get_admin_chrome_style() {
		$styles = $this->get_core_styles( false );

		return ! empty( $styles[0] )
			? $styles[0]
			: array(
				'handle' => 'pufferdesk-core-admin-chrome',
				'path'   => 'assets/css/core/admin-chrome.css',
			);
	}

	/**
	 * Get core CSS sources in cascade order.
	 *
	 * @param bool $include_shell Whether shell component CSS is needed.
	 * @return array<int,array{handle:string,path:string}>
	 */
	public function get_core_styles( $include_shell ) {
		$styles = $this->normalize_core_styles( isset( $this->get_manifest()['coreStyles'] ) ? $this->get_manifest()['coreStyles'] : array() );

		if ( empty( $styles ) ) {
			$styles = array(
				array(
					'handle' => 'pufferdesk-core-admin-chrome',
					'path'   => 'assets/css/core/admin-chrome.css',
				),
			);
		}

		return $include_shell ? $styles : array_slice( $styles, 0, 1 );
	}

	/**
	 * Get JavaScript sources in dependency order.
	 *
	 * @return array<int,array{handle:string,path:string,deps:array<int,string>}>
	 */
	public function get_core_scripts() {
		return $this->normalize_scripts( isset( $this->get_manifest()['scripts'] ) ? $this->get_manifest()['scripts'] : array() );
	}

	/**
	 * Get the handle that receives the runtime config inline script.
	 *
	 * @return string
	 */
	public function get_config_script_handle() {
		return self::CONFIG_SCRIPT_HANDLE;
	}

	/**
	 * Get dist asset paths from the manifest.
	 *
	 * @return array<string,string>
	 */
	private function get_dist() {
		$dist = isset( $this->get_manifest()['dist'] ) && is_array( $this->get_manifest()['dist'] )
			? $this->get_manifest()['dist']
			: array();

		return array(
			'adminChromeCss' => isset( $dist['adminChromeCss'] ) && is_scalar( $dist['adminChromeCss'] ) ? $this->normalize_asset_path( $dist['adminChromeCss'] ) : 'assets/dist/css/pufferdesk-admin-chrome.min.css',
			'coreCss'        => isset( $dist['coreCss'] ) && is_scalar( $dist['coreCss'] ) ? $this->normalize_asset_path( $dist['coreCss'] ) : 'assets/dist/css/pufferdesk-core.min.css',
			'iframeScript'   => isset( $dist['iframeScript'] ) && is_scalar( $dist['iframeScript'] ) ? $this->normalize_asset_path( $dist['iframeScript'] ) : 'assets/dist/js/pufferdesk-admin-iframe.min.js',
			'script'         => isset( $dist['script'] ) && is_scalar( $dist['script'] ) ? $this->normalize_asset_path( $dist['script'] ) : 'assets/dist/js/pufferdesk.min.js',
		);
	}

	/**
	 * Load and cache the manifest.
	 *
	 * @return array<string,mixed>
	 */
	private function get_manifest() {
		if ( null !== $this->manifest ) {
			return $this->manifest;
		}

		$path = PUFFERDESK_DIR . 'assets/manifest.json';
		$data = file_exists( $path )
			? wp_json_file_decode( $path, array( 'associative' => true ) )
			: null;

		$this->manifest = is_array( $data ) ? $data : array();

		return $this->manifest;
	}

	/**
	 * Normalize core CSS entries.
	 *
	 * @param mixed $styles Raw manifest styles.
	 * @return array<int,array{handle:string,path:string}>
	 */
	private function normalize_core_styles( $styles ) {
		if ( ! is_array( $styles ) ) {
			return array();
		}

		$normalized = array();
		foreach ( $styles as $style ) {
			if ( ! is_array( $style ) ) {
				continue;
			}

			$handle = isset( $style['handle'] ) && is_scalar( $style['handle'] ) ? sanitize_key( $style['handle'] ) : '';
			$path   = isset( $style['path'] ) && is_scalar( $style['path'] ) ? $this->normalize_asset_path( $style['path'] ) : '';
			if ( '' === $handle || '' === $path ) {
				continue;
			}

			$normalized[] = array(
				'handle' => $handle,
				'path'   => $path,
			);
		}

		return $normalized;
	}

	/**
	 * Normalize JavaScript entries.
	 *
	 * @param mixed $scripts Raw manifest scripts.
	 * @return array<int,array{handle:string,path:string,deps:array<int,string>}>
	 */
	private function normalize_scripts( $scripts ) {
		if ( ! is_array( $scripts ) ) {
			return array();
		}

		$normalized = array();
		foreach ( $scripts as $script ) {
			if ( ! is_array( $script ) ) {
				continue;
			}

			$handle = isset( $script['handle'] ) && is_scalar( $script['handle'] ) ? sanitize_key( $script['handle'] ) : '';
			$path   = isset( $script['path'] ) && is_scalar( $script['path'] ) ? $this->normalize_asset_path( $script['path'] ) : '';
			if ( '' === $handle || '' === $path ) {
				continue;
			}

			$normalized[] = array(
				'handle' => $handle,
				'path'   => $path,
				'deps'   => $this->normalize_dependencies( isset( $script['deps'] ) ? $script['deps'] : array() ),
			);
		}

		return $normalized;
	}

	/**
	 * Normalize script dependencies.
	 *
	 * @param mixed $deps Raw dependency list.
	 * @return array<int,string>
	 */
	private function normalize_dependencies( $deps ) {
		if ( ! is_array( $deps ) ) {
			return array();
		}

		$normalized = array();
		foreach ( $deps as $dep ) {
			if ( ! is_scalar( $dep ) ) {
				continue;
			}

			$dep = sanitize_key( $dep );
			if ( '' !== $dep ) {
				$normalized[] = $dep;
			}
		}

		return array_values( array_unique( $normalized ) );
	}

	/**
	 * Normalize a relative asset path.
	 *
	 * @param mixed $path Raw path.
	 * @return string
	 */
	private function normalize_asset_path( $path ) {
		$path  = str_replace( '\\', '/', (string) $path );
		$path  = ltrim( $path, '/' );
		$parts = array_filter( explode( '/', $path ) );

		$normalized = array();
		foreach ( $parts as $part ) {
			if ( '.' === $part || '..' === $part ) {
				continue;
			}

			$part = preg_replace( '/[^A-Za-z0-9._-]/', '', $part );
			if ( '' !== $part ) {
				$normalized[] = $part;
			}
		}

		return implode( '/', $normalized );
	}
}
