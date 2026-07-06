// Descifra una marca de agua de un capítulo filtrado.
// Uso:  WATERMARK_KEY=<clave-base64> node scripts/decode-watermark.mjs "<valor tras df:>"
// (el valor empieza por "enc:" si está cifrado, o "b64:" si es solo base64)

const arg = process.argv[2];
if (!arg) {
  console.error('Pasa el valor de la marca (lo que va tras "df:" en el comentario <!-- df:... -->).');
  process.exit(1);
}

const b64ToBytes = (b64) => Uint8Array.from(Buffer.from(b64, 'base64'));

if (arg.startsWith('b64:')) {
  console.log(Buffer.from(arg.slice(4), 'base64').toString('utf8'));
  process.exit(0);
}

if (arg.startsWith('enc:')) {
  const keyB64 = process.env.WATERMARK_KEY;
  if (!keyB64) {
    console.error('Falta WATERMARK_KEY en el entorno (la misma clave configurada en Cloudflare).');
    process.exit(1);
  }
  const data = b64ToBytes(arg.slice(4));
  const iv = data.slice(0, 12);
  const ct = data.slice(12);
  const key = await crypto.subtle.importKey('raw', b64ToBytes(keyB64), { name: 'AES-GCM' }, false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  console.log(new TextDecoder().decode(pt));
  process.exit(0);
}

console.error('Formato no reconocido (esperaba "enc:..." o "b64:...").');
process.exit(1);
