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
				'icon'  => $this->theme_icon( 'dashboard.svg', 'dashicons-dashboard' ),
				'group' => 'content',
				'cap'   => 'read',
			),
			array(
				'id'    => 'posts',
				'label' => __( 'Posts', 'admin-os-mode' ),
				'url'   => admin_url( 'edit.php' ),
				'icon'  => $this->theme_icon( 'posts.svg', 'dashicons-admin-post' ),
				'group' => 'content',
				'cap'   => 'edit_posts',
			),
			array(
				'id'    => 'pages',
				'label' => __( 'Pages', 'admin-os-mode' ),
				'url'   => admin_url( 'edit.php?post_type=page' ),
				'icon'  => $this->theme_icon( 'pages.svg', 'dashicons-admin-page' ),
				'group' => 'content',
				'cap'   => 'edit_pages',
			),
			array(
				'id'    => 'media',
				'label' => __( 'Media', 'admin-os-mode' ),
				'url'   => admin_url( 'upload.php' ),
				'icon'  => $this->theme_icon( 'media.svg', 'dashicons-admin-media' ),
				'group' => 'content',
				'cap'   => 'upload_files',
			),
			array(
				'id'    => 'comments',
				'label' => __( 'Comments', 'admin-os-mode' ),
				'url'   => admin_url( 'edit-comments.php' ),
				'icon'  => $this->theme_icon( 'comments.svg', 'dashicons-admin-comments' ),
				'group' => 'content',
				'cap'   => 'edit_posts',
			),
			array(
				'id'    => 'appearance',
				'label' => __( 'Appearance', 'admin-os-mode' ),
				'url'   => admin_url( 'themes.php' ),
				'icon'  => $this->theme_icon( 'appearance.svg', 'dashicons-admin-appearance' ),
				'group' => 'site',
				'cap'   => 'switch_themes',
			),
			array(
				'id'    => 'plugins',
				'label' => __( 'Plugins', 'admin-os-mode' ),
				'url'   => admin_url( 'plugins.php' ),
				'icon'  => $this->theme_icon( 'plugins.svg', 'dashicons-admin-plugins' ),
				'group' => 'system',
				'cap'   => 'activate_plugins',
			),
			array(
				'id'    => 'users',
				'label' => __( 'Users', 'admin-os-mode' ),
				'url'   => admin_url( 'users.php' ),
				'icon'  => $this->theme_icon( 'users.svg', 'dashicons-admin-users' ),
				'group' => 'system',
				'cap'   => 'list_users',
			),
			array(
				'id'     => 'os-settings',
				'label'  => __( 'System Settings', 'admin-os-mode' ),
				'icon'   => $this->theme_icon( 'os-settings.svg', 'dashicons-admin-customizer' ),
				'group'  => 'system',
				'cap'    => 'read',
				'kind'   => 'native',
				'native' => 'settings',
				'menu'   => $this->get_os_settings_menu(),
			),
			array(
				'id'    => 'settings',
				'label' => __( 'Settings', 'admin-os-mode' ),
				'url'   => admin_url( 'options-general.php' ),
				'icon'  => $this->theme_icon( 'settings.svg', 'dashicons-admin-settings' ),
				'group' => 'system',
				'cap'   => 'manage_options',
			),
			array(
				'id'    => 'tools',
				'label' => __( 'Tools', 'admin-os-mode' ),
				'url'   => admin_url( 'tools.php' ),
				'icon'  => $this->theme_icon( 'tools.svg', 'dashicons-admin-tools' ),
				'group' => 'system',
				'cap'   => 'manage_options',
			),
			array(
				'id'    => 'site-health',
				'label' => __( 'Site Health', 'admin-os-mode' ),
				'url'   => admin_url( 'site-health.php' ),
				'icon'  => $this->theme_icon( 'site-health.svg', 'dashicons-heart' ),
				'group' => 'system',
				'cap'   => 'view_site_health_checks',
			),
		);

		if ( class_exists( 'WooCommerce' ) || current_user_can( 'manage_woocommerce' ) ) {
			$apps[] = array(
				'id'    => 'woocommerce',
				'label' => __( 'WooCommerce', 'admin-os-mode' ),
				'url'   => admin_url( 'admin.php?page=wc-admin' ),
				'icon'  => $this->theme_icon( 'woocommerce.svg', 'dashicons-cart' ),
				'group' => 'site',
				'cap'   => 'manage_woocommerce',
			);
		}

		$apps = $this->merge_admin_menu_apps( $apps );

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
		 * Each app accepts id, label, url, icon, group, cap, kind, native, and menu.
		 * Icons may be a Dashicon string or a descriptor:
		 * array( 'type' => 'dashicon', 'value' => 'dashicons-admin-post' )
		 * array( 'type' => 'image', 'src' => 'themes/adminos/default/icons/posts.svg' )
		 * array( 'type' => 'theme', 'name' => 'posts.svg', 'fallback' => 'dashicons-admin-post' )
		 * About windows may define about name, version, copyright, rights, and icon.
		 * Menus use array( 'groups' => array( ... ) ) with command-backed items.
		 *
		 * @param array<int,array<string,mixed>> $apps Registered apps.
		 */
		$apps = apply_filters( 'admin_os_mode_apps', $apps );

		return $this->normalize_apps( $apps );
	}

	/**
	 * Merge visible WordPress top-level admin menu items into the app registry.
	 *
	 * Curated built-in apps are retained as overrides while the final order follows
	 * the WordPress admin menu where possible.
	 *
	 * @param array<int,array<string,mixed>> $apps Curated apps.
	 * @return array<int,array<string,mixed>>
	 */
	private function merge_admin_menu_apps( $apps ) {
		$menu_items = $this->get_admin_menu_items();

		if ( empty( $menu_items ) ) {
			return $apps;
		}

		$by_id  = array();
		$by_url = array();
		foreach ( $apps as $index => $app ) {
			if ( ! is_array( $app ) ) {
				continue;
			}

			if ( ! empty( $app['id'] ) ) {
				$by_id[ sanitize_key( (string) $app['id'] ) ] = $index;
			}
			if ( ! empty( $app['url'] ) ) {
				$by_url[ $this->get_url_key( (string) $app['url'] ) ] = $index;
			}
		}

		$ordered = array();
		$used    = array();

		foreach ( $menu_items as $item ) {
			if ( ! is_array( $item ) || empty( $item[2] ) ) {
				continue;
			}

			$slug = (string) $item[2];
			if ( $this->is_skipped_admin_menu_item( $slug, $item ) ) {
				continue;
			}

			$cap = isset( $item[1] ) ? (string) $item[1] : 'read';
			if ( '' !== $cap && ! current_user_can( $cap ) ) {
				continue;
			}

			$menu_title = isset( $item[0] ) ? (string) $item[0] : '';
			$id         = $this->get_admin_menu_app_id( $slug );
			$url        = $this->get_admin_menu_url( $slug );
			$label      = $this->get_admin_menu_label( $menu_title );
			if ( '' === $id || '' === $url || '' === $label ) {
				continue;
			}

			$url_key = $this->get_url_key( $url );
			$index   = isset( $by_id[ $id ] )
				? $by_id[ $id ]
				: ( isset( $by_url[ $url_key ] ) ? $by_url[ $url_key ] : null );

			if ( null !== $index ) {
				if ( ! isset( $used[ $index ] ) ) {
					$ordered[]      = $apps[ $index ];
					$used[ $index ] = true;
				}
				continue;
			}

			$ordered[] = array(
				'id'     => $id,
				'label'  => $label,
				'url'    => $url,
				'icon'   => $this->get_admin_menu_icon( isset( $item[6] ) ? (string) $item[6] : '', $menu_title ),
				'group'  => 'site',
				'cap'    => $cap ? $cap : 'read',
				'source' => 'wp-menu',
			);
		}

		foreach ( $apps as $index => $app ) {
			if ( ! isset( $used[ $index ] ) ) {
				$ordered[] = $app;
			}
		}

		return $ordered;
	}

	/**
	 * Get WordPress admin menu items, building an AJAX-safe snapshot when needed.
	 *
	 * WordPress does not normally populate the top-level $menu array during
	 * admin-ajax.php requests, but the settings save endpoint still needs the same
	 * plugin-derived app IDs that the shell rendered on the full admin page.
	 *
	 * @return array<int,array<int,mixed>>
	 */
	private function get_admin_menu_items() {
		global $menu, $submenu, $_wp_menu_nopriv, $_wp_submenu_nopriv, $_registered_pages, $_parent_pages, $_wp_real_parent_file;

		if ( is_array( $menu ) && ! empty( $menu ) ) {
			return $menu;
		}

		if ( ! is_admin() || did_action( 'admin_menu' ) ) {
			return is_array( $menu ) ? $menu : array();
		}

		if ( ! function_exists( 'add_menu_page' ) && file_exists( ABSPATH . 'wp-admin/includes/plugin.php' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		if ( ! function_exists( 'add_menu_page' ) ) {
			return array();
		}

		$menu                 = is_array( $menu ) ? $menu : array();
		$submenu              = is_array( $submenu ) ? $submenu : array();
		$_wp_menu_nopriv     = is_array( $_wp_menu_nopriv ) ? $_wp_menu_nopriv : array();
		$_wp_submenu_nopriv  = is_array( $_wp_submenu_nopriv ) ? $_wp_submenu_nopriv : array();
		$_registered_pages   = is_array( $_registered_pages ) ? $_registered_pages : array();
		$_parent_pages       = is_array( $_parent_pages ) ? $_parent_pages : array();
		$_wp_real_parent_file = is_array( $_wp_real_parent_file ) ? $_wp_real_parent_file : array();

		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- WordPress core hook used to build an admin menu snapshot for AJAX saves.
		do_action( 'admin_menu', '' );

		return is_array( $menu ) ? $menu : array();
	}

	/**
	 * Whether a WordPress admin menu item should not become an Admin OS app.
	 *
	 * @param string             $slug Menu slug.
	 * @param array<int,mixed>   $item Raw menu item.
	 * @return bool
	 */
	private function is_skipped_admin_menu_item( $slug, $item ) {
		if ( Admin_OS_Mode_Router::PAGE_SLUG === $slug ) {
			return true;
		}

		if ( false !== strpos( $slug, 'separator' ) ) {
			return true;
		}

		$classes = isset( $item[4] ) ? (string) $item[4] : '';

		return false !== strpos( $classes, 'wp-menu-separator' );
	}

	/**
	 * Build a stable app ID for a WordPress admin menu slug.
	 *
	 * @param string $slug Menu slug.
	 * @return string
	 */
	private function get_admin_menu_app_id( $slug ) {
		$core_ids = array(
			'edit-comments.php'           => 'comments',
			'edit.php'                    => 'posts',
			'edit.php?post_type=page'     => 'pages',
			'index.php'                   => 'dashboard',
			'options-general.php'         => 'settings',
			'plugins.php'                 => 'plugins',
			'themes.php'                  => 'appearance',
			'tools.php'                   => 'tools',
			'upload.php'                  => 'media',
			'users.php'                   => 'users',
			'admin.php?page=wc-admin'     => 'woocommerce',
		);

		if ( isset( $core_ids[ $slug ] ) ) {
			return $core_ids[ $slug ];
		}

		$id = preg_replace( '/[^a-z0-9]+/', '-', strtolower( $slug ) );
		$id = is_string( $id ) ? trim( $id, '-' ) : '';

		return $id ? 'wp-admin-' . sanitize_key( $id ) : '';
	}

	/**
	 * Get a WordPress admin URL for a menu slug.
	 *
	 * @param string $slug Menu slug.
	 * @return string
	 */
	private function get_admin_menu_url( $slug ) {
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
	 * @param string $label Raw menu title.
	 * @return string
	 */
	private function get_admin_menu_label( $label ) {
		$label = preg_replace( '#<span[^>]*>.*?</span>#is', '', $label );
		$label = wp_strip_all_tags( is_string( $label ) ? $label : '' );

		return sanitize_text_field( trim( $label ) );
	}

	/**
	 * Normalize a WordPress admin menu icon.
	 *
	 * @param string $icon       Raw menu icon.
	 * @param string $menu_title Raw menu title.
	 * @return string|array<string,string>
	 */
	private function get_admin_menu_icon( $icon, $menu_title = '' ) {
		$icon = trim( $icon );
		if ( '' === $icon || 'none' === $icon ) {
			$title_icon = $this->get_admin_menu_title_icon( $menu_title );

			return $title_icon ? $title_icon : 'dashicons-admin-generic';
		}

		if ( 'dashicons-admin-generic' === $icon ) {
			$title_icon = $this->get_admin_menu_title_icon( $menu_title );

			return $title_icon ? $title_icon : $icon;
		}

		if ( 0 === strpos( $icon, 'dashicons-' ) ) {
			return $icon;
		}

		$url = $this->get_admin_menu_image_url( $icon );

		return $url ? array(
			'type' => 'image',
			'url'  => $url,
		) : 'dashicons-admin-generic';
	}

	/**
	 * Extract an image icon from plugin menu title HTML.
	 *
	 * Some plugins embed an image inside the menu title instead of using
	 * add_menu_page()'s icon argument to avoid WordPress SVG color filtering.
	 *
	 * @param string $menu_title Raw menu title.
	 * @return array<string,string>|null
	 */
	private function get_admin_menu_title_icon( $menu_title ) {
		if ( '' === $menu_title || false === stripos( $menu_title, '<img' ) ) {
			return null;
		}

		if ( ! preg_match( '#<img[^>]+src=[\'"]([^\'"]+)[\'"][^>]*>#i', $menu_title, $matches ) ) {
			return null;
		}

		$url = $this->get_admin_menu_image_url( html_entity_decode( $matches[1], ENT_QUOTES ) );
		if ( '' === $url ) {
			return null;
		}

		return array(
			'type' => 'image',
			'url'  => $url,
		);
	}

	/**
	 * Normalize an image URL found in WordPress admin menu metadata.
	 *
	 * @param string $url Raw image URL.
	 * @return string
	 */
	private function get_admin_menu_image_url( $url ) {
		$url = trim( html_entity_decode( (string) $url, ENT_QUOTES ) );
		if ( $this->is_admin_menu_data_image_url( $url ) ) {
			return $url;
		}

		return esc_url_raw( $url );
	}

	/**
	 * Check whether a data URI is a narrow image-only admin menu icon.
	 *
	 * @param string $url Raw image URL.
	 * @return bool
	 */
	private function is_admin_menu_data_image_url( $url ) {
		return (bool) preg_match( '#^data:image/(?:png|gif|jpe?g|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$#', $url );
	}

	/**
	 * Normalize URL values for registry matching.
	 *
	 * @param string $url URL.
	 * @return string
	 */
	private function get_url_key( $url ) {
		return untrailingslashit( esc_url_raw( $url ) );
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
				'icon'  => $this->theme_icon( 'folder-content.svg', 'dashicons-category' ),
			),
			array(
				'id'    => 'site',
				'label' => __( 'Site', 'admin-os-mode' ),
				'icon'  => $this->theme_icon( 'folder-site.svg', 'dashicons-admin-site-alt3' ),
			),
			array(
				'id'    => 'system',
				'label' => __( 'System', 'admin-os-mode' ),
				'icon'  => $this->theme_icon( 'folder-system.svg', 'dashicons-admin-generic' ),
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

			$label = sanitize_text_field( $app['label'] );
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
				'label'  => $label,
				'url'    => $url,
				'icon'   => $icon,
				'about'  => $this->normalize_about( isset( $app['about'] ) ? $app['about'] : array(), $label, $icon ),
				'group'  => $group,
				'kind'   => $kind,
				'native' => $native,
				'menu'   => $this->normalize_menu_definition( isset( $app['menu'] ) ? $app['menu'] : array(), $label ),
			);
		}

		return $normalized;
	}

	/**
	 * Normalize the menu definition for an app.
	 *
	 * @param mixed  $definition Raw menu definition.
	 * @param string $fallback_label App label used for default app menu.
	 * @return array<string,array<int,array<string,mixed>>>
	 */
	private function normalize_menu_definition( $definition, $fallback_label ) {
		$groups = array();

		if ( is_array( $definition ) ) {
			if ( isset( $definition['groups'] ) && is_array( $definition['groups'] ) ) {
				$groups = $definition['groups'];
			} elseif ( array_values( $definition ) === $definition ) {
				$groups = $definition;
			} else {
				foreach ( $this->get_default_menu_group_ids() as $id ) {
					if ( isset( $definition[ $id ] ) && is_array( $definition[ $id ] ) ) {
						$groups[] = array_merge(
							$definition[ $id ],
							array( 'id' => $id )
						);
					}
				}
			}
		}

		$normalized_groups = $this->normalize_menu_groups( $groups, $fallback_label );

		return array(
			'groups' => $normalized_groups ? $normalized_groups : $this->get_default_app_menu_groups( $fallback_label ),
		);
	}

	/**
	 * Normalize menu groups.
	 *
	 * @param array<int,mixed> $groups Raw menu groups.
	 * @param string           $fallback_label App label used for default app menu.
	 * @return array<int,array<string,mixed>>
	 */
	private function normalize_menu_groups( $groups, $fallback_label ) {
		$normalized = array();

		foreach ( $groups as $index => $group ) {
			if ( is_string( $group ) ) {
				$label = sanitize_text_field( $group );
				if ( '' !== $label ) {
					$normalized[] = array(
						'id'    => $this->get_default_menu_group_id( $index ),
						'label' => $label,
						'items' => array(),
					);
				}
				continue;
			}

			if ( ! is_array( $group ) ) {
				continue;
			}

			$id    = ! empty( $group['id'] ) ? $this->normalize_command_id( $group['id'] ) : $this->get_default_menu_group_id( $index );
			$label = ! empty( $group['label'] ) ? sanitize_text_field( $group['label'] ) : $this->get_default_menu_group_label( $id, $fallback_label );
			if ( '' === $id || '' === $label ) {
				continue;
			}

			$normalized_group = array(
				'id'    => $id,
				'label' => $label,
				'items' => $this->normalize_menu_command_items( isset( $group['items'] ) ? $group['items'] : array() ),
			);

			if ( ! empty( $group['disabled'] ) ) {
				$normalized_group['disabled'] = true;
			}

			if ( ! empty( $group['command'] ) ) {
				$normalized_group['command'] = $this->normalize_command_id( $group['command'] );
			}

			if ( ! empty( $group['icon'] ) ) {
				$normalized_group['icon'] = sanitize_text_field( $group['icon'] );
			}

			if ( ! empty( $group['payload'] ) ) {
				$normalized_group['payload'] = $this->normalize_menu_payload( $group['payload'] );
			}

			if ( ! empty( $group['target'] ) ) {
				$normalized_group['target'] = sanitize_text_field( $group['target'] );
			}

			if ( ! empty( $group['title'] ) ) {
				$normalized_group['title'] = sanitize_text_field( $group['title'] );
			}

			if ( ! empty( $group['url'] ) ) {
				$normalized_group['url'] = esc_url_raw( $group['url'] );
			}

			$normalized[] = $normalized_group;
		}

		return $normalized;
	}

	/**
	 * Normalize command-backed menu items.
	 *
	 * @param mixed $items Raw command items.
	 * @return array<int,array<string,mixed>>
	 */
	private function normalize_menu_command_items( $items ) {
		$normalized = array();

		if ( ! is_array( $items ) ) {
			return $normalized;
		}

		foreach ( $items as $item ) {
			if ( is_string( $item ) ) {
				$label = sanitize_text_field( $item );
				if ( '' !== $label ) {
					$normalized[] = array( 'label' => $label );
				}
				continue;
			}

			if ( ! is_array( $item ) ) {
				continue;
			}

			if ( ! empty( $item['separator'] ) || ( isset( $item['type'] ) && 'separator' === $item['type'] ) ) {
				$normalized[] = array( 'type' => 'separator' );
				continue;
			}

			if ( empty( $item['label'] ) ) {
				continue;
			}

			$menu_item = array(
				'label' => sanitize_text_field( $item['label'] ),
			);

			if ( ! empty( $item['id'] ) ) {
				$menu_item['id'] = $this->normalize_command_id( $item['id'] );
			}

			if ( ! empty( $item['command'] ) ) {
				$menu_item['command'] = $this->normalize_command_id( $item['command'] );
			}

			if ( ! empty( $item['icon'] ) ) {
				$menu_item['icon'] = sanitize_text_field( $item['icon'] );
			}

			if ( ! empty( $item['payload'] ) ) {
				$menu_item['payload'] = $this->normalize_menu_payload( $item['payload'] );
			}

			if ( ! empty( $item['shortcut'] ) ) {
				$shortcut = $this->normalize_menu_shortcut( $item['shortcut'] );
				if ( ! empty( $shortcut ) ) {
					$menu_item['shortcut'] = $shortcut;
				}
			}

			if ( ! empty( $item['target'] ) ) {
				$menu_item['target'] = sanitize_text_field( $item['target'] );
			}

			if ( ! empty( $item['title'] ) ) {
				$menu_item['title'] = sanitize_text_field( $item['title'] );
			}

			if ( ! empty( $item['url'] ) ) {
				$menu_item['url'] = esc_url_raw( $item['url'] );
			}

			if ( ! empty( $item['disabled'] ) ) {
				$menu_item['disabled'] = true;
			}

			if ( '' !== $menu_item['label'] ) {
				$normalized[] = $menu_item;
			}
		}

		return $normalized;
	}

	/**
	 * System Settings app menu definition.
	 *
	 * @return array<string,array<int,array<string,mixed>>>
	 */
	private function get_os_settings_menu() {
		return array(
			'groups' => array(
				array(
					'id'    => 'app',
					'label' => __( 'System Settings', 'admin-os-mode' ),
					'items' => array(
						array(
							'label'   => __( 'About System Settings', 'admin-os-mode' ),
							'command' => 'open-about',
							'target'  => 'os-settings',
						),
						array( 'type' => 'separator' ),
						array(
							'label'    => __( 'Hide System Settings', 'admin-os-mode' ),
							'command'  => 'window.hide',
							'icon'     => 'dashicons-hidden',
							'shortcut' => '⌘H',
						),
						array(
							'label'    => __( 'Hide Others', 'admin-os-mode' ),
							'command'  => 'window.hide-others',
							'icon'     => 'dashicons-excerpt-view',
							'shortcut' => '⌥⌘H',
						),
						array(
							'label'   => __( 'Show All', 'admin-os-mode' ),
							'command' => 'window.show-all',
							'icon'    => 'dashicons-visibility',
						),
						array( 'type' => 'separator' ),
						array(
							'label'    => __( 'Quit System Settings', 'admin-os-mode' ),
							'command'  => 'window.close',
							'icon'     => 'dashicons-dismiss',
							'shortcut' => '⌘Q',
						),
					),
				),
				array(
					'id'    => 'edit',
					'label' => __( 'Edit', 'admin-os-mode' ),
					'items' => array(),
				),
				array(
					'id'    => 'view',
					'label' => __( 'View', 'admin-os-mode' ),
					'items' => array(),
				),
				array(
					'id'    => 'window',
					'label' => __( 'Window', 'admin-os-mode' ),
					'items' => array(),
				),
				array(
					'id'    => 'help',
					'label' => __( 'Help', 'admin-os-mode' ),
					'items' => array(),
				),
			),
		);
	}

	/**
	 * Normalize command payload data.
	 *
	 * @param mixed $payload Raw payload data.
	 * @return array<string,mixed>
	 */
	private function normalize_menu_payload( $payload ) {
		$normalized = array();

		if ( ! is_array( $payload ) ) {
			return $normalized;
		}

		foreach ( $payload as $key => $value ) {
			$key = sanitize_key( $key );
			if ( '' === $key ) {
				continue;
			}

			if ( is_array( $value ) ) {
				$normalized[ $key ] = $this->normalize_menu_payload( $value );
			} elseif ( is_bool( $value ) || is_int( $value ) || is_float( $value ) ) {
				$normalized[ $key ] = $value;
			} elseif ( is_scalar( $value ) ) {
				$normalized[ $key ] = sanitize_text_field( (string) $value );
			}
		}

		return $normalized;
	}

	/**
	 * Normalize a keyboard shortcut descriptor.
	 *
	 * Shortcuts may be plain display strings like "⌘W" or structured arrays
	 * with key/modifiers for future platform-specific expansion.
	 *
	 * @param mixed $shortcut Raw shortcut descriptor.
	 * @return string|array<string,mixed>
	 */
	private function normalize_menu_shortcut( $shortcut ) {
		if ( is_string( $shortcut ) ) {
			return sanitize_text_field( $shortcut );
		}

		if ( ! is_array( $shortcut ) ) {
			return '';
		}

		$normalized = array();

		if ( ! empty( $shortcut['label'] ) && is_string( $shortcut['label'] ) ) {
			$normalized['label'] = sanitize_text_field( $shortcut['label'] );
		}

		if ( ! empty( $shortcut['key'] ) && is_string( $shortcut['key'] ) ) {
			$normalized['key'] = sanitize_text_field( $shortcut['key'] );
		}

		if ( ! empty( $shortcut['keyLabel'] ) && is_string( $shortcut['keyLabel'] ) ) {
			$normalized['keyLabel'] = sanitize_text_field( $shortcut['keyLabel'] );
		}

		if ( ! empty( $shortcut['modifiers'] ) && is_array( $shortcut['modifiers'] ) ) {
			$allowed_modifiers = array( 'alt', 'ctrl', 'meta', 'shift' );
			$modifiers         = array();

			foreach ( $shortcut['modifiers'] as $modifier ) {
				$modifier = sanitize_key( (string) $modifier );
				if ( in_array( $modifier, $allowed_modifiers, true ) && ! in_array( $modifier, $modifiers, true ) ) {
					$modifiers[] = $modifier;
				}
			}

			if ( ! empty( $modifiers ) ) {
				$normalized['modifiers'] = $modifiers;
			}
		}

		if ( ! empty( $shortcut['allowInTextFields'] ) ) {
			$normalized['allowInTextFields'] = true;
		}

		if ( isset( $shortcut['preventDefault'] ) && false === (bool) $shortcut['preventDefault'] ) {
			$normalized['preventDefault'] = false;
		}

		return empty( $normalized['label'] ) && empty( $normalized['key'] ) ? '' : $normalized;
	}

	/**
	 * Default app menu groups.
	 *
	 * @param string $app_label Active app label.
	 * @return array<int,array<string,mixed>>
	 */
	private function get_default_app_menu_groups( $app_label ) {
		return array(
			array(
				'id'    => 'app',
				'label' => $app_label,
				'items' => array(
					array(
						'label'   => sprintf(
							/* translators: %s: app label. */
							__( 'About %s', 'admin-os-mode' ),
							$app_label
						),
						'command' => 'open-about',
					),
					array( 'type' => 'separator' ),
					array(
						'label'    => sprintf(
							/* translators: %s: app label. */
							__( 'Hide %s', 'admin-os-mode' ),
							$app_label
						),
						'command'  => 'window.hide',
						'shortcut' => '⌘H',
					),
					array(
						'label'    => __( 'Hide Others', 'admin-os-mode' ),
						'command'  => 'window.hide-others',
						'shortcut' => '⌥⌘H',
					),
					array(
						'label'   => __( 'Show All', 'admin-os-mode' ),
						'command' => 'window.show-all',
					),
					array( 'type' => 'separator' ),
					array(
						'label'    => sprintf(
							/* translators: %s: app label. */
							__( 'Quit %s', 'admin-os-mode' ),
							$app_label
						),
						'command'  => 'window.close',
						'shortcut' => '⌘Q',
					),
				),
			),
			array(
				'id'    => 'file',
				'label' => __( 'File', 'admin-os-mode' ),
				'items' => array(),
			),
			array(
				'id'    => 'edit',
				'label' => __( 'Edit', 'admin-os-mode' ),
				'items' => array(),
			),
			array(
				'id'    => 'view',
				'label' => __( 'View', 'admin-os-mode' ),
				'items' => array(),
			),
			array(
				'id'    => 'window',
				'label' => __( 'Window', 'admin-os-mode' ),
				'items' => array(
					array(
						'label'    => __( 'Minimize', 'admin-os-mode' ),
						'command'  => 'window.minimize',
						'shortcut' => '⌘M',
					),
					array(
						'label'   => __( 'Zoom', 'admin-os-mode' ),
						'command' => 'window.toggle-maximize',
					),
					array(
						'label'    => __( 'Close', 'admin-os-mode' ),
						'command'  => 'window.close',
						'shortcut' => '⌘W',
					),
				),
			),
			array(
				'id'    => 'help',
				'label' => __( 'Help', 'admin-os-mode' ),
				'items' => array(),
			),
		);
	}

	/**
	 * Default menu group id by position.
	 *
	 * @param int $index Group position.
	 * @return string
	 */
	private function get_default_menu_group_id( $index ) {
		$ids = $this->get_default_menu_group_ids();

		return isset( $ids[ $index ] ) ? $ids[ $index ] : 'menu-' . ( $index + 1 );
	}

	/**
	 * Default menu group ids.
	 *
	 * @return array<int,string>
	 */
	private function get_default_menu_group_ids() {
		return array( 'app', 'file', 'edit', 'view', 'go', 'window', 'help' );
	}

	/**
	 * Normalize reusable about window metadata.
	 *
	 * @param mixed               $about Raw about metadata.
	 * @param string              $fallback_name App label.
	 * @param array<string,mixed> $fallback_icon Normalized app icon.
	 * @return array<string,mixed>
	 */
	private function normalize_about( $about, $fallback_name, $fallback_icon ) {
		$about = is_array( $about ) ? $about : array();
		$name  = ! empty( $about['name'] ) ? sanitize_text_field( $about['name'] ) : $fallback_name;
		$year  = gmdate( 'Y' );
		$icon  = isset( $about['icon'] ) ? Admin_OS_Mode_Icon_Renderer::normalize( $about['icon'] ) : $fallback_icon;

		return array(
			'name'      => $name,
			'version'   => ! empty( $about['version'] )
				? sanitize_text_field( $about['version'] )
				: sprintf(
					/* translators: %s: plugin version. */
					__( 'Version %s', 'admin-os-mode' ),
					ADMIN_OS_MODE_VERSION
				),
			'copyright' => ! empty( $about['copyright'] )
				? sanitize_text_field( $about['copyright'] )
				: sprintf(
					/* translators: %s: current year. */
					__( 'Copyright (c) %s Admin OS Mode contributors.', 'admin-os-mode' ),
					$year
				),
			'rights'    => ! empty( $about['rights'] ) ? sanitize_text_field( $about['rights'] ) : __( 'Licensed under GPLv2 or later.', 'admin-os-mode' ),
			'icon'      => $icon,
		);
	}

	/**
	 * Default menu group label.
	 *
	 * @param string $id Group id.
	 * @param string $fallback_label App label.
	 * @return string
	 */
	private function get_default_menu_group_label( $id, $fallback_label ) {
		$labels = array(
			'app'    => $fallback_label,
			'file'   => __( 'File', 'admin-os-mode' ),
			'edit'   => __( 'Edit', 'admin-os-mode' ),
			'view'   => __( 'View', 'admin-os-mode' ),
			'go'     => __( 'Go', 'admin-os-mode' ),
			'window' => __( 'Window', 'admin-os-mode' ),
			'help'   => __( 'Help', 'admin-os-mode' ),
		);

		return isset( $labels[ $id ] ) ? $labels[ $id ] : sanitize_text_field( $id );
	}

	/**
	 * Normalize command and group identifiers.
	 *
	 * @param mixed $value Raw id.
	 * @return string
	 */
	private function normalize_command_id( $value ) {
		$value = strtolower( sanitize_text_field( (string) $value ) );
		$normalized = preg_replace( '/[^a-z0-9_.-]/', '', $value );

		return is_string( $normalized ) ? $normalized : '';
	}

	/**
	 * Build a theme-aware icon descriptor with a Dashicon fallback.
	 *
	 * @param string $name Theme icon file name.
	 * @param string $fallback Dashicon fallback class.
	 * @return array<string,string>
	 */
	private function theme_icon( $name, $fallback ) {
		return array(
			'type'     => 'theme',
			'name'     => $name,
			'fallback' => $fallback,
		);
	}
}
