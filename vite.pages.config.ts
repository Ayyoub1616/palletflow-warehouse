import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { defineConfig } from 'vite';

export default defineConfig({
  root:'pages-src',
  base:'/palletflow-warehouse/',
  publicDir:'../public',
  define:{'import.meta.env.VITE_API_BASE_URL':JSON.stringify('https://palletflow-warehouse.truthisoutchannel.chatgpt.site')},
  css:{postcss:{plugins:[tailwindcss()]}},
  plugins:[react()],
  build:{outDir:'../.pages-dist',emptyOutDir:true},
});
