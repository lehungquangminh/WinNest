const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const svgContent = fs.readFileSync(path.join(__dirname, '../pages/logo_app.svg'), 'utf8');

  // HTML page that renders the SVG to a canvas and sends the PNG base64 data back
  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <canvas id="canvas" width="512" height="512"></canvas>
        <script>
          const canvas = document.getElementById('canvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();
          // Use base64 encoded SVG to load in Image
          const svgBase64 = btoa(unescape(encodeURIComponent(\`${svgContent}\`)));
          img.src = 'data:image/svg+xml;base64,' + svgBase64;
          
          img.onload = () => {
            ctx.drawImage(img, 0, 0, 512, 512);
            try {
              const dataUrl = canvas.toDataURL('image/png');
              const { ipcRenderer } = require('electron');
              ipcRenderer.send('save-png', dataUrl);
            } catch (err) {
              ipcRenderer.send('error', err.message);
            }
          };
          img.onerror = (e) => {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('error', 'Failed to load SVG into image');
          };
        </script>
      </body>
    </html>
  `;

  const tempHtmlPath = path.join(__dirname, 'temp.html');
  fs.writeFileSync(tempHtmlPath, html);

  ipcMain.on('save-png', (event, dataUrl) => {
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
    const destPath = path.join(__dirname, '../pages/icon.png');
    fs.writeFileSync(destPath, base64Data, 'base64');
    console.log('Success: Saved PNG icon to:', destPath);
    
    fs.unlinkSync(tempHtmlPath);
    app.quit();
  });

  ipcMain.on('error', (event, msg) => {
    console.error('Error in window:', msg);
    fs.unlinkSync(tempHtmlPath);
    app.quit();
    process.exit(1);
  });

  win.loadFile(tempHtmlPath);
});
