import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import type { UppyFile, UploadResult } from "@uppy/core";
import DashboardModal from "@uppy/react/dashboard-modal";
import "@uppy/core/css/style.min.css";
import "@uppy/dashboard/css/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import { Button } from "@/components/ui/button";
import { comprimirImagen, esImagenComprimible } from "@/lib/imageCompression";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  /**
   * Function to get upload parameters for each file.
   * IMPORTANT: This receives the file object - use file.name, file.size, file.type
   * to request per-file presigned URLs from your backend.
   */
  onGetUploadParameters: (
    file: UppyFile<Record<string, unknown>, Record<string, unknown>>
  ) => Promise<{
    method: "PUT";
    url: string;
    headers?: Record<string, string>;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  /**
   * Comprime las imagenes antes de subirlas. Activar SOLO para fotos
   * (tickets, visitas, evidencia). Los documentos contables —boletas,
   * facturas, cotizaciones— se suben fieles al original y deben dejarlo en
   * false, que es el valor por defecto.
   */
  compressImages?: boolean;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * A file upload component that renders as a button and provides a modal interface for
 * file management.
 *
 * Features:
 * - Renders as a customizable button that opens a file upload modal
 * - Provides a modal interface for:
 *   - File selection
 *   - File preview
 *   - Upload progress tracking
 *   - Upload status display
 *
 * The component uses Uppy v5 under the hood to handle all file upload functionality.
 * All file management features are automatically handled by the Uppy dashboard modal.
 *
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files allowed to be uploaded
 *   (default: 1)
 * @param props.maxFileSize - Maximum file size in bytes (default: 10MB)
 * @param props.onGetUploadParameters - Function to get upload parameters for each file.
 *   Receives the UppyFile object with file.name, file.size, file.type properties.
 *   Use these to request per-file presigned URLs from your backend. Returns method,
 *   url, and optional headers for the upload request.
 * @param props.onComplete - Callback function called when upload is complete. Typically
 *   used to make post-upload API calls to update server state and set object ACL
 *   policies.
 * @param props.buttonClassName - Optional CSS class name for the button
 * @param props.children - Content to be rendered inside the button
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  compressImages = false,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);

  // La instancia de Uppy se crea UNA sola vez, asi que los callbacks que se le
  // pasan ahi quedan congelados en el primer render y no ven el estado actual
  // del componente que los usa. Se guardan en refs y se leen al vuelo.
  const onCompleteRef = useRef(onComplete);
  const onGetUploadParametersRef = useRef(onGetUploadParameters);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onGetUploadParametersRef.current = onGetUploadParameters;
  });

  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
      },
      autoProceed: true,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: (file) => onGetUploadParametersRef.current(file),
      })
      .on("upload", () => {
        // no-op: engancha el ciclo de subida para que el preprocesador corra
      })
      .on("complete", (result) => {
        // Cerrar el modal al terminar: sin esto la ventana de carga queda
        // abierta y parece que sigue subiendo aunque ya haya terminado.
        setShowModal(false);
        onCompleteRef.current?.(result);
        // Limpiar para que la proxima apertura no muestre los archivos previos.
        uppyRef.current?.clear();
      })
  );
  const uppyRef = useRef<typeof uppy | null>(null);
  uppyRef.current = uppy;

  const compressImagesRef = useRef(compressImages);
  compressImagesRef.current = compressImages;

  // Comprime las fotos justo antes de subirlas. Los PDF y cualquier archivo que
  // no sea imagen pasan de largo, igual que las imagenes cuando el llamador
  // pidio fidelidad al original (compressImages = false).
  useEffect(() => {
    const preprocesar = async (fileIDs: string[]) => {
      if (!compressImagesRef.current) return;
      for (const id of fileIDs) {
        const file = uppy.getFile(id);
        if (!file || !esImagenComprimible(file.type)) continue;
        try {
          const comprimida = await comprimirImagen(file.data as Blob);
          if (comprimida) {
            uppy.setFileState(id, {
              data: comprimida,
              size: comprimida.size,
            } as never);
          }
        } catch {
          // Ante cualquier problema se sube el original: perder la foto seria peor.
        }
      }
    };
    uppy.addPreProcessor(preprocesar);
    return () => {
      uppy.removePreProcessor(preprocesar);
    };
  }, [uppy]);

  return (
    <div>
      <Button type="button" onClick={() => setShowModal(true)} className={buttonClassName}>
        {children}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
      />
    </div>
  );
}

