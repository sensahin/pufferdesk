<?php
/**
 * Wallpaper registry and resolver.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * Owns built-in wallpaper options, upload resolution, and CSS variables.
 */
final class Admin_OS_Mode_Wallpaper_Registry {
	/**
	 * Built-in original gradient wallpapers.
	 *
	 * @var array<int,array<string,string>>
	 */
	private $gradient_wallpapers = array(
		array(
			'id'        => 'aurora-mist',
			'css_value' => 'radial-gradient(circle at 24% 18%, rgba(117, 236, 218, 0.92), transparent 32%), radial-gradient(circle at 78% 24%, rgba(62, 126, 255, 0.78), transparent 36%), radial-gradient(circle at 58% 76%, rgba(247, 141, 119, 0.58), transparent 40%), linear-gradient(135deg, #182f46 0%, #227a88 42%, #d9edf2 100%)',
		),
		array(
			'id'        => 'blue-drift',
			'css_value' => 'radial-gradient(circle at 20% 30%, rgba(95, 216, 255, 0.82), transparent 32%), radial-gradient(circle at 82% 18%, rgba(36, 76, 210, 0.82), transparent 36%), linear-gradient(135deg, #0d2844 0%, #1f74a7 48%, #bce9f1 100%)',
		),
		array(
			'id'        => 'violet-tide',
			'css_value' => 'radial-gradient(circle at 18% 20%, rgba(255, 128, 218, 0.76), transparent 30%), radial-gradient(circle at 70% 18%, rgba(91, 107, 255, 0.72), transparent 34%), radial-gradient(circle at 68% 78%, rgba(83, 218, 201, 0.54), transparent 36%), linear-gradient(135deg, #26163f 0%, #4e2f87 48%, #b7dff2 100%)',
		),
		array(
			'id'        => 'sunset-glass',
			'css_value' => 'radial-gradient(circle at 16% 22%, rgba(255, 219, 121, 0.88), transparent 32%), radial-gradient(circle at 72% 20%, rgba(255, 112, 112, 0.72), transparent 36%), radial-gradient(circle at 64% 80%, rgba(84, 199, 255, 0.58), transparent 42%), linear-gradient(135deg, #513048 0%, #db7662 48%, #f2e6c8 100%)',
		),
		array(
			'id'        => 'green-lake',
			'css_value' => 'radial-gradient(circle at 18% 26%, rgba(161, 245, 187, 0.82), transparent 34%), radial-gradient(circle at 78% 22%, rgba(64, 184, 174, 0.66), transparent 36%), linear-gradient(135deg, #102f37 0%, #267d74 52%, #d6efe0 100%)',
		),
		array(
			'id'        => 'graphite-dawn',
			'css_value' => 'radial-gradient(circle at 24% 18%, rgba(202, 214, 225, 0.64), transparent 30%), radial-gradient(circle at 76% 28%, rgba(86, 134, 180, 0.58), transparent 36%), linear-gradient(135deg, #151b24 0%, #425263 52%, #c9d2dc 100%)',
		),
	);

	/**
	 * Build client-facing wallpaper config for the current user/theme.
	 *
	 * @param array<string,mixed>            $theme Theme data.
	 * @param Admin_OS_Mode_User_Preferences $preferences User preferences.
	 * @return array<string,mixed>
	 */
	public function get_client_config( $theme, Admin_OS_Mode_User_Preferences $preferences ) {
		$preference = $preferences->get_wallpaper();
		$resolved   = $this->resolve_preference( $preference, $theme );

		return array(
			'preference'    => $resolved['preference'],
			'current'       => $resolved['item'],
			'css_variables' => $resolved['css_variables'],
			'default'       => $this->get_default_preference( $theme ),
			'items'         => array_values( $this->get_available_wallpapers( $theme ) ),
			'can_upload'    => current_user_can( 'upload_files' ),
		);
	}

	/**
	 * Get available built-in wallpapers for a theme.
	 *
	 * @param array<string,mixed> $theme Theme data.
	 * @return array<string,array<string,mixed>>
	 */
	public function get_available_wallpapers( $theme ) {
		$items = array();

		foreach ( $this->get_theme_wallpaper_items( $theme ) as $item ) {
			$items[ $this->get_item_key( $item['type'], $item['id'] ) ] = $item;
		}

		foreach ( $this->gradient_wallpapers as $gradient ) {
			$item = array(
				'type'      => 'gradient',
				'id'        => sanitize_key( $gradient['id'] ),
				'label'     => $this->get_gradient_label( $gradient['id'] ),
				'css_value' => $gradient['css_value'],
				'preview'   => $gradient['css_value'],
				'fit'       => 'cover',
				'position'  => 'center center',
			);
			$items[ $this->get_item_key( $item['type'], $item['id'] ) ] = $item;
		}

		/**
		 * Filter available Admin OS wallpapers.
		 *
		 * @param array<string,array<string,mixed>> $items Wallpaper items keyed by type:id.
		 * @param array<string,mixed>               $theme Current theme.
		 */
		$items = apply_filters( 'admin_os_mode_wallpapers', $items, $theme );

		return $this->normalize_wallpaper_items( $items );
	}

	/**
	 * Validate a wallpaper preference against current theme options and attachments.
	 *
	 * @param array<string,mixed> $preference Wallpaper preference.
	 * @param array<string,mixed> $theme Theme data.
	 * @return true|WP_Error
	 */
	public function validate_preference( $preference, $theme ) {
		$type = isset( $preference['type'] ) ? sanitize_key( $preference['type'] ) : '';

		if ( 'upload' === $type ) {
			if ( ! current_user_can( 'upload_files' ) ) {
				return new WP_Error(
					'admin_os_mode_wallpaper_upload_forbidden',
					__( 'You do not have permission to choose uploaded wallpapers.', 'admin-os-mode' )
				);
			}

			$attachment_id = isset( $preference['attachment_id'] ) ? absint( $preference['attachment_id'] ) : 0;
			if ( ! $this->is_valid_image_attachment( $attachment_id ) ) {
				return new WP_Error(
					'admin_os_mode_invalid_wallpaper_upload',
					__( 'Choose a valid image from the WordPress Media Library.', 'admin-os-mode' )
				);
			}

			return true;
		}

		$item = $this->find_item( $type, isset( $preference['id'] ) ? $preference['id'] : '', $theme );
		if ( ! $item ) {
			return new WP_Error(
				'admin_os_mode_invalid_wallpaper',
				__( 'The selected wallpaper is not available.', 'admin-os-mode' )
			);
		}

		return true;
	}

	/**
	 * Resolve a preference into a current item and CSS variables.
	 *
	 * @param array<string,mixed> $preference Wallpaper preference.
	 * @param array<string,mixed> $theme Theme data.
	 * @return array<string,mixed>
	 */
	public function resolve_preference( $preference, $theme ) {
		$preference = is_array( $preference ) ? $preference : array();
		$type       = isset( $preference['type'] ) ? sanitize_key( $preference['type'] ) : '';

		if ( 'upload' === $type ) {
			$upload = $this->resolve_upload( $preference );
			if ( $upload ) {
				return $upload;
			}
		}

		$item = $this->find_item( $type, isset( $preference['id'] ) ? $preference['id'] : '', $theme );
		if ( ! $item ) {
			$preference = $this->get_default_preference( $theme );
			$item       = $this->find_item( $preference['type'], $preference['id'], $theme );
		}

		if ( ! $item ) {
			$item = array(
				'type'      => 'gradient',
				'id'        => 'none',
				'label'     => __( 'Default', 'admin-os-mode' ),
				'css_value' => 'none',
				'preview'   => 'none',
				'fit'       => 'cover',
				'position'  => 'center center',
			);
		}

		$preference = array(
			'type'          => $item['type'],
			'id'            => $item['id'],
			'attachment_id' => 0,
			'fit'           => isset( $preference['fit'] ) ? $preference['fit'] : 'cover',
			'position'      => isset( $preference['position'] ) ? $preference['position'] : 'center center',
		);

		return array(
			'preference'    => $preference,
			'item'          => $item,
			'css_variables' => $this->get_css_variables( $item, $preference ),
		);
	}

	/**
	 * Get the default preference for a theme.
	 *
	 * @param array<string,mixed> $theme Theme data.
	 * @return array<string,mixed>
	 */
	public function get_default_preference( $theme ) {
		$default_id = '';
		if ( ! empty( $theme['media']['wallpapers']['default'] ) ) {
			$default_id = sanitize_key( $theme['media']['wallpapers']['default'] );
		}

		if ( $default_id && $this->find_item( 'theme', $default_id, $theme ) ) {
			return array(
				'type'          => 'theme',
				'id'            => $default_id,
				'attachment_id' => 0,
				'fit'           => 'cover',
				'position'      => 'center center',
			);
		}

		$items = $this->get_available_wallpapers( $theme );
		$item  = reset( $items );

		return array(
			'type'          => $item && ! empty( $item['type'] ) ? $item['type'] : 'gradient',
			'id'            => $item && ! empty( $item['id'] ) ? $item['id'] : 'aurora-mist',
			'attachment_id' => 0,
			'fit'           => 'cover',
			'position'      => 'center center',
		);
	}

	/**
	 * Resolve an upload preference.
	 *
	 * @param array<string,mixed> $preference Wallpaper preference.
	 * @return array<string,mixed>|null
	 */
	private function resolve_upload( $preference ) {
		$attachment_id = isset( $preference['attachment_id'] ) ? absint( $preference['attachment_id'] ) : 0;
		if ( ! $this->is_valid_image_attachment( $attachment_id ) ) {
			return null;
		}

		$url = wp_get_attachment_image_url( $attachment_id, 'full' );
		if ( ! $url ) {
			$url = wp_get_attachment_url( $attachment_id );
		}

		if ( ! $url ) {
			return null;
		}

		$label = get_the_title( $attachment_id );
		$item  = array(
			'type'          => 'upload',
			'id'            => 'custom',
			'attachment_id' => $attachment_id,
			'label'         => $label ? sanitize_text_field( $label ) : __( 'Custom Wallpaper', 'admin-os-mode' ),
			'url'           => esc_url_raw( $url ),
			'css_value'     => $this->get_url_css_value( $url ),
			'preview'       => $this->get_url_css_value( $url ),
			'fit'           => isset( $preference['fit'] ) ? $preference['fit'] : 'cover',
			'position'      => isset( $preference['position'] ) ? $preference['position'] : 'center center',
		);
		$preference = array(
			'type'          => 'upload',
			'id'            => '',
			'attachment_id' => $attachment_id,
			'fit'           => $item['fit'],
			'position'      => $item['position'],
		);

		return array(
			'preference'    => $preference,
			'item'          => $item,
			'css_variables' => $this->get_css_variables( $item, $preference ),
		);
	}

	/**
	 * Get theme-declared image wallpapers.
	 *
	 * @param array<string,mixed> $theme Theme data.
	 * @return array<int,array<string,mixed>>
	 */
	private function get_theme_wallpaper_items( $theme ) {
		$items = array();

		if ( ! empty( $theme['media']['wallpapers']['items'] ) && is_array( $theme['media']['wallpapers']['items'] ) ) {
			foreach ( $theme['media']['wallpapers']['items'] as $wallpaper ) {
				if ( empty( $wallpaper['id'] ) || empty( $wallpaper['url'] ) ) {
					continue;
				}

				$items[] = array(
					'type'      => 'theme',
					'id'        => sanitize_key( $wallpaper['id'] ),
					'label'     => isset( $wallpaper['label'] ) ? sanitize_text_field( $wallpaper['label'] ) : sanitize_key( $wallpaper['id'] ),
					'url'       => esc_url_raw( $wallpaper['url'] ),
					'css_value' => $this->get_url_css_value( $wallpaper['url'] ),
					'preview'   => $this->get_url_css_value( $wallpaper['url'] ),
					'fit'       => isset( $wallpaper['fit'] ) ? sanitize_key( $wallpaper['fit'] ) : 'cover',
					'position'  => isset( $wallpaper['position'] ) ? sanitize_text_field( $wallpaper['position'] ) : 'center center',
				);
			}
		}

		if ( empty( $items ) && ! empty( $theme['media']['wallpaper']['url'] ) ) {
			$items[] = array(
				'type'      => 'theme',
				'id'        => 'default',
				'label'     => __( 'Default', 'admin-os-mode' ),
				'url'       => esc_url_raw( $theme['media']['wallpaper']['url'] ),
				'css_value' => $this->get_url_css_value( $theme['media']['wallpaper']['url'] ),
				'preview'   => $this->get_url_css_value( $theme['media']['wallpaper']['url'] ),
				'fit'       => 'cover',
				'position'  => 'center center',
			);
		}

		return $items;
	}

	/**
	 * Normalize filtered wallpaper items.
	 *
	 * @param mixed $items Raw items.
	 * @return array<string,array<string,mixed>>
	 */
	private function normalize_wallpaper_items( $items ) {
		$normalized = array();
		if ( ! is_array( $items ) ) {
			return $normalized;
		}

		foreach ( $items as $item ) {
			if ( ! is_array( $item ) || empty( $item['id'] ) || empty( $item['type'] ) || empty( $item['css_value'] ) ) {
				continue;
			}

			$type = sanitize_key( $item['type'] );
			$id   = sanitize_key( $item['id'] );
			if ( '' === $type || '' === $id ) {
				continue;
			}

			$normalized[ $this->get_item_key( $type, $id ) ] = array(
				'type'      => $type,
				'id'        => $id,
				'label'     => isset( $item['label'] ) ? sanitize_text_field( $item['label'] ) : $id,
				'url'       => isset( $item['url'] ) ? esc_url_raw( $item['url'] ) : '',
				'css_value' => $this->sanitize_css_value( $item['css_value'] ),
				'preview'   => isset( $item['preview'] ) ? $this->sanitize_css_value( $item['preview'] ) : $this->sanitize_css_value( $item['css_value'] ),
				'fit'       => isset( $item['fit'] ) ? sanitize_key( $item['fit'] ) : 'cover',
				'position'  => isset( $item['position'] ) ? sanitize_text_field( $item['position'] ) : 'center center',
			);
		}

		return $normalized;
	}

	/**
	 * Get a translated label for a built-in gradient wallpaper.
	 *
	 * @param string $id Wallpaper ID.
	 * @return string
	 */
	private function get_gradient_label( $id ) {
		switch ( sanitize_key( $id ) ) {
			case 'blue-drift':
				return __( 'Blue Drift', 'admin-os-mode' );
			case 'violet-tide':
				return __( 'Violet Tide', 'admin-os-mode' );
			case 'sunset-glass':
				return __( 'Sunset Glass', 'admin-os-mode' );
			case 'green-lake':
				return __( 'Green Lake', 'admin-os-mode' );
			case 'graphite-dawn':
				return __( 'Graphite Dawn', 'admin-os-mode' );
			case 'aurora-mist':
			default:
				return __( 'Aurora Mist', 'admin-os-mode' );
		}
	}

	/**
	 * Find a built-in wallpaper item.
	 *
	 * @param string              $type Wallpaper type.
	 * @param string              $id Wallpaper ID.
	 * @param array<string,mixed> $theme Theme data.
	 * @return array<string,mixed>|null
	 */
	private function find_item( $type, $id, $theme ) {
		$type = sanitize_key( $type );
		$id   = sanitize_key( $id );
		if ( '' === $type || '' === $id ) {
			return null;
		}

		$items = $this->get_available_wallpapers( $theme );
		$key   = $this->get_item_key( $type, $id );

		return isset( $items[ $key ] ) ? $items[ $key ] : null;
	}

	/**
	 * Build CSS variables for a resolved wallpaper.
	 *
	 * @param array<string,mixed> $item Wallpaper item.
	 * @param array<string,mixed> $preference Wallpaper preference.
	 * @return array<string,string>
	 */
	private function get_css_variables( $item, $preference ) {
		return array(
			'--aos-wallpaper-image'    => isset( $item['css_value'] ) ? $this->sanitize_css_value( $item['css_value'] ) : 'none',
			'--aos-wallpaper-size'     => $this->sanitize_size( isset( $preference['fit'] ) ? $preference['fit'] : 'cover' ),
			'--aos-wallpaper-position' => $this->sanitize_position( isset( $preference['position'] ) ? $preference['position'] : 'center center' ),
			'--aos-wallpaper-repeat'   => 'no-repeat',
		);
	}

	/**
	 * Check if an attachment is a valid image.
	 *
	 * @param int $attachment_id Attachment ID.
	 * @return bool
	 */
	private function is_valid_image_attachment( $attachment_id ) {
		if ( ! $attachment_id || 'attachment' !== get_post_type( $attachment_id ) ) {
			return false;
		}

		return wp_attachment_is_image( $attachment_id );
	}

	/**
	 * Build a safe url() CSS value.
	 *
	 * @param string $url URL.
	 * @return string
	 */
	private function get_url_css_value( $url ) {
		$url = str_replace(
			array( '"', '\\' ),
			array( '%22', '%5C' ),
			esc_url_raw( $url )
		);

		return $url ? 'url("' . $url . '")' : 'none';
	}

	/**
	 * Sanitize a CSS image value generated by the registry.
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	private function sanitize_css_value( $value ) {
		$value = trim( (string) $value );
		$value = str_replace( ';', '', $value );

		return '' === $value ? 'none' : $value;
	}

	/**
	 * Sanitize wallpaper fit.
	 *
	 * @param mixed $value Raw fit.
	 * @return string
	 */
	private function sanitize_size( $value ) {
		$value = sanitize_key( $value );

		return in_array( $value, array( 'cover', 'contain', 'auto' ), true ) ? $value : 'cover';
	}

	/**
	 * Sanitize wallpaper position.
	 *
	 * @param mixed $value Raw position.
	 * @return string
	 */
	private function sanitize_position( $value ) {
		$value = sanitize_text_field( $value );

		return in_array( $value, array( 'center center', 'top center', 'bottom center', 'center left', 'center right' ), true ) ? $value : 'center center';
	}

	/**
	 * Build an item lookup key.
	 *
	 * @param string $type Type.
	 * @param string $id ID.
	 * @return string
	 */
	private function get_item_key( $type, $id ) {
		return sanitize_key( $type ) . ':' . sanitize_key( $id );
	}
}
