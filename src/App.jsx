import ToastNotificacion from "./components/ToastNotificacion";
import { Routes, Route, useLocation } from 'react-router-dom';
import Topbar from './components/Topbar';
import Navbar from './components/Navbar';
import RutaProtegida from './components/RutaProtegida';
import EsperarSesion from './components/EsperarSesion';
import Home from './pages/Home';
import Catalogo from './pages/Catalogo';
import DetalleProducto from './pages/DetalleProducto';
import Arriendos from './pages/Arriendos';
import Nosotros from './pages/Nosotros';
import ContactoCotizacion from './pages/ContactoCotizacion';
import Carrito from './pages/Carrito';
import Login from './pages/Login';
import CuentaCliente from './pages/CuentaCliente';
import Admin from './pages/Admin';
import Fletes from './pages/Fletes';
import Garantias from './pages/Garantias';
import PreguntasFrecuentes from './pages/PreguntasFrecuentes';
import TerminosCondiciones from './pages/TerminosCondiciones';
import Privacidad from './pages/Privacidad';
import Footer from './components/Footer';
import './index.css';

function App() {
  const location = useLocation();
  const esRutaAdmin = location.pathname.startsWith('/admin');

  // Páginas que se inicializan con los datos del usuario (formularios prellenados): esperan a saber quién es.
  const conSesion = (pagina) => <EsperarSesion>{pagina}</EsperarSesion>;

  // Páginas solo para clientes. Un ADMIN que entra aquí es llevado a /admin.
  const soloCliente = (pagina) => <RutaProtegida roles={['CLIENTE']}>{pagina}</RutaProtegida>;

  return (
    <>
      <ToastNotificacion />
      {!esRutaAdmin && <Topbar />}
      {!esRutaAdmin && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/catalogo" element={<Catalogo />} />
        <Route path="/producto/:id" element={<DetalleProducto />} />
        <Route path="/arriendos" element={conSesion(<Arriendos />)} />
        <Route path="/nosotros" element={<Nosotros />} />
        <Route path="/fletes" element={<Fletes />} />
        <Route path="/garantias" element={<Garantias />} />
        <Route path="/faq" element={<PreguntasFrecuentes />} />
        <Route path="/terminos" element={<TerminosCondiciones />} />
        <Route path="/privacidad" element={<Privacidad />} />
        <Route path="/contacto" element={conSesion(<ContactoCotizacion />)} />
        <Route path="/cotizaciones" element={conSesion(<ContactoCotizacion />)} />
        <Route path="/carrito" element={conSesion(<Carrito />)} />
        <Route path="/cuenta" element={soloCliente(<CuentaCliente />)} />
        <Route path="/mi-cuenta" element={soloCliente(<CuentaCliente />)} />
        <Route path="/perfil" element={soloCliente(<CuentaCliente />)} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Login />} />
        <Route path="/admin" element={<RutaProtegida roles={['ADMIN']}><Admin /></RutaProtegida>} />
      </Routes>
      {!esRutaAdmin && <Footer />}
    </>
  );
}

export default App;
