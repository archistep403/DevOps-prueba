export function formatCLP(value) {
  return '$' + Number(value).toLocaleString('es-CL');
}

// "111111111" -> "11.111.111-1" (el RUN se guarda sin puntos ni guion).
export function formatRun(run) {
  if (!run || run.length < 2) return run || '';
  return `${run.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${run.slice(-1)}`;
}
