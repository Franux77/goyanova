import React, { useState, useEffect } from "react";
import { analizarWhatsapp, analizarWhatsappInternacional, enlaceWhatsapp } from "../../utils/whatsapp";
import { supabase } from "../../utils/supabaseClient";
import { useCaracteristicasPlan } from "../../hooks/useCaracteristicasPlan";
import "./Paso4ContactoOpciones.css";

/* Campo de WhatsApp que se corrige solo mientras la persona escribe:
   saca el 0 y el 15, agrega el 3777 si falta y avisa cuántos números faltan. */
const CampoWhatsapp = ({ formData, setFormData, errores, setErrores }) => {
  const guardado = formData.whatsapp || "";
  const esExtranjero = !!formData.whatsappExtranjero;

  // Lo que se ve en el campo: lo que escribió, o el número guardado si viene de antes
  const [texto, setTexto] = useState(() => {
    if (formData.whatsappTexto) return formData.whatsappTexto;
    if (!guardado) return "";
    if (esExtranjero) return `+${guardado}`;
    const r = analizarWhatsapp(guardado);
    return r.valido ? r.visible.replace("+54 9 ", "") : guardado;
  });
  const [tocado, setTocado] = useState(false);

  const analisis = esExtranjero ? analizarWhatsappInternacional(texto) : analizarWhatsapp(texto);

  const actualizar = (valor, extranjero = esExtranjero) => {
    setTexto(valor);
    const r = extranjero ? analizarWhatsappInternacional(valor) : analizarWhatsapp(valor);
    setFormData({
      ...formData,
      whatsapp: r.valido ? r.numero : "",
      whatsappTexto: valor,
      whatsappExtranjero: extranjero,
    });
    setErrores((prev) => ({ ...prev, whatsapp: r.valido || !valor ? "" : r.error }));
  };

  const cambiarPais = () => actualizar("", !esExtranjero);

  // El error se muestra recién cuando deja el campo (o si ya intentó publicar)
  const mostrarError = !analisis.valido && texto && (tocado || errores.whatsapp) && !analisis.incompleto;
  const mostrarFalta = !analisis.valido && texto && analisis.incompleto;

  return (
    <div className="psf-campo">
      <label className="psf-label" htmlFor="psf-whatsapp">
        Tu número de WhatsApp
      </label>
      <p className="psf-ayuda">
        {esExtranjero
          ? "Escribí el número completo con el código del país."
          : "Escribilo como te salga: con o sin 0, con o sin 15. Lo acomodamos solos."}
      </p>

      <div className={`psf-wsp ${analisis.valido ? "ok" : ""} ${mostrarError || (errores.whatsapp && !texto) ? "error" : ""}`}>
        <span className="psf-wsp-pais" aria-hidden="true">
          {esExtranjero ? "🌎 +" : "🇦🇷 +54 9"}
        </span>
        <input
          id="psf-whatsapp"
          name="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={esExtranjero ? "Ej: 595 981 123456" : "Ej: 3777 41-2345"}
          value={texto}
          onChange={(e) => actualizar(e.target.value.replace(/[^\d\s()+-]/g, "").slice(0, 22))}
          onBlur={() => setTocado(true)}
          aria-invalid={!!mostrarError}
          aria-describedby="psf-wsp-estado"
        />
        {analisis.valido && <span className="material-icons psf-wsp-check" aria-hidden="true">check_circle</span>}
      </div>

      <div id="psf-wsp-estado" className="psf-wsp-estado" aria-live="polite">
        {analisis.valido ? (
          <>
            <p className="psf-wsp-listo">
              <span className="material-icons">verified</span>
              Te van a escribir al <strong>{analisis.visible}</strong>
            </p>
            {analisis.aviso && <p className="psf-wsp-aviso">{analisis.aviso}</p>}
            <a
              href={enlaceWhatsapp(analisis.numero, "Hola, esto es una prueba desde GoyaNova")}
              target="_blank"
              rel="noopener noreferrer"
              className="psf-wsp-probar"
            >
              <span className="material-icons">open_in_new</span>
              Probar que abre mi WhatsApp
            </a>
          </>
        ) : mostrarFalta ? (
          <p className="psf-wsp-falta">{analisis.error}…</p>
        ) : mostrarError ? (
          <p className="psf-error">{analisis.error}</p>
        ) : errores.whatsapp && !texto ? (
          <p className="psf-error">{errores.whatsapp}</p>
        ) : null}
      </div>

      <button type="button" className="psf-link-boton" onClick={cambiarPais}>
        {esExtranjero ? "Mi número es de Argentina" : "Mi número es de otro país"}
      </button>
    </div>
  );
};

const Paso4ContactoOpciones = ({ formData, setFormData, errores, setErrores, parte = "todo" }) => {
  const { tiene, cargando } = useCaracteristicasPlan();
  const [catalogoPagos, setCatalogoPagos] = useState([]);

  // Traer el catálogo de métodos de pago solo si el plan lo habilita
  useEffect(() => {
    if (!tiene('metodos_pago_formulario')) return;

    const cargarCatalogo = async () => {
      const { data, error } = await supabase
        .from('metodos_pago_catalogo')
        .select('codigo, etiqueta, icono')
        .order('orden', { ascending: true });

      if (!error) setCatalogoPagos(data || []);
    };

    cargarCatalogo();
  }, [tiene]);

  const handleOtherChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value.trim() });

    if (name === "email") {
      const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if (value && !emailValido) {
        setErrores(prev => ({ ...prev, email: "Formato de email inválido" }));
      } else {
        setErrores(prev => ({ ...prev, email: "" }));
      }
    }

    if (name === "sitio_web" && value) {
      const urlValida = /^https?:\/\/.+\..+/.test(value);
      if (!urlValida) {
        setErrores(prev => ({ ...prev, sitio_web: "Tiene que empezar con http:// o https://" }));
      } else {
        setErrores(prev => ({ ...prev, sitio_web: "" }));
      }
    }
  };

  const toggleMetodoPago = (codigo) => {
    const actuales = formData.metodos_pago || [];
    const nuevos = actuales.includes(codigo)
      ? actuales.filter(m => m !== codigo)
      : [...actuales, codigo];
    setFormData({ ...formData, metodos_pago: nuevos });
  };

  return (
    <div className="paso4-container">
      {parte !== "extras" && (
        <CampoWhatsapp formData={formData} setFormData={setFormData} errores={errores} setErrores={setErrores} />
      )}

      {parte !== "whatsapp" && (
      <>
      <div className="paso4-group">
        <label>Tu email (si querés)</label>
        <input
          type="email"
          name="email"
          placeholder="tucorreo@gmail.com"
          value={formData.email || ""}
          onChange={handleOtherChange}
          className={errores.email ? 'input-error' : ''}
        />
        {errores.email && <p className="paso4-error">{errores.email}</p>}
      </div>

      <h3 className="psf-subtitulo">Tus redes</h3>

      <div className="paso4-group">
        <label>Instagram</label>
        <input
          type="text"
          name="instagram"
          placeholder="ejemplo: goyanova.com.ar"
          value={formData.instagram || ""}
          onChange={handleOtherChange}
        />
      </div>

      <div className="paso4-group">
        <label>Facebook</label>
        <input
          type="text"
          name="facebook"
          placeholder="Tu nombre en Facebook"
          value={formData.facebook || ""}
          onChange={handleOtherChange}
        />
      </div>

      {/* ============================================
          A PARTIR DE ACÁ: campos que dependen del plan.
          No se muestra nada mientras carga (evita parpadeo).
          ============================================ */}

      {/* Link al sitio web — desde Plan Impulso */}
      {!cargando && tiene('link_sitio_web') && (
        <div className="paso4-group">
          <label>Link a tu sitio web (opcional)</label>
          <input
            type="text"
            name="sitio_web"
            placeholder="https://tunegocio.com"
            value={formData.sitio_web || ""}
            onChange={handleOtherChange}
            className={errores.sitio_web ? 'input-error' : ''}
          />
          {errores.sitio_web && <p className="paso4-error">{errores.sitio_web}</p>}
        </div>
      )}

      {/* Métodos de pago y cuotas — desde Plan Impulso */}
      {!cargando && tiene('metodos_pago_formulario') && (
        <div className="paso4-group">
          <label>¿Qué métodos de pago aceptás?</label>
          <p className="paso4-hint">Elegí todos los que uses</p>

          <div className="paso4-metodos-grid">
            {catalogoPagos.map((m) => (
              <button
                type="button"
                key={m.codigo}
                className={`paso4-metodo-chip ${
                  (formData.metodos_pago || []).includes(m.codigo) ? 'activo' : ''
                }`}
                onClick={() => toggleMetodoPago(m.codigo)}
              >
                {m.etiqueta}
              </button>
            ))}
          </div>

          <label className="paso4-checkbox-inline">
            <input
              type="checkbox"
              checked={formData.acepta_cuotas || false}
              onChange={(e) => setFormData({ ...formData, acepta_cuotas: e.target.checked })}
            />
            Acepto pagos en cuotas
          </label>
        </div>
      )}

      {/* Envíos y alcance — desde Plan Impulso */}
      {!cargando && tiene('envios_formulario') && (
        <div className="paso4-group">
          <label className="paso4-checkbox-inline">
            <input
              type="checkbox"
              checked={formData.hace_envios || false}
              onChange={(e) => setFormData({
                ...formData,
                hace_envios: e.target.checked,
                alcance_envio: e.target.checked ? formData.alcance_envio : null
              })}
            />
            Hago envíos
          </label>

          {formData.hace_envios && (
            <select
              value={formData.alcance_envio || ''}
              onChange={(e) => setFormData({ ...formData, alcance_envio: e.target.value })}
              className="paso4-select-envio"
            >
              <option value="">¿A dónde envío?</option>
              <option value="ciudad">Solo dentro de la ciudad</option>
              <option value="provincia">Dentro de la provincia</option>
              <option value="nacional">A todo el país</option>
            </select>
          )}
        </div>
      )}

      {/* Mensaje predefinido de WhatsApp — exclusivo Plan Elite */}
      {!cargando && tiene('whatsapp_mensaje_personalizado') && (
        <div className="paso4-group">
          <label>Mensaje predefinido de WhatsApp (opcional)</label>
          <p className="paso4-hint">
            Se completa solo cuando alguien te escribe desde tu perfil
          </p>
          <textarea
            value={formData.whatsapp_mensaje_personalizado || ''}
            onChange={(e) => setFormData({
              ...formData,
              whatsapp_mensaje_personalizado: e.target.value.slice(0, 200)
            })}
            rows={2}
            maxLength={200}
            placeholder="Ej: Hola, quiero consultar tarifas para este fin de semana"
          />
        </div>
      )}

      {!cargando && tiene('reglas_devoluciones') && (
        <div className="paso4-group">
          <label>Reglas, devoluciones y condiciones (opcional)</label>
          <p className="paso4-hint">
            Contá tus condiciones: política de devolución, garantía, formas de trabajo, lo que quieras aclarar
          </p>
          <textarea
            value={formData.reglas_devoluciones || ''}
            onChange={(e) => setFormData({
              ...formData,
              reglas_devoluciones: e.target.value.slice(0, 600)
            })}
            rows={4}
            maxLength={600}
            placeholder="Ej: Aceptamos devoluciones dentro de las 48hs con ticket. Los pedidos se preparan con 1 día de anticipación..."
          />
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default Paso4ContactoOpciones;