import React, { useState, useEffect } from "react";
import PhoneInput from "react-phone-input-2";
import 'react-phone-input-2/lib/style.css';
import { supabase } from "../../utils/supabaseClient";
import { useCaracteristicasPlan } from "../../hooks/useCaracteristicasPlan";
import "./Paso4ContactoOpciones.css";

const Paso4ContactoOpciones = ({ formData, setFormData, errores, setErrores }) => {
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

  const handleChange = (value, country) => {
    // value viene con el código de país incluido (ej: "543777209955")
    setFormData({ ...formData, whatsapp: value });

    // Validar longitud mínima (código país + al menos 8 dígitos)
    const numeroSinCodigo = value.replace(country.dialCode, "");

    if (!value || value === country.dialCode) {
      setErrores(prev => ({ ...prev, whatsapp: "El número de WhatsApp es obligatorio" }));
    } else if (numeroSinCodigo.length < 8) {
      setErrores(prev => ({ ...prev, whatsapp: "El número debe tener al menos 8 dígitos" }));
    } else {
      setErrores(prev => ({ ...prev, whatsapp: "" }));
    }
  };

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

  const generarLinkWhatsapp = (numero) => {
    // Limpiar completamente el número (sin espacios ni caracteres especiales)
    const limpio = numero.replace(/\D/g, "");
    return `https://wa.me/${limpio}`;
  };

  // Verificar si el número es válido para mostrar el link
  const numeroValido = formData.whatsapp && formData.whatsapp.replace(/\D/g, "").length >= 10;

  return (
    <div className="paso4-container">
      <h3>Paso 4: ¿Cómo te contactan?</h3>

      <div className="paso4-group">
        <label>Tu número de WhatsApp *</label>
        <p className="paso4-hint">
          Poné tu número de celu (sin espacios)
        </p>
        <PhoneInput
          country={"ar"}
          value={formData.whatsapp || ""}
          onChange={handleChange}
          inputProps={{
            name: "whatsapp",
            required: true,
            autoFocus: false,
          }}
          placeholder="37772020526"
          enableSearch={true}
          countryCodeEditable={false}
          disableCountryCode={false}
          specialLabel=""
          containerClass="paso4-phone-container"
          inputClass={`paso4-phone-input ${errores.whatsapp ? 'input-error' : ''}`}
          buttonClass="paso4-phone-button"
          dropdownClass="paso4-phone-dropdown"
        />

        {errores.whatsapp && <p className="paso4-error">{errores.whatsapp}</p>}

        <p className="paso4-hint">
          Ejemplo: +54 3777 123123 (elegí tu país arriba)
        </p>

        {numeroValido && (
          <a
            href={generarLinkWhatsapp(formData.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="paso4-whatsapp-link"
          >
            🔗 Probar enlace de WhatsApp
          </a>
        )}
      </div>

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

      <h3>Tus redes (si tenés)</h3>

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
    </div>
  );
};

export default Paso4ContactoOpciones;