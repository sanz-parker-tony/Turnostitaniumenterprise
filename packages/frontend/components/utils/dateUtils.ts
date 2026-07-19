/**
 * Utilidades para manejo correcto de fechas sin problemas de zona horaria
 * 
 * IMPORTANTE: JavaScript tiene un problema conocido con las fechas cuando se usa
 * el constructor new Date('YYYY-MM-DD'), que interpreta la fecha como UTC medianoche
 * y luego la convierte a la zona horaria local, lo que puede cambiar el día.
 * 
 * Estas funciones evitan ese problema trabajando directamente con componentes de fecha.
 */

/**
 * Genera un rango de fechas entre dos fechas (inclusivo)
 * @param fechaInicio - Fecha de inicio en formato 'YYYY-MM-DD'
 * @param fechaFin - Fecha de fin en formato 'YYYY-MM-DD'
 * @returns Array de fechas en formato 'YYYY-MM-DD'
 */
export function generarRangoFechas(fechaInicio: string, fechaFin: string): string[] {
  const fechas: string[] = [];
  const [anioInicio, mesInicio, diaInicio] = fechaInicio.split('-').map(Number);
  const [anioFin, mesFin, diaFin] = fechaFin.split('-').map(Number);
  
  const inicio = new Date(anioInicio, mesInicio - 1, diaInicio);
  const fin = new Date(anioFin, mesFin - 1, diaFin);
  const actual = new Date(inicio);
  
  while (actual <= fin) {
    const year = actual.getFullYear();
    const month = String(actual.getMonth() + 1).padStart(2, '0');
    const day = String(actual.getDate()).padStart(2, '0');
    fechas.push(`${year}-${month}-${day}`);
    actual.setDate(actual.getDate() + 1);
  }
  
  return fechas;
}

/**
 * Convierte una fecha en formato 'YYYY-MM-DD' a objeto Date sin problemas de zona horaria
 * @param fecha - Fecha en formato 'YYYY-MM-DD'
 * @returns Objeto Date
 */
export function fechaStringADate(fecha: string): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

/**
 * Convierte un objeto Date a string en formato 'YYYY-MM-DD'
 * @param fecha - Objeto Date
 * @returns Fecha en formato 'YYYY-MM-DD'
 */
export function dateAFechaString(fecha: Date): string {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene el nombre del día de la semana
 * @param fecha - Fecha en formato 'YYYY-MM-DD'
 * @param formato - 'corto' para abreviado, 'largo' para nombre completo
 * @returns Nombre del día
 */
export function obtenerDiaSemana(fecha: string, formato: 'corto' | 'largo' = 'corto'): string {
  const diasCortos = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const diasLargos = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const d = new Date(anio, mes - 1, dia);
  return formato === 'corto' ? diasCortos[d.getDay()] : diasLargos[d.getDay()];
}

/**
 * Verifica si una fecha es fin de semana (sábado o domingo)
 * @param fecha - Fecha en formato 'YYYY-MM-DD'
 * @returns true si es fin de semana
 */
export function esFindeSemana(fecha: string): boolean {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const d = new Date(anio, mes - 1, dia);
  return d.getDay() === 0 || d.getDay() === 6;
}

/**
 * Obtiene el número de día del mes
 * @param fecha - Fecha en formato 'YYYY-MM-DD'
 * @returns Número del día (1-31)
 */
export function obtenerDiaDelMes(fecha: string): number {
  const [, , dia] = fecha.split('-').map(Number);
  return dia;
}

/**
 * Obtiene el nombre del mes
 * @param fecha - Fecha en formato 'YYYY-MM-DD'
 * @param formato - 'corto' para abreviado, 'largo' para nombre completo
 * @returns Nombre del mes
 */
export function obtenerNombreMes(fecha: string, formato: 'corto' | 'largo' = 'corto'): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const d = new Date(anio, mes - 1, dia);
  return d.toLocaleDateString('es-ES', { month: formato === 'corto' ? 'short' : 'long' });
}

/**
 * Formatea una fecha en formato legible
 * @param fecha - Fecha en formato 'YYYY-MM-DD'
 * @param formato - Formato deseado
 * @returns Fecha formateada
 */
export function formatearFecha(
  fecha: string,
  formato: 'yyyy/MM/dd' | 'dd/MM/yyyy' | 'DD de MMM' | 'DD de MMMM, YYYY' = 'yyyy/MM/dd'
): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const d = new Date(anio, mes - 1, dia);
  
  switch (formato) {
    case 'yyyy/MM/dd':
    case 'dd/MM/yyyy':
      return `${anio}/${String(mes).padStart(2, '0')}/${String(dia).padStart(2, '0')}`;
    case 'DD de MMM':
      return `${dia} de ${obtenerNombreMes(fecha, 'corto')}`;
    case 'DD de MMMM, YYYY':
      return `${dia} de ${obtenerNombreMes(fecha, 'largo')}, ${anio}`;
    default:
      return fecha;
  }
}

/**
 * Suma o resta días a una fecha
 * @param fecha - Fecha en formato 'YYYY-MM-DD'
 * @param dias - Número de días a sumar (positivo) o restar (negativo)
 * @returns Nueva fecha en formato 'YYYY-MM-DD'
 */
export function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const d = new Date(anio, mes - 1, dia);
  d.setDate(d.getDate() + dias);
  return dateAFechaString(d);
}

/**
 * Calcula la diferencia en días entre dos fechas
 * @param fechaInicio - Fecha de inicio en formato 'YYYY-MM-DD'
 * @param fechaFin - Fecha de fin en formato 'YYYY-MM-DD'
 * @returns Número de días de diferencia
 */
export function diferenciaEnDias(fechaInicio: string, fechaFin: string): number {
  const inicio = fechaStringADate(fechaInicio);
  const fin = fechaStringADate(fechaFin);
  const diferencia = fin.getTime() - inicio.getTime();
  return Math.floor(diferencia / (1000 * 60 * 60 * 24));
}

/**
 * Obtiene la fecha actual en formato 'YYYY-MM-DD'
 * @returns Fecha actual
 */
export function obtenerFechaActual(): string {
  return dateAFechaString(new Date());
}
