import React from 'react';
import './Loading.css';

const Loading = ({ message = 'Cargando...', fullScreen = false }) => {
  const containerClass = fullScreen ? 'global-loader-fullscreen' : 'global-loader-container';
  
  return (
    <div className={containerClass}>
      <div className="global-modern-loader">
        <div className="global-loader-ring"></div>
        <div className="global-loader-ring"></div>
        <div className="global-loader-ring"></div>
        <div className="global-loader-pulse"></div>
      </div>
      <p className="global-loader-text">{message}</p>
    </div>
  );
};

export default Loading;