import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import './ModalCodigoQR.css';

const ModalCodigoQR = ({ servicioId, nombreServicio, onClose }) => {
  const canvasWrapperRef = useRef(null);
  const [copiado, setCopiado] = useState(false);

  const link = `https://goyanova.com.ar/qr/${servicioId}`;

  const handleDescargar = () => {
    const canvas = canvasWrapperRef.current?.querySelector('canvas');
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const enlaceDescarga = document.createElement('a');
    const nombreArchivo = (nombreServicio || 'servicio')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    enlaceDescarga.href = url;
    enlaceDescarga.download = `qr-${nombreArchivo || 'goyanova'}.png`;
    enlaceDescarga.click();
  };

  const handleCopiarLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Si falla el clipboard (navegador viejo o sin permiso), no rompemos nada
    }
  };

  return (
    <div className="modalqr-overlay" onClick={onClose}>
      <div className="modalqr-contenido" onClick={(e) => e.stopPropagation()}>
        <button className="modalqr-cerrar" onClick={onClose} aria-label="Cerrar">
          <span className="material-icons">close</span>
        </button>

        <h3 className="modalqr-titulo">Tu código QR de reseñas</h3>
        <p className="modalqr-subtitulo">
          Imprimilo y ponelo en tu local. Tus clientes lo escanean y dejan una reseña en
          segundos, sin necesidad de crear una cuenta.
        </p>

        <div className="modalqr-canvas-wrapper" ref={canvasWrapperRef}>
          <QRCodeCanvas value={link} size={220} level="M" marginSize={2} />
        </div>

        <button className="modalqr-btn-descargar" onClick={handleDescargar}>
          <span className="material-icons">download</span>
          Descargar imagen PNG
        </button>

        <div className="modalqr-link-box">
          <input type="text" value={link} readOnly className="modalqr-link-input" />
          <button className="modalqr-btn-copiar" onClick={handleCopiarLink}>
            <span className="material-icons">{copiado ? 'check' : 'content_copy'}</span>
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalCodigoQR;
