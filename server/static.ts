import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Estrategia: setear Cache-Control en un middleware ANTES de que
  // express.static y res.sendFile entren a actuar. El módulo `send` solo
  // setea su default 'public, max-age=0' cuando NO hay Cache-Control
  // previo en la response — si lo seteamos primero acá, no lo sobrescribe.
  // Adicionalmente pasamos `cacheControl: false` a send para deshabilitar
  // ese default por completo (defensa en profundidad).
  //
  // Reglas:
  // - /assets/*  → immutable (chunks hasheados de Vite, contenido eterno)
  // - cualquier otra ruta no-API → no-cache, no-store, must-revalidate
  //   (cubre index.html y la fallback de SPA en cada ruta del cliente)
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) return next();

    if (req.path.startsWith("/assets/")) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
    next();
  });

  app.use(express.static(distPath, { cacheControl: false }));

  // SPA fallback. cacheControl:false impide que sendFile reintroduzca el
  // default; el middleware previo ya setteó los headers correctos.
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"), { cacheControl: false });
  });
}
