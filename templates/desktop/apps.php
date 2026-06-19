<?php
/**
 * Desktop app icons.
 *
 * @package PufferDesk
 */

defined( 'ABSPATH' ) || exit;

/**
 * Template variables.
 *
 * @var array<int,array<string,mixed>>  $apps
 * @var array<string,string>            $labels
 * @var array<string,mixed>             $theme
 * @var array<string,mixed>             $workspace_state
 */

if ( empty( $apps ) ) {
	return;
}

$pufferdesk_workspace_state      = isset( $workspace_state ) && is_array( $workspace_state ) ? $workspace_state : array();
$pufferdesk_labels               = isset( $labels ) && is_array( $labels ) ? $labels : PufferDesk_Runtime_Config::get_shell_template_labels( isset( $theme ) && is_array( $theme ) ? $theme : array() );
$pufferdesk_apps_layer_restored  = PufferDesk_Desktop_Layout::layer_has_saved_icon_positions( $apps, $pufferdesk_workspace_state, 'app' );
$pufferdesk_apps_layer_class     = 'pdk-desktop-apps pdk-desktop-icon-layer';
$pufferdesk_apps_layer_class    .= $pufferdesk_apps_layer_restored ? ' is-managed' : '';
$pufferdesk_desktop_icon_labels  = array();

if ( ! empty( $pufferdesk_workspace_state[ PufferDesk_Workspace_State::SECTION_DESKTOP_ICONS ] ) && is_array( $pufferdesk_workspace_state[ PufferDesk_Workspace_State::SECTION_DESKTOP_ICONS ] ) ) {
	foreach ( $pufferdesk_workspace_state[ PufferDesk_Workspace_State::SECTION_DESKTOP_ICONS ] as $pufferdesk_desktop_icon ) {
		if ( ! is_array( $pufferdesk_desktop_icon ) || empty( $pufferdesk_desktop_icon['id'] ) || empty( $pufferdesk_desktop_icon['label'] ) ) {
			continue;
		}

		$pufferdesk_desktop_icon_id = (string) $pufferdesk_desktop_icon['id'];
		if ( 0 !== strpos( $pufferdesk_desktop_icon_id, PufferDesk_Workspace_State::DESKTOP_ICON_PREFIX_APP ) ) {
			continue;
		}

		$pufferdesk_desktop_icon_labels[ substr( $pufferdesk_desktop_icon_id, strlen( PufferDesk_Workspace_State::DESKTOP_ICON_PREFIX_APP ) ) ] = (string) $pufferdesk_desktop_icon['label'];
	}
}
?>
<section class="<?php echo esc_attr( $pufferdesk_apps_layer_class ); ?>" aria-label="<?php echo esc_attr( isset( $pufferdesk_labels['desktop_apps'] ) ? $pufferdesk_labels['desktop_apps'] : 'desktop_apps' ); ?>">
	<?php foreach ( $apps as $pufferdesk_app ) : ?>
		<?php
		$pufferdesk_app_id                 = isset( $pufferdesk_app['id'] ) ? (string) $pufferdesk_app['id'] : '';
		$pufferdesk_app_default_label      = isset( $pufferdesk_app['label'] ) ? (string) $pufferdesk_app['label'] : '';
		$pufferdesk_app_has_label_override = isset( $pufferdesk_desktop_icon_labels[ $pufferdesk_app_id ] );
		$pufferdesk_app_label              = $pufferdesk_app_has_label_override ? $pufferdesk_desktop_icon_labels[ $pufferdesk_app_id ] : $pufferdesk_app_default_label;
		$pufferdesk_app_badge              = isset( $pufferdesk_app['badge'] ) && is_array( $pufferdesk_app['badge'] ) ? $pufferdesk_app['badge'] : array();
		$pufferdesk_aria_label             = PufferDesk_App_Badge_Renderer::get_aria_label( $pufferdesk_app_label, $pufferdesk_app_badge );
		?>
		<button
			type="button"
			class="pdk-desktop-icon pdk-desktop-app"
			data-pdk-context="<?php echo esc_attr( PufferDesk_Context_Menu_Contracts::TARGET_DESKTOP_APP ); ?>"
			data-pdk-context-id="<?php echo esc_attr( $pufferdesk_app_id ); ?>"
			data-pdk-context-label="<?php echo esc_attr( $pufferdesk_app_label ); ?>"
			data-pdk-desktop-icon
			data-pdk-desktop-icon-default-label="<?php echo esc_attr( $pufferdesk_app_default_label ); ?>"
			data-pdk-desktop-icon-id="<?php echo esc_attr( PufferDesk_Workspace_State::desktop_app_icon_id( $pufferdesk_app_id ) ); ?>"
			data-pdk-desktop-icon-kind="app"
			data-pdk-open-app="<?php echo esc_attr( $pufferdesk_app_id ); ?>"
			<?php if ( $pufferdesk_app_has_label_override ) : ?>
				data-pdk-desktop-icon-label-override="1"
			<?php endif; ?>
			<?php if ( $pufferdesk_apps_layer_restored ) : ?>
				<?php PufferDesk_Desktop_Layout::render_icon_attributes( PufferDesk_Workspace_State::desktop_app_icon_id( $pufferdesk_app_id ), $pufferdesk_workspace_state ); ?>
			<?php endif; ?>
			aria-label="<?php echo esc_attr( $pufferdesk_aria_label ); ?>"
		>
			<span class="pdk-app-icon">
				<?php PufferDesk_Icon_Renderer::render( $pufferdesk_app['icon'], $theme ); ?>
				<?php PufferDesk_App_Badge_Renderer::render( $pufferdesk_app_badge ); ?>
			</span>
			<span class="pdk-desktop-app-label"><?php echo esc_html( $pufferdesk_app_label ); ?></span>
		</button>
	<?php endforeach; ?>
</section>
