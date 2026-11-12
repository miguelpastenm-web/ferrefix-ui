import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/authContexto';
import { ApiError, erroresPorCampo } from '../api/errores';
import { validadores, validarFormulario, formatearRut } from '../data/validaciones';
import { rutaInternaSegura, rutaInicialPorRol } from '../utils/redireccion';
import { mostrarToast } from '../components/ToastNotificacion';
import { IndicadorCarga } from '../components/EsperarSesion';

const CAMPOS_DEL_FORMULARIO = ['nombre', 'rut', 'email', 'password'];

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { autenticado, cargando, roles, login, registrar } = useAuth();

  // 'login' | 'registro' - derivado siempre de la ruta (/registro o /login)
  const modo = location.pathname === '/registro' ? 'registro' : 'login';

  // Estados de formulario
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [errores, setErrores] = useState({});
  const [touched, setTouched] = useState({});
  const [enviando, setEnviando] = useState(false);

  const reglasActuales = () =>
    modo === 'registro'
      ? { nombre: validadores.nombre, rut: validadores.rut, email: validadores.email, password: validadores.password }
      : { email: validadores.email, password: validadores.requerido('La contraseña') };

  const valores = { nombre, rut, email, password };

  const handleChange = (campo, valor, setter) => {
    setter(valor);
    if (touched[campo]) {
      const validador = reglasActuales()[campo];
      if (validador) setErrores((prev) => ({ ...prev, [campo]: validador(valor) }));
    }
  };

  const handleBlur = (campo) => {
    setTouched((prev) => ({ ...prev, [campo]: true }));
    const validador = reglasActuales()[campo];
    if (validador) setErrores((prev) => ({ ...prev, [campo]: validador(valores[campo]) }));
  };

  const claseCampo = (campo) =>
    `form-control form-control-sm rounded-1${errores[campo] ? ' is-invalid' : ''}`;

  const limpiarMensajes = () => {
    setErrorMsg('');
    setErrores({});
    setTouched({});
  };

  // Traduce el rechazo del backend a mensajes junto a los campos y una alerta general.
  const mostrarErrorDelServidor = (error) => {
    if (!(error instanceof ApiError)) {
      setErrorMsg('Ocurrió un error inesperado. Inténtalo nuevamente.');
      return;
    }
    const delServidor = erroresPorCampo(error); // 400 con "details": {campo: mensaje}
    const mapeados = {};
    CAMPOS_DEL_FORMULARIO.forEach((campo) => {
      if (delServidor[campo]) mapeados[campo] = delServidor[campo];
    });
    // Rechazos de negocio que vienen sin "details": se asocian al campo que corresponde.
    if (modo === 'registro' && (error.status === 400 || error.status === 409) && /RUT/i.test(error.mensaje)) {
      mapeados.rut = error.mensaje;
    }
    if (modo === 'registro' && error.status === 409 && /correo/i.test(error.mensaje)) {
      mapeados.email = error.mensaje;
    }
    if (Object.keys(mapeados).length > 0) setErrores((prev) => ({ ...prev, ...mapeados }));
    setErrorMsg(error.mensaje);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (enviando) return;
    setErrorMsg('');

    const reglas = reglasActuales();
    const nuevosErrores = validarFormulario(reglas, valores);
    setErrores(nuevosErrores);
    setTouched(Object.keys(reglas).reduce((acc, campo) => ({ ...acc, [campo]: true }), {}));
    if (Object.keys(nuevosErrores).length > 0) return;

    setEnviando(true);
    try {
      if (modo === 'login') {
        const usuario = await login({ email, password });
        mostrarToast({ titulo: '¡Bienvenido/a de vuelta!', mensaje: `Hola, ${usuario.nombre}.`, tipo: 'success', duracion: 3500 });
      } else {
        const usuario = await registrar({ rut, nombre, email, password });
        mostrarToast({ titulo: '¡Cuenta creada con éxito!', mensaje: `Bienvenido/a a Ferrefix, ${usuario.nombre}.`, tipo: 'success', duracion: 3500 });
      }
      // No se navega aquí: al quedar autenticado, el <Navigate> de más abajo lleva al destino.
    } catch (error) {
      mostrarErrorDelServidor(error);
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) return <IndicadorCarga etiqueta="Verificando tu sesión…" />;

  // Con sesión iniciada no tiene sentido ver el formulario. `next` solo se respeta si es una ruta INTERNA.
  if (autenticado) {
    return <Navigate to={rutaInternaSegura(searchParams.get('next'), rutaInicialPorRol(roles))} replace />;
  }

  return (
    <div className="login-page py-5 d-flex align-items-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-10 col-md-8 col-lg-5">

            <div className="auth-card shadow-sm p-4 p-md-5">

              {/* Encabezado */}
              <div className="auth-head mb-4">
                <h1 className="auth-title mb-1">
                  {modo === 'login' ? 'Iniciar Sesión en Ferrefix' : 'Crear Cuenta de Cliente'}
                </h1>
                <p className="auth-sub mb-0">
                  {modo === 'login'
                    ? 'Accede a tu cuenta para autocompletar tus compras y ver tus pedidos.'
                    : 'Regístrate para comprar herramientas con despacho prioritario.'}
                </p>
              </div>

              {/* Selector de modo (se conserva el parámetro "next") */}
              <div className="btn-group login-mode-group w-100 mb-4 rounded-1" role="group">
                <button
                  type="button"
                  className={`btn login-mode-btn ${modo === 'login' ? 'active' : ''}`}
                  onClick={() => { limpiarMensajes(); navigate(`/login${location.search}`, { replace: true }); }}
                >
                  Ya tengo cuenta
                </button>
                <button
                  type="button"
                  className={`btn login-mode-btn ${modo === 'registro' ? 'active' : ''}`}
                  onClick={() => { limpiarMensajes(); navigate(`/registro${location.search}`, { replace: true }); }}
                >
                  Soy nuevo cliente
                </button>
              </div>

              {/* Mensaje general */}
              {errorMsg && (
                <div className="alert alert-danger auth-alert py-2 px-3 rounded-1 mb-3" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-1"></i>
                  {errorMsg}
                </div>
              )}

              {/* Formulario */}
              <form onSubmit={handleSubmit} noValidate>
                {modo === 'registro' && (
                  <>
                    <div className="mb-3">
                      <label htmlFor="auth-nombre" className="form-label auth-label mb-1">Nombre Completo *</label>
                      <input
                        id="auth-nombre"
                        name="nombre"
                        type="text"
                        autoComplete="name"
                        className={claseCampo('nombre')}
                        placeholder="Ej: Juan Pérez"
                        value={nombre}
                        onChange={(e) => handleChange('nombre', e.target.value, setNombre)}
                        onBlur={() => handleBlur('nombre')}
                        required
                      />
                      {errores.nombre && <div className="invalid-feedback">{errores.nombre}</div>}
                    </div>

                    <div className="mb-3">
                      <label htmlFor="auth-rut" className="form-label auth-label mb-1">RUN / RUT *</label>
                      <input
                        id="auth-rut"
                        name="rut"
                        type="text"
                        inputMode="text"
                        autoComplete="off"
                        className={`${claseCampo('rut')} font-monospace`}
                        placeholder="Ej: 12.345.678-5"
                        maxLength={12}
                        value={rut}
                        onChange={(e) => handleChange('rut', formatearRut(e.target.value), setRut)}
                        onBlur={() => handleBlur('rut')}
                        required
                      />
                      {errores.rut && <div className="invalid-feedback">{errores.rut}</div>}
                    </div>
                  </>
                )}

                <div className="mb-3">
                  <label htmlFor="auth-email" className="form-label auth-label mb-1">Correo Electrónico *</label>
                  <input
                    id="auth-email"
                    name="email"
                    type="email"
                    autoComplete={modo === 'login' ? 'username' : 'email'}
                    className={claseCampo('email')}
                    placeholder="nombre@ejemplo.cl"
                    value={email}
                    onChange={(e) => handleChange('email', e.target.value, setEmail)}
                    onBlur={() => handleBlur('email')}
                    required
                  />
                  {errores.email && <div className="invalid-feedback">{errores.email}</div>}
                </div>

                <div className="mb-4">
                  <label htmlFor="auth-password" className="form-label auth-label mb-1">Contraseña *</label>
                  <input
                    id="auth-password"
                    name="password"
                    type="password"
                    autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
                    className={claseCampo('password')}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => handleChange('password', e.target.value, setPassword)}
                    onBlur={() => handleBlur('password')}
                    required
                  />
                  {modo === 'registro' && !errores.password && <div className="form-text">Mínimo 8 caracteres.</div>}
                  {errores.password && <div className="invalid-feedback">{errores.password}</div>}
                </div>

                <button
                  type="submit"
                  className="btn btn-ambar auth-submit w-100 py-2 rounded-1 shadow-sm mb-3"
                  disabled={enviando}
                >
                  {enviando ? 'Enviando…' : modo === 'login' ? 'Entrar a mi Cuenta' : 'Registrarme e Iniciar Sesión'}
                </button>
              </form>

              <div className="auth-foot pt-3 mt-3 border-top">
                <Link to="/" className="auth-back-link">
                  ← Volver a la Tienda
                </Link>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
