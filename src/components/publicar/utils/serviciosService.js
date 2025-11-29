// src/components/publicar/utils/serviciosService.js
import { supabase } from "../../../utils/supabaseClient";
import { normalizarDia } from "./helpers";

// 🔹 Cargar servicio existente
export const cargarServicioDesdeDB = async (id, setFormData) => {
  try {
    const { data: servicio, error } = await supabase
      .from("servicios")
      .select(`
        id, nombre, tipo, categoria_id, descripcion, direccion_escrita,
        latitud, longitud, referencia, contacto_whatsapp, contacto_email,
        contacto_instagram, contacto_facebook, foto_portada, 
        mostrar_boton_whatsapp, categorias(nombre)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    const { data: disponibilidad, error: dispError } = await supabase
      .from("disponibilidades")
      .select("*")
      .eq("servicio_id", id);

    if (dispError) throw dispError;

    const { data: imagenes, error: imgError } = await supabase
      .from("imagenes_servicio")
      .select("url, orden")
      .eq("servicio_id", id)
      .order("orden", { ascending: true });

    if (imgError) throw imgError;

    const imagenesUrls = imagenes?.map((img) => img.url) || [];

    let tipoDisponibilidad = "";
    let horarios = {};
    let mensajeServicio = "";

    if (disponibilidad?.length) {
      tipoDisponibilidad = disponibilidad[0].tipo || "";
      const filaConMensaje = disponibilidad.find(
        (d) => d.mensaje && d.mensaje.trim() !== ""
      );
      mensajeServicio = filaConMensaje?.mensaje || "";

      // ✅ Solo procesar horarios si NO es "consultar" ni "no disponible"
      if (tipoDisponibilidad !== "whatsapp" && tipoDisponibilidad !== "no_disponible") {
        horarios = disponibilidad.reduce((acc, d) => {
          // ⚠️ Ignorar filas sin día (casos especiales)
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
      mostrarBotonWhatsapp: servicio.mostrar_boton_whatsapp ?? true, // 👈 AGREGADO
      portadaPreview: servicio.foto_portada || null,
      portadaDB: servicio.foto_portada || null,
      tipoDisponibilidad,
      mensaje: mensajeServicio,
      horarios,
      imagenesPreview: imagenesUrls,
      imagenesDB: imagenesUrls,
    }));
  } catch (err) {
    // Se mantiene manejo de error silencioso
  }
};

// 🔹 Publicar o actualizar servicio completo
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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("No se pudo obtener el usuario logueado");

    // ✅ Si estamos EDITANDO, obtenemos el usuario_id ORIGINAL del servicio
    let usuario_id = user.id;
    
    if (id) {
      const { data: servicioOriginal, error: errorOriginal } = await supabase
        .from('servicios')
        .select('usuario_id')
        .eq('id', id)
        .single();
      
      if (!errorOriginal && servicioOriginal) {
        // ✅ MANTENER el usuario_id original, NO cambiarlo al del admin
        usuario_id = servicioOriginal.usuario_id;
      }
    }

    // Resolver categoría si es nombre
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
      usuario_id, // ✅ Ahora usa el usuario_id correcto (original si es edición)
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
      mostrar_boton_whatsapp: formData.mostrarBotonWhatsapp ?? true, // 👈 AGREGADO con default true
    };

    let servicioId = id;
    
    // ✅ Crear o actualizar servicio
    if (!id) {
      const { data: insertado } = await supabase
        .from("servicios")
        .insert([payloadServicio])
        .select()
        .single();
      servicioId = insertado.id;
    } else {
      await supabase.from("servicios").update(payloadServicio).eq("id", id);
      await supabase.from("disponibilidades").delete().eq("servicio_id", id);
    }

    // ========== MANEJO DE IMÁGENES ==========

    // 🔹 1. SUBIR NUEVA PORTADA
    if (formData.portadaFile) {
      const timestamp = Date.now();
      const ext = formData.portadaFile.name.split('.').pop();
      const rutaPortada = `portadas/${servicioId}_${timestamp}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
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

    // 🔹 2. ELIMINAR PORTADA VIEJA (si se marcó para eliminar)
    if (formData.portadaAEliminar && !formData.portadaFile) {
      try {
        const urlParts = formData.portadaAEliminar.split('/imagenes/');
        if (urlParts.length > 1) {
          const rutaArchivo = urlParts[1].split('?')[0];
          await supabase.storage.from('imagenes').remove([rutaArchivo]);
        }
      } catch (e) {
        console.error("Error eliminando portada:", e);
      }

      await supabase
        .from('servicios')
        .update({ foto_portada: null })
        .eq('id', servicioId);
    }

    // 🔹 3. ELIMINAR IMÁGENES MARCADAS
    if (formData.imagenesAEliminar?.length > 0) {
      for (const url of formData.imagenesAEliminar) {
        try {
          const urlParts = url.split('/imagenes/');
          if (urlParts.length > 1) {
            const rutaArchivo = urlParts[1].split('?')[0];
            await supabase.storage.from('imagenes').remove([rutaArchivo]);
          }

          await supabase
            .from('imagenes_servicio')
            .delete()
            .eq('url', url)
            .eq('servicio_id', servicioId);
        } catch (e) {
          console.error("Error eliminando imagen:", e);
        }
      }
    }

    // 🔹 4. SUBIR NUEVAS IMÁGENES DE GALERÍA
    if (formData.imagenesFiles?.length > 0) {
      // Obtener el orden máximo actual
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
        const nombreArchivo = `${servicioId}_img_${i + 1}_${timestamp}_${file.name.replace(/\s+/g, '_')}`;
        const ruta = `servicios/${nombreArchivo}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('imagenes')
          .upload(ruta, file, { upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('imagenes')
            .getPublicUrl(ruta);

          await supabase
            .from('imagenes_servicio')
            .insert({
              servicio_id: servicioId,
              url: urlData.publicUrl,
              orden: ordenInicial + i + 1
            });
        }
      }
    }

    // ========== DISPONIBILIDADES ==========
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

    // 🔹 OBTENER ROL DEL USUARIO PARA NAVEGACIÓN INTELIGENTE
    const { data: perfilData } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("id", user.id)
      .single();

    const esAdmin = perfilData?.rol === "admin";

    // 🔹 NAVEGACIÓN MEJORADA CON CONTEXTO COMPLETO
    navigate("/publicar/finalizado", {
      replace: true, // 🔑 Reemplaza la entrada en el historial (evita volver al form)
      state: {
        esActualizacion: !!id,
        origenPanel: esAdmin ? "admin" : "usuario",
        servicioId: servicioId
      }
    });

  } catch (err) {
    console.error("Error publicando:", err);
    setErrorModal("Ocurrió un error al publicar el servicio. Intenta de nuevo.");
  } finally {
    setPublicando(false);
  }
};