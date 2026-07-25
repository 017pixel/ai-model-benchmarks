//
// Minimal dev server with built-in TypeScript→ESM transpiler.
// No esbuild/Vite/bundler needed — strips TS on the fly and serves as ES modules.
// Usage: node server.mjs
//

import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, extname } from 'node:path';

const PORT = 4000;
const ROOT = new URL('.', import.meta.url).pathname;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.ts': 'application/javascript; charset=utf-8',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
};

const cache = new Map();

// ── TypeScript transpiler ─────────────────────────────────────────────

function transpile(ts) {
  // 0. Collect type-only names (for cleaning imports later)
  const typeNames = new Set();
  for (const m of ts.matchAll(/^(?:export\s+)?(?:interface|type)\s+(\w+)/gm)) typeNames.add(m[1]);

  // 1. Remove interface blocks
  ts = ts.replace(/^(?:export\s+)?interface\s+\w+(?:<[^>]*>)?\s*(?:extends\s+[^{]+)?\s*\{[^}]*\}/gms, '');

  // 2. Remove type aliases:  type X = ...;
  ts = ts.replace(/^(?:export\s+)?type\s+\w+(?:<[^>]*>)?\s*=[^;]*;/gm, '');

  // 3. Remove export type { ... } re-exports
  ts = ts.replace(/^export\s+type\s*\{[^}]*\}\s*;?/gm, '');

  // 4. Convert enums to const objects
  ts = ts.replace(
    /^(\s*)(?:export\s+)?enum\s+(\w+)\s*\{([\s\S]*?)\n\s*\}/gm,
    (_, indent, name, body) => {
      const lines = body.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//'));
      let val = 0;
      const entries = lines.map((l) => {
        const semi = l.replace(/,\s*$/, '');
        if (semi.includes('=')) {
          const [k, v] = semi.split('=');
          val = parseInt(v.trim()) || 0;
          return `${indent}  ${k.trim()}: ${val},`;
        }
        const e = `${indent}  ${semi}: ${val},`;
        val++;
        return e;
      });
      return `${indent}export const ${name} = {\n${entries.join('\n')}\n${indent}};`;
    },
  );

  // 5. Remove access modifiers
  ts = ts.replace(/\b(public|private|protected|abstract|readonly|override)\b\s+/g, '');

  // 6. Handle abstract method declarations:  methodName(params);  →  methodName(params) {}
  ts = ts.replace(/^([ \t]+)(\w+)\s*\(([^)]*)\)\s*;\s*$/gm, '$1$2($3) {}');

  // 7. Remove non-null assertions:  expr!. → expr.  and expr![ → expr[
  ts = ts.replace(/(\w|\]|\))(!)(?=\.|\[|,|;|\)|\s|$)/g, '$1');

  // 8. Remove generic type parameters from new expressions: new Foo<A,B>() → new Foo()
  ts = ts.replace(/\bnew\s+(\w+)\s*<[^>]+>\s*\(/g, 'new $1(');

  // 9. Remove generic type params from function/class declarations
  ts = ts.replace(/(\w+)\s*<[^>]+>\s*\(/g, '$1(');

  // 10. Remove type casts:  expr as Type → expr
  //    Handle both  (x) as Type  and  something as Type
  ts = ts.replace(/\)\s+as\s+[^,;)}\]]+/g, ')');
  ts = ts.replace(/\b\w+\s+as\s+\w+[^,;)}\]]*/g, (m) => {
    const i = m.indexOf(' as ');
    return i > 0 ? m.substring(0, i) : m;
  });

  // 11. Line-by-line: strip param types, return types, variable types
  ts = ts.split('\n').map(stripLine).join('\n');

  // 12. Clean imports: remove identifiers that are type-only
  ts = ts.replace(/^import\s*\{([^}]*)\}\s*from\s*(['"][^'"]+['"])\s*;?\s*$/gm, (line, imports, fromStr) => {
    const names = imports
      .split(',')
      .map((s) => s.trim())
      .filter((s) => {
        const name = s.replace(/^\s+|\s+$/g, '').split(/\s+as\s+/)[0].trim();
        return name && !typeNames.has(name);
      });
    if (names.length === 0) return '';
    return `import { ${names.join(', ')} } from ${fromStr};`;
  });

  // 13. Clean up excess blank lines
  ts = ts.replace(/\n{3,}/g, '\n\n');

  return ts;
}

function stripLine(line) {
  const t = line.trim();
  if (!t || t === '{' || t === '}' || t.startsWith('//') || t.startsWith('/*') || t.startsWith('*'))
    return line;

  // Remove return type annotations:  ): Type {  or  ): Type ;
  line = line.replace(/\)\s*:\s*[^{;]*?([\{;])/, ') $1');

  // Strip type annotations from function/constructor/getter/setter parameters
  if (/(?:function|constructor|get\s+|set\s+|=>|\w+\s*\()/.test(t) && line.includes('(')) {
    line = stripParamTypes(line);
  }

  // Strip type annotations from const/let/var with simple names (not destructured)
  if (/^(?:export\s+)?(?:const|let|var)\s+\w+\??/.test(t) && !/^(?:export\s+)?(?:const|let|var)\s*[{[]/.test(t)) {
    line = line.replace(/^(\s*(?:export\s+)?(?:const|let|var)\s+\w+\??)\s*:\s*[^=;]*?([=;])/, '$1 $2');
  }

  // Strip type-only class field declarations (no =, no parens)
  if (/^\s+\w+\??\s*:\s*\w.*;\s*$/.test(line) && !line.includes('=') && !line.includes('(')) {
    return '';
  }

  // Strip type from class fields with defaults:  name: Type = val;
  line = line.replace(/^(\s+\w+\??)\s*:\s*[^=;]*?([=;])/, '$1 $2');

  return line;
}

function stripParamTypes(line) {
  const open = line.indexOf('(');
  if (open === -1) return line;
  const close = findClose(line, open);
  if (close === -1) return line;
  const before = line.substring(0, open + 1);
  const after = line.substring(close);
  const params = line.substring(open + 1, close);
  const parts = splitComma(params);
  const stripped = parts.map((p) => {
    p = p.trim();
    if (!p) return p;
    if (p.startsWith('...'))
      return p.replace(/^(\.\.\.\w+)\s*:\s*\S+/, '$1');
    if (p.startsWith('{') || p.startsWith('[')) return p; // destructured
    const ci = p.indexOf(':');
    if (ci === -1) return p;
    const afterColon = p.substring(ci + 1).trim();
    const first = afterColon[0];
    const isType =
      /^[A-Z]/.test(afterColon) ||
    /^(?:number|string|boolean|void|any|never|null|undefined|object|unknown|bigint|symbol)/.test(afterColon) ||
    afterColon.startsWith('{') ||
    afterColon.startsWith('[') ||
    afterColon.startsWith('(');
    if (!isType) return p;
    const eqIdx = p.indexOf('=', ci);
    if (eqIdx !== -1) return p.substring(0, ci).trim() + ' ' + p.substring(eqIdx);
    return p.substring(0, ci).trim();
  });
  return before + stripped.join(', ') + after;
}

function findClose(str, openIdx) {
  let d = 0;
  for (let i = openIdx; i < str.length; i++) {
    if (str[i] === '(') d++;
    else if (str[i] === ')') {
      d--;
      if (d === 0) return i;
    }
  }
  return -1;
}

function splitComma(str) {
  const parts = [];
  let d = 0,
    cur = '';
  for (const ch of str) {
    if ('([{'.includes(ch)) d++;
    else if (')]}'.includes(ch)) d--;
    if (ch === ',' && d === 0) {
      parts.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur) parts.push(cur);
  return parts;
}

// ── Module resolution ──────────────────────────────────────────────────

async function resolveModule(relPath) {
  const abs = join(ROOT, relPath);
 for (const ext of ['.ts', '.js', '.tsx', '.jsx']) {
    try { if ((await stat(abs + ext)).isFile()) return abs + ext; } catch {}
  }
  for (const ext of ['.ts', '.js']) {
    try { if ((await stat(join(abs, 'index' + ext))).isFile()) return join(abs, 'index' + ext); } catch {}
  }
  return null;
}

async function exists(p) {
  try { return (await stat(p)).isFile(); } catch { return false; }
}

// ── HTTP server ────────────────────────────────────────────────────────

async function serveFile(res, filePath) {
  try {
    const s = await stat(filePath);
    if (s.isDirectory()) filePath = join(filePath, 'index.html');
    const raw = await readFile(filePath);
    const ext = extname(filePath);
    let body = raw;
    let mime = MIME[ext] || 'application/octet-stream';

    if (ext === '.ts') {
      const cached = cache.get(filePath);
      if (cached && cached.mtime === s.mtimeMs) {
        body = cached.code;
      } else {
        body = transpile(raw.toString('utf8'));
        cache.set(filePath, { mtime: s.mtimeMs, code: body });
      }
    }

    if (typeof body === 'string') body = Buffer.from(body, 'utf8');
    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': body.length,
      'Cache-Control': ext === '.ts' ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(body);
  } catch (e) {
    if (e.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + filePath);
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('500: ' + e.message);
    }
  }
}

const server = createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url?.split('?')[0] || '/');
    if (urlPath === '/') urlPath = '/index.html';
    let filePath = join(ROOT, urlPath);

    if (await exists(filePath)) {
      await serveFile(res, filePath);
      return;
    }

    const resolved = await resolveModule(urlPath);
    if (resolved) {
      await serveFile(res, resolved);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found: ' + urlPath);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500: ' + e.message);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log();
  console.log('  \u26cf  TERRARIA CLONE dev server');
  console.log(`  \u279c  http://localhost:${PORT}/`);
  console.log();
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} already in use.`);
    process.exit(1);
  }
});
