const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = 3000;

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method !== 'POST' || req.url !== '/run') {
    res.writeHead(404);
    return res.end();
  }

  let body = '';
  req.on('data', d => body += d);
  req.on('end', () => {
    let code;
    try {
      ({ code } = JSON.parse(body));
    } catch (e) {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: 'invalid json' }));
    }

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'java_'));
    const filePath = path.join(tmpDir, 'Main.java');

    fs.writeFileSync(filePath, code);

    exec(`javac -encoding UTF-8 ${filePath} && java -Dfile.encoding=UTF-8 -Dstdout.encoding=UTF-8 -Dstderr.encoding=UTF-8 -cp ${tmpDir} Main`, { timeout: 5000, cwd: tmpDir }, (err, stdout, stderr) => {
      fs.rmSync(tmpDir, { recursive: true, force: true });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        output: stdout.replace(/\r\n/g, '\n').trim(),
        error: stderr.replace(/\r\n/g, '\n').trim() || (err ? err.message : '')
      }));
    });
  });
}).listen(PORT, () => {
  console.log(`Java 채점 서버 실행 중: http://localhost:${PORT}`);
});
