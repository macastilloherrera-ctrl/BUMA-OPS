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

  // Estrategia de cache para SPA con bundles hasheados:
  //
  // - `index.html` → no-cache: el HTML referencia los chunks JS/CSS por su
  //   nombre hasheado. Cuando hacemos un nuevo deploy, los hashes cambian,
  //   por lo tanto el HTML cambia. Si el browser cachea el HTML viejo,
  //   sigue pidiendo los chunks viejos. Para que descubra los nuevos hashes
  //   tras cada deploy, el HTML debe revalidarse contra el server siempre.
  //
  // - `/assets/*` (chunks hasheados de Vite) → immutable: el contenido del
  //   chunk nunca cambia para un mismo nombre — si cambia el contenido,
  //   cambia el hash y cambia el nombre. Así que se puede cachear forever.
  //
  // Esto resuelve el caso de Firefox: si el browser tenía el index.html
  // viejo cacheado, ahora con el redeploy va a recargarlo y descubrir los
  // chunks nuevos. Sin esto, Firefox podía servir indefinidamente bundle
  // viejo aunque hubiera deploy nuevo.
  app.use(
    express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
          return;
        }
        const assetsDir = `${path.sep}assets${path.sep}`;
        if (filePath.includes(assetsDir)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    }),
  );

  // SPA fallback — sirve index.html para cualquier ruta no-API.
  // También aplica no-cache porque es el mismo HTML.
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
