// El servidor calcula netos, percepción y CPP; aquí solo se prepara la entrada.
export function prepararCompra(form, detalle) {
  return {
    idProveedor: Number(form.idProveedor) || null,
    tipoComprobante: form.tipoComprobante,
    serieComprobante: form.serieComprobante,
    aplicaPercepcion: Boolean(form.aplicaPercepcion),
    percepcion: form.aplicaPercepcion ? Number(form.percepcion) || 0 : 0,
    descuentoGlobal: Number(form.descuentoGlobal) || 0,
    medioPago: form.medioPago,
    fechaIngreso: form.fechaIngreso ? new Date(form.fechaIngreso).toISOString().replace('Z', '') : null,
    detalles: detalle.map(i => ({
      idProducto: i.idProducto,
      cantidad: Number(i.cantidad),
      costoTotal: i.costoTotal !== '' && i.costoTotal != null ? Number(i.costoTotal) : null,
      costoUnitario: Number(i.costoUnitario) || 0,
      descuentoPct: Number(i.descuentoPct) || 0,
      precioVenta: i.precioVenta ? Number(i.precioVenta) : null,
      unidadesBonificacion: Number(i.unidadesBonif) || 0,
      idProductoBonif: i.idProductoBonif ? Number(i.idProductoBonif) : null,
      cantidadBonif: i.idProductoBonif ? Number(i.cantidadBonif) || 0 : null,
    })),
  };
}
