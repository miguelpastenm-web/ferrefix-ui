import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import OfertaDestacada from '../components/OfertaDestacada';
import BannerPromocional from '../components/BannerPromocional';
import {
  EVENTO_GENERADORES_ACTUALIZADOS,
  ENLACE_POR_DEFECTO,
  obtenerOfertasGeneradas
} from '../data/generadores';
import { listarProductos } from '../api/productos';
import { useCarga } from '../hooks/useCarga';
import { ofertasDeCategoria } from '../utils/ofertas';

import dewaltImg from '../assets/banners/dewalt.webp';
import makitaImg from '../assets/banners/makita.webp';
import boschImg from '../assets/banners/bosch.webp';
import bannerSeguridadImg from '../assets/banners/banner-seguridad.webp';
import bannerMaderasImg from '../assets/banners/banner-maderas-estructurales-para-tu-construccion.webp';

import construccionImg from '../assets/categories/construccion.webp';
import maderasImg from '../assets/categories/maderas.webp';
import herramientasImg from '../assets/categories/herramientas.webp';
import fijacionesImg from '../assets/categories/fijaciones.webp';
import gasfiteriaImg from '../assets/categories/gasfiteria.webp';
import electricidadImg from '../assets/categories/electricidad.webp';
import pinturasImg from '../assets/categories/pinturas.webp';
import ceramicasImg from '../assets/categories/ceramicas.webp';
import seguridadImg from '../assets/categories/seguridad.webp';

const IMAGENES_BANNER = [
  {
    id: 1,
    url: dewaltImg,
    alt: 'Publicidad de producto DeWalt'
  },
  {
    id: 2,
    url: makitaImg,
    alt: 'Publicidad de producto Makita'
  },
  {
    id: 3,
    url: boschImg,
    alt: 'Publicidad de producto Bosch'
  }
];

const CATEGORIAS = [
  { id: 'construccion', nombre: 'Construcción', img: construccionImg },
  { id: 'maderas', nombre: 'Maderas', img: maderasImg },
  { id: 'herramientas', nombre: 'Herramientas', img: herramientasImg },
  { id: 'fijaciones', nombre: 'Fijaciones', img: fijacionesImg },
  { id: 'gasfiteria', nombre: 'Gasfitería', img: gasfiteriaImg },
  { id: 'electricidad', nombre: 'Electricidad', img: electricidadImg },
  { id: 'pinturas', nombre: 'Pinturas', img: pinturasImg },
  { id: 'ceramicas', nombre: 'Cerámicas', img: ceramicasImg },
  { id: 'seguridad', nombre: 'Seguridad', img: seguridadImg }
];

function Home() {
  const [slideActivo, setSlideActivo] = useState(0);
  const [ofertasGeneradas, setOfertasGeneradas] = useState(obtenerOfertasGeneradas);

  // Ofertas destacadas: los productos REALES del catálogo que traen imagen de oferta, por categoría. Si la API falla
  // o no hay ninguno, la sección simplemente no se muestra (el resto del inicio no depende de esto).
  const { datos: productos } = useCarga(listarProductos, 'inicio');
  const ofertasSeguridad = ofertasDeCategoria(productos, 'Seguridad');
  const ofertasMaderasBase = ofertasDeCategoria(productos, 'Maderas');

  // Intervalo automático del carrusel de banners
  useEffect(() => {
    const intervalo = setInterval(() => {
      setSlideActivo((prev) => (prev + 1) % IMAGENES_BANNER.length);
    }, 5000);

    return () => clearInterval(intervalo);
  }, []);

  // Sincroniza las imágenes creadas desde el panel administrativo.
  useEffect(() => {
    const sincronizar = () => {
      setOfertasGeneradas(obtenerOfertasGeneradas());
    };

    window.addEventListener(EVENTO_GENERADORES_ACTUALIZADOS, sincronizar);
    window.addEventListener('storage', sincronizar);

    return () => {
      window.removeEventListener(EVENTO_GENERADORES_ACTUALIZADOS, sincronizar);
      window.removeEventListener('storage', sincronizar);
    };
  }, []);

  // Las ofertas creadas en el panel admin se muestran en la fila de maderas.
  // Si no tienen un enlace propio, se conserva el enlace al producto real.
  const ofertasMaderas = ofertasMaderasBase.map((oferta, indice) => {
    const generada = ofertasGeneradas[indice];
    const enlaceGenerado =
      generada?.enlace && generada.enlace !== ENLACE_POR_DEFECTO ? generada.enlace : null;

    return {
      img: generada?.imagen || oferta.img,
      link: enlaceGenerado || oferta.link,
      alt: generada?.alt || oferta.alt
    };
  });

  const retrocederSlide = () => {
    setSlideActivo((prev) => (prev - 1 + IMAGENES_BANNER.length) % IMAGENES_BANNER.length);
  };

  const avanzarSlide = () => {
    setSlideActivo((prev) => (prev + 1) % IMAGENES_BANNER.length);
  };

  return (
    <div className="home-content">
      {/* Carrusel de marcas / Hero */}
      <section className="carrousel-section py-3 py-md-4">
        <div className="container">
          <div className="carrousel-banner-card">
            <div className="carousel slide h-100">

              {/* Slides */}
              <div className="carousel-inner h-100">
                {IMAGENES_BANNER.map((img, index) => (
                  <div
                    key={img.id}
                    className={`carousel-item h-100 ${index === slideActivo ? 'active' : ''}`}
                  >
                    <img
                      src={img.url}
                      alt={img.alt}
                      className="d-block w-100 carrousel-slide-img"
                    />
                  </div>
                ))}
              </div>

              {/* Flecha Izquierda */}
              <button
                className="carousel-control-prev carrousel-control-pill shadow-lg rounded-4 start-0 ms-3"
                type="button"
                onClick={retrocederSlide}
                aria-label="Anterior"
              >
                <i className="bi bi-chevron-left"></i>
              </button>

              {/* Flecha Derecha */}
              <button
                className="carousel-control-next carrousel-control-pill shadow-lg rounded-4 end-0 me-3"
                type="button"
                onClick={avanzarSlide}
                aria-label="Siguiente"
              >
                <i className="bi bi-chevron-right"></i>
              </button>

              {/* Indicadores */}
              <div className="carousel-indicators carrousel-dots-container mb-3">
                {IMAGENES_BANNER.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`carrousel-dot-indicator bg-ambar ${index === slideActivo ? 'active' : ''}`}
                    aria-current={index === slideActivo ? 'true' : 'false'}
                    aria-label={`Slide ${index + 1}`}
                    onClick={() => setSlideActivo(index)}
                  ></button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categorías destacadas */}
      <section id="catalogo" className="py-2 mb-3">
        <div className="container">

          {/* Encabezado */}
          <div className="marca-centro mb-4">
            <h2 className="cat-title mb-1">
              Categorías destacadas
            </h2>
            <p className="marca-parrafo mb-0">
              Todo lo que necesitas para tus proyectos, obras y reparaciones.
            </p>
          </div>

          {/* Contenedor Categorías */}
          <div className="categorias-banner-capsula rounded-4 bg-platino py-4 px-3 px-lg-4">
            <div className="row row-cols-3 row-cols-md-5 row-cols-xl-auto justify-content-center justify-content-xl-between flex-xl-nowrap g-3 g-xl-2 align-items-start">
              {CATEGORIAS.map((cat) => (
                <div key={cat.id} className="col">
                  <Link
                    to={`/catalogo?categoria=${encodeURIComponent(cat.nombre)}`}
                    className="categoria-item-enlace marca-centro d-block"
                  >
                    <div className="categoria-circulo-wrapper ratio ratio-1x1 rounded-circle overflow-hidden mx-auto shadow-sm">
                      <img
                        src={cat.img}
                        alt={cat.nombre}
                        className="w-100 h-100 object-fit-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="categoria-badge-pill rounded-pill shadow-sm py-2 px-2 mt-2 mx-auto">
                      <span className="categoria-texto-label d-block marca-truncar">
                        {cat.nombre}
                      </span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Banner promocional de seguridad (fijo) */}
      <BannerPromocional
        imagen={bannerSeguridadImg}
        alt="Banner promocional de productos de seguridad"
      />

      {/* Ofertas destacadas de seguridad */}
      <OfertaDestacada ofertas={ofertasSeguridad} />

      {/* Banner de maderas estructurales */}
      <BannerPromocional
        imagen={bannerMaderasImg}
        alt="Banner promocional de maderas estructurales para tu construcción"
        enlace="/catalogo?categoria=Maderas"
      />

      {/* Ofertas destacadas de maderas: oferta 1 a 4 */}
      <OfertaDestacada ofertas={ofertasMaderas} />
    </div>
  );
}

export default Home;
