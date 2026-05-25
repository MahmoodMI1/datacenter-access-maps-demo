import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const POLYFILL = `if(!Promise.withResolvers){Promise.withResolvers=function(){let r,j;const p=new Promise((a,b)=>{r=a;j=b});return{promise:p,resolve:r,reject:j};}}`;

export default defineConfig({
  plugins: [
    react(),
    {
      name: "pdf-worker-safari-polyfill",
      transform(code, id) {
        if (id.includes("pdf.worker")) {
          return { code: POLYFILL + "\n" + code, map: null };
        }
      },
      renderChunk(code, chunk) {
        if (chunk.fileName.includes("pdf.worker")) {
          return { code: POLYFILL + "\n" + code, map: null };
        }
      },
    },
  ],
});
