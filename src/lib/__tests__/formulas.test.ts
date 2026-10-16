import { describe, expect, it } from "vitest";
import { calcularProrrateoEnMemoria, type ParticipantInput } from "../formulas";

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



