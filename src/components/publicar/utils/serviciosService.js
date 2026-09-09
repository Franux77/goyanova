// src/components/publicar/utils/serviciosService.js
import { supabase } from "../../../utils/supabaseClient";
import { normalizarDia } from "./helpers";

// 🔹 Cargar servicio existente (OPTIMIZADO)
export const cargarServicioDesdeDB = async (id, setFormData) => {
  try {
    const withTimeout = (promise, ms = 15000) => {
      return Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout al cargar servicio')), ms)
        )
      ]);
    };

    const { data: servicio, error } = await withTimeout(
      supabase
        .from("servicios")
        .select(`
          id, nombre, tipo, categoria_id, descripcion, direccion_escrita,
          latitud, longitud, referencia, contacto_whatsapp, contacto_email,
          contacto_instagram, contacto_facebook, foto_portada, 
          mostrar_boton_whatsapp, categorias(nombre),
          metodos_pago, acepta_cuotas, hace_envios, alcance_envio,
                    sitio_web, whatsapp_mensaje_personalizado, foto_referencia_ubicacion, reglas_devoluciones
        `)
        .eq("id", id)
        .single()
    );

    if (error) throw error;
    if (!servicio) throw new Error('Servicio no encontrado');

    const [disponibilidadResult, imagenesResult] = await Promise.all([
      withTimeout(
        supabase
          .from("disponibilidades")
          .select("*")
          .eq("servicio_id", id)
      ),
      withTimeout(
        supabase
          .from("imagenes_servicio")
          .select("url, orden")
          .eq("servicio_id", id)
          .order("orden", { ascending: true })
      )
    ]);

    const disponibilidad = disponibilidadResult.data || [];
    const imagenes = imagenesResult.data || [];
    const imagenesUrls = imagenes.map((img) => img.url);

    const normalizarTipoDisponibilidad = (tipo) => {
      const t = String(tipo || "").toLowerCase();
      
      if (["horarios", "horario"].includes(t)) return "horario";
      if (["por_turnos", "turnos"].includes(t)) return "turnos";
      if (["por_pedido", "pedido"].includes(t)) return "pedido";
      if (["whatsapp", "consultar"].includes(t)) return "consultar";
      if (["no_disponible", "nodisp"].includes(t)) return "nodisp";
      
      return t || "horario";
    };

    let tipoDisponibilidad = "";
    let horarios = {};
    let mensajeServicio = "";

    if (disponibilidad.length) {
      tipoDisponibilidad = normalizarTipoDisponibilidad(disponibilidad[0].tipo || "");
      
      const filaConMensaje = disponibilidad.find(
        (d) => d.mensaje && d.mensaje.trim() !== ""
      );
      mensajeServicio = filaConMensaje?.mensaje || "";

      if (tipoDisponibilidad !== "consultar" && tipoDisponibilidad !== "nodisp") {
        horarios = disponibilidad.reduce((acc, d) => {
          if (!d.dia) return acc;
          const diaNormalizado = normalizarDia(d.dia).toLowerCase();
          if (!acc[diaNormalizado]) acc[diaNormalizado] = [];
          acc[diaNormalizado].push({
            inicio: d.hora_inicio,
            fin: d.hora_fin,
            turno: d.turno,
            titulo: d.titulo,
            tipo: d.tipo,
          });
          return acc;
        }, {});
      }
    }

    let disponibilidadesArray = disponibilidad.map(d => ({
      dia: d.dia || null,
      inicio: d.hora_inicio || null,
      fin: d.hora_fin || null,
      turno: d.turno || null,
      titulo: d.titulo || "",
      tipo: d.tipo || "",
      mensaje: d.mensaje || ""
    }));

    setFormData((prev) => ({
      ...prev,
      nombre: servicio.nombre || "",
      tipo: servicio.tipo || "",
      categoria: servicio.categoria_id || "",
      categoriaNombre: servicio.categorias?.nombre || "",
      descripcion: servicio.descripcion || "",
      direccion_escrita: servicio.direccion_escrita || "",
      ubicacion: {
        lat: servicio.latitud ?? null,
        lng: servicio.longitud ?? null,
        referencia: servicio.referencia ?? "",
      },
      whatsapp: servicio.contacto_whatsapp || "",
      email: servicio.contacto_email || "",
      instagram: servicio.contacto_instagram || "",
      facebook: servicio.contacto_facebook || "",
      mostrarBotonWhatsapp: servicio.mostrar_boton_whatsapp ?? true,
      portadaPreview: servicio.foto_portada || null,
      portadaDB: servicio.foto_portada || null,
      tipoDisponibilidad,
      mensaje: mensajeServicio,
      horarios,
      disponibilidades: disponibilidadesArray,
      imagenesPreview: imagenesUrls,
      imagenesDB: imagenesUrls,
      // 🆕 Campos habilitados desde Plan Impulso en adelante
      metodos_pago: servicio.metodos_pago || [],
      acepta_cuotas: servicio.acepta_cuotas || false,
      hace_envios: servicio.hace_envios || false,
      alcance_envio: servicio.alcance_envio || null,
      sitio_web: servicio.sitio_web || "",
            whatsapp_mensaje_personalizado: servicio.whatsapp_mensaje_personalizado || "",
      reglas_devoluciones: servicio.reglas_devoluciones || "",
      // 🆕 Foto de referencia de ubicación
      referenciaPreview: servicio.foto_referencia_ubicacion || null,
      referenciaDB: servicio.foto_referencia_ubicacion || null,
    }));
    
  } catch (err) {
    console.error('❌ Error cargando servicio:', err);
    throw err;
  }
};

// 🔹 Obtener datos de membresía premium
// 🩹 FIX: se agrego el filtro por fecha_fin > now(). Antes una membresia
// vencida seguia devolviendo es_premium=true en cada servicio nuevo/editado.
const obtenerDatosPremium = async (usuario_id) => {
  try {
    const { data: membresia, error } = await supabase
      .from('membresias')
      .select('tipo_membresia, badge_texto, fecha_fin, prioridad_nivel')
      .eq('usuario_id', usuario_id)
      .eq('estado', 'activa')
      .gt('fecha_fin', new Date().toISOString())
      .order('prioridad_nivel', { ascending: false })
      .order('fecha_fin', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error al obtener membresía:', error);
      return { es_premium: false, badge_texto: null, fecha_premium_hasta: null };
    }

    if (!membresia) {
      return { es_premium: false, badge_texto: null, fecha_premium_hasta: null };
    }

    const esPremium = membresia.tipo_membresia !== 'gratis' && membresia.tipo_membresia !== null;

    let badgeTexto = membresia.badge_texto;

    if (!badgeTexto && esPremium) {
      const mapeoNombres = {
        'manual_admin': 'VIP',
        'codigo_promocion': 'Promoción',
        'pago': 'Premium',
        'impulso': 'Verificado',
        'destacado': 'Destacado',
        'elite': 'Elite'
      };
      badgeTexto = mapeoNombres[membresia.tipo_membresia] || 'Premium';
    }

    // 🩹 FIX: si el plan requiere aprobación de identidad y el admin
    // todavía no la dio, el badge no se muestra aunque el plan lo incluya.
    // Antes esto solo lo chequeaba el trigger de membresías, no acá — por
    // eso publicar/editar un servicio podía "destrabar" el badge sin que
    // nadie lo hubiera aprobado.
    const { data: requiereValidacion } = await supabase.rpc('usuario_tiene_caracteristica', {
      p_usuario_id: usuario_id,
      p_clave: 'requiere_validacion_identidad'
    });

    if (requiereValidacion) {
      const { data: perfil } = await supabase
        .from('perfiles_usuarios')
        .select('identidad_verificada')
        .eq('id', usuario_id)
        .single();

      if (!perfil?.identidad_verificada) {
        badgeTexto = null;
      }
    }

    return {
      es_premium: esPremium,
      badge_texto: badgeTexto,
      fecha_premium_hasta: membresia.fecha_fin
    };

  } catch (err) {
    console.error('Error crítico al obtener datos premium:', err);
    return { es_premium: false, badge_texto: null, fecha_premium_hasta: null };
  }
};

export const publicarServicio = async (
  formData,
  id,
  navigate,
  setErrorModal,
  setPublicando
) => {
  try {
    setPublicando(true);
    setErrorModal(null);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error("No se pudo obtener el usuario logueado");
    }

    if (!id) {
      const { data: limiteData, error: limiteError } = await supabase
        .rpc('puede_publicar_servicio', {
          p_usuario_id: user.id
        });

      if (limiteError) {
        console.error('Error al verificar límite:', limiteError);
      } else if (!limiteData.puede_publicar) {
        throw new Error(
          `Has alcanzado tu límite de servicios (${limiteData.servicios_actuales}/${limiteData.limite_servicios}). ` +
          `Mejorá tu plan para publicar más servicios.`
        );
      }
    }

    let usuario_id = user.id;
    
    if (id) {
      const { data: servicioOriginal } = await supabase
        .from('servicios')
        .select('usuario_id')
        .eq('id', id)
        .single();
      
      if (servicioOriginal) {
        usuario_id = servicioOriginal.usuario_id;
      }
    }

    // 🆕 Características del plan del dueño: gatea qué campos se guardan.
    // Si el usuario cambió a un plan inferior entre que cargó el form y
    // publicó, estos campos se limpian en vez de guardarse igual.
    const { data: caracteristicas } = await supabase.rpc(
      'obtener_caracteristicas_usuario',
      { p_usuario_id: usuario_id }
    );

    const puedeMetodosPago = caracteristicas?.metodos_pago_formulario === true;
    const puedeEnvios = caracteristicas?.envios_formulario === true;
    const puedeSitioWeb = caracteristicas?.link_sitio_web === true;
        const puedeMensajePersonalizado = caracteristicas?.whatsapp_mensaje_personalizado === true;
    const puedeFotoReferencia = caracteristicas?.foto_referencia_ubicacion === true;
    const puedeReglas = caracteristicas?.reglas_devoluciones === true;

    const datosPremium = await obtenerDatosPremium(usuario_id);

    let categoriaId = formData.categoria;
    if (typeof categoriaId !== "number") {
      const { data: catRow } = await supabase
        .from("categorias")
        .select("id")
        .eq("nombre", formData.categoria)
        .maybeSingle();
      categoriaId = catRow?.id || null;
    }

    const payloadServicio = {
      usuario_id,
      nombre: formData.nombre,
      tipo: formData.tipo,
      categoria_id: categoriaId,
      descripcion: formData.descripcion,
      direccion_escrita: formData.direccion_escrita,
      latitud: formData.ubicacion.lat,
      longitud: formData.ubicacion.lng,
      referencia: formData.ubicacion.referencia || null,
      contacto_whatsapp: formData.whatsapp || null,
      contacto_email: formData.email || null,
      contacto_instagram: formData.instagram || null,
      contacto_facebook: formData.facebook || null,
      mostrar_boton_whatsapp: formData.mostrarBotonWhatsapp ?? true,
      es_premium: datosPremium.es_premium,
      badge_texto: datosPremium.badge_texto,
      fecha_premium_hasta: datosPremium.fecha_premium_hasta,
      // 🆕 Campos por plan — se limpian si el plan no los habilita
      metodos_pago: puedeMetodosPago ? (formData.metodos_pago || []) : [],
      acepta_cuotas: puedeMetodosPago ? !!formData.acepta_cuotas : false,
      hace_envios: puedeEnvios ? !!formData.hace_envios : false,
      alcance_envio: puedeEnvios ? (formData.alcance_envio || null) : null,
      sitio_web: puedeSitioWeb ? (formData.sitio_web || null) : null,
            whatsapp_mensaje_personalizado: puedeMensajePersonalizado
        ? (formData.whatsapp_mensaje_personalizado || null)
        : null,
      reglas_devoluciones: puedeReglas
        ? (formData.reglas_devoluciones || null)
        : null,
    };

    let servicioId = id;
    
    if (!id) {
      const { data: insertado, error: insertError } = await supabase
        .from("servicios")
        .insert([payloadServicio])
        .select()
        .single();
      
      if (insertError) throw insertError;
      servicioId = insertado.id;
    } else {
      const { error: updateError } = await supabase
        .from("servicios")
        .update(payloadServicio)
        .eq("id", id);
      
      if (updateError) throw updateError;
      
      await supabase.from("disponibilidades").delete().eq("servicio_id", id);
    }

    if (formData.portadaFile) {
      const timestamp = Date.now();
      const ext = formData.portadaFile.name.split('.').pop();
      const rutaPortada = `portadas/${servicioId}_${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('imagenes')
        .upload(rutaPortada, formData.portadaFile, { upsert: true });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('imagenes')
          .getPublicUrl(rutaPortada);

        await supabase
          .from('servicios')
          .update({ foto_portada: urlData.publicUrl })
          .eq('id', servicioId);
      }
    }

    if (formData.portadaAEliminar && !formData.portadaFile) {
      const urlParts = formData.portadaAEliminar.split('/imagenes/');
      if (urlParts.length > 1) {
        const rutaArchivo = urlParts[1].split('?')[0];
        await supabase.storage.from('imagenes').remove([rutaArchivo]);
      }
      await supabase.from('servicios').update({ foto_portada: null }).eq('id', servicioId);
    }

    // 🆕 Subir foto de referencia de ubicación (solo si el plan la habilita)
    if (puedeFotoReferencia && formData.referenciaFile) {
      const timestamp = Date.now();
      const ext = formData.referenciaFile.name.split('.').pop();
      const rutaReferencia = `referencias/${servicioId}_${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('imagenes')
        .upload(rutaReferencia, formData.referenciaFile, { upsert: true });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('imagenes')
          .getPublicUrl(rutaReferencia);

        await supabase
          .from('servicios')
          .update({ foto_referencia_ubicacion: urlData.publicUrl })
          .eq('id', servicioId);
      }
    }

    if (formData.referenciaAEliminar && !formData.referenciaFile) {
      const urlParts = formData.referenciaAEliminar.split('/imagenes/');
      if (urlParts.length > 1) {
        const rutaArchivo = urlParts[1].split('?')[0];
        await supabase.storage.from('imagenes').remove([rutaArchivo]);
      }
      await supabase.from('servicios').update({ foto_referencia_ubicacion: null }).eq('id', servicioId);
    }

    if (formData.imagenesAEliminar?.length > 0) {
      for (const url of formData.imagenesAEliminar) {
        const urlParts = url.split('/imagenes/');
        if (urlParts.length > 1) {
          const rutaArchivo = urlParts[1].split('?')[0];
          await supabase.storage.from('imagenes').remove([rutaArchivo]);
        }
        await supabase.from('imagenes_servicio').delete().eq('url', url).eq('servicio_id', servicioId);
      }
    }

    if (formData.imagenesFiles?.length > 0) {
      const { data: imagenesExistentes } = await supabase
        .from('imagenes_servicio')
        .select('orden')
        .eq('servicio_id', servicioId)
        .order('orden', { ascending: false })
        .limit(1);

      let ordenInicial = imagenesExistentes?.[0]?.orden || 0;

      for (let i = 0; i < formData.imagenesFiles.length; i++) {
        const file = formData.imagenesFiles[i];
        const timestamp = Date.now();
        const ext = file.name.split('.').pop();
        const ruta = `servicios/${servicioId}_img_${i + 1}_${timestamp}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('imagenes')
          .upload(ruta, file, { upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('imagenes').getPublicUrl(ruta);
          await supabase.from('imagenes_servicio').insert({
            servicio_id: servicioId,
            url: urlData.publicUrl,
            orden: ordenInicial + i + 1
          });
        }
      }
    }

    const disponibilidadesPayload = (formData.disponibilidades || []).map((d) => ({
      servicio_id: servicioId,
      dia: d.dia || null,
      hora_inicio: d.inicio || null,
      hora_fin: d.fin || null,
      turno: d.turno || null,
      titulo: d.titulo,
      tipo: d.tipo,
      mensaje: formData.mensaje || null,
    }));

    if (disponibilidadesPayload.length) {
      await supabase.from("disponibilidades").insert(disponibilidadesPayload);
    }
    
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const { data: perfilUsuario } = await supabase
      .from('perfiles_usuarios')
      .select('rol')
      .eq('id', currentUser.id)
      .single();

    const esAdmin = perfilUsuario?.rol === 'admin';
    const origenPanel = esAdmin ? 'admin' : 'usuario';

    navigate("/publicar/finalizado", {
      replace: true,
      state: {
        esActualizacion: !!id,
        origenPanel: origenPanel,
        servicioId: servicioId
      }
    });

  } catch (err) {
    setErrorModal(err.message || "Error al publicar el servicio");
  } finally {
    setPublicando(false);
  }
};