<?php
/**
 * First-run onboarding Sticky Note seeding.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Creates one welcome Sticky Note for new PufferDesk users.
 */
final class PufferDesk_Onboarding_Note {
	const META_PREFIX = 'pufferdesk_onboarding_note';
	const VERSION     = 1;

	/**
	 * Workspace state service.
	 *
	 * @var PufferDesk_Workspace_State
	 */
	private $workspace_state;

	/**
	 * Sticky Notes document service.
	 *
	 * @var PufferDesk_Document_Service
	 */
	private $documents;

	/**
	 * Virtual filesystem service.
	 *
	 * @var PufferDesk_Virtual_Filesystem
	 */
	private $virtual_filesystem;

	/**
	 * Constructor.
	 *
	 * @param PufferDesk_Workspace_State     $workspace_state Workspace state service.
	 * @param PufferDesk_Document_Service    $documents Sticky Notes document service.
	 * @param PufferDesk_Virtual_Filesystem  $virtual_filesystem Virtual filesystem service.
	 */
	public function __construct(
		PufferDesk_Workspace_State $workspace_state,
		PufferDesk_Document_Service $documents,
		PufferDesk_Virtual_Filesystem $virtual_filesystem
	) {
		$this->workspace_state    = $workspace_state;
		$this->documents          = $documents;
		$this->virtual_filesystem = $virtual_filesystem;
	}

	/**
	 * Seed the first-run welcome Sticky Note when the user has no prior workspace.
	 *
	 * @param array<string,array<string,mixed>> $themes Available themes.
	 * @param array<int,array<string,mixed>>    $apps Available apps.
	 * @param array<int,array<string,mixed>>    $widgets Available widgets.
	 * @param array<int,array<string,mixed>>    $folders Available folders.
	 */
	public function maybe_seed( $themes, $apps, $widgets, $folders ) {
		$user_id = get_current_user_id();

		if (
			! $user_id
			|| ! current_user_can( 'read' )
			|| ! $this->documents->current_user_can_use_documents()
			|| $this->has_seed_marker( $user_id )
			|| $this->user_has_workspace_state( $user_id )
			|| $this->user_has_sticky_notes()
		) {
			return;
		}

		$marker = array(
			'created_at'  => current_time( 'mysql', true ),
			'document_id' => 0,
			'status'      => 'creating',
			'version'     => self::VERSION,
		);

		if ( ! add_user_meta( $user_id, $this->get_meta_key(), $marker, true ) ) {
			return;
		}

		$document = $this->documents->create_document(
			array(
				'color'      => 'yellow',
				'content'    => $this->get_note_content(),
				'kind'       => PufferDesk_Document_Service::KIND_STICKY,
				'parentPath' => $this->virtual_filesystem->get_default_path_for_document_kind( PufferDesk_Document_Service::KIND_STICKY, $user_id ),
				'title'      => $this->get_note_title(),
			)
		);

		if ( is_wp_error( $document ) || empty( $document['id'] ) ) {
			delete_user_meta( $user_id, $this->get_meta_key() );
			return;
		}

		$document_id = absint( $document['id'] );
		$theme_ids   = $this->seed_workspace_layouts( $document_id, $themes, $apps, $widgets, $folders, $user_id );

		update_user_meta(
			$user_id,
			$this->get_meta_key(),
			array(
				'created_at'  => $marker['created_at'],
				'document_id' => $document_id,
				'status'      => 'created',
				'theme_ids'   => $theme_ids,
				'version'     => self::VERSION,
			)
		);
	}

	/**
	 * Seed theme-scoped Sticky Note layout records.
	 *
	 * @param int                              $document_id Sticky Note document ID.
	 * @param array<string,array<string,mixed>> $themes Available themes.
	 * @param array<int,array<string,mixed>>   $apps Available apps.
	 * @param array<int,array<string,mixed>>   $widgets Available widgets.
	 * @param array<int,array<string,mixed>>   $folders Available folders.
	 * @param int                              $user_id User ID.
	 * @return array<int,string>
	 */
	private function seed_workspace_layouts( $document_id, $themes, $apps, $widgets, $folders, $user_id ) {
		$seeded = array();

		foreach ( $this->get_target_themes( $themes ) as $theme ) {
			$theme_id = isset( $theme['id'] ) ? sanitize_key( (string) $theme['id'] ) : '';
			if ( '' === $theme_id ) {
				continue;
			}

			$state = $this->workspace_state->get_state( $theme_id, $apps, $widgets, $folders, $user_id );
			$notes = isset( $state[ PufferDesk_Workspace_State::SECTION_STICKY_NOTES ] ) && is_array( $state[ PufferDesk_Workspace_State::SECTION_STICKY_NOTES ] )
				? $state[ PufferDesk_Workspace_State::SECTION_STICKY_NOTES ]
				: array();

			if ( $this->has_sticky_note_layout( $notes, $document_id ) ) {
				$seeded[] = $theme_id;
				continue;
			}

			$notes[] = array(
				'id'    => $document_id,
				'state' => $this->get_layout_state( $theme ),
			);

			$state[ PufferDesk_Workspace_State::SECTION_STICKY_NOTES ] = $notes;
			$expected_updated_at = isset( $state['updatedAt'] ) ? absint( $state['updatedAt'] ) : 0;
			$saved = $this->workspace_state->set_state( $theme_id, $state, $apps, $widgets, $folders, $user_id, $expected_updated_at );

			if ( ! is_wp_error( $saved ) ) {
				$seeded[] = $theme_id;
			}
		}

		return array_values( array_unique( $seeded ) );
	}

	/**
	 * Target bundled themes for the onboarding note.
	 *
	 * @param array<string,array<string,mixed>> $themes Available themes.
	 * @return array<int,array<string,mixed>>
	 */
	private function get_target_themes( $themes ) {
		$targets = array();

		foreach ( is_array( $themes ) ? $themes : array() as $theme ) {
			if ( ! is_array( $theme ) || ! empty( $theme['abstract'] ) ) {
				continue;
			}

			$family = isset( $theme['family'] ) ? sanitize_key( (string) $theme['family'] ) : '';
			if ( in_array( $family, array( 'default', 'cupertino', 'redmond' ), true ) ) {
				$targets[] = $theme;
			}
		}

		return $targets;
	}

	/**
	 * Default first-run layout for the note.
	 *
	 * @param array<string,mixed> $theme Theme metadata.
	 * @return array<string,mixed>
	 */
	private function get_layout_state( $theme ) {
		$is_redmond = isset( $theme['family'] ) && 'redmond' === sanitize_key( (string) $theme['family'] );
		$width      = $is_redmond ? 305 : 360;
		$height     = $is_redmond ? 254 : 285;

		return array(
			'expandedHeight' => $height,
			'height'         => $height,
			'hidden'         => false,
			'right'          => 24,
			'top'            => 220,
			'width'          => $width,
			'zIndex'         => 41,
		);
	}

	/**
	 * Whether a layout list already contains this Sticky Note.
	 *
	 * @param array<int,array<string,mixed>> $notes Sticky Note layout records.
	 * @param int                           $document_id Document ID.
	 * @return bool
	 */
	private function has_sticky_note_layout( $notes, $document_id ) {
		foreach ( $notes as $note ) {
			if ( is_array( $note ) && isset( $note['id'] ) && absint( $note['id'] ) === $document_id ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Whether this user already has the onboarding marker.
	 *
	 * @param int $user_id User ID.
	 * @return bool
	 */
	private function has_seed_marker( $user_id ) {
		return '' !== get_user_meta( $user_id, $this->get_meta_key(), true );
	}

	/**
	 * Whether this user has any current-site PufferDesk workspace state.
	 *
	 * @param int $user_id User ID.
	 * @return bool
	 */
	private function user_has_workspace_state( $user_id ) {
		$site_prefix = PufferDesk_Workspace_State::META_PREFIX . '_' . absint( get_current_blog_id() ) . '_';
		$meta        = get_user_meta( $user_id );

		foreach ( array_keys( $meta ) as $meta_key ) {
			if ( 0 === strpos( $meta_key, $site_prefix ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Whether this user already has Sticky Notes documents.
	 *
	 * @return bool
	 */
	private function user_has_sticky_notes() {
		$documents = $this->documents->list_documents( PufferDesk_Document_Service::KIND_STICKY, '' );

		return is_array( $documents ) && ! empty( $documents );
	}

	/**
	 * User-meta key scoped to the current site.
	 *
	 * @return string
	 */
	private function get_meta_key() {
		return self::META_PREFIX . '_' . absint( get_current_blog_id() );
	}

	/**
	 * Welcome note title.
	 *
	 * @return string
	 */
	private function get_note_title() {
		return __( 'Welcome to PufferDesk', 'pufferdesk' );
	}

	/**
	 * Welcome note content.
	 *
	 * @return string
	 */
	private function get_note_content() {
		return sprintf(
			'<p>%1$s</p><p>%2$s</p><p>%3$s</p>',
			esc_html__( 'Your WordPress admin has a desktop now.', 'pufferdesk' ),
			esc_html__( 'Drag windows, right-click the desktop, and make folders.', 'pufferdesk' ),
			esc_html__( 'Classic Admin is still one click away.', 'pufferdesk' )
		);
	}
}
