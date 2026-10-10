import sharp from 'sharp';
import {mkdirSync} from 'node:fs';
const root=new URL('../public/icons/',import.meta.url);mkdirSync(root,{recursive:true});
// Original vector mark. All meaningful artwork fits Android's maskable safe area.
const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#243c31"/><path d="M142 318V206h46c37 0 57 15 57 43 0 19-10 31-27 38l32 31h-41l-30-29h-5v29zm32-55h15c16 0 24-4 24-14s-8-15-24-15h-15zM262 206h32v66c0 15 7 23 20 23s20-8 20-23v-66h32v67c0 32-19 48-52 48s-52-16-52-48z" fill="#fffdf7"/><path d="M300 156h50v50m-3-47-53 53" stroke="#e46c38" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`);
for(const [file,size] of [['icon-192.png',192],['icon-512.png',512],['maskable-512.png',512],['apple-touch-icon.png',180]])await sharp(svg).resize(size,size).png().toFile(new URL(file,root).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
console.log('Generated four RUdown app icons.');
