import { mostrarToast } from "../components/ToastNotificacion";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/authContexto';
import { REGIONES_CHILE, REGION_POR_DEFECTO } from '../data/chile';
import {
  validadores,
  validarFormulario,
  formatearRut,
  formatearTelefono
} from '../data/validaciones';

// Reglas de validación de los campos del formulario.
const REGLAS_VALIDACION = {
  nombre: validadores.razonSocial,
  rut: validadores.rut,
  email: validadores.email,
  telefono: validadores.telefono,
  detalle: validadores.detalle
};

function ContactoCotizacion() {
  const { usuario: sesion } = useAuth();

  const valorInicial = {
    nombre: sesion ? sesion.nombre : '',
    rut: '',
    email: sesion ? sesion.email : '',
    telefono: '',
    tipoProyecto: 'Herramientas de Alto Rendimiento',
    region: REGION_POR_DEFECTO,
    detalle: '',
    despachoObra: true
  };

  const [form, setForm] = useState(valorInicial);
  const [errores, setErrores] = useState({});
  const [touched, setTouched] = useState({});

  // Valida un solo campo (lo usa onChange/onBlur).
  const validarCampo = (campo, valor) => {
    const validador = REGLAS_VALIDACION[campo];
    if (!validador) return;
    const mensaje = validador(valor);
    setErrores((prev) => ({ ...prev, [campo]: mensaje }));
  };

  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (touched[campo]) validarCampo(campo, valor);
  };

  const handleBlur = (campo) => {
    setTouched((prev) => ({ ...prev, [campo]: true }));
    validarCampo(campo, form[campo]);
  };

  // Clase de Bootstrap según si el campo tiene error y fue tocado.
  const claseCampo = (campo, base = 'form-control form-control-sm rounded-1') =>
    `${base}${errores[campo] ? ' is-invalid' : ''}`;

  const handleSubmit = (e) => {
    e.preventDefault();

    const nuevosErrores = validarFormulario(REGLAS_VALIDACION, form);
    setErrores(nuevosErrores);
    setTouched(
      Object.keys(REGLAS_VALIDACION).reduce((acc, campo) => ({ ...acc, [campo]: true }), {})
    );

    if (Object.keys(nuevosErrores).length > 0) {
      return;
    }

    const cotizacion = {
      idCotizacion: `COT-${Date.now().toString().slice(-6)}`,
      fecha: new Date().toLocaleString('es-CL'),
      ...form
    };

    // Guardar en localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const previas = JSON.parse(localStorage.getItem('ferrefix_cotizaciones_v1') || '[]');
      localStorage.setItem('ferrefix_cotizaciones_v1', JSON.stringify([cotizacion, ...previas]));
    }

    mostrarToast({
      titulo: "¡Cotización Enviada!",
      mensaje: `Tu número de cotización es #${cotizacion.idCotizacion}. Un asesor se pondrá en contacto a la brevedad.`,
      tipo: "success",
      duracion: 6000
    });
    setForm({ ...valorInicial, nombre: '', email: '' });
    setErrores({});
    setTouched({});
  };

  return (
    <div className="contacto-cotizacion-page py-4 py-lg-5">
      <div className="container">

        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-4">
          <ol className="breadcrumb cot-breadcrumb mb-0">
            <li className="breadcrumb-item"><Link to="/">Inicio</Link></li>
            <li className="breadcrumb-item active" aria-current="page">Cotizaciones y Contacto</li>
          </ol>
        </nav>

        {/* Encabezado */}
        <div className="brand-hero rounded-1 p-4 p-md-5 mb-4">
          <h1 className="brand-hero-title mb-2">
            Cotizaciones por Volumen y Contacto Comercial
          </h1>
          <p className="brand-hero-text mb-0">
            ¿Necesitas presupuestos especiales para tu obra, compra por mayor o arriendo corporativo? Completa el formulario y un asesor técnico de Ferrefix te enviará la propuesta formal en menos de 2 horas hábiles.
          </p>
        </div>

        {/* Canales Directos */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-md-4">
            <div className="cot-channel-card rounded-1 p-4 shadow-sm h-100">
              <div className="cot-channel-title mb-1">Mesa Central y Cotizaciones</div>
              <div className="cot-channel-sub mb-2">Atención telefónica de lunes a sábado</div>
              <a href="tel:+56993456575" className="cot-channel-link">
                +56 9 9345 6575
              </a>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="cot-channel-card rounded-1 p-4 shadow-sm h-100">
              <div className="cot-channel-title mb-1">Correo de Ventas Corporativas</div>
              <div className="cot-channel-sub mb-2">Envío de órdenes de compra y licitaciones</div>
              <span className="cot-channel-value">
                contacto@ferrefix.cl
              </span>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="cot-channel-card rounded-1 p-4 shadow-sm h-100">
              <div className="cot-channel-title mb-1">Casa Matriz y Mesón Técnico</div>
              <div className="cot-channel-sub mb-2">Retiro inmediato de materiales y maquinaria</div>
              <span className="cot-channel-value">
                Antonio Varas 666, Providencia
              </span>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="row justify-content-center">
          <div className="col-12">
            <div className="cot-form-card rounded-1 shadow-sm p-4 p-md-5">

              <div className="cot-form-header pb-3 mb-4">
                <h2 className="cot-form-title mb-1">
                  Formulario de Solicitud de Cotización
                </h2>
                <p className="cot-form-sub mb-0">
                  Ingresa los detalles de los productos o maquinaria que requieres para tu faena.
                </p>
              </div>

              {Object.values(errores).some(Boolean) && (
                <div className="alert alert-danger d-flex align-items-center p-3 rounded-1 mb-4" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  <div>Revisa los campos marcados en rojo antes de enviar tu solicitud.</div>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="row g-3">

                  <div className="col-12 col-md-6">
                    <label className="form-label cot-label mb-1">
                      Nombre o Razón Social *
                    </label>
                    <input 
                      type="text" 
                      className={claseCampo('nombre')}
                      placeholder="Ej: Constructora Andina o Juan Pérez"
                      value={form.nombre}
                      onChange={(e) => handleChange('nombre', e.target.value)}
                      onBlur={() => handleBlur('nombre')}
                      required
                    />
                    {errores.nombre && <div className="invalid-feedback">{errores.nombre}</div>}
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label cot-label mb-1">
                      RUT Persona o Empresa *
                    </label>
                    <input 
                      type="text" 
                      className={claseCampo('rut')}
                      placeholder="Ej: 76.123.456-7"
                      value={form.rut}
                      onChange={(e) => handleChange('rut', formatearRut(e.target.value))}
                      onBlur={() => handleBlur('rut')}
                      inputMode="text"
                      maxLength={12}
                      required
                    />
                    {errores.rut && <div className="invalid-feedback">{errores.rut}</div>}
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label cot-label mb-1">
                      Correo Electrónico de Contacto *
                    </label>
                    <input 
                      type="email" 
                      className={claseCampo('email')}
                      placeholder="adquisiciones@empresa.cl"
                      value={form.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      onBlur={() => handleBlur('email')}
                      required
                    />
                    {errores.email && <div className="invalid-feedback">{errores.email}</div>}
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label cot-label mb-1">
                      Teléfono Móvil o Faena *
                    </label>
                    <input 
                      type="tel" 
                      className={claseCampo('telefono')}
                      placeholder="+56 9 9876 5432"
                      value={form.telefono}
                      onChange={(e) => handleChange('telefono', formatearTelefono(e.target.value))}
                      onBlur={() => handleBlur('telefono')}
                      inputMode="tel"
                      maxLength={17}
                      required
                    />
                    {errores.telefono && <div className="invalid-feedback">{errores.telefono}</div>}
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label cot-label mb-1">
                      Tipo de Requerimiento *
                    </label>
                    <select 
                      className="form-select form-select-sm rounded-1"
                      value={form.tipoProyecto}
                      onChange={(e) => setForm({ ...form, tipoProyecto: e.target.value })}
                    >
                      <option value="Herramientas de Alto Rendimiento">Herramientas de Alto Rendimiento (DeWalt, Bosch, Makita)</option>
                      <option value="Materiales de Obra Gruesa">Materiales de Obra Gruesa (Cemento, Maderas)</option>
                      <option value="Fijaciones y Tornillería por Mayor">Fijaciones y Tornillería por Mayor</option>
                      <option value="Arriendo de Maquinaria y Demoledores">Arriendo de Maquinaria y Demoledores</option>
                      <option value="Equipamiento de Seguridad y Faena">Equipamiento de Seguridad y Faena</option>
                      <option value="Otro Requerimiento Especial">Otro Requerimiento Especial</option>
                    </select>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label cot-label mb-1">
                      Región de Entrega / Faena *
                    </label>
                    <select 
                      className="form-select form-select-sm rounded-1"
                      value={form.region}
                      onChange={(e) => handleChange('region', e.target.value)}
                    >
                      {REGIONES_CHILE.map((r) => (
                        <option key={r.region} value={r.region}>{r.region}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label cot-label mb-1">
                      Detalle de Productos, Cantidades o Especificaciones *
                    </label>
                    <textarea 
                      className={claseCampo('detalle')}
                      rows="4"
                      placeholder="Detalla qué artículos, cantidades aproximadas o fechas de faena necesitas cotizar..."
                      value={form.detalle}
                      onChange={(e) => handleChange('detalle', e.target.value)}
                      onBlur={() => handleBlur('detalle')}
                      required
                    ></textarea>
                    {errores.detalle && <div className="invalid-feedback">{errores.detalle}</div>}
                  </div>

                  <div className="col-12">
                    <div className="form-check">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        id="despachoCheck"
                        checked={form.despachoObra}
                        onChange={(e) => setForm({ ...form, despachoObra: e.target.checked })}
                      />
                      <label className="form-check-label cot-check-label" htmlFor="despachoCheck">
                        Solicito incluir cotización de despacho directo en camión a obra / faena.
                      </label>
                    </div>
                  </div>

                  <div className="col-12 pt-2">
                    <button 
                      type="submit" 
                      className="btn btn-ambar cot-submit-btn px-4 py-2 rounded-1 shadow-sm"
                    >
                      Enviar Solicitud de Cotización
                    </button>
                  </div>

                </div>
              </form>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default ContactoCotizacion;
