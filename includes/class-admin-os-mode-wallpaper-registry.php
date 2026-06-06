<?php
/**
 * Wallpaper registry and resolver.
 *
 * @package AdminOSMode
 */

defined( 'ABSPATH' ) || exit;

/**
 * Owns built-in wallpaper/color options, upload resolution, and CSS variables.
 */
final class Admin_OS_Mode_Wallpaper_Registry {
	/**
	 * Built-in original color backgrounds.
	 *
	 * @var array<int,array<string,string>>
	 */
	private $color_backgrounds = array(
		array(
			'id'        => 'black',
			'css_value' => 'linear-gradient(#000000, #000000)',
		),
		array(
			'id'        => 'periwinkle',
			'css_value' => 'linear-gradient(#747bd6, #747bd6)',
		),
		array(
			'id'        => 'cyan',
			'css_value' => 'linear-gradient(#22adc5, #22adc5)',
		),
		array(
			'id'        => 'rose',
			'css_value' => 'linear-gradient(#e36d78, #e36d78)',
		),
		array(
			'id'        => 'blue',
			'css_value' => 'linear-gradient(#465bd8, #465bd8)',
		),
		array(
			'id'        => 'peach',
			'css_value' => 'linear-gradient(#f2d2c1, #f2d2c1)',
		),
		array(
			'id'        => 'cream',
			'css_value' => 'linear-gradient(#f1e1c8, #f1e1c8)',
		),
		array(
			'id'        => 'gold',
			'css_value' => 'linear-gradient(#ddb253, #ddb253)',
		),
		array(
			'id'        => 'magenta',
			'css_value' => 'linear-gradient(#cf4d9e, #cf4d9e)',
		),
		array(
			'id'        => 'ember',
			'css_value' => 'linear-gradient(#fb3f27, #fb3f27)',
		),
		array(
			'id'        => 'blush',
			'css_value' => 'linear-gradient(#efcbc6, #efcbc6)',
		),
		array(
			'id'        => 'mist',
			'css_value' => 'linear-gradient(#e7eaeb, #e7eaeb)',
		),
		array(
			'id'        => 'pink',
			'css_value' => 'linear-gradient(#f2d2dc, #f2d2dc)',
		),
		array(
			'id'        => 'gray',
			'css_value' => 'linear-gradient(#8b8e92, #8b8e92)',
		),
		array(
			'id'        => 'silver',
			'css_value' => 'linear-gradient(#c8ccd2, #c8ccd2)',
		),
		array(
			'id'        => 'slate',
			'css_value' => 'linear-gradient(#5c6161, #5c6161)',
		),
		array(
			'id'        => 'teal',
			'css_value' => 'linear-gradient(#0b948c, #0b948c)',
		),
		array(
			'id'        => 'mint',
			'css_value' => 'linear-gradient(#72c9a8, #72c9a8)',
		),
		array(
			'id'        => 'yellow',
			'css_value' => 'linear-gradient(#f8bd2e, #f8bd2e)',
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
			'groups'        => $this->get_grouped_options( $theme ),
			'items'         => array_values( $this->get_available_wallpapers( $theme ) ),
			'uploads'       => $this->get_uploaded_wallpaper_items( $preferences ),
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

		foreach ( $this->color_backgrounds as $color ) {
			$item = array(
				'type'      => 'color',
				'id'        => sanitize_key( $color['id'] ),
				'label'     => $this->get_color_label( $color['id'] ),
				'css_value' => $color['css_value'],
				'preview'   => $color['css_value'],
				'swatch'    => $this->get_swatch_from_css_value( $color['css_value'] ),
				'fit'       => 'cover',
				'position'  => 'center center',
			);
			$items[ $this->get_item_key( $item['type'], $item['id'] ) ] = $item;
		}

		/**
		 * Filter available Admin OS wallpapers.
		 *
		 * @param array<string,array<string,mixed>> $items Wallpaper and color items keyed by type:id.
		 * @param array<string,mixed>               $theme Current theme.
		 */
		$items = apply_filters( 'admin_os_mode_wallpapers', $items, $theme );

		return $this->normalize_wallpaper_items( $items );
	}

	/**
	 * Get client-facing wallpaper option groups.
	 *
	 * @param array<string,mixed> $theme Theme data.
	 * @return array<string,array<int,array<string,mixed>>>
	 */
	private function get_grouped_options( $theme ) {
		$groups = array(
			'wallpapers' => array(),
			'colors'     => array(),
		);

		foreach ( $this->get_available_wallpapers( $theme ) as $item ) {
			if ( 'color' === $item['type'] ) {
				$groups['colors'][] = $item;
				continue;
			}

			if ( 'upload' !== $item['type'] ) {
				$groups['wallpapers'][] = $item;
			}
		}

		return $groups;
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
				'type'      => 'color',
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
			'type'          => $item && ! empty( $item['type'] ) ? $item['type'] : 'color',
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
	 * Get the user's saved upload wallpaper items.
	 *
	 * @param Admin_OS_Mode_User_Preferences $preferences User preferences.
	 * @return array<int,array<string,mixed>>
	 */
	private function get_uploaded_wallpaper_items( Admin_OS_Mode_User_Preferences $preferences ) {
		$items = array();

		foreach ( $preferences->get_wallpaper_uploads() as $attachment_id ) {
			$resolved = $this->resolve_upload(
				array(
					'type'          => 'upload',
					'attachment_id' => $attachment_id,
					'fit'           => 'cover',
					'position'      => 'center center',
				)
			);

			if ( $resolved && ! empty( $resolved['item'] ) ) {
				$items[] = $resolved['item'];
			}
		}

		return $items;
	}

	/**
	 * Get theme-declared wallpapers.
	 *
	 * @param array<string,mixed> $theme Theme data.
	 * @return array<int,array<string,mixed>>
	 */
	private function get_theme_wallpaper_items( $theme ) {
		$items = array();

		if ( ! empty( $theme['media']['wallpapers']['items'] ) && is_array( $theme['media']['wallpapers']['items'] ) ) {
			foreach ( $theme['media']['wallpapers']['items'] as $wallpaper ) {
				if ( empty( $wallpaper['id'] ) ) {
					continue;
				}

				$css_value = '';
				$preview   = '';
				$url       = '';
				if ( ! empty( $wallpaper['url'] ) ) {
					$url       = esc_url_raw( $wallpaper['url'] );
					$css_value = $this->get_url_css_value( $url );
					$preview   = $css_value;
				} elseif ( ! empty( $wallpaper['css_value'] ) ) {
					$css_value = $this->sanitize_css_value( $wallpaper['css_value'] );
					$preview   = ! empty( $wallpaper['preview'] ) ? $this->sanitize_css_value( $wallpaper['preview'] ) : $css_value;
				}

				if ( '' === $css_value || 'none' === $css_value ) {
					continue;
				}

				$items[] = array(
					'type'      => 'theme',
					'id'        => sanitize_key( $wallpaper['id'] ),
					'label'     => isset( $wallpaper['label'] ) ? sanitize_text_field( $wallpaper['label'] ) : sanitize_key( $wallpaper['id'] ),
					'url'       => $url,
					'css_value' => $css_value,
					'preview'   => $preview,
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
				'swatch'    => isset( $item['swatch'] ) ? $this->sanitize_swatch( $item['swatch'] ) : '',
				'fit'       => isset( $item['fit'] ) ? sanitize_key( $item['fit'] ) : 'cover',
				'position'  => isset( $item['position'] ) ? sanitize_text_field( $item['position'] ) : 'center center',
			);
		}

		return $normalized;
	}

	/**
	 * Get a translated label for a built-in color background.
	 *
	 * @param string $id Color background ID.
	 * @return string
	 */
	private function get_color_label( $id ) {
		switch ( sanitize_key( $id ) ) {
			case 'periwinkle':
				return __( 'Periwinkle', 'admin-os-mode' );
			case 'cyan':
				return __( 'Cyan', 'admin-os-mode' );
			case 'rose':
				return __( 'Rose', 'admin-os-mode' );
			case 'blue':
				return __( 'Blue', 'admin-os-mode' );
			case 'peach':
				return __( 'Peach', 'admin-os-mode' );
			case 'cream':
				return __( 'Cream', 'admin-os-mode' );
			case 'gold':
				return __( 'Gold', 'admin-os-mode' );
			case 'magenta':
				return __( 'Magenta', 'admin-os-mode' );
			case 'ember':
				return __( 'Ember', 'admin-os-mode' );
			case 'blush':
				return __( 'Blush', 'admin-os-mode' );
			case 'mist':
				return __( 'Mist', 'admin-os-mode' );
			case 'pink':
				return __( 'Pink', 'admin-os-mode' );
			case 'gray':
				return __( 'Gray', 'admin-os-mode' );
			case 'silver':
				return __( 'Silver', 'admin-os-mode' );
			case 'slate':
				return __( 'Slate', 'admin-os-mode' );
			case 'teal':
				return __( 'Teal', 'admin-os-mode' );
			case 'mint':
				return __( 'Mint', 'admin-os-mode' );
			case 'yellow':
				return __( 'Yellow', 'admin-os-mode' );
			case 'black':
			default:
				return __( 'Black', 'admin-os-mode' );
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
		$css_value   = isset( $item['css_value'] ) ? $this->sanitize_css_value( $item['css_value'] ) : 'none';
		$layer_count = $this->count_css_image_layers( $css_value );
		$size        = $this->sanitize_size( isset( $preference['fit'] ) ? $preference['fit'] : 'cover' );
		$position    = $this->sanitize_position( isset( $preference['position'] ) ? $preference['position'] : 'center center' );

		return array(
			'--aos-wallpaper-image'    => $css_value,
			'--aos-wallpaper-size'     => $this->repeat_css_layer_value( $size, $layer_count ),
			'--aos-wallpaper-position' => $this->repeat_css_layer_value( $position, $layer_count ),
			'--aos-wallpaper-repeat'   => $this->repeat_css_layer_value( 'no-repeat', $layer_count ),
		);
	}

	/**
	 * Count top-level CSS background-image layers.
	 *
	 * @param string $css_value CSS image value.
	 * @return int
	 */
	private function count_css_image_layers( $css_value ) {
		$css_value = (string) $css_value;
		if ( '' === trim( $css_value ) || 'none' === trim( strtolower( $css_value ) ) ) {
			return 1;
		}

		$depth  = 0;
		$layers = 1;
		$length = strlen( $css_value );

		for ( $index = 0; $index < $length; $index++ ) {
			$char = $css_value[ $index ];
			if ( '(' === $char ) {
				$depth++;
				continue;
			}

			if ( ')' === $char ) {
				$depth = max( 0, $depth - 1 );
				continue;
			}

			if ( ',' === $char && 0 === $depth ) {
				$layers++;
			}
		}

		return max( 1, $layers );
	}

	/**
	 * Repeat a CSS value for each wallpaper image layer.
	 *
	 * @param string $value Value.
	 * @param int    $count Layer count.
	 * @return string
	 */
	private function repeat_css_layer_value( $value, $count ) {
		return implode( ', ', array_fill( 0, max( 1, (int) $count ), $value ) );
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
	 * Extract the solid swatch color from a generated solid gradient value.
	 *
	 * @param string $css_value CSS value.
	 * @return string
	 */
	private function get_swatch_from_css_value( $css_value ) {
		if ( preg_match( '/#[0-9a-fA-F]{3,8}/', (string) $css_value, $matches ) ) {
			return $this->sanitize_swatch( $matches[0] );
		}

		return '';
	}

	/**
	 * Sanitize a solid swatch color.
	 *
	 * @param mixed $value Raw swatch value.
	 * @return string
	 */
	private function sanitize_swatch( $value ) {
		$value = trim( (string) $value );

		if ( preg_match( '/^#[0-9a-fA-F]{3,8}$/', $value ) ) {
			return strtolower( $value );
		}

		return '';
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
