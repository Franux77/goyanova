// src/components/home/CategoryCard.jsx
import React from 'react';
import './CategoryCard.css';

const CategoryCard = ({ title, icon, onSelect }) => {
  return (
    <div 
      className="category-card" 
      onClick={() => onSelect(title)}
      data-category={title} // Identificador único para scroll
    >
      <span className="material-icons">{icon}</span>
      <p>{title}</p>
    </div>
  );
};

export default CategoryCard;