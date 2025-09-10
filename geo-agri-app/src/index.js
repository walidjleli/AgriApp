import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';
import WaterPointsMap from './components/WaterPointsMap';

console.log('🚀 index.js: Démarrage de l\'application');

const GeoAgriApp = () => {
  console.log('✅ GeoAgriApp component rendering');
  
  const [waterPoints, setWaterPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Données de démonstration pour la Tunisie
  const demoPoints = [
    {
      _id: 'demo1',
      name: 'Puits Principal Tunis',
      governorate: 'Tunis',
      type: 'Puits',
      status: 'Actif',
      latitude: 36.8065,
      longitude: 10.1815
    },
    {
      _id: 'demo2',
      name: 'Forage Sidi Bouzid',
      governorate: 'Sidi Bouzid',
      type: 'Forage',
      status: 'Actif',
      latitude: 35.0378,
      longitude: 9.4856
    },
    {
      _id: 'demo3',
      name: 'Source Kasserine',
      governorate: 'Kasserine',
      type: 'Source',
      status: 'Actif',
      latitude: 35.1677,
      longitude: 8.8368
    }
  ];

  useEffect(() => {
    console.log('🔄 Chargement des points d\'eau...');
    
    setTimeout(() => {
      fetch('http://localhost:5000/api/points')
        .then(res => {
          if (!res.ok) throw new Error('Backend non disponible');
          return res.json();
        })
        .then(data => {
          console.log('✅ Données récupérées du backend:', data);
          setWaterPoints(Array.isArray(data) ? data : []);
        })
        .catch(err => {
          console.log('⚠️ Backend non disponible, aucune donnée chargée');
          setWaterPoints([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        backgroundColor: '#f8f9fa',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔄</div>
        <h2 style={{ color: '#495057', margin: '0 0 10px 0' }}>Chargement</h2>
        <p style={{ color: '#6c757d', margin: '0' }}>Récupération des points d'eau...</p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#f0f8ff',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <header style={{
        textAlign: 'center',
        marginBottom: '20px',
        padding: '20px',
        backgroundColor: '#fff',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          color: '#2E7D32',
          fontSize: '28px',
          margin: '0 0 10px 0'
        }}>
          🌍 Application Geo-Agri - Points d'Eau Tunisie
        </h1>
        <p style={{
          color: '#666',
          fontSize: '16px',
          margin: '0'
        }}>
          Système de gestion des ressources hydriques
        </p>
      </header>

      {/* Affichage direct de la carte interactive */}
      <div style={{ padding: '0 20px' }}>
        <WaterPointsMap />
      </div>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        marginTop: '30px',
        padding: '15px',
        backgroundColor: '#e8f5e8',
        border: '1px solid #c8e6c9',
        borderRadius: '5px',
        color: '#2e7d32'
      }}>
        ✅ Application fonctionnelle
      </footer>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
console.log('🚀 index.js: Root créé');

root.render(
  <React.StrictMode>
    <GeoAgriApp />
  </React.StrictMode>
);

console.log('🚀 index.js: Composant rendu');

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
