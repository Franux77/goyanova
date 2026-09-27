import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import './ModalCodigoQR.css';

const ModalCodigoQR = ({ servicioId, nombreServicio, onClose }) => {
  const canvasWrapperRef = useRef(null);
  const [copiado, setCopiado] = useState(false);
  const [errorCopia, setErrorCopia] = useState(false);

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
    // navigator.clipboard solo funciona en contexto seguro (https o localhost);
    // si no está disponible (ej: abriendo por http:// en una IP local desde el
    // celular) copiamos "a mano" con un textarea temporal + execCommand.
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
      } else {
        const textareaTemporal = document.createElement('textarea');
        textareaTemporal.value = link;
        textareaTemporal.style.position = 'fixed';
        textareaTemporal.style.opacity = '0';
        document.body.appendChild(textareaTemporal);
        textareaTemporal.focus();
        textareaTemporal.select();
        const copiadoOk = document.execCommand('copy');
        document.body.removeChild(textareaTemporal);
        if (!copiadoOk) throw new Error('execCommand copy falló');
      }
      setErrorCopia(false);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (error) {
      console.error('Error al copiar el link:', error);
      setCopiado(false);
      setErrorCopia(true);
      setTimeout(() => setErrorCopia(false), 3000);
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
        {errorCopia && (
          <p className="modalqr-error-copia">
            No pudimos copiarlo automáticamente. Mantené presionado el link de arriba para copiarlo manualmente.
          </p>
        )}
      </div>
    </div>
  );
};

export default ModalCodigoQR;
