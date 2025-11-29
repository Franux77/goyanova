import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CategoryPage from './CategoryPage';

const CategoryPageWrapper = () => {
  const { categoryName } = useParams();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  return <CategoryPage category={categoryName} onBack={handleBack} />;
};

export default CategoryPageWrapper;
