import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Terminos.css';

const Terminos = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === '/privacidad') {
      const el = document.getElementById('privacidad');
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  const handleVolver = () => {
    if (window.history.length > 2) navigate(-1);
    else navigate('/');
  };

  return (
    <div className="legal-page">
      <nav className="legal-navbar">
        <div className="legal-navbar-container">
          <button className="legal-back-btn" onClick={handleVolver} aria-label="Volver">
            <span className="material-icons">arrow_back</span>
            <span>Volver</span>
          </button>
          <div className="legal-navbar-brand">
            <img src="/assets/GoyaNova_20250918_144009_0000.png" alt="GoyaNova" />
            <span>GoyaNova</span>
          </div>
        </div>
      </nav>

      <div className="legal-content">
        <header className="legal-header">
          <span className="legal-badge">
            <span className="material-icons">gavel</span>
            Documento legal
          </span>
          <h1>Términos y Condiciones de Uso y Política de Privacidad</h1>
          <p className="legal-updated">Última actualización: 27 de Septiembre de 2026</p>
          <p className="legal-intro">
            Bienvenido a GoyaNova (en adelante, "la Plataforma"), accesible a través del dominio web
            www.goyanova.com.ar. Los presentes Términos y Condiciones regulan el acceso, navegación y
            uso de la Plataforma por parte de los usuarios, vecinos, turistas y prestadores de servicios.
          </p>
          <p className="legal-intro">
            Al acceder, navegar, registrarse o interactuar en GoyaNova, usted acepta de manera expresa,
            automática y sin reservas todos los términos aquí descritos. Si no está de acuerdo con estos
            términos, deberá abstenerse de utilizar la Plataforma.
          </p>
        </header>

        <nav className="legal-toc">
          <a href="#seccion-1">1. El Servicio y el Modelo "Cero Comisiones"</a>
          <a href="#seccion-2">2. Edad, Registro y Cuentas (incluido inicio de sesión con Google)</a>
          <a href="#seccion-3">3. Planes, Límites de Publicación y Precios</a>
          <a href="#seccion-4">4. Pagos, Facturación y Reembolsos</a>
          <a href="#seccion-5">5. Verificación de Identidad (Badge Verificado)</a>
          <a href="#seccion-6">6. Calificaciones, Reseñas y Moderación</a>
          <a href="#seccion-7">7. Asistente Virtual con Inteligencia Artificial</a>
          <a href="#seccion-8">8. Exclusión de Responsabilidad</a>
          <a href="#privacidad">9. Política de Privacidad y Tratamiento de Datos</a>
          <a href="#seccion-10">10. Modificaciones</a>
        </nav>

        <section id="seccion-1" className="legal-section">
          <h2>1. El Servicio y el Modelo "Cero Comisiones"</h2>
          <p>GoyaNova es un directorio digital e interactivo hiperlocal diseñado para conectar de forma directa a los vecinos y turistas de la ciudad de Goya, Corrientes, con trabajadores de oficios, comercios y prestadores de servicios locales.</p>
          <p><strong>Intermediación Excluida:</strong> GoyaNova actúa únicamente como un puente digital de contacto. No participa, no interviene, no procesa transacciones monetarias ni cobra comisiones por los trabajos acordados o realizados.</p>
          <p><strong>Tarifas de Registro:</strong> El uso, búsqueda y registro básico en la Plataforma es gratuito para todos los usuarios y prestadores. Los prestadores de servicios podrán, de forma estrictamente opcional, adherirse a suscripciones "Premium" de pago mensual para destacar su perfil dentro del directorio.</p>
        </section>

        <section id="seccion-2" className="legal-section">
          <h2>2. Requisitos de Edad, Registro y Cuentas</h2>
          <p><strong>Navegación General:</strong> La búsqueda y exploración del mapa interactivo, categorías y perfiles es libre, voluntaria y puede realizarse de forma 100% anónima sin necesidad de registro previo.</p>
          <p><strong>Registro Obligatorio:</strong> Se requiere la creación de una cuenta y registro de usuario para poder publicar un perfil de servicio, dejar calificaciones u opiniones (sobre un servicio o sobre la Plataforma), reportar contenido, o interactuar con el sistema de soporte y notificaciones.</p>
          <p><strong>Formas de registro:</strong> El registro puede hacerse con correo electrónico y contraseña, o iniciando sesión con una cuenta de Google. En ambos casos la autenticación se gestiona mediante Supabase Auth, nuestro proveedor de infraestructura de identidad; GoyaNova no almacena la contraseña de su cuenta de Google ni tiene acceso a ella.</p>
          <p><strong>Edad Mínima:</strong> Para registrarse y publicar un servicio u oficio en GoyaNova, es requisito obligatorio ser mayor de 18 (dieciocho) años de edad.</p>
        </section>

        <section id="seccion-3" className="legal-section">
          <h2>3. Planes, Límites de Publicación y Precios</h2>
          <p>GoyaNova ofrece un plan gratuito y planes pagos opcionales ("Impulso", "Destacado" y "Elite"), cada uno con distinto límite de servicios publicables, cantidad de fotos, posicionamiento en resultados y funciones adicionales (por ejemplo: historias temporales, estadísticas del perfil, badge de verificado, o mensaje de WhatsApp personalizado). El detalle vigente y actualizado de cada plan y sus beneficios se muestra siempre en Mi Panel → Mi Membresía, que prevalece sobre cualquier descripción general que se haga en otro lugar del sitio.</p>
          <p><strong>Plan Gratuito:</strong> No tiene fecha de vencimiento y permite publicar un (1) servicio con una cantidad reducida de fotografías de referencia.</p>
          <p><strong>Planes pagos:</strong> Se contratan por períodos mensuales renovables y amplían la cantidad de servicios y fotos permitidas respecto del plan gratuito, además de sumar herramientas de mayor visibilidad. Los precios se fijan y cobran en dólares estadounidenses (USD); el monto exacto que se debita en pesos argentinos lo calcula automáticamente Mercado Pago al momento del pago, según la cotización vigente ese día.</p>
        </section>

        <section id="seccion-4" className="legal-section">
          <h2>4. Pagos, Facturación y Política de Reembolsos</h2>
          <p><strong>Suscripción Voluntaria:</strong> El prestador puede realizar un "upgrade" voluntario a cualquier plan pago desde su panel para obtener posicionamiento destacado y mayor capacidad de contenido, y puede cambiar de plan o darlo de baja cuando lo desee.</p>
          <p><strong>Pasarela de Pagos:</strong> Todos los pagos se procesan de forma externa y segura a través de la plataforma de Mercado Pago. GoyaNova no almacena números de tarjeta ni datos financieros de quien paga: esa información queda exclusivamente en poder de Mercado Pago.</p>
          <p><strong>Facturación:</strong> GoyaNova emitirá el correspondiente comprobante o factura por los cobros de suscripción realizados, de acuerdo con la normativa fiscal vigente.</p>
          <p><strong>Política de Reembolsos e Inexistencia de Reintegros:</strong> Dado que los beneficios del plan pago se habilitan de manera inmediata en la plataforma al procesarse el pago, no se realizarán reembolsos, cancelaciones con reintegro ni devoluciones de dinero si el usuario decide dar de baja la suscripción antes de que finalice el mes facturado.</p>
          <p>Si el usuario cancela la suscripción antes del vencimiento, mantendrá los beneficios activos hasta la finalización exacta del período ya pagado. Al vencer el ciclo, la cuenta volverá automáticamente a la modalidad gratuita, ocultando las fotos y publicaciones que excedan el límite sin perder el historial ni las calificaciones.</p>
          <p><strong>Excepción única:</strong> Se contemplarán devoluciones únicamente en casos de fallas técnicas críticas del sistema debidamente comprobadas por nuestro soporte, donde el pago se haya debitado pero la plataforma no haya activado los beneficios correspondientes tras un reclamo formal dentro de las 72 horas hábiles de ocurrido el problema.</p>
        </section>

        <section id="seccion-5" className="legal-section">
          <h2>5. Verificación de Identidad (Badge Verificado)</h2>
          <p><strong>Carácter opcional:</strong> Los prestadores con un plan pago (Impulso, Destacado o Elite) pueden solicitar, de forma voluntaria, la validación de su identidad desde Mi Panel → Badge Verificado, adjuntando una foto o escaneo de un documento de identidad.</p>
          <p><strong>Uso exclusivo del documento:</strong> El documento cargado se utiliza únicamente para que el equipo de administración de GoyaNova verifique manualmente la identidad de la persona solicitante. No se publica, no se muestra a otros usuarios ni se comparte con terceros bajo ninguna circunstancia.</p>
          <p><strong>Resultado:</strong> Una vez aprobada la verificación, el perfil del prestador exhibe públicamente un ícono de "Verificado" (tilde azul), sin que ello implique de parte de GoyaNova garantía, aval o certificación alguna sobre la calidad, idoneidad o antecedentes del prestador — únicamente confirma que su identidad fue cotejada con el documento presentado.</p>
        </section>

        <section id="seccion-6" className="legal-section">
          <h2>6. Calificaciones, Reseñas y Moderación Comunitaria</h2>
          <p><strong>Reseñas sobre un servicio:</strong> Solo los usuarios registrados pueden calificar y comentar sobre los perfiles de los prestadores, ya sea desde el propio perfil o accediendo mediante el código QR / link que cada prestador puede generar desde Mis Servicios. Queda prohibido dejar reseñas falsas, ofensivas o de competencia desleal.</p>
          <p><strong>Reseñas sobre la Plataforma:</strong> GoyaNova también habilita un canal separado para que cualquier persona deje una opinión sobre la Plataforma en sí (no sobre un prestador puntual), accesible desde la sección "Nosotros" o mediante el código QR que GoyaNova difunde para tal fin. Estas opiniones son moderadas por el equipo antes de publicarse.</p>
          <p><strong>Reportes de contenido:</strong> Cualquier usuario registrado puede reportar un perfil o contenido que considere inapropiado desde el menú de opciones del perfil correspondiente.</p>
          <p><strong>Suspensión Preventiva:</strong> Con el fin de garantizar la seguridad de la comunidad y evitar fraudes o malas prácticas, GoyaNova se reserva el derecho de suspender de forma preventiva aquellos perfiles de prestadores que acumulen reportes o denuncias por parte de los usuarios.</p>
          <p><strong>Derecho a Réplica y Resolución:</strong> El prestador cuyo perfil haya sido suspendido preventivamente perderá el acceso a su panel y podrá canalizar su reclamo por fuera de la plataforma utilizando los canales oficiales de soporte (WhatsApp o correo de contacto). El equipo de administración de GoyaNova evaluará manualmente el caso antes de tomar la decisión definitiva de reactivar el perfil o darlo de baja permanentemente.</p>
        </section>

        <section id="seccion-7" className="legal-section">
          <h2>7. Asistente Virtual con Inteligencia Artificial</h2>
          <p><strong>Qué es:</strong> GoyaNova ofrece un asistente de chat automatizado, basado en inteligencia artificial, para responder consultas frecuentes sobre el uso de la Plataforma. No es una persona ni reemplaza al equipo de soporte humano.</p>
          <p><strong>Procesamiento por un tercero:</strong> Para generar sus respuestas, el asistente envía el texto de la conversación a un proveedor externo de inteligencia artificial, que lo procesa únicamente para devolver una respuesta y no lo utiliza con otros fines. Se recomienda no compartir en el chat datos sensibles, contraseñas o información que no quiera que salga de su dispositivo.</p>
          <p><strong>Mejora continua:</strong> Cuando el asistente no logra responder una consulta, la pregunta puede quedar registrada de forma interna (sin asociarla a su identidad) para que el equipo de GoyaNova revise y amplíe la información disponible.</p>
          <p><strong>Límites:</strong> El asistente puede eventualmente cometer errores o no tener información sobre algo muy puntual; ante cualquier duda importante, se recomienda confirmar la información por los canales oficiales de soporte (WhatsApp o Contacto).</p>
        </section>

        <section id="seccion-8" className="legal-section">
          <h2>8. Exclusión Absoluta de Responsabilidad</h2>
          <p>Debido a que GoyaNova funciona exclusivamente como un directorio de contacto directo que vincula al usuario mediante un enlace externo hacia la aplicación de WhatsApp del prestador:</p>
          <p><strong>Negociación Privada:</strong> Todos los presupuestos, precios, plazos, modalidades de pago y condiciones de trabajo se pactan de manera privada y directa entre el vecino/turista y el prestador. GoyaNova no participa de estas conversaciones ni tiene registro o acceso a los chats de WhatsApp de las partes.</p>
          <p><strong>Exención por Daños y Estafas:</strong> GoyaNova, sus fundadores y su equipo quedan totalmente eximidos de cualquier responsabilidad civil, comercial o penal ante incumplimientos de servicio, mala calidad del trabajo, daños materiales o siniestros en propiedades particulares, demoras, estafas económicas o comportamientos indebidos de cualquiera de las partes.</p>
          <p><strong>Enlaces a Terceros:</strong> No garantizamos la disponibilidad ni el correcto funcionamiento de plataformas externas de terceros utilizadas para el contacto o el pago, tales como WhatsApp, Google, Facebook, Instagram o Mercado Pago.</p>
        </section>

        <section id="privacidad" className="legal-section legal-section-highlight">
          <h2>9. Política de Privacidad y Tratamiento de Datos (Ley N° 25.326)</h2>
          <p>En cumplimiento con la Ley de Protección de Datos Personales de la República Argentina, informamos sobre el tratamiento de la información recopilada:</p>
          <p><strong>Datos de registro:</strong> Al registrarse con correo electrónico solicitamos nombre, apellido, dirección de correo electrónico y número de teléfono celular. Si inicia sesión con Google, únicamente recopilamos los datos básicos de perfil autorizados por dicha plataforma (como nombre y correo); la autenticación en sí es gestionada por Supabase Auth.</p>
          <p><strong>Datos públicos del perfil de servicio:</strong> Los datos de contacto, horarios, ubicación y fotos cargados por el prestador al publicar un servicio son de carácter estrictamente voluntario y público, con la única finalidad de que los vecinos y turistas puedan localizarlos y contactarlos.</p>
          <p><strong>Documento de verificación de identidad:</strong> Es un dato sensible que se trata de forma confidencial (ver sección 5) y nunca se hace público.</p>
          <p><strong>Conversaciones con el asistente de IA:</strong> Se procesan según lo descripto en la sección 7.</p>
          <p><strong>Almacenamiento técnico local:</strong> La Plataforma guarda en el navegador (localStorage) algunas preferencias puramente técnicas, como la posición del ícono del asistente en pantalla o la sesión iniciada, para que la experiencia sea más cómoda. No se utiliza para publicidad ni se comparte con terceros.</p>
          <p><strong>Privacidad de la Ubicación:</strong> El prestador es el único responsable de la precisión de las coordenadas GPS cargadas en el mapa. Se le permite y recomienda configurar una zona de cobertura general de trabajo en lugar de su dirección particular si así lo prefiere para resguardar su privacidad domiciliaria.</p>
          <p><strong>Derecho de Acceso y Supresión:</strong> Los usuarios registrados tienen pleno derecho a solicitar la modificación o eliminación total y permanente de su cuenta y todos sus datos almacenados en nuestra base de datos. La eliminación de cuenta puede solicitarse directamente desde Mi Panel → Configuración → Eliminar cuenta; la solicitud es revisada por el equipo antes de ejecutarse de forma definitiva. También puede solicitarse por nuestros canales de soporte.</p>
        </section>

        <section id="seccion-10" className="legal-section">
          <h2>10. Modificaciones a los Términos</h2>
          <p>Los administradores de GoyaNova se reservan el derecho a modificar, adaptar o actualizar parcial o totalmente los presentes Términos y Condiciones en cualquier momento, incluido para reflejar nuevas funciones de la Plataforma. Las modificaciones se considerarán aceptadas por los usuarios si continúan navegando o utilizando los servicios de la plataforma una vez publicadas las actualizaciones en el sitio web.</p>
        </section>

        <div className="legal-footer-cta">
          <p>¿Tenés dudas sobre estos términos?</p>
          <Link to="/contacto" className="legal-contact-btn">
            <span className="material-icons">mail</span>
            Contactanos
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Terminos;