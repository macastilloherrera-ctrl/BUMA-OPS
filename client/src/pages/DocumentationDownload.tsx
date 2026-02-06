import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Book, Shield, Code } from "lucide-react";

interface DocFile {
  name: string;
  url: string;
}

export default function DocumentationDownload() {
  const { data, isLoading } = useQuery<{ files: DocFile[] }>({
    queryKey: ["/api/docs"],
  });

  const getFileIcon = (name: string) => {
    if (name.includes("Usuario")) return <Book className="h-8 w-8 text-blue-500" />;
    if (name.includes("Administracion")) return <Shield className="h-8 w-8 text-green-500" />;
    if (name.includes("Tecnica")) return <Code className="h-8 w-8 text-purple-500" />;
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  const getFileDescription = (name: string) => {
    if (name.includes("Usuario")) {
      return "Guía completa para usuarios del sistema con instrucciones por rol";
    }
    if (name.includes("Administracion")) {
      return "Manual para administradores del sistema y gestión de usuarios";
    }
    if (name.includes("Tecnica")) {
      return "Documentación técnica con arquitectura, APIs y modelo de datos";
    }
    return "Documento del sistema";
  };

  const handleDownload = (url: string, name: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const files = data?.files || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Documentación del Sistema</h1>
          <p className="text-muted-foreground">Descarga los manuales y guías de BUMA OPS</p>
        </div>
      </div>

      {files.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No hay documentos disponibles para descargar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {files.map((file) => (
            <Card key={file.name} className="hover-elevate">
              <CardHeader>
                <div className="flex items-center gap-3">
                  {getFileIcon(file.name)}
                  <div>
                    <CardTitle className="text-lg">
                      {file.name.replace(/_/g, " ").replace(".docx", "")}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Documento Word (.docx)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {getFileDescription(file.name)}
                </p>
                <Button 
                  className="w-full" 
                  onClick={() => handleDownload(file.url, file.name)}
                  data-testid={`button-download-${file.name}`}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
