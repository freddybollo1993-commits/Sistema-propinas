"use client";
import React, { useEffect, useState } from "react";
import type { SessionUser } from "@/lib/auth";
import { type AppTheme, getActiveTheme, toggleTheme } from "@/lib/theme";

interface NavbarTopProps {
	currentUser: SessionUser | null;
	cicloInfo: { inicio: string; fin: string; estado: string } | null;
	onToggleSidebar: () => void;
	onLogout: () => void;
	tiendas?: any[];
	activeTiendaId?: string;
	onSelectTienda?: (tiendaId: string) => void;
	onOpenCrearTienda?: () => void;
	onOpenCatalogo?: () => void;
	onOpenCredenciales?: () => void;
	/** Número de solicitudes pendientes del moderador (solo Admin/Supervisor) */
	notificacionesPendientes?: number;
	/** Callback para abrir el panel de notificaciones */
	onOpenNotificaciones?: () => void;
}

export default function NavbarTop({
	currentUser,
	cicloInfo,
	onToggleSidebar,
	onLogout,
	tiendas = [],
	activeTiendaId = "",
	onSelectTienda,
	onOpenCrearTienda,
	onOpenCatalogo,
	onOpenCredenciales,
	notificacionesPendientes = 0,
	onOpenNotificaciones,
}: NavbarTopProps) {
	const getBadgeStyle = (rol?: string) => {
		if (rol === "Administrador") {
			return {
				bg: "bg-danger-subtle text-danger border border-danger-subtle",
				label: "Admin",
				jp: "管理者",
			};
		}
		if (rol === "Supervisor") {
			return {
				bg: "bg-primary-subtle text-primary border border-primary-subtle",
				label: "Supervisor",
				jp: "監督者",
			};
		}
		return {
			bg: "bg-warning-subtle text-dark border border-warning-subtle",
			label: rol || "Operador",
			jp: "担当者",
		};
	};

	const tiendaActual = tiendas.find((t) => t.id === activeTiendaId);
	const nombreTiendaActual =
		tiendaActual?.nombre || currentUser?.tiendaNombre || "Sede Principal";

	const roleInfo = getBadgeStyle(currentUser?.rol);
	const userInitial = (currentUser?.nombre || "U").charAt(0).toUpperCase();

	const [theme, setTheme] = useState<AppTheme>("halloween");

	useEffect(() => {
		setTheme(getActiveTheme());
		const handleThemeChange = (e: any) => {
			if (e.detail?.theme) {
				setTheme(e.detail.theme);
			}
		};
		window.addEventListener("shimaya-theme-change", handleThemeChange);
		return () =>
			window.removeEventListener("shimaya-theme-change", handleThemeChange);
	}, []);

	const handleToggleTheme = () => {
		const next = toggleTheme();
		setTheme(next);
	};

	return (
		<header className="navbar-top no-print">
			{/* Lado Izquierdo: Botón Menú + Selector Multi-Tienda + Ciclo */}
			<div className="d-flex align-items-center gap-2 gap-sm-3 flex-wrap">
				<button
					type="button"
					className="btn-toggle-sidebar shadow-none"
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						onToggleSidebar();
					}}
					title="Alternar Menú Lateral"
					aria-label="Alternar Menú Lateral"
				>
					<i className="bi bi-list fs-5"></i>
				</button>

				{/* Modo SuperAdmin / Usuario Maestro */}
				{currentUser?.esMaestro ? (
					<div className="d-flex align-items-center gap-2 flex-wrap">
						<button
							type="button"
							className="btn btn-warning btn-sm px-3 shadow-xs d-flex align-items-center gap-2 text-dark fw-bold"
							onClick={onOpenCatalogo}
							title="Abrir Catálogo General de Todas las Tiendas"
						>
							<i className="bi bi-grid-3x3-gap-fill"></i>
							<span className="d-none d-sm-inline">Catálogo</span>
						</button>

						{onOpenCredenciales && (
							<button
								type="button"
								className="btn btn-dark btn-sm px-2 px-sm-3 shadow-xs d-flex align-items-center gap-1 text-warning fw-bold border border-warning border-opacity-25"
								onClick={onOpenCredenciales}
								title="Directorio de Credenciales de Todas las Tiendas"
							>
								<i className="bi bi-key-fill"></i>
								<span className="d-none d-md-inline small">Credenciales</span>
							</button>
						)}

						<div
							className="input-group input-group-sm"
							style={{ maxWidth: "240px" }}
						>
							<span
								className="input-group-text bg-danger text-white border-danger px-2"
								title="Sede Activa Seleccionada"
							>
								<i className="bi bi-shop"></i>
							</span>
							<select
								className="form-select form-select-sm fw-bold text-dark border-danger"
								value={activeTiendaId || ""}
								onChange={(e) =>
									onSelectTienda && onSelectTienda(e.target.value)
								}
								title="Cambiar Tienda / Sucursal Activa"
								style={{ fontSize: "0.84rem" }}
							>
								{tiendas.map((t) => (
									<option key={t.id} value={t.id}>
										{t.nombre}
									</option>
								))}
							</select>
						</div>

						<button
							type="button"
							className="btn btn-outline-primary btn-sm px-2 px-sm-3 d-flex align-items-center gap-1"
							onClick={onOpenCrearTienda}
							title="Crear Nueva Tienda / Sucursal"
						>
							<i className="bi bi-plus-circle-fill"></i>
							<span className="d-none d-md-inline small fw-semibold">
								Nueva Tienda
							</span>
						</button>
					</div>
				) : (
					/* Indicador de Tienda Fija para Usuarios Locales */
					<div
						className="d-flex align-items-center gap-2 px-3 py-1 bg-white border rounded-pill shadow-xs"
						title={`Restaurante Asignado: ${nombreTiendaActual}`}
					>
						<span className="pulse-dot"></span>
						<div className="d-flex align-items-center gap-1">
							<i className="bi bi-shop text-danger small"></i>
							<span className="fw-bold small text-dark">
								{nombreTiendaActual}
							</span>
						</div>
					</div>
				)}

				{/* Badge de Ciclo Activo */}
				<div
					className="d-none d-lg-flex align-items-center gap-2 px-3 py-1 bg-white border rounded-pill text-dark small shadow-xs"
					id="cicloActivoBadge"
				>
					<i className="bi bi-calendar2-week text-danger"></i>
					<span className="text-secondary fw-semibold">Ciclo:</span>
					<span className="fw-bold text-dark font-mono">
						{cicloInfo && cicloInfo.inicio
							? `${cicloInfo.inicio} al ${cicloInfo.fin}`
							: "Cargando..."}
					</span>
					{cicloInfo?.estado && (
						<span
							className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0 ms-1 font-mono"
							style={{ fontSize: "0.68rem" }}
						>
							{cicloInfo.estado}
						</span>
					)}
				</div>
			</div>

			{/* Lado Derecho: Perfil de Usuario + Salir */}
			<div className="d-flex align-items-center gap-2 gap-sm-3">
				{/* User Pill with Hanko look */}
				<div className="d-flex align-items-center gap-2 py-1 px-2 rounded-pill bg-white border shadow-xs">
					<div
						className="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center fw-bold shadow-xs"
						style={{
							width: "32px",
							height: "32px",
							fontSize: "0.85rem",
							background: "linear-gradient(135deg, #c92a2a 0%, #a51d24 100%)",
						}}
					>
						{userInitial}
					</div>
					<div className="d-none d-sm-block text-start me-1">
						<div
							className="fw-bold text-dark small text-truncate lh-1"
							style={{ maxWidth: "140px" }}
						>
							{currentUser?.nombre || "Usuario"}
						</div>
						<span
							className={`badge ${currentUser?.esMaestro ? "bg-danger text-white" : roleInfo.bg} px-2 py-0 mt-1`}
							style={{ fontSize: "0.65rem" }}
						>
							{currentUser?.esMaestro
								? "Maestro 統括"
								: `${roleInfo.label} ${roleInfo.jp}`}
						</span>
					</div>
				</div>

				{/* Botón de Notificaciones (solo Admin/Supervisor/Maestro) */}
				{(currentUser?.rol === "Administrador" ||
					currentUser?.rol === "Supervisor" ||
					currentUser?.esMaestro) &&
					onOpenNotificaciones && (
						<button
							type="button"
							className="btn btn-sm shadow-xs position-relative d-flex align-items-center justify-content-center"
							onClick={onOpenNotificaciones}
							title={
								notificacionesPendientes > 0
									? `${notificacionesPendientes} solicitud${notificacionesPendientes > 1 ? "es" : ""} pendiente${notificacionesPendientes > 1 ? "s" : ""} de aprobación`
									: "Sin solicitudes pendientes"
							}
							style={{
								width: "38px",
								height: "38px",
								borderRadius: "50%",
								background:
									notificacionesPendientes > 0
										? "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)"
										: "#f1f5f9",
								border:
									notificacionesPendientes > 0
										? "2px solid #f59e0b"
										: "1.5px solid #e2e8f0",
								color: notificacionesPendientes > 0 ? "#1e293b" : "#64748b",
								transition: "all 0.2s ease",
							}}
						>
							<i
								className={`bi ${notificacionesPendientes > 0 ? "bi-bell-fill" : "bi-bell"} fs-6`}
								style={
									notificacionesPendientes > 0
										? { animation: "bellRing 1.5s ease infinite" }
										: {}
								}
							/>
							{notificacionesPendientes > 0 && (
								<span
									className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white"
									style={{
										fontSize: "0.6rem",
										padding: "3px 5px",
										minWidth: "18px",
									}}
								>
									{notificacionesPendientes > 99
										? "99+"
										: notificacionesPendientes}
								</span>
							)}
						</button>
					)}

				{/* Botón de Alternancia de Tema: Halloween vs Clásico Original */}
				<button
					type="button"
					className={`btn btn-sm shadow-xs d-flex align-items-center gap-1 px-2.5 py-1 rounded-pill theme-switcher-btn ${
						theme === "halloween"
							? "btn-dark text-warning border border-warning border-opacity-50"
							: "btn-outline-secondary bg-white"
					}`}
					onClick={handleToggleTheme}
					title={
						theme === "halloween"
							? "🎃 Tema estacional activo: Halloween. Clic para cambiar al Clásico Takumi"
							: "🎋 Tema activo: Clásico Takumi. Clic para activar el tema Halloween 🎃"
					}
					style={{ height: "36px" }}
				>
					{theme === "halloween" ? (
						<>
							<span className="fs-6" role="img" aria-label="Halloween">
								🎃
							</span>
							<span className="d-none d-md-inline small fw-bold text-warning">
								Halloween
							</span>
						</>
					) : (
						<>
							<span className="fs-6" role="img" aria-label="Clásico">
								🎋
							</span>
							<span className="d-none d-md-inline small fw-semibold text-secondary">
								Clásico
							</span>
						</>
					)}
				</button>

				{/* Botón Salir */}
				<button
					type="button"
					className="btn btn-outline-danger btn-sm px-3 shadow-xs"
					onClick={onLogout}
					title="Cerrar Sesión Segura"
				>
					<i className="bi bi-box-arrow-right"></i>
					<span className="btn-logout-text ms-1 fw-semibold">Salir</span>
				</button>
			</div>
		</header>
	);
}
