import fs from "fs";
import path from "path";

const htaccessContent = `
# Habilitar el manejo de errores
RewriteEngine On

# Redirigir todas las solicitudes excepto las de archivos y directorios existentes a index.html
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L]
`;

const buildPath = path.join(process.cwd(), "dist", ".htaccess");

fs.writeFile(buildPath, htaccessContent.trim(), (err) => {
  if (err) {
    console.error("Error al crear el archivo .htaccess:", err);
  } else {
    console.log(".htaccess creado exitosamente en la carpeta de dist.");
  }
});
