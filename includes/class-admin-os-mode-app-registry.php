<?php
/**
 * Admin app registry.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * Builds the app and folder data consumed by the shell.
 */
final class Admin_OS_Mode_App_Registry {
	/**
	 * App registry for the first shell.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	public function get_apps() {
		$apps = array(
			array(
				'id'    => 'dashboard',
				'label' => __( 'Dashboard', 'admin-os-mode' ),
				'url'   => admin_url( 'index.php?admin_os_classic=1' ),
				'icon'  => 'dashicons-dashboard',
				'group' => 'content',
				'cap'   => 'read',
			),
			array(
				'id'    => 'posts',
				'label' => __( 'Posts', 'admin-os-mode' ),
				'url'   => admin_url( 'edit.php' ),
				'icon'  => 'dashicons-admin-post',
				'group' => 'content',
				'cap'   => 'edit_posts',
			),
			array(
				'id'    => 'pages',
				'label' => __( 'Pages', 'admin-os-mode' ),
				'url'   => admin_url( 'edit.php?post_type=page' ),
				'icon'  => 'dashicons-admin-page',
				'group' => 'content',
				'cap'   => 'edit_pages',
			),
			array(
				'id'    => 'media',
				'label' => __( 'Media', 'admin-os-mode' ),
				'url'   => admin_url( 'upload.php' ),
				'icon'  => 'dashicons-admin-media',
				'group' => 'content',
				'cap'   => 'upload_files',
			),
			array(
				'id'    => 'comments',
				'label' => __( 'Comments', 'admin-os-mode' ),
				'url'   => admin_url( 'edit-comments.php' ),
				'icon'  => 'dashicons-admin-comments',
				'group' => 'content',
				'cap'   => 'edit_posts',
			),
			array(
				'id'    => 'appearance',
				'label' => __( 'Appearance', 'admin-os-mode' ),
				'url'   => admin_url( 'themes.php' ),
				'icon'  => 'dashicons-admin-appearance',
				'group' => 'site',
				'cap'   => 'switch_themes',
			),
			array(
				'id'    => 'plugins',
				'label' => __( 'Plugins', 'admin-os-mode' ),
				'url'   => admin_url( 'plugins.php' ),
				'icon'  => 'dashicons-admin-plugins',
				'group' => 'system',
				'cap'   => 'activate_plugins',
			),
			array(
				'id'    => 'users',
				'label' => __( 'Users', 'admin-os-mode' ),
				'url'   => admin_url( 'users.php' ),
				'icon'  => 'dashicons-admin-users',
				'group' => 'system',
				'cap'   => 'list_users',
			),
			array(
				'id'     => 'os-settings',
				'label'  => __( 'OS Settings', 'admin-os-mode' ),
				'icon'   => 'dashicons-admin-customizer',
				'group'  => 'system',
				'cap'    => 'read',
				'kind'   => 'native',
				'native' => 'settings',
			),
			array(
				'id'    => 'settings',
				'label' => __( 'Settings', 'admin-os-mode' ),
				'url'   => admin_url( 'options-general.php' ),
				'icon'  => 'dashicons-admin-settings',
				'group' => 'system',
				'cap'   => 'manage_options',
			),
			array(
				'id'    => 'tools',
				'label' => __( 'Tools', 'admin-os-mode' ),
				'url'   => admin_url( 'tools.php' ),
				'icon'  => 'dashicons-admin-tools',
				'group' => 'system',
				'cap'   => 'manage_options',
			),
			array(
				'id'    => 'site-health',
				'label' => __( 'Site Health', 'admin-os-mode' ),
				'url'   => admin_url( 'site-health.php' ),
				'icon'  => 'dashicons-heart',
				'group' => 'system',
				'cap'   => 'view_site_health_checks',
			),
		);

		if ( class_exists( 'WooCommerce' ) || current_user_can( 'manage_woocommerce' ) ) {
			$apps[] = array(
				'id'    => 'woocommerce',
				'label' => __( 'WooCommerce', 'admin-os-mode' ),
				'url'   => admin_url( 'admin.php?page=wc-admin' ),
				'icon'  => 'dashicons-cart',
				'group' => 'site',
				'cap'   => 'manage_woocommerce',
			);
		}

		$apps = array_values(
			array_filter(
				$apps,
				static function ( $app ) {
					return current_user_can( $app['cap'] );
				}
			)
		);

		/**
		 * Filter the shell app registry.
		 *
		 * Each app accepts id, label, url, icon, group, cap, kind, and native.
		 * Icons may be a legacy Dashicon string or a descriptor:
		 * array( 'type' => 'dashicon', 'value' => 'dashicons-admin-post' )
		 * array( 'type' => 'image', 'src' => 'themes/modern/current/icons/post.svg' )
		 *
		 * @param array<int,array<string,mixed>> $apps Registered apps.
		 */
		$apps = apply_filters( 'admin_os_mode_apps', $apps );

		return $this->normalize_apps( $apps );
	}

	/**
	 * Folder registry derived from visible apps.
	 *
	 * @param array<int,array<string,mixed>> $apps Visible apps.
	 * @return array<int,array<string,mixed>>
	 */
	public function get_folders( $apps ) {
		$counts = array();
		foreach ( $apps as $app ) {
			$group            = isset( $app['group'] ) ? $app['group'] : 'system';
			$counts[ $group ] = isset( $counts[ $group ] ) ? $counts[ $group ] + 1 : 1;
		}

		$folders = array(
			array(
				'id'    => 'content',
				'label' => __( 'Content', 'admin-os-mode' ),
				'icon'  => 'dashicons-category',
			),
			array(
				'id'    => 'site',
				'label' => __( 'Site', 'admin-os-mode' ),
				'icon'  => 'dashicons-admin-site-alt3',
			),
			array(
				'id'    => 'system',
				'label' => __( 'System', 'admin-os-mode' ),
				'icon'  => 'dashicons-admin-generic',
			),
		);

		$folders = array_values(
			array_filter(
				$folders,
				static function ( $folder ) use ( $counts ) {
					return ! empty( $counts[ $folder['id'] ] );
				}
			)
		);

		foreach ( $folders as $index => $folder ) {
			$folders[ $index ]['icon'] = Admin_OS_Mode_Icon_Renderer::normalize( $folder['icon'] );
		}

		return $folders;
	}

	/**
	 * Normalize and permission-check app data.
	 *
	 * @param mixed $apps Raw app data.
	 * @return array<int,array<string,mixed>>
	 */
	private function normalize_apps( $apps ) {
		$normalized = array();

		if ( ! is_array( $apps ) ) {
			return $normalized;
		}

		foreach ( $apps as $app ) {
			if ( ! is_array( $app ) || empty( $app['id'] ) || empty( $app['label'] ) ) {
				continue;
			}

			if ( ! empty( $app['cap'] ) && ! current_user_can( $app['cap'] ) ) {
				continue;
			}

			$icon  = isset( $app['icon'] ) ? Admin_OS_Mode_Icon_Renderer::normalize( $app['icon'] ) : Admin_OS_Mode_Icon_Renderer::normalize( 'dashicons-admin-generic' );
			$group = isset( $app['group'] ) ? sanitize_key( $app['group'] ) : 'system';
			$kind  = isset( $app['kind'] ) ? sanitize_key( $app['kind'] ) : 'iframe';
			if ( ! in_array( $group, array( 'content', 'site', 'system' ), true ) ) {
				$group = 'system';
			}
			if ( ! in_array( $kind, array( 'iframe', 'native' ), true ) ) {
				$kind = 'iframe';
			}

			$url    = isset( $app['url'] ) ? esc_url_raw( $app['url'] ) : '';
			$native = isset( $app['native'] ) ? sanitize_key( $app['native'] ) : '';

			if ( 'iframe' === $kind && '' === $url ) {
				continue;
			}

			if ( 'native' === $kind && '' === $native ) {
				continue;
			}

			$normalized[] = array(
				'id'     => sanitize_key( $app['id'] ),
				'label'  => sanitize_text_field( $app['label'] ),
				'url'    => $url,
				'icon'   => $icon,
				'group'  => $group,
				'kind'   => $kind,
				'native' => $native,
			);
		}

		return $normalized;
	}
}
