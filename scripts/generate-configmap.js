#!/usr/bin/env node
/**
 * สร้าง k8s/configmap.yaml จาก app/index.html (single source of truth)
 */
const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '..');
const htmlPath = path.join(appDir, 'app', 'index.html');
const configmapPath = path.join(appDir, 'k8s', 'configmap.yaml');

const html = fs.readFileSync(htmlPath, 'utf8');
const indented = html
  .split('\n')
  .map((line) => '    ' + line)
  .join('\n');

const configmap = `apiVersion: v1
kind: ConfigMap
metadata:
  name: sample-app-html
  namespace: sample-app
  labels:
    app: sample-app
data:
  index.html: |
${indented}
`;

fs.writeFileSync(configmapPath, configmap, 'utf8');
console.log('Generated k8s/configmap.yaml from app/index.html');