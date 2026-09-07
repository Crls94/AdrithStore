import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararCompra } from './compraPayload.js';

const form = { idProveedor: '1', aplicaPercepcion: true, percepcion: '1.60', descuentoGlobal: '5' };
const item = { idProducto: 1, cantidad: '10', costoTotal: '100', descuentoPct: '20' };

test('envía bruto y porcentaje sin descontar dos veces', () => {
  const r = prepararCompra(form, [item]);
  assert.equal(r.detalles[0].costoTotal, 100);
  assert.equal(r.detalles[0].descuentoPct, 20);
  assert.equal(r.percepcion, 1.6);
  assert.equal(r.descuentoGlobal, 5);
});
test('desactivar percepción no envía el importe retenido en el formulario', () => {
  const r = prepararCompra({ ...form, aplicaPercepcion: false }, [item]);
  assert.equal(r.aplicaPercepcion, false);
  assert.equal(r.percepcion, 0);
});
test('conserva total de línea sin convertirlo en unitario redondeado', () => {
  const r = prepararCompra(form, [{ ...item, cantidad: '300', costoTotal: '10' }]);
  assert.equal(r.detalles[0].costoTotal, 10);
  assert.equal(r.detalles[0].cantidad, 300);
});
test('envía cantidades regaladas sin costo a distribuir', () => {
  const r = prepararCompra(form, [{ ...item, unidadesBonif: '2', idProductoBonif: '3', cantidadBonif: '4', costoBonifTotal: '999' }]);
  assert.equal(r.detalles[0].unidadesBonificacion, 2);
  assert.equal(r.detalles[0].idProductoBonif, 3);
  assert.equal(r.detalles[0].cantidadBonif, 4);
  assert.equal('costoBonifTotal' in r.detalles[0], false);
});
