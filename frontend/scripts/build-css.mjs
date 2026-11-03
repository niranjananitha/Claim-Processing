import fs from 'fs';
import postcss from 'postcss';
import tailwindPostcss from '@tailwindcss/postcss';

async function build() {
  try {
    const inputCss = fs.readFileSync('app/globals.css', 'utf8');
    const result = await postcss([tailwindPostcss]).process(inputCss, {
      from: 'app/globals.css',
      to: 'app/compiled.css',
    });
    fs.writeFileSync('app/compiled.css', result.css);
    console.log('Successfully compiled CSS to app/compiled.css! Size:', result.css.length);
  } catch (err) {
    console.error('Error compiling CSS:', err);
    process.exit(1);
  }
}

build();
