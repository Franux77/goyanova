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
          <p className="legal-updated">Última actualización: 28 de Agosto de 2026</p>
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
          <a href="#seccion-2">2. Edad, Registro y Límites de Publicación</a>
          <a href="#seccion-3">3. Suscripción Premium, Pagos y Reembolsos</a>
          <a href="#seccion-4">4. Calificaciones y Moderación</a>
          <a href="#seccion-5">5. Exclusión de Responsabilidad</a>
          <a href="#privacidad">6. Política de Privacidad</a>
          <a href="#seccion-7">7. Modificaciones</a>
        </nav>

        <section id="seccion-1" className="legal-section">
          <h2>1. El Servicio y el Modelo "Cero Comisiones"</h2>
          <p>GoyaNova es un directorio digital e interactivo hiperlocal diseñado para conectar de forma directa a los vecinos y turistas de la ciudad de Goya, Corrientes, con trabajadores de oficios, comercios y prestadores de servicios locales.</p>
          <p><strong>Intermediación Excluida:</strong> GoyaNova actúa únicamente como un puente digital de contacto. No participa, no interviene, no procesa transacciones monetarias ni cobra comisiones por los trabajos acordados o realizados.</p>
          <p><strong>Tarifas de Registro:</strong> El uso, búsqueda y registro básico en la Plataforma es gratuito para todos los usuarios y prestadores. Los prestadores de servicios podrán, de forma estrictamente opcional, adherirse a suscripciones "Premium" de pago mensual para destacar su perfil dentro del directorio.</p>
        </section>

        <section id="seccion-2" className="legal-section">
          <h2>2. Requisitos de Edad, Registro y Límites de Publicación</h2>
          <p><strong>Navegación General:</strong> La búsqueda y exploración del mapa interactivo es libre, voluntaria y puede realizarse de forma 100% anónima sin necesidad de registro previo.</p>
          <p><strong>Registro Obligatorio:</strong> Se requiere la creación de una cuenta y registro de usuario para poder publicar un perfil de servicio, realizar calificaciones o interactuar con el sistema de soporte.</p>
          <p><strong>Edad Mínima:</strong> Para registrarse y publicar un servicio u oficio en GoyaNova, es requisito obligatorio ser mayor de 18 (dieciocho) años de edad.</p>
          <p><strong>Límites de Publicación:</strong></p>
          <ul>
            <li><strong>Plan Gratuito:</strong> Permite publicar un máximo de un (1) servicio por cuenta y subir hasta cinco (5) fotografías de referencia. El perfil no tiene fecha de vencimiento.</li>
            <li><strong>Plan Premium:</strong> Permite publicar hasta diez (10) servicios o rubros diferentes desde una misma cuenta y subir hasta veinticinco (25) fotografías en total.</li>
          </ul>
        </section>

        <section id="seccion-3" className="legal-section">
          <h2>3. Suscripción Premium, Pagos, Facturación y Política de Reembolsos</h2>
          <p><strong>Suscripción Voluntaria:</strong> El prestador puede realizar un "upgrade" voluntario a Premium desde su panel para obtener posicionamiento destacado y mayor capacidad de contenido.</p>
          <p><strong>Pasarela de Pagos:</strong> Todos los pagos se procesan de forma externa y segura a través de la plataforma de Mercado Pago.</p>
          <p><strong>Facturación:</strong> GoyaNova emitirá el correspondiente comprobante o factura por los cobros de suscripción Premium realizados, de acuerdo con la normativa fiscal vigente y la categoría del proyecto.</p>
          <p><strong>Política de Reembolsos e Inexistencia de Reintegros:</strong> Dado que los beneficios de visibilidad Premium se habilitan de manera inmediata en la plataforma al procesarse el pago, no se realizarán reembolsos, cancelaciones con reintegro ni devoluciones de dinero si el usuario decide dar de baja la suscripción antes de que finalice el mes facturado.</p>
          <p>Si el usuario cancela la suscripción antes del vencimiento, mantendrá los beneficios destacados activos hasta la finalización exacta del período ya pagado. Al vencer el ciclo, la cuenta volverá automáticamente a la modalidad gratuita, ocultando las fotos y publicaciones que excedan el límite sin perder el historial ni las calificaciones.</p>
          <p><strong>Excepción única:</strong> Se contemplarán devoluciones únicamente en casos de fallas técnicas críticas del sistema debidamente comprobadas por nuestro soporte, donde el pago se haya debitado pero la plataforma no haya activado los beneficios correspondientes en la base de datos tras un reclamo formal de 72 horas hábiles.</p>
        </section>

        <section id="seccion-4" className="legal-section">
          <h2>4. Sistema de Calificaciones, Reseñas y Moderación Comunitaria</h2>
          <p><strong>Autorregulación:</strong> Solo los usuarios registrados pueden calificar y comentar sobre los perfiles de los prestadores. Queda prohibido dejar reseñas falsas, ofensivas o de competencia desleal.</p>
          <p><strong>Suspensión Preventiva:</strong> Con el fin de garantizar la seguridad de la comunidad y evitar fraudes o malas prácticas, GoyaNova se reserva el derecho de suspender de forma preventiva aquellos perfiles de prestadores que acumulen reportes o denuncias por parte de los usuarios.</p>
          <p><strong>Derecho a Réplica y Resolución:</strong> El prestador cuyo perfil haya sido suspendido preventivamente perderá el acceso a su panel y podrá canalizar su reclamo por fuera de la plataforma utilizando los canales oficiales de soporte (WhatsApp o correo de contacto). El equipo de administración de GoyaNova evaluará manualmente el caso antes de tomar la decisión definitiva de reactivar el perfil o darlo de baja permanentemente.</p>
        </section>

        <section id="seccion-5" className="legal-section">
          <h2>5. Exclusión Absoluta de Responsabilidad</h2>
          <p>Debido a que GoyaNova funciona exclusivamente como un directorio de contacto directo que vincula al usuario mediante un enlace externo hacia la aplicación de WhatsApp del prestador:</p>
          <p><strong>Negociación Privada:</strong> Todos los presupuestos, precios, plazos, modalidades de pago y condiciones de trabajo se pactan de manera privada y directa entre el vecino/turista y el prestador. GoyaNova no participa de estas conversaciones ni tiene registro o acceso a los chats de WhatsApp de las partes.</p>
          <p><strong>Exención por Daños y Estafas:</strong> GoyaNova (y sus fundadores Franco Fernández y Máximo Centurión) quedan totalmente eximidos de cualquier responsabilidad civil, comercial o penal ante incumplimientos de servicio, mala calidad del trabajo, daños materiales o siniestros en propiedades particulares, demoras, estafas económicas o comportamientos indebidos de cualquiera de las partes.</p>
          <p><strong>Enlaces a Terceros:</strong> No garantizamos la disponibilidad ni el correcto funcionamiento de plataformas externas de terceros utilizadas para el contacto o el pago, tales como WhatsApp, Facebook, Instagram o Mercado Pago.</p>
        </section>

        <section id="privacidad" className="legal-section legal-section-highlight">
          <h2>6. Política de Privacidad y Tratamiento de Datos (Ley N° 25.326)</h2>
          <p>En cumplimiento con la Ley de Protección de Datos Personales de la República Argentina, informamos sobre el tratamiento de la información recopilada:</p>
          <p><strong>Datos Recopilados:</strong> Al registrarse solicitamos nombre, apellido, dirección de correo electrónico, edad y número de teléfono celular. Si inicia sesión con Google, únicamente recopilamos los datos básicos de perfil autorizados por dicha plataforma.</p>
          <p><strong>Uso de la Información:</strong> Los datos de contacto, horarios y geolocalización cargados por el prestador son de carácter estrictamente voluntario y público, con la única finalidad de que los vecinos y turistas puedan localizarlos y contactarlos para solicitar sus servicios.</p>
          <p><strong>Privacidad de la Ubicación:</strong> El prestador es el único responsable de la precisión de las coordenadas GPS cargadas en el mapa. Se le permite y recomienda configurar una zona de cobertura general de trabajo en lugar de su dirección particular si así lo prefiere para resguardar su privacidad domiciliaria.</p>
          <p><strong>Derecho de Acceso y Supresión:</strong> Los usuarios registrados tienen pleno derecho a solicitar la modificación o eliminación total y permanente de su cuenta y todos sus datos almacenados en nuestra base de datos relacional (Supabase) enviando una solicitud formal a nuestros canales de soporte técnico.</p>
        </section>

        <section id="seccion-7" className="legal-section">
          <h2>7. Modificaciones a los Términos</h2>
          <p>Los administradores de GoyaNova se reservan el derecho a modificar, adaptar o actualizar parcial o totalmente los presentes Términos y Condiciones en cualquier momento. Las modificaciones se considerarán aceptadas por los usuarios si continúan navegando o utilizando los servicios de la plataforma una vez publicadas las actualizaciones en el sitio web.</p>
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