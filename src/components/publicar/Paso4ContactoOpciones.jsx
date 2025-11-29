import React from "react";
import PhoneInput from "react-phone-input-2";
import 'react-phone-input-2/lib/style.css';
import "./Paso4ContactoOpciones.css";

const Paso4ContactoOpciones = ({ formData, setFormData, errores, setErrores }) => {
  
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
      <h3>Paso 4: Contacto</h3>

      <div className="paso4-group">
        <label>WhatsApp (Obligatorio) *</label>
        <PhoneInput
          country={"ar"}
          value={formData.whatsapp || ""}
          onChange={handleChange}
          inputProps={{
            name: "whatsapp",
            required: true,
            autoFocus: false,
          }}
          placeholder="3777 209955"
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
          Ejemplo para Argentina: +54 3777 209955 • Selecciona tu país en el selector
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
        <label>Email (opcional)</label>
        <input
          type="email"
          name="email"
          placeholder="ejemplo@gmail.com"
          value={formData.email || ""}
          onChange={handleOtherChange}
          className={errores.email ? 'input-error' : ''}
        />
        {errores.email && <p className="paso4-error">{errores.email}</p>}
      </div>

      <h3>Redes Sociales (opcional)</h3>

      <div className="paso4-group">
        <label>Instagram</label>
        <input
          type="text"
          name="instagram"
          placeholder="@usuario"
          value={formData.instagram || ""}
          onChange={handleOtherChange}
        />
      </div>

      <div className="paso4-group">
        <label>Facebook</label>
        <input
          type="text"
          name="facebook"
          placeholder="facebook.com/tuusuario"
          value={formData.facebook || ""}
          onChange={handleOtherChange}
        />
      </div>
    </div>
  );
};

export default Paso4ContactoOpciones;
