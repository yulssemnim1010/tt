const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const { after, before, test } = require('node:test');
const { chromium } = require('playwright');

const projectRoot = path.resolve(__dirname, '..');
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
};

let browser;
let baseUrl;
let server;

async function measureProductAndCopy(page, sectionNumber) {
  return page.evaluate((targetSectionNumber) => {
    const { product, camera, THREE } = window.__scene;
    product.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(product);
    const corners = [
      [box.min.x, box.min.y, box.min.z], [box.max.x, box.min.y, box.min.z],
      [box.min.x, box.max.y, box.min.z], [box.max.x, box.max.y, box.min.z],
      [box.min.x, box.min.y, box.max.z], [box.max.x, box.min.y, box.max.z],
      [box.min.x, box.max.y, box.max.z], [box.max.x, box.max.y, box.max.z],
    ];
    let left = Infinity;
    let right = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;

    corners.forEach(([x, y, z]) => {
      const point = new THREE.Vector3(x, y, z).project(camera);
      const screenX = (point.x * 0.5 + 0.5) * window.innerWidth;
      const screenY = (-point.y * 0.5 + 0.5) * window.innerHeight;
      left = Math.min(left, screenX);
      right = Math.max(right, screenX);
      top = Math.min(top, screenY);
      bottom = Math.max(bottom, screenY);
    });

    const copy = document.querySelector(`section:nth-child(${targetSectionNumber}) .copy`).getBoundingClientRect();
    const overlapWidth = Math.max(0, Math.min(right, copy.right) - Math.max(left, copy.left));
    const overlapHeight = Math.max(0, Math.min(bottom, copy.bottom) - Math.max(top, copy.top));

    return {
      productRect: { left, right, top, bottom },
      copyRect: { left: copy.left, right: copy.right, top: copy.top, bottom: copy.bottom },
      overlapArea: overlapWidth * overlapHeight,
    };
  }, sectionNumber);
}

async function measureBotanicalAndCopy(page, sectionNumber) {
  return page.evaluate((targetSectionNumber) => {
    const { botanicalAssembly, camera, THREE } = window.__scene;
    botanicalAssembly.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(botanicalAssembly);
    const localPoints = [
      [box.min.x, box.min.y, box.min.z], [box.max.x, box.min.y, box.min.z],
      [box.min.x, box.max.y, box.min.z], [box.max.x, box.max.y, box.min.z],
      [box.min.x, box.min.y, box.max.z], [box.max.x, box.min.y, box.max.z],
      [box.min.x, box.max.y, box.max.z], [box.max.x, box.max.y, box.max.z],
    ];
    let left = Infinity;
    let right = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;

    localPoints.forEach(([x, y, z]) => {
      const point = new THREE.Vector3(x, y, z).project(camera);
      const screenX = (point.x * 0.5 + 0.5) * window.innerWidth;
      const screenY = (-point.y * 0.5 + 0.5) * window.innerHeight;
      left = Math.min(left, screenX);
      right = Math.max(right, screenX);
      top = Math.min(top, screenY);
      bottom = Math.max(bottom, screenY);
    });

    const copy = document.querySelector(`section:nth-child(${targetSectionNumber}) .copy`).getBoundingClientRect();
    return {
      botanicalRect: { left, right, top, bottom },
      copyRect: { left: copy.left, right: copy.right, top: copy.top, bottom: copy.bottom },
    };
  }, sectionNumber);
}

before(async () => {
  server = http.createServer((request, response) => {
    const requestPath = request.url === '/' ? '/index.html' : request.url;
    const decodedPath = decodeURIComponent(requestPath.split('?')[0]);
    const filePath = path.resolve(projectRoot, `.${decodedPath}`);

    if (!filePath.startsWith(projectRoot)) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    fs.readFile(filePath, (error, content) => {
      if (error) {
        response.writeHead(error.code === 'ENOENT' ? 404 : 500).end();
        return;
      }

      response.writeHead(200, {
        'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
      });
      response.end(content);
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ channel: 'chrome', headless: true });
});

after(async () => {
  await browser?.close();
  await new Promise((resolve) => server?.close(resolve));
});

test('절차형 식물 어셈블리는 실제 깊이를 가지며 용기와 같은 루트에서 회전한다', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  const networkFailures = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    networkFailures.push(`${request.url()} — ${request.failure()?.errorText || 'unknown'}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  try {
    await page.waitForFunction(() => window.__scene?.botanicalAssembly, null, { timeout: 20_000 });
  } catch (error) {
    assert.fail([
      error.message,
      ...pageErrors.map((message) => `pageerror: ${message}`),
      ...networkFailures.map((message) => `requestfailed: ${message}`),
      ...consoleErrors.map((message) => `console.error: ${message}`),
    ].join('\n'));
  }

  const state = await page.evaluate(async () => {
    window.__preview(0.33);
    await new Promise(requestAnimationFrame);
    const { botanicalAssembly, product, THREE } = window.__scene;
    const botanicalSize = new THREE.Box3()
      .setFromObject(botanicalAssembly)
      .getSize(new THREE.Vector3());
    const runtime = botanicalAssembly.userData.sculptRuntime;
    const firstPart = botanicalAssembly.children[0];
    const basePartPosition = firstPart.position.clone();
    runtime.setExploded(1);
    const explodedDistance = firstPart.position.distanceTo(basePartPosition);
    runtime.setExploded(0);
    const keyframes = [];

    for (const progress of [0, 0.33, 0.66, 1]) {
      window.__preview(progress);
      await new Promise(requestAnimationFrame);
      keyframes.push({
        progress,
        productRotationY: product.rotation.y,
        botanicalParented: botanicalAssembly.parent === product,
      });
    }

    return {
      botanicalExists: Boolean(botanicalAssembly),
      botanicalDepth: botanicalSize.z,
      botanicalMeshCount: botanicalAssembly.getObjectsByProperty('isMesh', true).length,
      hasLegacyFrame: Boolean(window.__scene.scene.getObjectByName('botanical-frame')),
      productRotationY: product.rotation.y,
      canvasIsDecorative: document.getElementById('scene').getAttribute('aria-hidden') === 'true',
      modelParts: product.children.map((child) => child.name).filter(Boolean),
      botanicalParts: botanicalAssembly.children.map((child) => child.name).filter(Boolean),
      runtimeNodeCount: runtime.nodes.length,
      runtimeSocketCount: Object.keys(runtime.sockets).length,
      runtimeColliderCount: runtime.colliders.length,
      explodedDistance,
      keyframes,
    };
  });

  assert.deepEqual(pageErrors, []);
  assert.equal(state.botanicalExists, true);
  assert.equal(state.hasLegacyFrame, false);
  assert.ok(state.botanicalDepth > 0.5, JSON.stringify(state));
  assert.ok(state.botanicalMeshCount >= 80, JSON.stringify(state));
  assert.ok(state.productRotationY > Math.PI);
  assert.equal(state.canvasIsDecorative, true);
  assert.ok(state.modelParts.includes('botanical-assembly'));
  assert.deepEqual(state.botanicalParts, [
    'ginseng-spike',
    'coral-flower',
    'orange-flower',
    'pale-bud',
    'white-flower-cluster',
    'burgundy-cluster',
    'lower-pods',
    'side-spike',
  ]);
  assert.equal(state.runtimeNodeCount, 8);
  assert.ok(state.runtimeSocketCount >= 5, JSON.stringify(state));
  assert.ok(state.runtimeColliderCount >= 2, JSON.stringify(state));
  assert.ok(state.explodedDistance > 0.1, JSON.stringify(state));
  state.keyframes.forEach((keyframe) => {
    assert.ok(
      Math.abs(keyframe.productRotationY - keyframe.progress * Math.PI * 3.2) < 0.001,
      JSON.stringify(keyframe)
    );
    assert.equal(keyframe.botanicalParented, true, JSON.stringify(keyframe));
  });

  await page.close();
});

test('좁은 세로 화면에서도 3D 식물과 용기 어셈블리가 안전 영역 안에 표시된다', async () => {
  const scenarios = [
    { viewport: { width: 375, height: 812 }, progress: 0.66, sectionNumber: 3, margin: 12 },
    { viewport: { width: 768, height: 1024 }, progress: 0.33, sectionNumber: 2, margin: 24 },
  ];

  for (const scenario of scenarios) {
    const page = await browser.newPage({ viewport: scenario.viewport });
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__scene?.botanicalAssembly);
    await page.evaluate((progress) => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, maxScroll * progress);
    }, scenario.progress);
    await page.waitForFunction(
      (progress) => Math.abs(window.__scene.product.rotation.y - progress * Math.PI * 3.2) < 0.02,
      scenario.progress
    );

    const layout = await measureProductAndCopy(page, scenario.sectionNumber);
    assert.ok(layout.productRect.left >= scenario.margin, JSON.stringify(layout));
    assert.ok(layout.productRect.right <= scenario.viewport.width - scenario.margin, JSON.stringify(layout));
    assert.ok(layout.productRect.top >= scenario.margin, JSON.stringify(layout));
    assert.ok(layout.productRect.bottom <= scenario.viewport.height - scenario.margin, JSON.stringify(layout));
    await page.close();
  }
});

test('동작 줄이기 환경에서는 스크롤 포즈를 즉시 적용하고 반복 모션을 멈춘다', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__scene?.botanicalAssembly);

  const state = await page.evaluate(async () => {
    const progress = 0.33;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, maxScroll * progress);
    await new Promise(requestAnimationFrame);
    const firstY = window.__scene.product.position.y;
    for (let frame = 0; frame < 20; frame += 1) {
      await new Promise(requestAnimationFrame);
    }

    const scrollHint = document.querySelector('.scroll_hint');
    return {
      expectedRotation: progress * Math.PI * 3.2,
      rotation: window.__scene.product.rotation.y,
      positionDrift: Math.abs(window.__scene.product.position.y - firstY),
      hintExists: Boolean(scrollHint),
      hintAnimation: scrollHint ? getComputedStyle(scrollHint, '::after').animationName : '',
      loaderState: document.getElementById('loader').className,
      visibleSections: document.querySelectorAll('section.is_visible').length,
    };
  });

  assert.ok(Math.abs(state.rotation - state.expectedRotation) < 0.001, JSON.stringify(state));
  assert.ok(state.positionDrift < 0.0001, JSON.stringify(state));
  assert.equal(state.hintExists, true);
  assert.equal(state.hintAnimation, 'none');
  assert.match(state.loaderState, /(^|\s)is_hidden(\s|$)/);
  assert.ok(state.visibleSections >= 1);

  await page.close();
});

test('절차형 식물 어셈블리는 데스크톱·태블릿 최종 포즈에서도 화면 안에 유지된다', async () => {
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await desktop.goto(baseUrl, { waitUntil: 'networkidle' });
  await desktop.waitForFunction(() => window.__scene?.botanicalAssembly);

  await desktop.evaluate(() => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, maxScroll);
  });
  await desktop.waitForFunction(
    () => Math.abs(window.__scene.product.rotation.y - Math.PI * 3.2) < 0.02
  );
  const desktopFinal = await measureBotanicalAndCopy(desktop, 4);
  assert.ok(desktopFinal.botanicalRect.top >= 0, JSON.stringify(desktopFinal));
  assert.ok(desktopFinal.botanicalRect.bottom <= 800, JSON.stringify(desktopFinal));
  assert.ok(desktopFinal.botanicalRect.left >= 0, JSON.stringify(desktopFinal));
  assert.ok(desktopFinal.botanicalRect.right <= 1280, JSON.stringify(desktopFinal));
  await desktop.close();

  const tablet = await browser.newPage({ viewport: { width: 768, height: 1024 } });
  await tablet.goto(baseUrl, { waitUntil: 'networkidle' });
  await tablet.waitForFunction(() => window.__scene?.botanicalAssembly);
  await tablet.evaluate(() => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, maxScroll);
  });
  await tablet.waitForFunction(
    () => Math.abs(window.__scene.product.rotation.y - Math.PI * 3.2) < 0.02
  );
  const tabletFinal = await measureBotanicalAndCopy(tablet, 4);
  assert.ok(tabletFinal.botanicalRect.top >= 0, JSON.stringify(tabletFinal));
  assert.ok(tabletFinal.botanicalRect.bottom <= 1024, JSON.stringify(tabletFinal));
  assert.ok(tabletFinal.botanicalRect.left >= 0, JSON.stringify(tabletFinal));
  assert.ok(tabletFinal.botanicalRect.right <= 768, JSON.stringify(tabletFinal));
  await tablet.close();
});
