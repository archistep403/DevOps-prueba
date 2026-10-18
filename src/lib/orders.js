export const ORDER_STATUSES = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' }
];

export const statusLabel = value => ORDER_STATUSES.find(s => s.value === value)?.label ?? value;

export function formatDate(iso) {
  return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

// Las ventas canceladas no cuentan como ingreso.
export const sumSales = orders => orders.filter(o => o.estado !== 'cancelado').reduce((s, o) => s + o.total, 0);

// Pasos del seguimiento que ve el usuario (un pedido cancelado se muestra aparte).
export const TRACKING_STEPS = [
  { value: 'pendiente', label: 'Pedido recibido', hint: 'Recibimos tu compra y la estamos preparando.' },
  { value: 'enviado', label: 'En camino', hint: 'Tu pedido salió de la tienda.' },
  { value: 'entregado', label: 'Entregado', hint: 'Tu pedido llegó a su destino.' }
];

// Historial de estados. Los pedidos antiguos no lo tienen: se arma con su fecha y estado actual.
export function orderHistory(order) {
  if (Array.isArray(order.historial) && order.historial.length > 0) return order.historial;
  const base = [{ estado: 'pendiente', fecha: order.fecha }];
  return order.estado === 'pendiente' ? base : [...base, { estado: order.estado, fecha: order.fecha }];
}
