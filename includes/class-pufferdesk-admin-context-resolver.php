<?php
/**
 * Current WordPress admin page context resolver for iframe windows.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Resolves the active WordPress admin menu context for embedded admin pages.
 */
final class PufferDesk_Admin_Context_Resolver {
	const CONFIDENCE_UNKNOWN        = 'unknown';
	const CONFIDENCE_PARENT        = 'parent';
	const CONFIDENCE_PARENT_SUBMENU = 'parent+submenu';
	const CONFIDENCE_URL           = 'url';

	/**
	 * WordPress admin menu app provider.
	 *
	 * @var PufferDesk_Admin_Menu_App_Provider
	 */
	private $admin_menu_provider;

	/**
	 * Constructor.
	 *
	 * @param PufferDesk_Admin_Menu_App_Provider $admin_menu_provider Admin menu provider.
	 */
	public function __construct( PufferDesk_Admin_Menu_App_Provider $admin_menu_provider ) {
		$this->admin_menu_provider = $admin_menu_provider;
	}

	/**
	 * Resolve the current iframe admin page context.
	 *
	 * @return array<string,mixed>
	 */
	public function resolve() {
		global $parent_file, $submenu_file, $plugin_page;

		$current_url          = $this->get_current_admin_url();
		$page_title           = $this->get_page_title();
		$current_parent_file  = isset( $parent_file ) ? sanitize_text_field( (string) $parent_file ) : '';
		$current_submenu_file = isset( $submenu_file ) ? sanitize_text_field( (string) $submenu_file ) : '';
		$current_plugin_page  = isset( $plugin_page ) ? sanitize_text_field( (string) $plugin_page ) : '';
		$screen               = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		$screen_id            = $screen && isset( $screen->id ) ? sanitize_text_field( (string) $screen->id ) : '';
		$context              = $this->get_context_for_parent( $current_parent_file );
		$confidence           = self::CONFIDENCE_UNKNOWN;

		if ( empty( $context ) ) {
			$context = $this->get_context_for_current_url( $current_url );
			if ( ! empty( $context ) ) {
				$current_parent_file = isset( $context['slug'] ) ? sanitize_text_field( (string) $context['slug'] ) : $current_parent_file;
				$confidence          = self::CONFIDENCE_URL;
			}
		}

		$routes       = isset( $context['navigation'] ) && is_array( $context['navigation'] ) ? $this->normalize_routes( $context['navigation'] ) : array();
		$active_route = $this->find_active_route( $routes, $current_submenu_file, $current_url );
		$submenu_item = $this->find_submenu_item( $current_parent_file, $current_submenu_file, $current_url, $active_route );

		if ( ! empty( $context ) && self::CONFIDENCE_URL !== $confidence ) {
			$confidence = ! empty( $submenu_item ) || ! empty( $active_route )
				? self::CONFIDENCE_PARENT_SUBMENU
				: self::CONFIDENCE_PARENT;
		}

		if ( empty( $current_submenu_file ) && ! empty( $active_route['slug'] ) ) {
			$current_submenu_file = sanitize_text_field( (string) $active_route['slug'] );
		}

		return array(
			'currentUrl'    => $current_url,
			'pageTitle'     => $page_title,
			'parentFile'    => $current_parent_file,
			'submenuFile'   => $current_submenu_file,
			'pluginPage'    => $current_plugin_page,
			'screenId'      => $screen_id,
			'parentLabel'   => isset( $context['label'] ) ? sanitize_text_field( (string) $context['label'] ) : '',
			'submenuLabel'  => $this->get_submenu_label( $submenu_item, $active_route ),
			'parentAppId'   => isset( $context['id'] ) ? sanitize_key( (string) $context['id'] ) : '',
			'routes'        => $routes,
			'activeRouteId' => isset( $active_route['id'] ) ? sanitize_key( (string) $active_route['id'] ) : '',
			'confidence'    => $confidence,
		);
	}

	/**
	 * Get the current top-level menu context.
	 *
	 * @param string $parent_file Current parent file.
	 * @return array<string,mixed>
	 */
	private function get_context_for_parent( $parent_file ) {
		$parent_file = trim( (string) $parent_file );

		return '' !== $parent_file ? $this->admin_menu_provider->get_admin_menu_context( $parent_file ) : array();
	}

	/**
	 * Find a menu context by matching the current URL against known admin routes.
	 *
	 * @param string $current_url Current URL.
	 * @return array<string,mixed>
	 */
	private function get_context_for_current_url( $current_url ) {
		if ( '' === $current_url ) {
			return array();
		}

		foreach ( $this->admin_menu_provider->get_admin_menu_contexts() as $context ) {
			$url = isset( $context['url'] ) ? (string) $context['url'] : '';
			if ( $this->admin_urls_match( $url, $current_url ) ) {
				return $context;
			}

			$routes = isset( $context['navigation'] ) && is_array( $context['navigation'] ) ? $context['navigation'] : array();
			foreach ( $routes as $route ) {
				$route_url = isset( $route['url'] ) ? (string) $route['url'] : '';
				if ( $this->admin_urls_match( $route_url, $current_url ) ) {
					return $context;
				}
			}
		}

		return array();
	}

	/**
	 * Normalize route data to the browser navigation contract.
	 *
	 * @param array<int,array<string,mixed>> $routes Raw routes.
	 * @return array<int,array<string,mixed>>
	 */
	private function normalize_routes( $routes ) {
		$normalized = array();

		foreach ( $routes as $route ) {
			if ( ! is_array( $route ) || empty( $route['id'] ) || empty( $route['label'] ) || empty( $route['url'] ) ) {
				continue;
			}

			$normalized[] = array(
				'id'                   => sanitize_key( (string) $route['id'] ),
				'label'                => sanitize_text_field( (string) $route['label'] ),
				'url'                  => esc_url_raw( (string) $route['url'] ),
				'appId'                => ! empty( $route['app_id'] ) ? sanitize_key( (string) $route['app_id'] ) : ( ! empty( $route['appId'] ) ? sanitize_key( (string) $route['appId'] ) : '' ),
				'parent'               => ! empty( $route['parent'] ) ? sanitize_text_field( (string) $route['parent'] ) : '',
				'slug'                 => ! empty( $route['slug'] ) ? sanitize_text_field( (string) $route['slug'] ) : '',
				'cap'                  => ! empty( $route['cap'] ) ? sanitize_text_field( (string) $route['cap'] ) : PufferDesk_App_Normalizer::DEFAULT_CAPABILITY,
				'command'              => PufferDesk_Command_Ids::APP_OPEN_ROUTE,
				'target'               => ! empty( $route['target'] ) ? sanitize_key( (string) $route['target'] ) : '',
				'iframe_compatibility' => PufferDesk_App_Normalizer::normalize_iframe_compatibility( isset( $route['iframe_compatibility'] ) ? $route['iframe_compatibility'] : PufferDesk_App_Normalizer::IFRAME_COMPATIBILITY_EMBED ),
			);
		}

		return $normalized;
	}

	/**
	 * Find the active route for the current page.
	 *
	 * @param array<int,array<string,mixed>> $routes Routes.
	 * @param string                         $submenu_file Current submenu file.
	 * @param string                         $current_url Current URL.
	 * @return array<string,mixed>
	 */
	private function find_active_route( $routes, $submenu_file, $current_url ) {
		$submenu_file = trim( (string) $submenu_file );

		if ( '' !== $submenu_file ) {
			foreach ( $routes as $route ) {
				if ( ! empty( $route['slug'] ) && (string) $route['slug'] === $submenu_file ) {
					return $route;
				}
			}
		}

		foreach ( $routes as $route ) {
			$route_url = isset( $route['url'] ) ? (string) $route['url'] : '';
			if ( $this->admin_urls_match( $route_url, $current_url ) ) {
				return $route;
			}
		}

		return array();
	}

	/**
	 * Find the raw WordPress submenu item for the active page.
	 *
	 * @param string              $parent_file Parent file.
	 * @param string              $submenu_file Submenu file.
	 * @param string              $current_url Current URL.
	 * @param array<string,mixed> $active_route Active route.
	 * @return array<int,mixed>
	 */
	private function find_submenu_item( $parent_file, $submenu_file, $current_url, $active_route ) {
		$items        = $this->get_submenu_items( $parent_file );
		$submenu_file = trim( (string) $submenu_file );
		$route_slug   = ! empty( $active_route['slug'] ) ? (string) $active_route['slug'] : '';

		foreach ( $items as $item ) {
			if ( ! is_array( $item ) || empty( $item[2] ) ) {
				continue;
			}

			$slug = (string) $item[2];
			if ( '' !== $submenu_file && $slug === $submenu_file ) {
				return $item;
			}

			if ( '' !== $route_slug && $slug === $route_slug ) {
				return $item;
			}

			if ( $this->admin_urls_match( $this->get_admin_menu_url( $slug ), $current_url ) ) {
				return $item;
			}
		}

		return array();
	}

	/**
	 * Get WordPress submenu items for a parent.
	 *
	 * @param string $parent_file Parent file.
	 * @return array<int,array<int,mixed>>
	 */
	private function get_submenu_items( $parent_file ) {
		global $submenu, $_wp_real_parent_file;

		$parent_file = trim( (string) $parent_file );
		$submenu_items = is_array( $submenu ) ? $submenu : array();
		$parents       = '' !== $parent_file ? array( $parent_file ) : array();

		if ( is_array( $_wp_real_parent_file ) && isset( $_wp_real_parent_file[ $parent_file ] ) ) {
			$parents[] = (string) $_wp_real_parent_file[ $parent_file ];
		}

		foreach ( array_unique( array_filter( $parents ) ) as $parent ) {
			if ( isset( $submenu_items[ $parent ] ) && is_array( $submenu_items[ $parent ] ) ) {
				return $submenu_items[ $parent ];
			}
		}

		return array();
	}

	/**
	 * Resolve the submenu label.
	 *
	 * @param array<int,mixed>    $submenu_item Submenu item.
	 * @param array<string,mixed> $active_route Active route.
	 * @return string
	 */
	private function get_submenu_label( $submenu_item, $active_route ) {
		if ( ! empty( $submenu_item[0] ) ) {
			return $this->get_admin_menu_label( (string) $submenu_item[0] );
		}

		return ! empty( $active_route['label'] ) ? sanitize_text_field( (string) $active_route['label'] ) : '';
	}

	/**
	 * Compare admin URLs for context matching.
	 *
	 * Route URL query values must be present in the current URL. Identity-changing
	 * query vars on the current URL prevent a broad parent route from matching.
	 *
	 * @param string $route_url Route URL.
	 * @param string $current_url Current URL.
	 * @return bool
	 */
	private function admin_urls_match( $route_url, $current_url ) {
		$route   = $this->parse_admin_url( $route_url );
		$current = $this->parse_admin_url( $current_url );

		if ( empty( $route ) || empty( $current ) || $route['path'] !== $current['path'] ) {
			return false;
		}

		foreach ( array( 'page', 'post_type', 'taxonomy' ) as $identity_key ) {
			if ( isset( $current['query'][ $identity_key ] ) && ! isset( $route['query'][ $identity_key ] ) ) {
				return false;
			}
		}

		foreach ( $route['query'] as $key => $value ) {
			if ( ! array_key_exists( $key, $current['query'] ) || (string) $current['query'][ $key ] !== (string) $value ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Parse an admin URL for path/query comparison.
	 *
	 * @param string $url URL.
	 * @return array{path:string,query:array<string,mixed>}|array<string,mixed>
	 */
	private function parse_admin_url( $url ) {
		$url = esc_url_raw( (string) $url );
		if ( '' === $url ) {
			return array();
		}

		$url   = remove_query_arg( PufferDesk_Router::QUERY_IFRAME, $url );
		$parts = wp_parse_url( $url );
		if ( empty( $parts['path'] ) ) {
			return array();
		}

		$query = array();
		if ( ! empty( $parts['query'] ) ) {
			wp_parse_str( $parts['query'], $query );
			unset( $query[ PufferDesk_Router::QUERY_IFRAME ] );
			$query = array_filter(
				$query,
				static function ( $value ) {
					return is_scalar( $value ) && '' !== (string) $value;
				}
			);
		}

		return array(
			'path'  => untrailingslashit( (string) $parts['path'] ),
			'query' => $query,
		);
	}

	/**
	 * Get the current admin URL without the iframe query marker.
	 *
	 * @return string
	 */
	private function get_current_admin_url() {
		$request_uri = isset( $_SERVER['REQUEST_URI'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';
		$request_uri = is_string( $request_uri ) ? $request_uri : '';
		$request_uri = '' !== $request_uri ? remove_query_arg( PufferDesk_Router::QUERY_IFRAME, $request_uri ) : '';

		if ( '' === $request_uri ) {
			global $pagenow;
			$request_uri = '/wp-admin/' . ( isset( $pagenow ) ? (string) $pagenow : 'index.php' );
		}

		$admin_parts = wp_parse_url( admin_url() );
		$scheme      = ! empty( $admin_parts['scheme'] ) ? $admin_parts['scheme'] : ( is_ssl() ? 'https' : 'http' );
		$host        = ! empty( $admin_parts['host'] ) ? $admin_parts['host'] : '';
		$port        = ! empty( $admin_parts['port'] ) ? ':' . (int) $admin_parts['port'] : '';

		if ( '' === $host ) {
			return esc_url_raw( $request_uri );
		}

		return esc_url_raw( $scheme . '://' . $host . $port . $request_uri );
	}

	/**
	 * Get the current WordPress admin page title.
	 *
	 * @return string
	 */
	private function get_page_title() {
		global $title;

		$page_title = isset( $title ) ? (string) $title : '';
		if ( '' === $page_title && function_exists( 'get_admin_page_title' ) ) {
			$page_title = (string) get_admin_page_title();
		}

		$page_title = html_entity_decode( wp_strip_all_tags( $page_title ), ENT_QUOTES, get_bloginfo( 'charset' ) );

		return sanitize_text_field( trim( $page_title ) );
	}

	/**
	 * Get a WordPress admin URL for a menu slug.
	 *
	 * @param string $slug Menu slug.
	 * @return string
	 */
	private function get_admin_menu_url( $slug ) {
		$slug = (string) $slug;
		if ( preg_match( '#^https?://#i', $slug ) ) {
			return esc_url_raw( $slug );
		}

		if ( false !== strpos( $slug, '.php' ) ) {
			return admin_url( $slug );
		}

		return admin_url( 'admin.php?page=' . rawurlencode( $slug ) );
	}

	/**
	 * Normalize a WordPress admin menu label.
	 *
	 * @param string $label Raw label.
	 * @return string
	 */
	private function get_admin_menu_label( $label ) {
		$label = preg_replace_callback(
			'#<span\b([^>]*)>(.*?)</span>#is',
			static function ( $matches ) {
				$attrs = isset( $matches[1] ) ? (string) $matches[1] : '';
				if ( preg_match( '/\bclass\s*=\s*([\'"])(.*?)\1/is', $attrs, $class_match ) ) {
					$classes = preg_split( '/\s+/', strtolower( (string) $class_match[2] ) );
					$classes = is_array( $classes ) ? array_filter( $classes ) : array();
					foreach ( $classes as $class ) {
						if (
							in_array( $class, array( 'awaiting-mod', 'menu-counter', 'plugin-count', 'screen-reader-text', 'update-count', 'update-plugins' ), true ) ||
							preg_match( '/^count-\d+$/', $class )
						) {
							return '';
						}
					}
				}

				return isset( $matches[2] ) ? (string) $matches[2] : '';
			},
			(string) $label
		);
		$label = html_entity_decode( wp_strip_all_tags( (string) $label ), ENT_QUOTES, get_bloginfo( 'charset' ) );

		return sanitize_text_field( trim( $label ) );
	}
}
