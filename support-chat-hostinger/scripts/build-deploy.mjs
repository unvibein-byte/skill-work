import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function buildUserDeploy() {
  const out = join(root, 'deploy-user');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, 'shared'), { recursive: true });

  let html = readFileSync(join(root, 'user', 'index.html'), 'utf8');
  html = html.replace(/\.\.\/shared\//g, 'shared/');
  writeFileSync(join(out, 'index.html'), html);

  let css = readFileSync(join(root, 'user', 'user.css'), 'utf8');
  css = css.replace("@import url('../shared/chat.css')", "@import url('shared/chat.css')");
  writeFileSync(join(out, 'user.css'), css);

  cpSync(join(root, 'user', 'user.js'), join(out, 'user.js'));
  cpSync(join(root, 'shared', 'firebase-config.js'), join(out, 'shared', 'firebase-config.js'));
  cpSync(join(root, 'shared', 'chat-core.js'), join(out, 'shared', 'chat-core.js'));
  cpSync(join(root, 'shared', 'chat.css'), join(out, 'shared', 'chat.css'));
  cpSync(join(root, 'user', '.htaccess'), join(out, '.htaccess'));
  console.log('Created deploy-user/ → upload to user.24hrwork.space');
}

function buildAdminDeploy() {
  const out = join(root, 'deploy-admin');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, 'shared'), { recursive: true });

  let html = readFileSync(join(root, 'admin', 'index.html'), 'utf8');
  html = html.replace(/\.\.\/shared\//g, 'shared/');
  writeFileSync(join(out, 'index.html'), html);

  let css = readFileSync(join(root, 'admin', 'admin.css'), 'utf8');
  css = css.replace("@import url('../shared/chat.css')", "@import url('shared/chat.css')");
  writeFileSync(join(out, 'admin.css'), css);

  cpSync(join(root, 'admin', 'admin.js'), join(out, 'admin.js'));
  cpSync(join(root, 'shared', 'firebase-config.js'), join(out, 'shared', 'firebase-config.js'));
  cpSync(join(root, 'shared', 'chat-core.js'), join(out, 'shared', 'chat-core.js'));
  cpSync(join(root, 'shared', 'chat.css'), join(out, 'shared', 'chat.css'));
  cpSync(join(root, 'admin', '.htaccess'), join(out, '.htaccess'));
  console.log('Created deploy-admin/ → upload to admin.24hrwork.space');
}

buildUserDeploy();
buildAdminDeploy();
