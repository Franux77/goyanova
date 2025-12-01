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
    if (!servicio) throw new Error('Servicio no encontrado');

    const { data: disponibilidad } = await supabase
      .from("disponibilidades")
      .select("*")
      .eq("servicio_id", id);

    const { data: imagenes } = await supabase
      .from("imagenes_servicio")
      .select("url, orden")
      .eq("servicio_id", id)
      .order("orden", { ascending: true });

    const imagenesUrls = imagenes?.map((img) => img.url) || [];

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

    if (disponibilidad?.length) {
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

    let disponibilidadesArray = [];
    
    if (disponibilidad?.length) {
      disponibilidadesArray = disponibilidad.map(d => ({
        dia: d.dia || null,
        inicio: d.hora_inicio || null,
        fin: d.hora_fin || null,
        turno: d.turno || null,
        titulo: d.titulo || "",
        tipo: d.tipo || "",
        mensaje: d.mensaje || ""
      }));
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
      mostrarBotonWhatsapp: servicio.mostrar_boton_whatsapp ?? true,
      portadaPreview: servicio.foto_portada || null,
      portadaDB: servicio.foto_portada || null,
      tipoDisponibilidad,
      mensaje: mensajeServicio,
      horarios,
      disponibilidades: disponibilidadesArray,
      imagenesPreview: imagenesUrls,
      imagenesDB: imagenesUrls,
    }));
    
  } catch (err) {
    throw err;
  }
};

// 🔹 Publicar o actualizar servicio
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
    
    navigate("/publicar/finalizado", {
      replace: true,
      state: {
        esActualizacion: !!id,
        origenPanel: "admin",
        servicioId: servicioId
      }
    });

  } catch (err) {
    setErrorModal(err.message || "Error al publicar el servicio");
  } finally {
    setPublicando(false);
  }
};