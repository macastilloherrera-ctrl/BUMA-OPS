/**
 * Compresión de imágenes en el navegador, antes de subirlas.
 *
 * Se usa SOLO para fotos (tickets, visitas, evidencia). Los documentos
 * contables —boletas, facturas, cotizaciones— se suben fieles al original y
 * nunca pasan por acá: recomprimir un documento le quita valor probatorio.
 */

export interface CompressionOptions {
  /** Lado máximo en píxeles. Por encima, la foto se reescala. */
  maxDimension?: number;
  /** Calidad JPEG, de 0 a 1. */
  quality?: number;
}

const DEFAULTS: Required<CompressionOptions> = {
  maxDimension: 1920,
  quality: 0.82,
};

/** Formatos que no conviene recomprimir: vectores y animados. */
const NO_COMPRIMIR = new Set(["image/svg+xml", "image/gif"]);

export function esImagenComprimible(tipo: string | undefined | null): boolean {
  if (!tipo) return false;
  return tipo.startsWith("image/") && !NO_COMPRIMIR.has(tipo);
}

/**
 * Devuelve una versión más liviana de la imagen, o null si no corresponde
 * comprimirla o si el resultado no sería más chico que el original.
 */
export async function comprimirImagen(
  archivo: Blob,
  opciones: CompressionOptions = {},
): Promise<Blob | null> {
  const { maxDimension, quality } = { ...DEFAULTS, ...opciones };

  if (!esImagenComprimible(archivo.type)) return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(archivo);
  } catch {
    // Si el navegador no puede decodificarla, se sube tal cual.
    return null;
  }

  try {
    const escala = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Fondo blanco: al pasar a JPEG, la transparencia quedaría negra.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(bitmap, 0, 0, ancho, alto);

    const comprimida = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );

    // Si no achicó nada, no vale la pena perder el original.
    if (!comprimida || comprimida.size >= archivo.size) return null;
    return comprimida;
  } finally {
    bitmap.close();
  }
}
