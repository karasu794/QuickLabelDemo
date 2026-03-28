// scripts/download-chromium.js
const chromium = require('@sparticuz/chromium');
const fs = require('fs');
const path = require('path');
const https = require('https');

async function downloadFont(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
      }
    }).on('error', (err) => {
      fs.unlink(destination, () => {});
      reject(err);
    });
  });
}

async function download() {
  try {
    // 1. Chromium本体をダウンロード
    console.log('Downloading Chromium. This may take a moment...');
    const executablePath = await chromium.executablePath();
    console.log('✅ Chromium downloaded successfully to:', executablePath);

    // 2. PDFに必要な日本語フォントを手動でダウンロード
    console.log('Downloading Noto Sans JP font...');
    
    // フォント保存用ディレクトリ（publicフォルダ内）を作成
    const fontsDir = path.join(__dirname, '..', 'public', 'fonts');
    if (!fs.existsSync(fontsDir)) {
      fs.mkdirSync(fontsDir, { recursive: true });
    }

    try {
      const fontPath = path.join(fontsDir, 'NotoSansJP-Regular.woff2');
      
      // WOFF2形式のフォントURL（より現代的で軽量）
      const fontUrls = [
        'https://fonts.gstatic.com/s/notosansjp/v52/NotoSansJP-Regular.woff2',
        'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-400-normal.woff2'
      ];
      
      let downloadSuccess = false;
      
      for (let i = 0; i < fontUrls.length; i++) {
        try {
          console.log(`Trying URL ${i + 1}/${fontUrls.length}: ${fontUrls[i]}`);
          await downloadFont(fontUrls[i], fontPath);
          console.log('✅ Noto Sans JP font downloaded successfully to:', fontPath);
          downloadSuccess = true;
          break;
        } catch (urlError) {
          console.log(`URL ${i + 1} failed: ${urlError.message}`);
          if (i === fontUrls.length - 1) {
            throw new Error('All font download URLs failed');
          }
        }
      }
      
      if (!downloadSuccess) {
        // フォントダウンロードが失敗した場合は、CSS内でGoogle Fontsを使用する旨をログ出力
        console.warn('⚠️ Local font download failed. PDF generation will use Google Fonts CSS fallback.');
        console.warn('This requires internet connection during PDF generation.');
      }
      
    } catch (fontError) {
      console.warn('⚠️ Noto Sans JP font setup failed:', fontError.message);
      console.warn('PDF generation will use system fonts as fallback.');
    }

    console.log('✅ Setup completed successfully!');

  } catch (error) {
    console.error('❌ Failed to download Chromium:', error);
    process.exit(1);
  }
}

download();