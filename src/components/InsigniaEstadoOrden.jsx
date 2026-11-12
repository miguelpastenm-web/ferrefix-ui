import { infoEstadoOrden } from '../utils/estadosOrden';

export default function InsigniaEstadoOrden({ estado }) {
  const { etiqueta, clase } = infoEstadoOrden(estado);
  return (
    <span className={`badge ${clase}`} data-estado={estado ?? ''}>
      ● {etiqueta}
    </span>
  );
}
