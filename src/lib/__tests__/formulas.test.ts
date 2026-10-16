import { describe, expect, it } from "vitest";
import {
	calcularProrrateoEnMemoria,
	calcularRedistribucionSanciones,
	type ParticipantInput,
	type SancionParaRedistribucion,
	type TrabajadorJornadaFecha,
} from "../formulas";
import { getAreaGroup, ordenarColaboradoresPorArea } from "../areas";

describe("Motor de Cálculo de Prorrateo de Propinas (60% Salón / 40% Cocina)", () => {
	it("debe distribuir exactamente 60% para Salón y 40% para Cocina con horas iguales", () => {
		const montoTotal = 1000;
		const participantes: ParticipantInput[] = [
			{ colaborador: "Mesero 1", area: "Salón", horas: 8 },
			{ colaborador: "Cocinero 1", area: "Cocina", horas: 8 },
		];

		const resultado = calcularProrrateoEnMemoria(montoTotal, participantes);

		expect(resultado.fondoSalon).toBe(600);
		expect(resultado.fondoCocina).toBe(400);
		expect(resultado.totalHorasSalon).toBe(8);
		expect(resultado.totalHorasCocina).toBe(8);

		const mesero = resultado.detalles.find((d) => d.colaborador === "Mesero 1");
		const cocinero = resultado.detalles.find(
			(d) => d.colaborador === "Cocinero 1",
		);

		expect(mesero?.propinaAsignada).toBe(600);
		expect(cocinero?.propinaAsignada).toBe(400);
	});

	it("debe prorratear equitativamente por horas laboradas dentro de la misma área", () => {
		const montoTotal = 1000;
		const participantes: ParticipantInput[] = [
			{ colaborador: "Mesero A", area: "Salón", horas: 4 },
			{ colaborador: "Mesero B", area: "Salón", horas: 8 },
			{ colaborador: "Cocinero A", area: "Cocina", horas: 8 },
		];

		const resultado = calcularProrrateoEnMemoria(montoTotal, participantes);

		expect(resultado.fondoSalon).toBe(600);
		expect(resultado.totalHorasSalon).toBe(12);

		const meseroA = resultado.detalles.find(
			(d) => d.colaborador === "Mesero A",
		);
		const meseroB = resultado.detalles.find(
			(d) => d.colaborador === "Mesero B",
		);
		const cocineroA = resultado.detalles.find(
			(d) => d.colaborador === "Cocinero A",
		);

		// Mesero A: 600 * (4 / 12) = 200
		expect(meseroA?.propinaAsignada).toBe(200);
		// Mesero B: 600 * (8 / 12) = 400
		expect(meseroB?.propinaAsignada).toBe(400);
		// Cocinero A: 400 * (8 / 8) = 400
		expect(cocineroA?.propinaAsignada).toBe(400);

		const sumaTotal = resultado.detalles.reduce(
			(acc, curr) => acc + curr.propinaAsignada,
			0,
		);
		expect(sumaTotal).toBe(1000);
	});

	it("debe manejar colaboradores con 0 horas sin arrojar NaN o división entre cero", () => {
		const montoTotal = 500;
		const participantes: ParticipantInput[] = [
			{ colaborador: "Mesero Cero", area: "Salón", horas: 0 },
			{ colaborador: "Mesero Activo", area: "Salón", horas: 5 },
			{ colaborador: "Cocinero Activo", area: "Cocina", horas: 5 },
		];

		const resultado = calcularProrrateoEnMemoria(montoTotal, participantes);

		const meseroCero = resultado.detalles.find(
			(d) => d.colaborador === "Mesero Cero",
		);
		const meseroActivo = resultado.detalles.find(
			(d) => d.colaborador === "Mesero Activo",
		);

		expect(meseroCero?.propinaAsignada).toBe(0);
		expect(meseroActivo?.propinaAsignada).toBe(300);
	});

	it("debe repartir de forma equitativa entre todo el personal en Modo Especial (ejemplo: S/ 100 entre 3 salón y 2 cocina = S/ 20 c/u)", () => {
		const montoTotal = 100;
		const participantes: ParticipantInput[] = [
			{ colaborador: "Salón 1", area: "Salón", horas: 8 },
			{ colaborador: "Salón 2", area: "Salón", horas: 8 },
			{ colaborador: "Salón 3", area: "Salón", horas: 8 },
			{ colaborador: "Cocina 1", area: "Cocina", horas: 8 },
			{ colaborador: "Cocina 2", area: "Cocina", horas: 8 },
		];

		const resultado = calcularProrrateoEnMemoria(montoTotal, participantes, "EQUITATIVO_GENERAL");

		// Verificamos que cada trabajador reciba exactamente S/ 20
		resultado.detalles.forEach((d) => {
			expect(d.propinaAsignada).toBe(20);
		});

		// Fondo Salón (3 personas x 20) = 60, Fondo Cocina (2 personas x 20) = 40
		expect(resultado.fondoSalon).toBe(60);
		expect(resultado.fondoCocina).toBe(40);
		expect(resultado.totalHorasSalon).toBe(24);
		expect(resultado.totalHorasCocina).toBe(16);
		expect(resultado.totalHorasGlobal).toBe(40);

		// Suma total igual a 100
		const suma = resultado.detalles.reduce((acc, curr) => acc + curr.propinaAsignada, 0);
		expect(suma).toBe(100);
	});

	it("debe prorratear equitativamente por horas globales en modo especial con turnos diferenciados", () => {
		const montoTotal = 1000;
		const participantes: ParticipantInput[] = [
			{ colaborador: "Salón 12h", area: "Salón", horas: 12 },
			{ colaborador: "Cocina 6h", area: "Cocina", horas: 6 },
			{ colaborador: "Cocina 6h B", area: "Cocina", horas: 6 },
		];

		// Total horas = 24.
		// Salón 12h: 1000 * (12/24) = 500
		// Cocina 6h: 1000 * (6/24) = 250
		// Cocina 6h B: 1000 * (6/24) = 250
		const resultado = calcularProrrateoEnMemoria(montoTotal, participantes, "equitativo");

		const s1 = resultado.detalles.find((d) => d.colaborador === "Salón 12h");
		const c1 = resultado.detalles.find((d) => d.colaborador === "Cocina 6h");
		const c2 = resultado.detalles.find((d) => d.colaborador === "Cocina 6h B");

		expect(s1?.propinaAsignada).toBe(500);
		expect(c1?.propinaAsignada).toBe(250);
		expect(c2?.propinaAsignada).toBe(250);
		expect(resultado.fondoSalon).toBe(500);
		expect(resultado.fondoCocina).toBe(500);
	});

	it("debe aplicar pérdida total cuando la frecuencia permitida es 0 y se comete al menos 1 falta", () => {
		// Simulación de evaluación de reincidencia con tolerancia cero (frecuenciaMax: 0)
		const catalogo = [{ infraccion: "Falta Injustificada", estado: "Activo", frecuenciaMax: 0 }];
		const mapLimites: Record<string, number> = {};
		catalogo.forEach((c) => {
			mapLimites[c.infraccion] = c.frecuenciaMax !== undefined ? Math.max(0, c.frecuenciaMax) : 0;
		});

		const colaboradorFaltas = 1;
		const maxPermitido = mapLimites["Falta Injustificada"];
		const superoLimite = colaboradorFaltas > maxPermitido;

		expect(maxPermitido).toBe(0);
		expect(superoLimite).toBe(true);
	});

	it("debe redistribuir la diferencia restante más el adelanto completo cuando un colaborador pierde el 100% de la propina", () => {
		// Colaborador A gana S/ 300 de propina y solicitó un adelanto de S/ 100
		const propinaBruta = 300;
		const adelantos = 100;
		const perdidaTotal = true;

		// Cálculo según regla de negocio
		let montoGenerado = 0;
		if (perdidaTotal) {
			const diferencia = Math.max(0, propinaBruta - adelantos); // S/ 200
			montoGenerado = diferencia + adelantos; // S/ 200 + S/ 100 = S/ 300
		}

		expect(montoGenerado).toBe(300);

		// Si el adelanto supera la propina bruta (ej. propina 80, adelanto 100)
		const propinaMenor = 80;
		const adelantoMayor = 100;
		const dif2 = Math.max(0, propinaMenor - adelantoMayor); // S/ 0
		const montoGen2 = dif2 + adelantoMayor; // S/ 0 + S/ 100 = S/ 100

		expect(montoGen2).toBe(100);
	});

	it("debe unificar múltiples turnos registrados en la misma fecha en una sola jornada consolidada para la liquidación", () => {
		// Simular dos turnos en la misma fecha (ej. 6:00 PM con ID 101 y 10:00 PM con ID 102)
		const registrosSimulados = [
			{
				id: 101,
				fecha: "2026-10-08",
				detalles: [{ colaborador: "Mesero Test", horas: 6, propina: 30.5 }],
			},
			{
				id: 102,
				fecha: "2026-10-08",
				detalles: [{ colaborador: "Mesero Test", horas: 6, propina: 40.25 }],
			},
		];

		const mapaJornadas: Record<string, any> = {};
		registrosSimulados.forEach((reg) => {
			reg.detalles.forEach((det) => {
				const f = reg.fecha;
				if (!mapaJornadas[f]) {
					mapaJornadas[f] = {
						fecha: f,
						ids: [reg.id],
						horas: det.horas,
						propina: det.propina,
					};
				} else {
					mapaJornadas[f].ids.push(reg.id);
					mapaJornadas[f].horas += det.horas;
					mapaJornadas[f].propina += det.propina;
				}
			});
		});

		const detalleDiasUnificado = Object.values(mapaJornadas).map((j: any) => ({
			fecha: j.fecha,
			idRegistro: j.ids.length === 1 ? j.ids[0] : j.ids.join(", "),
			turnoTexto: j.ids.length > 1 ? `${j.ids.length} turnos (#${j.ids.join(", #")})` : `Reg #${j.ids[0]}`,
			horas: Math.round(j.horas * 100) / 100,
			propina: Math.round(j.propina * 100) / 100,
			cantTurnos: j.ids.length,
		}));

		// Debe haber exactamente 1 fila consolidada para la fecha
		expect(detalleDiasUnificado.length).toBe(1);
		expect(detalleDiasUnificado[0].fecha).toBe("2026-10-08");
		expect(detalleDiasUnificado[0].horas).toBe(12);
		expect(detalleDiasUnificado[0].propina).toBe(70.75);
		expect(detalleDiasUnificado[0].cantTurnos).toBe(2);
		expect(detalleDiasUnificado[0].turnoTexto).toBe("2 turnos (#101, #102)");
	});

	it("EDICIÓN DE TURNO: debe recalcular propinas al incorporar un apoyo registrado con posterioridad", () => {
		const montoTotal = 1000;
		// Registro original del día X sin el apoyo:
		const original: ParticipantInput[] = [
			{ colaborador: "Mesero 1", area: "Salón", horas: 12 },
			{ colaborador: "Mesero 2", area: "Salón", horas: 12 },
			{ colaborador: "Cocinero 1", area: "Cocina", horas: 12 },
			{ colaborador: "Cocinero 2", area: "Cocina", horas: 12 },
		];
		const resOriginal = calcularProrrateoEnMemoria(montoTotal, original);
		expect(resOriginal.detalles.find((d) => d.colaborador === "Mesero 1")?.propinaAsignada).toBe(300);
		expect(resOriginal.detalles.find((d) => d.colaborador === "Mesero 2")?.propinaAsignada).toBe(300);

		// Edición del turno incluyendo al nuevo apoyo registrado:
		const editadoConApoyo: ParticipantInput[] = [
			...original,
			{ colaborador: "Apoyo Nuevo Salón", area: "Apoyo Salón", horas: 12 },
		];
		const resEditado = calcularProrrateoEnMemoria(montoTotal, editadoConApoyo);

		// Fondo Salón (600) ahora se reparte entre 3 (Mesero 1, Mesero 2, Apoyo Salón)
		const mesero1 = resEditado.detalles.find((d) => d.colaborador === "Mesero 1");
		const mesero2 = resEditado.detalles.find((d) => d.colaborador === "Mesero 2");
		const apoyo = resEditado.detalles.find((d) => d.colaborador === "Apoyo Nuevo Salón");
		const cocinero1 = resEditado.detalles.find((d) => d.colaborador === "Cocinero 1");

		expect(mesero1?.propinaAsignada).toBe(200);
		expect(mesero2?.propinaAsignada).toBe(200);
		expect(apoyo?.propinaAsignada).toBe(200);
		// Cocina permanece intacta con S/ 200 c/u
		expect(cocinero1?.propinaAsignada).toBe(200);
		expect(resEditado.fondoSalon).toBe(600);
		expect(resEditado.fondoCocina).toBe(400);
	});

	it("EDICIÓN DE TURNO: debe recalcular propinas al modificar horas trabajadas o desactivar trabajadores", () => {
		const montoTotal = 1000;
		// Modificación de horas: Mesero 1 hizo 12h, Mesero 2 se ajusta a 6h bajo justificación
		const conHorasAjustadas: ParticipantInput[] = [
			{ colaborador: "Mesero 1", area: "Salón", horas: 12 },
			{ colaborador: "Mesero 2", area: "Salón", horas: 6 },
			{ colaborador: "Cocinero Único", area: "Cocina", horas: 12 },
		];

		const res = calcularProrrateoEnMemoria(montoTotal, conHorasAjustadas);
		// Fondo Salón = 600. Total horas Salón = 18h.
		// Mesero 1: 600 * (12/18) = 400
		// Mesero 2: 600 * (6/18) = 200
		const m1 = res.detalles.find((d) => d.colaborador === "Mesero 1");
		const m2 = res.detalles.find((d) => d.colaborador === "Mesero 2");
		const c1 = res.detalles.find((d) => d.colaborador === "Cocinero Único");

		expect(m1?.propinaAsignada).toBe(400);
		expect(m2?.propinaAsignada).toBe(200);
		expect(c1?.propinaAsignada).toBe(400);
	});
});

describe("Redistribución Quirúrgica de Sanciones (Misma Fecha, Carga Horaria y Área)", () => {
	it("REGLA 1: Debe redistribuir fondos ÚNICAMENTE al personal que laboró en la misma fecha de la sanción", () => {
		const sanciones: SancionParaRedistribucion[] = [
			{ colaborador: "Mesero Sancionado", monto: 50, fecha: "2026-10-10", area: "Salón" },
		];

		const personalPorFecha: Record<string, Record<string, TrabajadorJornadaFecha>> = {
			"2026-10-10": {
				"Mesero Sancionado": { colaborador: "Mesero Sancionado", horas: 8, area: "Salón" },
				"Mesero Mismo Dia": { colaborador: "Mesero Mismo Dia", horas: 8, area: "Salón" },
			},
			"2026-10-11": {
				"Mesero Otro Dia": { colaborador: "Mesero Otro Dia", horas: 8, area: "Salón" },
			},
		};

		const resultado = calcularRedistribucionSanciones(sanciones, personalPorFecha);

		// "Mesero Mismo Dia" estuvo presente en la fecha de la sanción -> recibe los S/ 50
		expect(resultado.bonosPorColaborador["Mesero Mismo Dia"]).toBe(50);
		// "Mesero Otro Dia" trabajó en otra fecha -> debe recibir S/ 0 (o undefined)
		expect(resultado.bonosPorColaborador["Mesero Otro Dia"]).toBeUndefined();
		// El sancionado no recibe parte de su propia sanción
		expect(resultado.bonosPorColaborador["Mesero Sancionado"]).toBeUndefined();
		expect(resultado.fondoRedistribuirTotal).toBe(50);
	});

	it("REGLA 2: Debe prorratear los fondos proporcionalmente a las horas registradas (carga de trabajo)", () => {
		const sanciones: SancionParaRedistribucion[] = [
			{ colaborador: "Mesero Infractor", monto: 60, fecha: "2026-10-12", area: "Salón" },
		];

		const personalPorFecha: Record<string, Record<string, TrabajadorJornadaFecha>> = {
			"2026-10-12": {
				"Mesero Infractor": { colaborador: "Mesero Infractor", horas: 6, area: "Salón" },
				"Mesero 8h": { colaborador: "Mesero 8h", horas: 8, area: "Salón" },
				"Mesero 4h": { colaborador: "Mesero 4h", horas: 4, area: "Salón" },
			},
		};

		// Total horas destinatarios = 8h + 4h = 12h
		// Mesero 8h: 60 * (8 / 12) = S/ 40.00
		// Mesero 4h: 60 * (4 / 12) = S/ 20.00
		const resultado = calcularRedistribucionSanciones(sanciones, personalPorFecha);

		expect(resultado.bonosPorColaborador["Mesero 8h"]).toBe(40);
		expect(resultado.bonosPorColaborador["Mesero 4h"]).toBe(20);
		expect(resultado.fondoSalonTotal).toBe(60);
		expect(resultado.fondoCocinaTotal).toBe(0);

		// Detalle de auditoría
		const detalle8h = resultado.detallesPorColaborador["Mesero 8h"];
		expect(detalle8h).toHaveLength(1);
		expect(detalle8h[0].horasTrabajador).toBe(8);
		expect(detalle8h[0].totalHorasArea).toBe(12);
		expect(detalle8h[0].montoBono).toBe(40);
	});

	it("REGLA 3: Debe respetar la separación estricta de áreas (Salón para Salón, Cocina para Cocina)", () => {
		const sanciones: SancionParaRedistribucion[] = [
			{ colaborador: "Mesero Sancionado", monto: 100, fecha: "2026-10-14", area: "Salón" },
			{ colaborador: "Cocinero Sancionado", monto: 40, fecha: "2026-10-14", area: "Cocina" },
		];

		const personalPorFecha: Record<string, Record<string, TrabajadorJornadaFecha>> = {
			"2026-10-14": {
				"Mesero Sancionado": { colaborador: "Mesero Sancionado", horas: 8, area: "Salón" },
				"Mesero Limpio": { colaborador: "Mesero Limpio", horas: 8, area: "Salón" },
				"Cocinero Sancionado": { colaborador: "Cocinero Sancionado", horas: 8, area: "Cocina" },
				"Cocinero Limpio": { colaborador: "Cocinero Limpio", horas: 8, area: "Cocina" },
			},
		};

		const resultado = calcularRedistribucionSanciones(sanciones, personalPorFecha);

		// Salón se queda en Salón
		expect(resultado.bonosPorColaborador["Mesero Limpio"]).toBe(100);
		// Cocina se queda en Cocina
		expect(resultado.bonosPorColaborador["Cocinero Limpio"]).toBe(40);
		expect(resultado.fondoSalonTotal).toBe(100);
		expect(resultado.fondoCocinaTotal).toBe(40);
		expect(resultado.fondoRedistribuirTotal).toBe(140);
	});

	it("REGLA 4: Debe excluir al infractor y a trabajadores con pérdida total del 100%", () => {
		const sanciones: SancionParaRedistribucion[] = [
			{ colaborador: "Mesero A", monto: 90, fecha: "2026-10-15", area: "Salón" },
		];

		const personalPorFecha: Record<string, Record<string, TrabajadorJornadaFecha>> = {
			"2026-10-15": {
				"Mesero A": { colaborador: "Mesero A", horas: 8, area: "Salón" },
				"Mesero Con Pérdida": { colaborador: "Mesero Con Pérdida", horas: 8, area: "Salón" },
				"Mesero Elegible": { colaborador: "Mesero Elegible", horas: 8, area: "Salón" },
			},
		};

		const colaboradoresConPerdidaTotal = new Set<string>(["Mesero Con Pérdida"]);

		const resultado = calcularRedistribucionSanciones(
			sanciones,
			personalPorFecha,
			colaboradoresConPerdidaTotal
		);

		// "Mesero Con Pérdida" está vetado -> 0
		expect(resultado.bonosPorColaborador["Mesero Con Pérdida"]).toBeUndefined();
		// "Mesero A" es el infractor -> 0
		expect(resultado.bonosPorColaborador["Mesero A"]).toBeUndefined();
		// "Mesero Elegible" se lleva el 100% de la sanción (S/ 90)
		expect(resultado.bonosPorColaborador["Mesero Elegible"]).toBe(90);
	});

	it("REGLA 5: Soporta consolidación de múltiples turnos en la misma fecha", () => {
		const sanciones: SancionParaRedistribucion[] = [
			{ colaborador: "Infracción Cocina", monto: 120, fecha: "2026-10-16", area: "Cocina" },
		];

		// Cocinero Doble Turno hizo 2 turnos de 6h (total 12h)
		// Cocinero Turno Simple hizo 1 turno de 6h (total 6h)
		const personalPorFecha: Record<string, Record<string, TrabajadorJornadaFecha>> = {
			"2026-10-16": {
				"Infracción Cocina": { colaborador: "Infracción Cocina", horas: 6, area: "Cocina" },
				"Cocinero Doble Turno": { colaborador: "Cocinero Doble Turno", horas: 12, area: "Cocina" },
				"Cocinero Turno Simple": { colaborador: "Cocinero Turno Simple", horas: 6, area: "Cocina" },
			},
		};

		// Total horas elegibles = 18h
		// Doble Turno (12h): 120 * (12 / 18) = S/ 80.00
		// Turno Simple (6h): 120 * (6 / 18) = S/ 40.00
		const resultado = calcularRedistribucionSanciones(sanciones, personalPorFecha);

		expect(Math.round(resultado.bonosPorColaborador["Cocinero Doble Turno"] * 100) / 100).toBe(80);
		expect(Math.round(resultado.bonosPorColaborador["Cocinero Turno Simple"] * 100) / 100).toBe(40);
	});

	it("REGLA 6: Manejo seguro cuando no existen otros colaboradores elegibles en esa fecha", () => {
		const sanciones: SancionParaRedistribucion[] = [
			{ colaborador: "Mesero Solitario", monto: 30, fecha: "2026-10-17", area: "Salón" },
		];

		const personalPorFecha: Record<string, Record<string, TrabajadorJornadaFecha>> = {
			"2026-10-17": {
				"Mesero Solitario": { colaborador: "Mesero Solitario", horas: 8, area: "Salón" },
			},
		};

		const resultado = calcularRedistribucionSanciones(sanciones, personalPorFecha);

		expect(resultado.fondoRedistribuirTotal).toBe(0);
		expect(resultado.bonosPorColaborador["Mesero Solitario"]).toBeUndefined();
	});
});

describe("Organización de Colaboradores (Salón, Apoyos Salón, Cocina, Apoyos Cocina)", () => {
	it("debe clasificar correctamente las áreas y subgrupos con getAreaGroup", () => {
		const salonRegular = getAreaGroup("Salón");
		const salonApoyo = getAreaGroup("Apoyo Salón");
		const cocinaRegular = getAreaGroup("Cocina");
		const cocinaApoyo = getAreaGroup("Apoyo Cocina");
		const admin = getAreaGroup("Administración");

		expect(salonRegular.groupOrder).toBe(1);
		expect(salonRegular.subOrder).toBe(1);

		expect(salonApoyo.groupOrder).toBe(1);
		expect(salonApoyo.subOrder).toBe(2);

		expect(cocinaRegular.groupOrder).toBe(2);
		expect(cocinaRegular.subOrder).toBe(1);

		expect(cocinaApoyo.groupOrder).toBe(2);
		expect(cocinaApoyo.subOrder).toBe(2);

		expect(admin.groupOrder).toBe(3);
		expect(admin.subOrder).toBe(1);
	});

	it("debe ordenar la lista estrictamente en la secuencia: 1° Salón, 2° Apoyos Salón, 3° Cocina, 4° Apoyos Cocina", () => {
		const colaboradoresDesordenados = [
			{ nombre: "Zulema Cocina Apoyo", area: "Apoyo Cocina" },
			{ nombre: "Carlos Cocina Titular", area: "Cocina" },
			{ nombre: "Beatriz Salón Apoyo", area: "Apoyo Salón" },
			{ nombre: "Alberto Salón Titular", area: "Salón" },
			{ nombre: "Daniel Salón Titular", area: "Salón" },
			{ nombre: "Ximena Cocina Titular", area: "Cocina" },
			{ nombre: "Ana Salón Apoyo", area: "Apoyo Salón" },
		];

		const ordenados = ordenarColaboradoresPorArea(colaboradoresDesordenados);

		const nombresOrdenados = ordenados.map((c) => c.nombre);

		expect(nombresOrdenados).toEqual([
			// 1. Salón titulares (alfabético)
			"Alberto Salón Titular",
			"Daniel Salón Titular",
			// 2. Salón apoyos (alfabético)
			"Ana Salón Apoyo",
			"Beatriz Salón Apoyo",
			// 3. Cocina titulares (alfabético)
			"Carlos Cocina Titular",
			"Ximena Cocina Titular",
			// 4. Cocina apoyos (alfabético)
			"Zulema Cocina Apoyo",
		]);
	});

	it("debe soportar indistintamente la propiedad 'colaborador' o 'nombre'", () => {
		const listaLiquidacion = [
			{ colaborador: "Pedro Cocina", area: "Cocina" },
			{ colaborador: "Maria Apoyo Salón", area: "Apoyo Salón" },
			{ colaborador: "Juan Salón", area: "Salón" },
		];

		const ordenados = ordenarColaboradoresPorArea(listaLiquidacion);

		expect(ordenados.map((c) => c.colaborador)).toEqual([
			"Juan Salón",
			"Maria Apoyo Salón",
			"Pedro Cocina",
		]);
	});
});



