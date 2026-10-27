import {mkdir,copyFile} from 'node:fs/promises';
// Only this explicit public allowlist is uploaded as browser-readable assets.
await mkdir(new URL('./public/',import.meta.url),{recursive:true});
for(const file of ['index.html','styles.css','app.js','admin.html','admin.css','admin.js','接通指南.md']) {
  await copyFile(new URL(file,import.meta.url),new URL(`public/${file}`,import.meta.url));
}
