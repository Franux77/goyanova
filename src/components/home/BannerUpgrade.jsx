import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import './BannerUpgrade.css';

const BannerUpgrade = ({ user }) => {
  const navigate = useNavigate();
  const [tipoMembresia, setTipoMembresia] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setVisible(false);
      return;
    }

    const verificarMembresia = async () => {
      try {
        const { data: membresia } = await supabase
          .from('membresias')
          .select('tipo_membresia, badge_texto')
          .eq('usuario_id', user.id)
          .eq('estado', 'activa')
          .order('prioridad_nivel', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Mostrar banner solo si es gratis o promo
        if (!membresia || membresia.tipo_membresia === 'gratis') {
          setTipoMembresia('gratis');
          setVisible(true);
        } else if (
          membresia.tipo_membresia === 'codigo_folleto' ||
          membresia.tipo_membresia === 'codigo_promocion' ||
          membresia.tipo_membresia === 'codigo_gratis'
        ) {
          setTipoMembresia('promo');
          setVisible(true);
        } else {
          // Premium VIP o Pago → No mostrar banner
          setVisible(false);
        }
      } catch (err) {
        console.error('Error verificando membresía:', err);
        setVisible(false);
      }
    };

    verificarMembresia();
  }, [user]);

  if (!visible || !tipoMembresia) return null;

  const config = {
    gratis: {
      bg: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)',
      icon: 'workspace_premium',
      texto: 'Obtené más visibilidad con Premium',
      boton: 'Mejorá tu plan',
      colorBoton: '#fff',
      bgBoton: 'rgba(0,0,0,0.2)'
    },
    promo: {
      bg: 'linear-gradient(135deg, #2196f3 0%, #00bcd4 100%)',
      icon: 'star',
      texto: 'Descubrí los beneficios Premium VIP',
      boton: 'Ver mejoras',
      colorBoton: '#fff',
      bgBoton: 'rgba(0,0,0,0.15)'
    }
  };

  const actual = config[tipoMembresia];

  return (
    <div className="banner-upgrade" style={{ background: actual.bg }}>
      <div className="banner-upgrade-content">
        <div className="banner-upgrade-left">
          <span className="material-icons banner-upgrade-icon">{actual.icon}</span>
          <span className="banner-upgrade-text">{actual.texto}</span>
        </div>
        <button
          className="banner-upgrade-btn"
          style={{ 
            background: actual.bgBoton,
            color: actual.colorBoton
          }}
          onClick={() => navigate('/panel/mi-membresia')}
        >
          {actual.boton}
          <span className="material-icons">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};

export default BannerUpgrade;