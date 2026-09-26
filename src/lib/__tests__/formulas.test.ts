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
});
