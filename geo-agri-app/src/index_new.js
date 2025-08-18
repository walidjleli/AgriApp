import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';

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
          setWaterPoints(Array.isArray(data) ? data : demoPoints);
        })
        .catch(err => {
          console.log('⚠️ Backend non disponible, utilisation des données de démo');
          setWaterPoints(demoPoints);
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
      padding: '20px',
      backgroundColor: '#f0f8ff',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <header style={{
        textAlign: 'center',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#fff',
        borderRadius: '10px',
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

      {/* Statistiques */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{
          backgroundColor: '#e3f2fd',
          padding: '20px',
          borderRadius: '10px',
          textAlign: 'center',
          border: '1px solid #bbdefb'
        }}>
          <div style={{ fontSize: '32px', color: '#1976d2' }}>💧</div>
          <h3 style={{ margin: '10px 0 5px 0', color: '#1976d2' }}>Points d'Eau</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '0', color: '#0d47a1' }}>
            {waterPoints.length}
          </p>
        </div>
        
        <div style={{
          backgroundColor: '#e8f5e8',
          padding: '20px',
          borderRadius: '10px',
          textAlign: 'center',
          border: '1px solid #c8e6c9'
        }}>
          <div style={{ fontSize: '32px', color: '#4caf50' }}>✅</div>
          <h3 style={{ margin: '10px 0 5px 0', color: '#4caf50' }}>Actifs</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '0', color: '#2e7d32' }}>
            {waterPoints.filter(p => p.status === 'Actif').length}
          </p>
        </div>

        <div style={{
          backgroundColor: '#fff3e0',
          padding: '20px',
          borderRadius: '10px',
          textAlign: 'center',
          border: '1px solid #ffcc02'
        }}>
          <div style={{ fontSize: '32px', color: '#ff9800' }}>📊</div>
          <h3 style={{ margin: '10px 0 5px 0', color: '#ff9800' }}>Gouvernorats</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '0', color: '#e65100' }}>
            {new Set(waterPoints.map(p => p.governorate)).size}
          </p>
        </div>
      </div>

      {/* Liste des points d'eau */}
      <div style={{
        backgroundColor: 'white',
        padding: '25px',
        borderRadius: '10px',
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginBottom: '20px', color: '#333' }}>📋 Points d'Eau Enregistrés</h3>
        
        {waterPoints.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#666'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏜️</div>
            <p>Aucun point d'eau enregistré</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {waterPoints.map((point, index) => (
              <div key={point._id || index} style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                backgroundColor: '#f9f9f9'
              }}>
                <h4 style={{
                  color: '#2E7D32',
                  margin: '0 0 10px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  💧 {point.name}
                </h4>
                
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  <p style={{ margin: '5px 0' }}>
                    <strong>📍 Gouvernorat:</strong> {point.governorate}
                  </p>
                  <p style={{ margin: '5px 0' }}>
                    <strong>🔧 Type:</strong> {point.type}
                  </p>
                  <p style={{ margin: '5px 0' }}>
                    <strong>📊 État:</strong> 
                    <span style={{
                      color: point.status === 'Actif' ? '#28a745' : '#dc3545',
                      fontWeight: 'bold',
                      marginLeft: '5px'
                    }}>
                      {point.status}
                    </span>
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>
                    <strong>🌐 Coordonnées:</strong><br/>
                    Lat: {point.latitude?.toFixed(4)}<br/>
                    Lng: {point.longitude?.toFixed(4)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
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
        ✅ Application fonctionnelle - {waterPoints.length} point(s) d'eau enregistré(s)
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
