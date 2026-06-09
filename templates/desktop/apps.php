<?php
/**
 * Desktop app icons.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * @var array<int,array<string,mixed>>  $apps
 * @var array<string,mixed>             $theme
 * @var array<string,mixed>             $workspace_state
 */

if ( empty( $apps ) ) {
	return;
}

$pufferdesk_workspace_state      = isset( $workspace_state ) && is_array( $workspace_state ) ? $workspace_state : array();
$pufferdesk_apps_layer_restored  = PufferDesk_Desktop_Layout::layer_has_saved_icon_positions( $apps, $pufferdesk_workspace_state, 'app' );
$pufferdesk_apps_layer_class     = 'pdk-desktop-apps pdk-desktop-icon-layer';
$pufferdesk_apps_layer_class    .= $pufferdesk_apps_layer_restored ? ' is-managed' : '';
?>
<section class="<?php echo esc_attr( $pufferdesk_apps_layer_class ); ?>" aria-label="<?php esc_attr_e( 'Desktop apps', 'pufferdesk-admin-desktop' ); ?>">
	<?php foreach ( $apps as $pufferdesk_app ) : ?>
		<?php
		$pufferdesk_app_label   = isset( $pufferdesk_app['label'] ) ? (string) $pufferdesk_app['label'] : '';
		$pufferdesk_app_badge   = isset( $pufferdesk_app['badge'] ) && is_array( $pufferdesk_app['badge'] ) ? $pufferdesk_app['badge'] : array();
		$pufferdesk_badge_text  = isset( $pufferdesk_app_badge['text'] ) ? (string) $pufferdesk_app_badge['text'] : '';
		$pufferdesk_badge_tone  = isset( $pufferdesk_app_badge['tone'] ) ? sanitize_html_class( (string) $pufferdesk_app_badge['tone'] ) : 'attention';
		$pufferdesk_badge_tone  = '' !== $pufferdesk_badge_tone ? $pufferdesk_badge_tone : 'attention';
		$pufferdesk_badge_label = isset( $pufferdesk_app_badge['aria_label'] ) ? (string) $pufferdesk_app_badge['aria_label'] : '';
		$pufferdesk_aria_label  = '' !== $pufferdesk_badge_label
			? sprintf(
				/* translators: 1: app label, 2: app badge accessibility label. */
				__( '%1$s, %2$s', 'pufferdesk-admin-desktop' ),
				$pufferdesk_app_label,
				$pufferdesk_badge_label
			)
			: $pufferdesk_app_label;
		?>
		<button
			type="button"
			class="pdk-desktop-icon pdk-desktop-app"
			data-pdk-context="desktop-app"
			data-pdk-context-id="<?php echo esc_attr( $pufferdesk_app['id'] ); ?>"
			data-pdk-context-label="<?php echo esc_attr( $pufferdesk_app_label ); ?>"
			data-pdk-desktop-icon
			data-pdk-desktop-icon-id="<?php echo esc_attr( 'app:' . $pufferdesk_app['id'] ); ?>"
			data-pdk-desktop-icon-kind="app"
			data-pdk-open-app="<?php echo esc_attr( $pufferdesk_app['id'] ); ?>"
			<?php if ( $pufferdesk_apps_layer_restored ) : ?>
				<?php PufferDesk_Desktop_Layout::render_icon_attributes( 'app:' . $pufferdesk_app['id'], $pufferdesk_workspace_state ); ?>
			<?php endif; ?>
			aria-label="<?php echo esc_attr( $pufferdesk_aria_label ); ?>"
		>
			<span class="pdk-app-icon">
				<?php PufferDesk_Icon_Renderer::render( $pufferdesk_app['icon'], $theme ); ?>
				<?php if ( '' !== $pufferdesk_badge_text ) : ?>
					<span class="pdk-app-badge pdk-app-badge-<?php echo esc_attr( $pufferdesk_badge_tone ); ?>" aria-hidden="true"><?php echo esc_html( $pufferdesk_badge_text ); ?></span>
				<?php endif; ?>
			</span>
			<span class="pdk-desktop-app-label"><?php echo esc_html( $pufferdesk_app_label ); ?></span>
		</button>
	<?php endforeach; ?>
</section>
