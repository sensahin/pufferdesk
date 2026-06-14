<?php
/**
 * Wallpaper registry and resolver.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Owns built-in wallpaper/color options, upload resolution, and CSS variables.
 */
final class PufferDesk_Wallpaper_Registry {
	const TYPE_COLOR  = 'color';
	const TYPE_THEME  = 'theme';
	const TYPE_UPLOAD = 'upload';

	/**
	 * Wallpaper preference type IDs.
	 *
	 * @return array<string,string>
	 */
	public static function get_type_ids() {
		return array(
			'COLOR'  => self::TYPE_COLOR,
			'THEME'  => self::TYPE_THEME,
			'UPLOAD' => self::TYPE_UPLOAD,
		);
	}

	/**
	 * Built-in original color backgrounds.
	 *
	 * @var array<int,array<string,string>>
	 */
	private $color_backgrounds = array(
		array(
			'id'            => 'black',
			'css_value'     => 'linear-gradient(#000000, #000000)',
			'menu_contrast' => 'light',
		),
		array(
			'id'            => 'periwinkle',
			'css_value'     => 'linear-gradient(#747bd6, #747bd6)',
			'menu_contrast' => 'dark',
		),
		array(
			'id'            => 'cyan',
			'css_value'     => 'linear-gradient(#22adc5, #22adc5)',
			'menu_contrast' => 'dark',
		),
		array(
			'id'            => 'rose',
			'css_value'     => 'linear-gradient(#e36d78, #e36d78)',
			'menu_contrast' => 'dark',
		),
		array(
			'id'            => 'blue',
			'css_value'     => 'linear-gradient(#465bd8, #465bd8)',
			'menu_contrast' => 'light',
		),
		array(
			'id'            => 'peach',
			'css_value'     => 'linear-gradient(#f2d2c1, #f2d2c1)',
			'menu_contrast' => 'dark',
		),
		array(
			'id'            => 'cream',
			'css_value'     => 'linear-gradient(#f1e1c8, #f1e1c8)',
			'menu_contrast' => 'dark',
		),
		array(
			'id'            => 'gold',
			'css_value'     => 'linear-gradient(#ddb253, #ddb253)',
			'menu_contrast' => 'dark',
		),
		array(
			'id'            => 'magenta',
			'css_value'     => 'linear-gradient(#cf4d9e, #cf4d9e)',
			'menu_contrast' => 'dark',
		),
		array(
			'id'            => 'ember',
			'css_value'     => 'linear-gradient(#fb3f27, #fb3f27)',
			'menu_contrast' => 'dark',
		),
		array(
			'id'            => 'blush',
			'css_value'     => 'linear-gradient(#efcbc6, #efcbc6)',
			'menu_contrast' => 'dark',
		),
		array(
			'id'            => 'mist',
			'css_value'     => 'linear-gradient(#e7eaeb, #e7eaeb)',
			'menu_contrast' => 'dark',
		),
		array(
			'id'            => 'pink',
			'css_value'     => 'linear-gradient(#f2d2dc, #f2d2dc)',
			'menu_contrast' => 'dark',
		),
		array(
			'id'            => 'gray',
			'css_value'     => 'linear-gradient(#8b8e92, #8b8e92)',
			'menu_contrast' => 'dark',
		),
		array(
			'id'            => 'silver',
			'css_value'     => 'linear-gradient(#c8ccd2, #c8ccd2)',
			'menu_contrast' => 'dark',
		),
		array(
			'id'            => 'slate',
			'css_value'     => 'linear-gradient(#5c6161, #5c6161)',
			'menu_contrast' => 'light',
		),
		array(
			'id'            => 'teal',
			'css_value'     => 'linear-gradient(#0b948c, #0b948c)',
			'menu_contrast' => 'light',
		),
		array(
			'id'            => 'mint',
			'css_value'     => 'linear-gradient(#72c9a8, #72c9a8)',
			'menu_contrast' => 'dark',
		),
		array(
			'id'            => 'yellow',
			'css_value'     => 'linear-gradient(#f8bd2e, #f8bd2e)',
			'menu_contrast' => 'dark',
		),
	);

	/**
	 * Build client-facing wallpaper config for the current user/theme.
	 *
	 * @param array<string,mixed>            $theme Theme data.
	 * @param PufferDesk_User_Preferences $preferences User preferences.
	 * @return array<string,mixed>
	 */
	public function get_client_config( $theme, PufferDesk_User_Preferences $preferences ) {
		$preference = $preferences->get_wallpaper();
		$resolved   = $this->resolve_preference( $preference, $theme );

		return array(
			'preference'    => $resolved['preference'],
			'current'       => $resolved['item'],
			'css_variables' => $resolved['css_variables'],
			'menu_contrast' => $resolved['menu_contrast'],
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

		foreach ( $this->get_shared_wallpaper_items() as $item ) {
			$items[ $this->get_item_key( $item['type'], $item['id'] ) ] = $item;
		}

		foreach ( $this->get_theme_wallpaper_items( $theme ) as $item ) {
			$items[ $this->get_item_key( $item['type'], $item['id'] ) ] = $item;
		}

		foreach ( $this->color_backgrounds as $color ) {
			$item = array(
				'type'          => self::TYPE_COLOR,
				'id'            => sanitize_key( $color['id'] ),
				'label'         => $this->get_color_label( $color['id'] ),
				'css_value'     => $color['css_value'],
				'preview'       => $color['css_value'],
				'swatch'        => $this->get_swatch_from_css_value( $color['css_value'] ),
				'fit'           => 'cover',
				'position'      => 'center center',
				'menu_contrast' => $this->sanitize_menu_contrast( isset( $color['menu_contrast'] ) ? $color['menu_contrast'] : '' ),
			);
			$items[ $this->get_item_key( $item['type'], $item['id'] ) ] = $item;
		}

		/**
		 * Filter available PufferDesk wallpapers.
		 *
		 * @param array<string,array<string,mixed>> $items Wallpaper and color items keyed by type:id.
		 * @param array<string,mixed>               $theme Current theme.
		 */
		$items = apply_filters( 'pufferdesk_wallpapers', $items, $theme );

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
			if ( self::TYPE_COLOR === $item['type'] ) {
				$groups['colors'][] = $item;
				continue;
			}

			if ( self::TYPE_UPLOAD !== $item['type'] ) {
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

		if ( self::TYPE_UPLOAD === $type ) {
			if ( ! current_user_can( 'upload_files' ) ) {
				return new WP_Error(
					'pufferdesk_wallpaper_upload_forbidden',
					__( 'You do not have permission to choose uploaded wallpapers.', 'pufferdesk' )
				);
			}

			$attachment_id = isset( $preference['attachment_id'] ) ? absint( $preference['attachment_id'] ) : 0;
			if ( ! $this->is_valid_image_attachment( $attachment_id ) ) {
				return new WP_Error(
					'pufferdesk_invalid_wallpaper_upload',
					__( 'Choose a valid image from the WordPress Media Library.', 'pufferdesk' )
				);
			}

			return true;
		}

		$item = $this->find_item( $type, isset( $preference['id'] ) ? $preference['id'] : '', $theme );
		if ( ! $item ) {
			return new WP_Error(
				'pufferdesk_invalid_wallpaper',
				__( 'The selected wallpaper is not available.', 'pufferdesk' )
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

		if ( self::TYPE_UPLOAD === $type ) {
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
				'type'      => self::TYPE_COLOR,
				'id'        => 'none',
				'label'     => __( 'Default', 'pufferdesk' ),
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
			'menu_contrast' => $this->get_item_menu_contrast( $item ),
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

		if ( $default_id && $this->find_item( self::TYPE_THEME, $default_id, $theme ) ) {
			return array(
				'type'          => self::TYPE_THEME,
				'id'            => $default_id,
				'attachment_id' => 0,
				'fit'           => 'cover',
				'position'      => 'center center',
			);
		}

		$items = $this->get_available_wallpapers( $theme );
		$item  = reset( $items );

		return array(
			'type'          => $item && ! empty( $item['type'] ) ? $item['type'] : self::TYPE_COLOR,
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
			'type'          => self::TYPE_UPLOAD,
			'id'            => 'custom',
			'attachment_id' => $attachment_id,
			'label'         => $label ? sanitize_text_field( $label ) : __( 'Custom Wallpaper', 'pufferdesk' ),
			'url'           => esc_url_raw( $url ),
			'css_value'     => $this->get_url_css_value( $url ),
			'preview'       => $this->get_url_css_value( $url ),
			'fit'           => isset( $preference['fit'] ) ? $preference['fit'] : 'cover',
			'position'      => isset( $preference['position'] ) ? $preference['position'] : 'center center',
			'menu_contrast' => 'auto',
		);
		$preference = array(
			'type'          => self::TYPE_UPLOAD,
			'id'            => '',
			'attachment_id' => $attachment_id,
			'fit'           => $item['fit'],
			'position'      => $item['position'],
		);

		return array(
			'preference'    => $preference,
			'item'          => $item,
			'css_variables' => $this->get_css_variables( $item, $preference ),
			'menu_contrast' => 'auto',
		);
	}

	/**
	 * Get the user's saved upload wallpaper items.
	 *
	 * @param PufferDesk_User_Preferences $preferences User preferences.
	 * @return array<int,array<string,mixed>>
	 */
	private function get_uploaded_wallpaper_items( PufferDesk_User_Preferences $preferences ) {
		$items = array();

		foreach ( $preferences->get_wallpaper_uploads() as $attachment_id ) {
			$resolved = $this->resolve_upload(
				array(
					'type'          => self::TYPE_UPLOAD,
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
	 * Get shared bundled wallpaper items available to every theme.
	 *
	 * @return array<int,array<string,mixed>>
	 */
	private function get_shared_wallpaper_items() {
		return $this->normalize_wallpaper_definitions(
			array(
				array(
					'id'        => 'aurora-flow',
					'label'     => __( 'Aurora', 'pufferdesk' ),
					'css_value' => 'radial-gradient(circle at 18% 20%, rgba(255, 255, 255, 0.34), transparent 24%), radial-gradient(circle at 78% 18%, rgba(46, 211, 255, 0.38), transparent 30%), linear-gradient(135deg, #2447c7 0%, #2fb8d2 52%, #8d3cff 100%)',
				),
				array(
					'id'        => 'aqua-horizon',
					'label'     => __( 'Aqua', 'pufferdesk' ),
					'css_value' => 'radial-gradient(circle at 16% 18%, rgba(255, 255, 255, 0.46), transparent 22%), linear-gradient(120deg, #1d5fbf 0%, #1eb4c9 55%, #62f1dc 100%)',
				),
				array(
					'id'        => 'alpine-mist',
					'label'     => __( 'Alpine', 'pufferdesk' ),
					'css_value' => 'radial-gradient(circle at 76% 22%, rgba(255, 255, 255, 0.42), transparent 24%), linear-gradient(130deg, #16406d 0%, #3a8e9b 48%, #9ac77c 100%)',
				),
				array(
					'id'        => 'canyon-light',
					'label'     => __( 'Canyon', 'pufferdesk' ),
					'css_value' => 'radial-gradient(circle at 72% 18%, rgba(255, 231, 174, 0.45), transparent 28%), linear-gradient(125deg, #ff5c39 0%, #d83c7d 48%, #783fd6 100%)',
				),
				array(
					'id'        => 'coral-ridge',
					'label'     => __( 'Coral', 'pufferdesk' ),
					'css_value' => 'radial-gradient(circle at 20% 18%, rgba(255, 255, 255, 0.38), transparent 24%), linear-gradient(120deg, #ff4438 0%, #ee2d7a 52%, #b22ed5 100%)',
				),
				array(
					'id'        => 'ember',
					'label'     => __( 'Ember', 'pufferdesk' ),
					'css_value' => 'linear-gradient(135deg, #ffffc4 0.000%, #ff6164 50.000%, #b00012 100.000%)',
				),
				array(
					'id'        => 'breeze',
					'label'     => __( 'Breeze', 'pufferdesk' ),
					'css_value' => 'linear-gradient(90deg, #07aeea 0.000%, #2bf598 100.000%)',
				),
				array(
					'id'        => 'solar',
					'label'     => __( 'Solar', 'pufferdesk' ),
					'css_value' => 'linear-gradient(90deg, #2a001b 0.000%, #78130c 16.667%, #ce480e 33.333%, #ff8d22 50.000%, #ffd543 66.667%, #ffff69 83.333%, #ffff8d 100.000%)',
				),
				array(
					'id'        => 'azure',
					'label'     => __( 'Azure', 'pufferdesk' ),
					'css_value' => 'linear-gradient(180deg, #003bff 0.000%, #004bff 8.333%, #125cff 16.667%, #2b6cff 25.000%, #447bff 33.333%, #5d8bff 41.667%, #7499ff 50.000%, #8aa7ff 58.333%, #9db3ff 66.667%, #adbfff 75.000%, #b9c9ff 83.333%, #c2d2ff 91.667%, #c6d9ff 100.000%)',
				),
				array(
					'id'        => 'lagoon-glow',
					'label'     => __( 'Lagoon', 'pufferdesk' ),
					'css_value' => 'radial-gradient(circle at 80% 20%, rgba(227, 255, 241, 0.36), transparent 26%), linear-gradient(135deg, #0c6a88 0%, #18b5b7 54%, #69ddbb 100%)',
				),
				array(
					'id'        => 'violet-wave',
					'label'     => __( 'Violet', 'pufferdesk' ),
					'css_value' => 'radial-gradient(circle at 22% 18%, rgba(255, 255, 255, 0.3), transparent 22%), linear-gradient(130deg, #2b4fcf 0%, #7042d8 46%, #df46a6 100%)',
				),
				array(
					'id'        => 'sunset-field',
					'label'     => __( 'Sunset', 'pufferdesk' ),
					'css_value' => 'radial-gradient(circle at 74% 18%, rgba(255, 239, 170, 0.48), transparent 24%), linear-gradient(120deg, #ff7a18 0%, #ff3f68 48%, #6d4cf5 100%)',
				),
				array(
					'id'        => 'mint-haze',
					'label'     => __( 'Mint', 'pufferdesk' ),
					'css_value' => 'radial-gradient(circle at 18% 16%, rgba(255, 255, 255, 0.4), transparent 24%), linear-gradient(135deg, #207a68 0%, #6ac99d 52%, #b4d676 100%)',
				),
				array(
					'id'        => 'nightfall',
					'label'     => __( 'Nightfall', 'pufferdesk' ),
					'css_value' => 'radial-gradient(circle at 78% 18%, rgba(92, 116, 255, 0.34), transparent 28%), radial-gradient(circle at 22% 76%, rgba(0, 204, 196, 0.22), transparent 32%), linear-gradient(135deg, #121d3d 0%, #242056 50%, #0f5364 100%)',
				),
				array(
					'id'        => 'switchyard',
					'label'     => __( 'Switchyard', 'pufferdesk' ),
					'css_value' => 'radial-gradient(circle at 14% 18%, rgba(107, 183, 162, 0.34), transparent 24%), radial-gradient(circle at 78% 22%, rgba(231, 172, 91, 0.26), transparent 30%), linear-gradient(135deg, #263445 0%, #53606c 48%, #97a092 100%)',
				),
				array(
					'id'        => 'blueprint',
					'label'     => __( 'Blueprint', 'pufferdesk' ),
					'css_value' => 'linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px), linear-gradient(0deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px), linear-gradient(135deg, #1f3a4c 0%, #31535b 54%, #6f7c69 100%)',
				),
				array(
					'id'        => 'terminal-light',
					'label'     => __( 'Terminal Light', 'pufferdesk' ),
					'css_value' => 'radial-gradient(circle at 82% 18%, rgba(250, 205, 117, 0.38), transparent 25%), linear-gradient(135deg, #e2e6df 0%, #bbc6c1 50%, #7d9095 100%)',
				),
				array(
					'id'        => 'pane-light',
					'label'     => __( 'Pane Light', 'pufferdesk' ),
					'css_value' => 'radial-gradient(circle at 18% 16%, rgba(255, 255, 255, 0.68), transparent 22%), radial-gradient(circle at 82% 18%, rgba(97, 178, 255, 0.38), transparent 28%), linear-gradient(135deg, #dfefff 0%, #bcd8f4 48%, #d8e4f7 100%)',
				),
				array(
					'id'        => 'ribbon-blue',
					'label'     => __( 'Ribbon Blue', 'pufferdesk' ),
					'css_value' => 'radial-gradient(circle at 74% 20%, rgba(115, 196, 255, 0.46), transparent 28%), radial-gradient(circle at 22% 72%, rgba(76, 110, 245, 0.28), transparent 34%), linear-gradient(135deg, #e7f3ff 0%, #a9caf5 52%, #d9d8f7 100%)',
				),
				array(
					'id'        => 'graphite-glow',
					'label'     => __( 'Graphite Glow', 'pufferdesk' ),
					'css_value' => 'radial-gradient(circle at 82% 20%, rgba(66, 153, 225, 0.3), transparent 28%), radial-gradient(circle at 18% 70%, rgba(125, 92, 255, 0.2), transparent 34%), linear-gradient(135deg, #1c2635 0%, #26384d 50%, #18202c 100%)',
				),
			)
		);
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
			$items = $this->normalize_wallpaper_definitions( $theme['media']['wallpapers']['items'] );
		}

		if ( empty( $items ) && ! empty( $theme['media']['wallpaper']['url'] ) ) {
			$items[] = array(
				'type'          => self::TYPE_THEME,
				'id'            => 'default',
				'label'         => __( 'Default', 'pufferdesk' ),
				'url'           => esc_url_raw( $theme['media']['wallpaper']['url'] ),
				'css_value'     => $this->get_url_css_value( $theme['media']['wallpaper']['url'] ),
				'preview'       => $this->get_url_css_value( $theme['media']['wallpaper']['url'] ),
				'fit'           => 'cover',
				'position'      => 'center center',
				'menu_contrast' => 'auto',
			);
		}

		return $items;
	}

	/**
	 * Normalize wallpaper definitions into usable theme wallpaper items.
	 *
	 * @param mixed $wallpapers Wallpaper definition list.
	 * @return array<int,array<string,mixed>>
	 */
	private function normalize_wallpaper_definitions( $wallpapers ) {
		$items = array();
		if ( ! is_array( $wallpapers ) ) {
			return $items;
		}

		foreach ( $wallpapers as $wallpaper ) {
			$item = $this->normalize_wallpaper_definition( $wallpaper );
			if ( $item ) {
				$items[] = $item;
			}
		}

		return $items;
	}

	/**
	 * Normalize one wallpaper definition into a theme wallpaper item.
	 *
	 * @param mixed $wallpaper Raw wallpaper definition.
	 * @return array<string,mixed>|null
	 */
	private function normalize_wallpaper_definition( $wallpaper ) {
		if ( ! is_array( $wallpaper ) || empty( $wallpaper['id'] ) ) {
			return null;
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
			return null;
		}

		return array(
			'type'          => self::TYPE_THEME,
			'id'            => sanitize_key( $wallpaper['id'] ),
			'label'         => isset( $wallpaper['label'] ) ? sanitize_text_field( $wallpaper['label'] ) : sanitize_key( $wallpaper['id'] ),
			'url'           => $url,
			'css_value'     => $css_value,
			'preview'       => $preview,
			'fit'           => isset( $wallpaper['fit'] ) ? sanitize_key( $wallpaper['fit'] ) : 'cover',
			'position'      => isset( $wallpaper['position'] ) ? sanitize_text_field( $wallpaper['position'] ) : 'center center',
			'menu_contrast' => $this->sanitize_menu_contrast( isset( $wallpaper['menu_contrast'] ) ? $wallpaper['menu_contrast'] : '' ),
		);
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

			$css_value = $this->sanitize_css_value( $item['css_value'] );
			$preview   = isset( $item['preview'] ) ? $this->sanitize_css_value( $item['preview'] ) : $css_value;
			if ( '' === $css_value || 'none' === $css_value ) {
				continue;
			}

			$contrast_item = array_merge(
				$item,
				array(
					'css_value' => $css_value,
				)
			);

			$normalized[ $this->get_item_key( $type, $id ) ] = array(
				'type'          => $type,
				'id'            => $id,
				'label'         => isset( $item['label'] ) ? sanitize_text_field( $item['label'] ) : $id,
				'url'           => isset( $item['url'] ) ? esc_url_raw( $item['url'] ) : '',
				'css_value'     => $css_value,
				'preview'       => $preview,
				'swatch'        => isset( $item['swatch'] ) ? $this->sanitize_swatch( $item['swatch'] ) : '',
				'fit'           => isset( $item['fit'] ) ? sanitize_key( $item['fit'] ) : 'cover',
				'position'      => isset( $item['position'] ) ? sanitize_text_field( $item['position'] ) : 'center center',
				'menu_contrast' => $this->get_item_menu_contrast( $contrast_item ),
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
				return __( 'Periwinkle', 'pufferdesk' );
			case 'cyan':
				return __( 'Cyan', 'pufferdesk' );
			case 'rose':
				return __( 'Rose', 'pufferdesk' );
			case 'blue':
				return __( 'Blue', 'pufferdesk' );
			case 'peach':
				return __( 'Peach', 'pufferdesk' );
			case 'cream':
				return __( 'Cream', 'pufferdesk' );
			case 'gold':
				return __( 'Gold', 'pufferdesk' );
			case 'magenta':
				return __( 'Magenta', 'pufferdesk' );
			case 'ember':
				return __( 'Ember', 'pufferdesk' );
			case 'blush':
				return __( 'Blush', 'pufferdesk' );
			case 'mist':
				return __( 'Mist', 'pufferdesk' );
			case 'pink':
				return __( 'Pink', 'pufferdesk' );
			case 'gray':
				return __( 'Gray', 'pufferdesk' );
			case 'silver':
				return __( 'Silver', 'pufferdesk' );
			case 'slate':
				return __( 'Slate', 'pufferdesk' );
			case 'teal':
				return __( 'Teal', 'pufferdesk' );
			case 'mint':
				return __( 'Mint', 'pufferdesk' );
			case 'yellow':
				return __( 'Yellow', 'pufferdesk' );
			case 'black':
			default:
				return __( 'Black', 'pufferdesk' );
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
			'--pdk-wallpaper-image'    => $css_value,
			'--pdk-wallpaper-size'     => $this->repeat_css_layer_value( $size, $layer_count ),
			'--pdk-wallpaper-position' => $this->repeat_css_layer_value( $position, $layer_count ),
			'--pdk-wallpaper-repeat'   => $this->repeat_css_layer_value( 'no-repeat', $layer_count ),
		);
	}

	/**
	 * Resolve the menu-bar contrast for a wallpaper item.
	 *
	 * @param array<string,mixed> $item Wallpaper item.
	 * @return string
	 */
	private function get_item_menu_contrast( $item ) {
		$explicit = $this->sanitize_menu_contrast( isset( $item['menu_contrast'] ) ? $item['menu_contrast'] : '' );
		if ( $explicit ) {
			return $explicit;
		}

		return $this->infer_menu_contrast( isset( $item['css_value'] ) ? $item['css_value'] : '' );
	}

	/**
	 * Sanitize a menu contrast token.
	 *
	 * @param mixed $value Raw value.
	 * @return string
	 */
	private function sanitize_menu_contrast( $value ) {
		$value = sanitize_key( (string) $value );

		return in_array( $value, array( 'dark', 'light', 'auto' ), true ) ? $value : '';
	}

	/**
	 * Infer whether the menu bar should use dark or light text.
	 *
	 * @param string $css_value CSS wallpaper image.
	 * @return string
	 */
	private function infer_menu_contrast( $css_value ) {
		$samples = $this->extract_css_color_samples( $css_value );
		if ( empty( $samples ) ) {
			return 'auto';
		}

		$total_weight = 0.0;
		$red          = 0.0;
		$green        = 0.0;
		$blue         = 0.0;

		foreach ( $samples as $sample ) {
			$weight = max( 0.05, (float) $sample['alpha'] );
			$total_weight += $weight;
			$red          += (float) $sample['red'] * $weight;
			$green        += (float) $sample['green'] * $weight;
			$blue         += (float) $sample['blue'] * $weight;
		}

		if ( $total_weight <= 0 ) {
			return 'auto';
		}

		return $this->get_rgb_menu_contrast(
			$red / $total_weight,
			$green / $total_weight,
			$blue / $total_weight
		);
	}

	/**
	 * Extract RGB color samples from a CSS image value.
	 *
	 * @param string $css_value CSS image value.
	 * @return array<int,array{red:float,green:float,blue:float,alpha:float}>
	 */
	private function extract_css_color_samples( $css_value ) {
		$samples   = array();
		$css_value = (string) $css_value;

		if ( preg_match_all( '/#([0-9a-f]{3}|[0-9a-f]{6})\b/i', $css_value, $matches ) ) {
			foreach ( $matches[1] as $hex ) {
				if ( 3 === strlen( $hex ) ) {
					$hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
				}

				$samples[] = array(
					'red'   => hexdec( substr( $hex, 0, 2 ) ),
					'green' => hexdec( substr( $hex, 2, 2 ) ),
					'blue'  => hexdec( substr( $hex, 4, 2 ) ),
					'alpha' => 1.0,
				);
			}
		}

		if ( preg_match_all( '/rgba?\(([^)]+)\)/i', $css_value, $matches ) ) {
			foreach ( $matches[1] as $value ) {
				$parts = preg_split( '/\s*,\s*/', trim( $value ) );
				if ( ! is_array( $parts ) || count( $parts ) < 3 ) {
					continue;
				}

				$samples[] = array(
					'red'   => $this->parse_css_color_channel( $parts[0] ),
					'green' => $this->parse_css_color_channel( $parts[1] ),
					'blue'  => $this->parse_css_color_channel( $parts[2] ),
					'alpha' => isset( $parts[3] ) ? max( 0.0, min( 1.0, (float) $parts[3] ) ) : 1.0,
				);
			}
		}

		return $samples;
	}

	/**
	 * Parse a CSS color channel.
	 *
	 * @param string $channel Channel value.
	 * @return float
	 */
	private function parse_css_color_channel( $channel ) {
		$channel = trim( $channel );
		if ( false !== strpos( $channel, '%' ) ) {
			return max( 0.0, min( 255.0, (float) $channel * 2.55 ) );
		}

		return max( 0.0, min( 255.0, (float) $channel ) );
	}

	/**
	 * Pick menu text contrast for an RGB sample.
	 *
	 * @param float $red Red channel.
	 * @param float $green Green channel.
	 * @param float $blue Blue channel.
	 * @return string
	 */
	private function get_rgb_menu_contrast( $red, $green, $blue ) {
		$brightness = ( $red * 0.299 ) + ( $green * 0.587 ) + ( $blue * 0.114 );
		$luminance  = $this->get_relative_luminance( $red, $green, $blue );
		$hue        = $this->get_rgb_hue( $red, $green, $blue );

		if ( $brightness < 108 || $luminance < 0.16 ) {
			$is_warm_or_magenta = $luminance >= 0.18 && ( $hue <= 35 || $hue >= 285 );

			return $is_warm_or_magenta ? 'dark' : 'light';
		}

		return 'dark';
	}

	/**
	 * Get relative luminance for RGB channels.
	 *
	 * @param float $red Red channel.
	 * @param float $green Green channel.
	 * @param float $blue Blue channel.
	 * @return float
	 */
	private function get_relative_luminance( $red, $green, $blue ) {
		$channels = array( $red, $green, $blue );
		foreach ( $channels as $index => $channel ) {
			$value              = max( 0.0, min( 255.0, $channel ) ) / 255;
			$channels[ $index ] = $value <= 0.04045 ? $value / 12.92 : pow( ( $value + 0.055 ) / 1.055, 2.4 );
		}

		return ( 0.2126 * $channels[0] ) + ( 0.7152 * $channels[1] ) + ( 0.0722 * $channels[2] );
	}

	/**
	 * Get hue for RGB channels.
	 *
	 * @param float $red Red channel.
	 * @param float $green Green channel.
	 * @param float $blue Blue channel.
	 * @return float
	 */
	private function get_rgb_hue( $red, $green, $blue ) {
		$red   = max( 0.0, min( 255.0, $red ) ) / 255;
		$green = max( 0.0, min( 255.0, $green ) ) / 255;
		$blue  = max( 0.0, min( 255.0, $blue ) ) / 255;
		$max   = max( $red, $green, $blue );
		$min   = min( $red, $green, $blue );
		$delta = $max - $min;

		if ( $delta <= 0 ) {
			return 0.0;
		}

		if ( $max === $red ) {
			$hue = fmod( ( ( $green - $blue ) / $delta ), 6 );
		} elseif ( $max === $green ) {
			$hue = ( ( $blue - $red ) / $delta ) + 2;
		} else {
			$hue = ( ( $red - $green ) / $delta ) + 4;
		}

		$hue *= 60;

		return $hue < 0 ? $hue + 360 : $hue;
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
