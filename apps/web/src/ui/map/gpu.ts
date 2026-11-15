// SI-assisted (Claude Code); reviewed by <name>
/**
 * ¿El navegador dibuja WebGL por software (sin GPU)? Pasa en máquinas virtuales, escritorios
 * remotos y navegadores de prueba: ahí las capas satelitales animadas sobre el globo saturan la
 * página, así que el globo arranca sin capa.
 */
export function softwareRendering(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return true;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
  } catch {
    return false;
  }
}
