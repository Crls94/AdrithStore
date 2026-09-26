// Run against the isolated issue18 backend (8081) and Vite (5174).
// PLAYWRIGHT_MODULE_PATH may point to an existing Playwright installation; no app dependency required.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const psql = process.env.PSQL_PATH || 'C:/Program Files/PostgreSQL/18/bin/psql.exe';
const sql = text => execFileSync(psql, ['-X', '-w', '-h', '127.0.0.1', '-p', '55438', '-U', 'postgres', '-d', 'adrith_dashboard_issue18', '-v', 'ON_ERROR_STOP=1', '-f', '-'], { input: Buffer.from(text, 'utf8'), env: { ...process.env, PGCLIENTENCODING: 'UTF8' }, stdio: 'pipe' });
const out = process.env.DASHBOARD_SCREENSHOTS || path.join(process.env.TEMP || '.', 'adrith-issue18-ui');
fs.mkdirSync(out, { recursive: true });
const fixture = `
BEGIN;
INSERT INTO usuario(id_usuario,username,password_hash,rol,nombres,apellidos,activo) VALUES (18102,'issue18-vendedor','test','VENDEDOR','Vendedor','Prueba',true);
INSERT INTO cliente(id_cliente,nombre) VALUES (18101,'Cliente prueba');
INSERT INTO categorias(id_categoria,nombre) VALUES (18101,'Productos prueba'),(18102,'Servicios prueba');
INSERT INTO producto(id_producto,nombre,tipo,id_categoria,cpp,precio_venta,stock,unidad_medida) VALUES
(18101,'Producto prueba','BIEN_FISICO',18101,999,999,20,'UNIDAD'),(18102,'Servicio prueba','SERVICIO_PURO',18102,999,999,0,'UNIDAD'),(18103,'Comisión prueba','SERVICIO_COMIS',18102,999,999,0,'UNIDAD');
INSERT INTO venta(id_venta,id_cliente,id_usuario,fecha,estado,total,descuento_global) VALUES
(18101,18101,1,current_date+time '09:00','confirmado',80,0),
(18102,18101,1,current_date+time '10:00','confirmado',20,0),
(18103,18101,18102,current_date+time '11:00','confirmado',110,0),
(18104,18101,18102,current_date-interval '1 day'+time '12:00','confirmado',35,0),
(18105,18101,1,current_date+time '13:00','anulado',999,0);
INSERT INTO venta_detalle(id_venta,id_producto,cantidad,precio_historico,costo_historico,descuento_item,subtotal) VALUES
(18101,18101,2,50,30,20,80),(18104,18101,1,30,12,0,30),(18105,18101,1,999,100,0,999);
INSERT INTO venta_detalle_servicio(id_venta,id_producto,monto,comision,costo,subtotal) VALUES
(18102,18102,20,0,7,20),(18103,18103,100,10,2,110),(18104,18102,5,0,1,5);
INSERT INTO transaccion_financiera(id_transaccion,fecha,tipo_mov,monto,signo) VALUES (18101,current_date+time '14:00','GASTO',9,-1),(18102,current_date-interval '1 day'+time '14:00','GASTO',4,-1);
INSERT INTO compra(id_compra,fecha,estado,total) VALUES (18101,current_date+time '08:00','confirmado',50),(18102,current_date-interval '1 day'+time '08:00','confirmado',25);
INSERT INTO cuenta_financiera(id_cuenta,nombre,saldo_actual,activa) VALUES (18101,'Transferencia',123.45,true);
COMMIT;`;
const cleanup = `BEGIN;
DELETE FROM venta_detalle WHERE id_venta BETWEEN 18101 AND 18105;
DELETE FROM venta_detalle_servicio WHERE id_venta BETWEEN 18101 AND 18105;
DELETE FROM venta WHERE id_venta BETWEEN 18101 AND 18105;
DELETE FROM transaccion_financiera WHERE id_transaccion IN (18101,18102);
DELETE FROM compra WHERE id_compra IN (18101,18102);
DELETE FROM cuenta_financiera WHERE id_cuenta=18101;
DELETE FROM producto WHERE id_producto IN (18101,18102,18103);
DELETE FROM categorias WHERE id_categoria IN (18101,18102);
DELETE FROM cliente WHERE id_cliente=18101;
DELETE FROM usuario WHERE id_usuario=18102;
COMMIT;`;

(async () => {
  let browser;
  let seeded = false;
  try {
    // Never point these fixtures at the business database.
    const identity = sql('SELECT current_database();').toString();
    assert(identity.includes('adrith_dashboard_issue18'));
    sql(fixture); seeded = true;
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:5174/login');
    await page.getByPlaceholder('Nombre de usuario').fill('issue18');
    await page.locator('input[type=password]').fill('issue18-test-only');
    await page.locator('input[type=password]').press('Enter');
    await page.waitForURL('**/dashboard');
    const amount = page.getByTestId('ingreso-principal');
    const mainPurchases = page.getByTestId('dashboard-kpi-purchases');
    const mainCard = page.getByRole('region', { name: 'Resumen y tendencia' });
    const periodMetrics = page.getByRole('region', { name: 'Métricas del período' });
    const lowerPurchases = periodMetrics.getByText('Compras', { exact: true }).locator('..').locator('p').nth(1);
    const assertPurchasesMatch = async expected => {
      await page.waitForFunction(value => document.querySelector('[data-testid="dashboard-kpi-purchases"]')?.textContent === value, expected);
      assert.equal(await lowerPurchases.textContent(), expected);
    };
    const waitAmount = expected => page.waitForFunction(text => document.querySelector('[data-testid="ingreso-principal"]')?.textContent === text, expected);
    const waitHeatmap = expected => page.getByTestId('resumen-heatmap').getByText(expected, { exact: true }).first().waitFor();
    const selectDashboardValue = async (label, value) => {
      await page.getByRole('button', { name: label, exact: true }).click();
      await page.getByRole('listbox', { name: label }).locator(`[data-value="${value}"]`).click();
    };
    const selectPeriodGroup = async value => page.getByRole('group', { name: 'Grupo temporal' }).locator(`[data-value="${value}"]`).click();
    const dashboardValue = async label => (await page.getByRole('button', { name: label, exact: true }).textContent()).trim();
    const countDashboardOptions = async label => {
      await page.getByRole('button', { name: label, exact: true }).click();
      const menu = page.getByRole('listbox', { name: label });
      const count = await menu.getByRole('option').count();
      await menu.getByRole('option').first().press('Escape');
      return count;
    };
    await waitAmount('S/ 110.00'); await waitHeatmap('S/ 110.00');
    await assertPurchasesMatch('S/ 50.00');
    assert.equal(await page.getByRole('heading', { name: 'Mapa de calor de ventas' }).count(), 1);
    assert.deepEqual(await mainCard.locator('.grid.grid-cols-3.text-center > div:not(.col-span-3) > div:first-child').allTextContents(),
      ['VENTAS', 'COMPRAS', 'TICKET PROM.', 'GANANCIA', 'COSTOS', 'SALDO TOTAL']);
    assert.equal(await mainCard.getByText('Gastos', { exact: true }).count(), 0);
    assert.equal(await periodMetrics.getByText('Gastos', { exact: true }).count(), 1);
    assert.equal(await dashboardValue('Serie adicional'), 'Ninguna');
    await page.screenshot({ path: path.join(out, 'dashboard-desktop.png'), fullPage: true });
    await selectDashboardValue('Serie adicional', 'ganancia');
    assert(await page.locator('.recharts-area').count() === 2);
    await selectDashboardValue('Serie adicional', 'totalGastos');
    assert(await page.locator('.recharts-area').count() === 2);
    assert.equal(await amount.textContent(), 'S/ 110.00');
    await selectDashboardValue('Vendedor del dashboard', '1');
    await waitAmount('S/ 100.00'); await waitHeatmap('S/ 100.00');
    await assertPurchasesMatch('S/ 50.00');
    assert(await page.getByText('Gastos es el total global del negocio para este período; no se atribuye al vendedor.').isVisible());
    await selectDashboardValue('Tipo de ingreso', 'productos');
    await waitAmount('S/ 80.00'); await waitHeatmap('S/ 80.00');
    await selectDashboardValue('Tipo de ingreso', 'servicios');
    await waitAmount('S/ 20.00'); await waitHeatmap('S/ 20.00');
    await selectDashboardValue('Tipo de ingreso', 'ingresos');
    await selectDashboardValue('Vendedor del dashboard', '');
    await waitAmount('S/ 110.00');
    for (const [group, count] of [['semana', 5], ['mes', 7], ['año', 6], ['dia', 7]]) {
      await selectPeriodGroup(group);
      assert.equal(await countDashboardOptions('Período concreto'), count);
      await waitAmount(group === 'dia' ? 'S/ 110.00' : 'S/ 145.00');
      await assertPurchasesMatch(group === 'dia' ? 'S/ 50.00' : 'S/ 75.00');
    }
    await selectDashboardValue('Categoría del mapa', '18102');
    await waitHeatmap('S/ 30.00');
    assert.equal(await amount.textContent(), 'S/ 110.00');
    await page.getByRole('button', { name: 'Usar filtros del dashboard' }).click();
    await waitHeatmap('S/ 110.00');

    // While a request is delayed, retain the previous summary instead of flashing zeros.
    await page.route('**/api/dashboard/stats?**', async route => {
      await new Promise(resolve => setTimeout(resolve, 500)); await route.continue();
    });
    await selectDashboardValue('Tipo de ingreso', 'productos');
    assert.equal(await amount.textContent(), 'S/ 110.00');
    await waitAmount('S/ 80.00');
    await page.unroute('**/api/dashboard/stats?**');
    await page.reload(); await waitAmount('S/ 110.00');
    assert.equal(await dashboardValue('Tipo de ingreso'), 'Ingresos');
    assert.equal(await dashboardValue('Vendedor del dashboard'), 'Todos');
    assert.equal(await dashboardValue('Serie adicional'), 'Ninguna');
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, `Horizontal overflow at ${width}px`);
      await selectDashboardValue('Serie adicional', 'ganancia');
      await page.screenshot({ path: path.join(out, `dashboard-mobile-${width}.png`), fullPage: true });
    }
    assert.deepEqual(errors, []);
    console.log('PASS: dashboard defaults, filters, period options, exclusive series, loading, reconciliation, 1440/390/320px, no JS errors.');
    console.log('Screenshots: ' + out);
  } finally {
    try {
      if (browser) {
        const closed = await Promise.race([
          browser.close().then(() => true).catch(() => true),
          new Promise(resolve => setTimeout(() => resolve(false), 2500)),
        ]);
        if (!closed) browser.process()?.kill();
      }
    } finally {
      if (seeded) sql(cleanup);
    }
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
