import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../styles/enhanced.css';
import '../styles/leaflet-custom.css';

// Configuration des icônes Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const WaterPointsMap = () => {
  console.log('🗺️ WaterPointsMap: Version complète avec formulaire et carte');
  
  const [waterPoints, setWaterPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [clickPosition, setClickPosition] = useState(null);
  const [newPoint, setNewPoint] = useState({
    latitude: '',
    longitude: '',
    owner: '',
    surfaceArea: '',
    // Analyse d'eau
    flowRate: '',
    waterSalinity: '',
    // Analyse de sol
    activeLimestone: '',
    organicMatter: '',
    soilSalinity: '',
    soilPh: ''
  });

  // États pour la saisie en format DMS
  const [dmsInput, setDmsInput] = useState({
    showDMS: false,
    latDegrees: '',
    latMinutes: '',
    latSeconds: '',
    latDirection: 'N',
    lngDegrees: '',
    lngMinutes: '',
    lngSeconds: '',
    lngDirection: 'E'
  });

  // Données de démonstration avec nouvelles analyses
  const demoPoints = [
    {
      _id: 'demo1',
      latitude: 36.8065,
      longitude: 10.1815,
      owner: 'Administration Tunis',
      surfaceArea: '5.2',
      // Analyse d'eau
      flowRate: '120',
      waterSalinity: '1.2',
      // Analyse de sol
      activeLimestone: '15.5',
      organicMatter: '3.2',
      soilSalinity: '0.8',
      soilPh: '7.4'
    },
    {
      _id: 'demo2',
      latitude: 35.0378,
      longitude: 9.4856,
      owner: 'Coopérative Sidi Bouzid',
      surfaceArea: '12.8',
      // Analyse d'eau
      flowRate: '200',
      waterSalinity: '0.8',
      // Analyse de sol
      activeLimestone: '22.1',
      organicMatter: '2.8',
      soilSalinity: '0.5',
      soilPh: '7.1'
    },
    {
      _id: 'demo3',
      latitude: 35.1677,
      longitude: 8.8368,
      owner: 'Ferme Kasserine',
      surfaceArea: '8.5',
      // Analyse d'eau
      flowRate: '80',
      waterSalinity: '0.5',
      // Analyse de sol
      activeLimestone: '18.9',
      organicMatter: '1.9',
      soilSalinity: '0.7',
      soilPh: '7.8'
    }
  ];

  // Composant pour gérer les clics sur la carte (optionnel)
  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        // Seulement si le formulaire est ouvert, on peut cliquer pour remplir les coordonnées
        if (showAddForm) {
          const { lat, lng } = e.latlng;
          console.log('🎯 Clic sur la carte:', lat, lng);
          setClickPosition({ lat, lng });
          setNewPoint(prev => ({
            ...prev,
            latitude: lat.toFixed(6),
            longitude: lng.toFixed(6)
          }));
        }
      }
    });
    return null;
  };

  // Fonction de génération PDF
  const generatePDF = async (point) => {
    try {
      console.log('📄 Génération PDF pour:', point.owner);
      
      const pdf = new jsPDF();
      
      // En-tête
      pdf.setFontSize(20);
      pdf.text('🗺️ Rapport Point d\'Eau - Geo-Agri', 20, 20);
      
      // Informations générales
      pdf.setFontSize(16);
      pdf.text('📍 Informations Générales', 20, 40);
      pdf.setFontSize(12);
      pdf.text(`Propriétaire: ${point.owner}`, 25, 55);
      pdf.text(`Surface de terrain: ${point.surfaceArea} hectares`, 25, 70);
      pdf.text(`Latitude: ${point.latitude}°`, 25, 85);
      pdf.text(`Longitude: ${point.longitude}°`, 25, 100);
      
      // Analyse de l'eau
      pdf.setFontSize(16);
      pdf.text('💧 Analyse de l\'Eau', 20, 120);
      pdf.setFontSize(12);
      pdf.text(`Débit: ${point.flowRate} L/min`, 25, 135);
      pdf.text(`Salinité: ${point.waterSalinity} g/L`, 25, 150);
      
      // Évaluation qualité eau
      const waterQuality = evaluateWaterQuality(point);
      pdf.text(`Qualité de l'eau: ${waterQuality.level}`, 25, 165);
      
      // Analyse du sol
      pdf.setFontSize(16);
      pdf.text('🌱 Analyse du Sol', 20, 185);
      pdf.setFontSize(12);
      pdf.text(`Calcaire actif: ${point.activeLimestone}%`, 25, 200);
      pdf.text(`Matière Organique: ${point.organicMatter}%`, 25, 215);
      pdf.text(`Salinité du sol: ${point.soilSalinity} dS/m`, 25, 230);
      pdf.text(`pH du sol: ${point.soilPh}`, 25, 245);
      
      // Évaluation fertilité sol
      const soilFertility = evaluateSoilFertility(point);
      pdf.text(`Fertilité du sol: ${soilFertility.level}`, 25, 260);
      
      // Pied de page
      pdf.setFontSize(10);
      pdf.text(`Rapport généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 275);
      
      pdf.save(`rapport_${point.owner.replace(/\s+/g, '_')}.pdf`);
      console.log('✅ PDF généré avec succès');
      
    } catch (error) {
      console.error('❌ Erreur génération PDF:', error);
    }
  };

  // Fonction de suppression
  const handleDelete = async (pointId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce point d\'eau ?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/points/${pointId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setWaterPoints(prev => prev.filter(point => point._id !== pointId));
        console.log('✅ Point supprimé avec succès');
      } else {
        throw new Error('Erreur backend');
      }
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      // Suppression locale en cas d'erreur
      setWaterPoints(prev => prev.filter(point => point._id !== pointId));
      console.log('⚠️ Point supprimé localement');
    }
  };

  useEffect(() => {
    console.log('🔄 Chargement des points d\'eau avec analyses...');
    
    setTimeout(() => {
      fetch('http://localhost:5000/api/points')
        .then(res => {
          if (!res.ok) throw new Error('Backend non disponible');
          return res.json();
        })
        .then(data => {
          console.log('✅ Données récupérées du backend:', data);
          setWaterPoints(Array.isArray(data) && data.length > 0 ? data : demoPoints);
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

  // Fonctions d'évaluation
  const evaluateWaterQuality = (point) => {
    const flowRate = parseFloat(point.flowRate) || 0;
    const waterSalinity = parseFloat(point.waterSalinity) || 0;
    
    let score = 0;
    let issues = [];
    
    // Évaluation du débit (optimal: >10 L/min)
    if (flowRate >= 20) {
      score += 3;
    } else if (flowRate >= 10) {
      score += 2;
    } else if (flowRate >= 5) {
      score += 1;
      issues.push('Débit faible');
    } else {
      score += 0;
      issues.push('Débit très faible');
    }
    
    // Évaluation salinité de l'eau (optimal: ≤1.0 g/L)
    if (waterSalinity <= 1.0) {
      score += 3;
    } else if (waterSalinity <= 2.0) {
      score += 2;
      issues.push('Salinité modérée');
    } else if (waterSalinity <= 3.0) {
      score += 1;
      issues.push('Salinité élevée');
    } else {
      score += 0;
      issues.push('Salinité très élevée');
    }
    
    // Score final sur 6 points (au lieu de 9)
    if (score >= 5) return { level: 'Excellente', color: '#4CAF50', icon: '✓', issues };
    if (score >= 3) return { level: 'Bonne', color: '#FF9800', icon: '⚠️', issues };
    return { level: 'Médiocre', color: '#F44336', icon: '⚠️', issues };
  };

  const evaluateSoilFertility = (point) => {
    const activeLimestone = parseFloat(point.activeLimestone) || 0;
    const organicMatter = parseFloat(point.organicMatter) || 0;
    const soilSalinity = parseFloat(point.soilSalinity) || 0;
    const soilPh = parseFloat(point.soilPh) || 0;
    
    let score = 0;
    let recommendations = [];
    
    // Calcaire actif (optimal: 10-25%)
    if (activeLimestone >= 10 && activeLimestone <= 25) {
      score += 3;
    } else if (activeLimestone >= 5 && activeLimestone <= 30) {
      score += 2;
      if (activeLimestone < 10) recommendations.push('Calcaire actif faible');
      if (activeLimestone > 25) recommendations.push('Calcaire actif élevé');
    } else {
      score += 1;
      if (activeLimestone < 5) recommendations.push('Carence en calcaire actif');
      if (activeLimestone > 30) recommendations.push('Excès de calcaire actif');
    }
    
    // Matière organique (optimal: ≥3.0%)
    if (organicMatter >= 3.0) {
      score += 3;
    } else if (organicMatter >= 2.0) {
      score += 2;
      recommendations.push('Augmenter la matière organique');
    } else {
      score += 1;
      recommendations.push('Sol pauvre en matière organique');
    }
    
    // Salinité du sol (optimal: ≤2.0 dS/m)
    if (soilSalinity <= 2.0) {
      score += 3;
    } else if (soilSalinity <= 4.0) {
      score += 2;
      recommendations.push('Salinité modérée du sol');
    } else {
      score += 1;
      recommendations.push('Sol trop salin');
    }
    
    // pH du sol (optimal: 6.5-7.5)
    if (soilPh >= 6.5 && soilPh <= 7.5) {
      score += 3;
    } else if (soilPh >= 6.0 && soilPh <= 8.0) {
      score += 2;
      if (soilPh < 6.5) recommendations.push('Sol légèrement acide');
      if (soilPh > 7.5) recommendations.push('Sol légèrement basique');
    } else {
      score += 1;
      if (soilPh < 6.0) recommendations.push('Sol trop acide');
      if (soilPh > 8.0) recommendations.push('Sol trop basique');
    }
    
    if (score >= 10) return { level: 'Très fertile', color: '#4CAF50', icon: '✓', recommendations };
    if (score >= 8) return { level: 'Fertile', color: '#8BC34A', icon: '✓', recommendations };
    if (score >= 6) return { level: 'Moyennement fertile', color: '#FF9800', icon: '⚠️', recommendations };
    return { level: 'Peu fertile', color: '#F44336', icon: '⚠️', recommendations };
  };

  // Fonction pour convertir les coordonnées décimales vers DMS
  const convertToDMS = (decimal, isLatitude) => {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = ((minutesFloat - minutes) * 60).toFixed(2);
    
    const direction = isLatitude 
      ? (decimal >= 0 ? 'N' : 'S')
      : (decimal >= 0 ? 'E' : 'W');
    
    return `${degrees}°${minutes}'${seconds}"${direction}`;
  };

  // Fonction pour convertir DMS vers décimal
  const convertDMSToDecimal = (degrees, minutes, seconds, direction) => {
    let decimal = parseFloat(degrees) + parseFloat(minutes)/60 + parseFloat(seconds)/3600;
    if (direction === 'S' || direction === 'W') {
      decimal = -decimal;
    }
    return decimal;
  };

  // Générer des coordonnées aléatoirement pour la Tunisie
  const generateRandomCoordinates = () => {
    const tunisiaLat = 34 + Math.random() * 4; // Entre 32°N et 36°N
    const tunisiaLng = 8 + Math.random() * 4;  // Entre 8°E et 12°E
    
    setClickPosition({ lat: tunisiaLat, lng: tunisiaLng });
    setNewPoint(prev => ({
      ...prev,
      latitude: tunisiaLat.toFixed(6),
      longitude: tunisiaLng.toFixed(6)
    }));
  };

  // Gestion des changements dans le formulaire
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPoint(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Gestion des changements DMS
  const handleDMSChange = (e) => {
    const { name, value } = e.target;
    const newDmsInput = { ...dmsInput, [name]: value };
    setDmsInput(newDmsInput);

    // Conversion automatique vers décimal si tous les champs sont remplis
    if (newDmsInput.latDegrees && newDmsInput.latMinutes && newDmsInput.latSeconds) {
      const latDecimal = convertDMSToDecimal(
        newDmsInput.latDegrees, 
        newDmsInput.latMinutes, 
        newDmsInput.latSeconds, 
        newDmsInput.latDirection
      );
      setNewPoint(prev => ({ ...prev, latitude: latDecimal.toFixed(6) }));
    }

    if (newDmsInput.lngDegrees && newDmsInput.lngMinutes && newDmsInput.lngSeconds) {
      const lngDecimal = convertDMSToDecimal(
        newDmsInput.lngDegrees, 
        newDmsInput.lngMinutes, 
        newDmsInput.lngSeconds, 
        newDmsInput.lngDirection
      );
      setNewPoint(prev => ({ ...prev, longitude: lngDecimal.toFixed(6) }));
    }
  };

  // Ajout d'un nouveau point
  const handleAddPoint = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:5000/api/points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPoint),
      });

      if (response.ok) {
        const savedPoint = await response.json();
        setWaterPoints(prev => [...prev, savedPoint]);
        console.log('✅ Point ajouté avec succès:', savedPoint);
      } else {
        // Simulation locale si backend non disponible
        const simulatedPoint = {
          ...newPoint,
          _id: 'local_' + Date.now()
        };
        setWaterPoints(prev => [...prev, simulatedPoint]);
        console.log('⚠️ Point ajouté localement:', simulatedPoint);
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout:', error);
      // Ajout local en cas d'erreur
      const simulatedPoint = {
        ...newPoint,
        _id: 'local_' + Date.now()
      };
      setWaterPoints(prev => [...prev, simulatedPoint]);
    }

    // Réinitialiser le formulaire
    setShowAddForm(false);
    setNewPoint({
      latitude: '',
      longitude: '',
      owner: '',
      surfaceArea: '',
      flowRate: '',
      waterSalinity: '',
      activeLimestone: '',
      organicMatter: '',
      soilSalinity: '',
      soilPh: ''
    });
    setDmsInput({
      showDMS: false,
      latDegrees: '',
      latMinutes: '',
      latSeconds: '',
      latDirection: 'N',
      lngDegrees: '',
      lngMinutes: '',
      lngSeconds: '',
      lngDirection: 'E'
    });
    setClickPosition(null);
  };

  // Suppression d'un point
  const handleDeletePoint = async (pointId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce point d\'eau ?')) {
      try {
        const response = await fetch(`http://localhost:5000/api/points/${pointId}`, {
          method: 'DELETE',
        });

        if (response.ok || pointId.startsWith('local_') || pointId.startsWith('demo')) {
          setWaterPoints(prev => prev.filter(point => point._id !== pointId));
          console.log('✅ Point supprimé:', pointId);
        }
      } catch (error) {
        console.error('❌ Erreur lors de la suppression:', error);
        // Suppression locale même en cas d'erreur
        setWaterPoints(prev => prev.filter(point => point._id !== pointId));
      }
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        backgroundColor: '#f8f9fa',
        borderRadius: '10px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🧪</div>
          <h3>Chargement des analyses...</h3>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '10px',
      padding: '20px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{
        color: '#2E7D32',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        🧪 Points d'Eau avec Analyses Complètes
      </h2>

      {/* Contrôles */}
      <div style={{
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        alignItems: 'center'
      }}>
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ➕ Ajouter Point d'Eau
        </button>
        
        <div style={{
          padding: '8px 15px',
          backgroundColor: '#e3f2fd',
          borderRadius: '20px',
          fontSize: '14px',
          color: '#1976d2'
        }}>
          📊 {waterPoints.length} point(s) analysé(s)
        </div>
      </div>

      {/* Statistiques de qualité */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '15px',
        marginBottom: '25px'
      }}>
        <div style={{
          backgroundColor: '#e8f5e8',
          padding: '15px',
          borderRadius: '8px',
          border: '1px solid #c8e6c9'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>💧 Qualité de l'Eau</h4>
          <div style={{ fontSize: '12px' }}>
            <span style={{ color: '#28a745' }}>Excellente: {waterPoints.filter(p => evaluateWaterQuality(p).level === 'Excellente').length}</span><br/>
            <span style={{ color: '#ffc107' }}>Bonne: {waterPoints.filter(p => evaluateWaterQuality(p).level === 'Bonne').length}</span><br/>
            <span style={{ color: '#dc3545' }}>Médiocre: {waterPoints.filter(p => evaluateWaterQuality(p).level === 'Médiocre').length}</span>
          </div>
        </div>

        <div style={{
          backgroundColor: '#fff3e0',
          padding: '15px',
          borderRadius: '8px',
          border: '1px solid #ffcc02'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#e65100' }}>🌱 Qualité du Sol</h4>
          <div style={{ fontSize: '12px' }}>
            <span style={{ color: '#28a745' }}>Très fertile: {waterPoints.filter(p => evaluateSoilFertility(p).level === 'Très fertile').length}</span><br/>
            <span style={{ color: '#ffc107' }}>Fertile: {waterPoints.filter(p => evaluateSoilFertility(p).level === 'Fertile').length}</span><br/>
            <span style={{ color: '#dc3545' }}>Peu fertile: {waterPoints.filter(p => evaluateSoilFertility(p).level === 'Peu fertile').length}</span>
          </div>
        </div>
      </div>

      {/* Liste des points avec analyses */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {waterPoints.map((point, index) => {
          const waterQuality = evaluateWaterQuality(point);
          const soilQuality = evaluateSoilFertility(point);
          
          return (
            <div key={point._id || index} style={{
              border: '1px solid #ddd',
              borderRadius: '10px',
              padding: '20px',
              backgroundColor: '#f9f9f9'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px'
              }}>
                <h4 style={{
                  color: '#2E7D32',
                  margin: '0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  💧 Point #{index + 1}
                </h4>
                <button
                  onClick={() => handleDeletePoint(point._id)}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  🗑️
                </button>
              </div>

              {/* Informations générales */}
              <div style={{ marginBottom: '15px' }}>
                <p style={{ margin: '5px 0', fontSize: '14px' }}>
                  <strong>👤 Propriétaire:</strong> {point.owner}
                </p>
                <p style={{ margin: '5px 0', fontSize: '14px' }}>
                  <strong>🏞️ Surface:</strong> {point.surfaceArea} hectares
                </p>
                <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>
                  <strong>📍 Coordonnées:</strong><br/>
                  Lat: {convertToDMS(parseFloat(point.latitude), true)}<br/>
                  Lng: {convertToDMS(parseFloat(point.longitude), false)}
                </p>
              </div>

              {/* Analyse de l'eau */}
              <div style={{
                backgroundColor: '#e3f2fd',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '10px'
              }}>
                <h5 style={{ 
                  margin: '0 0 8px 0', 
                  color: '#1976d2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  🧪 Analyse de l'Eau
                  <span style={{ 
                    color: waterQuality.color,
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {waterQuality.level}
                  </span>
                </h5>
                <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                  <p style={{ margin: '3px 0' }}>
                    <strong>Débit:</strong> {point.flowRate} L/min
                    <span style={{ color: parseFloat(point.flowRate) >= 10 ? '#28a745' : '#dc3545' }}>
                      {parseFloat(point.flowRate) >= 10 ? ' ✓' : ' ⚠️'}
                    </span>
                  </p>
                  <p style={{ margin: '3px 0' }}>
                    <strong>Salinité:</strong> {point.waterSalinity} g/L
                    <span style={{ color: parseFloat(point.waterSalinity) <= 1.0 ? '#28a745' : '#dc3545' }}>
                      {parseFloat(point.waterSalinity) <= 1.0 ? ' ✓' : ' ⚠️'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Analyse du sol */}
              <div style={{
                backgroundColor: '#fff3e0',
                padding: '12px',
                borderRadius: '6px'
              }}>
                <h5 style={{ 
                  margin: '0 0 8px 0', 
                  color: '#e65100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  🌱 Analyse du Sol
                  <span style={{ 
                    color: soilQuality.color,
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {soilQuality.level}
                  </span>
                </h5>
                <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                  <p style={{ margin: '3px 0' }}>
                    <strong>Calcaire actif:</strong> {point.activeLimestone}%
                    <span style={{ color: (parseFloat(point.activeLimestone) >= 10 && parseFloat(point.activeLimestone) <= 25) ? '#28a745' : '#dc3545' }}>
                      {(parseFloat(point.activeLimestone) >= 10 && parseFloat(point.activeLimestone) <= 25) ? ' ✓' : ' ⚠️'}
                    </span>
                  </p>
                  <p style={{ margin: '3px 0' }}>
                    <strong>Matière organique:</strong> {point.organicMatter}%
                    <span style={{ color: parseFloat(point.organicMatter) >= 2.0 ? '#28a745' : '#dc3545' }}>
                      {parseFloat(point.organicMatter) >= 2.0 ? ' ✓' : ' ⚠️'}
                    </span>
                  </p>
                  <p style={{ margin: '3px 0' }}>
                    <strong>Salinité du sol:</strong> {point.soilSalinity} dS/m
                    <span style={{ color: parseFloat(point.soilSalinity) <= 2.0 ? '#28a745' : '#dc3545' }}>
                      {parseFloat(point.soilSalinity) <= 2.0 ? ' ✓' : ' ⚠️'}
                    </span>
                  </p>
                  <p style={{ margin: '3px 0' }}>
                    <strong>pH du sol:</strong> {point.soilPh}
                    <span style={{ color: (parseFloat(point.soilPh) >= 6.5 && parseFloat(point.soilPh) <= 7.5) ? '#28a745' : '#dc3545' }}>
                      {(parseFloat(point.soilPh) >= 6.5 && parseFloat(point.soilPh) <= 7.5) ? ' ✓' : ' ⚠️'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {waterPoints.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#666'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🧪</div>
          <p>Aucune analyse disponible</p>
        </div>
      )}

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <div style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          overflow: 'auto'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '10px',
            width: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
            margin: '20px'
          }}>
            <h3 style={{ marginTop: '0', color: '#2E7D32' }}>
              ➕ Nouveau Point d'Eau avec Analyses
            </h3>
            
            {clickPosition && (
              <div style={{
                backgroundColor: '#e8f5e8',
                padding: '10px',
                borderRadius: '5px',
                marginBottom: '15px',
                fontSize: '12px'
              }}>
                <strong>📍 Position sélectionnée:</strong><br/>
                Lat: {parseFloat(newPoint.latitude).toFixed(6)}<br/>
                Lng: {parseFloat(newPoint.longitude).toFixed(6)}
              </div>
            )}
            
            {/* Message informatif */}
            <div style={{
              backgroundColor: '#f0f8ff',
              border: '1px solid #bee5eb',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '15px',
              fontSize: '12px',
              color: '#0c5460'
            }}>
              <strong>💡 Astuce:</strong> Vous pouvez saisir les coordonnées manuellement ou cliquer sur la carte pour les remplir automatiquement.
            </div>
            
            <form onSubmit={handleAddPoint}>
              {/* Informations générales */}
              <fieldset style={{ 
                border: '1px solid #ddd', 
                borderRadius: '5px', 
                padding: '15px', 
                marginBottom: '15px' 
              }}>
                <legend style={{ color: '#2E7D32', fontWeight: 'bold' }}>
                  📋 Informations Générales
                </legend>
                
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                    👤 Propriétaire:
                  </label>
                  <input
                    type="text"
                    name="owner"
                    value={newPoint.owner}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '3px',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                      📍 Latitude (format décimal):
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      name="latitude"
                      value={newPoint.latitude}
                      onChange={handleInputChange}
                      required
                      placeholder="Ex: 36.806389"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '3px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                      📍 Longitude (format décimal):
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      name="longitude"
                      value={newPoint.longitude}
                      onChange={handleInputChange}
                      required
                      placeholder="Ex: 10.181667"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '3px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>

                {/* Bouton pour basculer vers format DMS */}
                <div style={{ marginBottom: '10px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setDmsInput(prev => ({ ...prev, showDMS: !prev.showDMS }))}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: dmsInput.showDMS ? '#6c757d' : '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px'
                    }}
                  >
                    {dmsInput.showDMS ? '📐 ← Format Décimal' : '📐 Format DMS →'}
                  </button>
                </div>

                {/* Champs DMS (conditionnels) */}
                {dmsInput.showDMS && (
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    padding: '10px',
                    borderRadius: '5px',
                    marginBottom: '10px'
                  }}>
                    <h6 style={{ margin: '0 0 10px 0', color: '#495057' }}>📐 Saisie en format DMS</h6>
                    
                    {/* Latitude DMS */}
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                        Latitude:
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 60px', gap: '5px' }}>
                        <input
                          type="number"
                          name="latDegrees"
                          value={dmsInput.latDegrees}
                          onChange={handleDMSChange}
                          placeholder="Degrés"
                          min="0"
                          max="90"
                          style={{ padding: '5px', fontSize: '12px', borderRadius: '3px', border: '1px solid #ccc' }}
                        />
                        <input
                          type="number"
                          name="latMinutes"
                          value={dmsInput.latMinutes}
                          onChange={handleDMSChange}
                          placeholder="Minutes"
                          min="0"
                          max="59"
                          style={{ padding: '5px', fontSize: '12px', borderRadius: '3px', border: '1px solid #ccc' }}
                        />
                        <input
                          type="number"
                          step="0.01"
                          name="latSeconds"
                          value={dmsInput.latSeconds}
                          onChange={handleDMSChange}
                          placeholder="Secondes"
                          min="0"
                          max="59.99"
                          style={{ padding: '5px', fontSize: '12px', borderRadius: '3px', border: '1px solid #ccc' }}
                        />
                        <select
                          name="latDirection"
                          value={dmsInput.latDirection}
                          onChange={handleDMSChange}
                          style={{ padding: '5px', fontSize: '12px', borderRadius: '3px', border: '1px solid #ccc' }}
                        >
                          <option value="N">N</option>
                          <option value="S">S</option>
                        </select>
                      </div>
                    </div>

                    {/* Longitude DMS */}
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                        Longitude:
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 60px', gap: '5px' }}>
                        <input
                          type="number"
                          name="lngDegrees"
                          value={dmsInput.lngDegrees}
                          onChange={handleDMSChange}
                          placeholder="Degrés"
                          min="0"
                          max="180"
                          style={{ padding: '5px', fontSize: '12px', borderRadius: '3px', border: '1px solid #ccc' }}
                        />
                        <input
                          type="number"
                          name="lngMinutes"
                          value={dmsInput.lngMinutes}
                          onChange={handleDMSChange}
                          placeholder="Minutes"
                          min="0"
                          max="59"
                          style={{ padding: '5px', fontSize: '12px', borderRadius: '3px', border: '1px solid #ccc' }}
                        />
                        <input
                          type="number"
                          step="0.01"
                          name="lngSeconds"
                          value={dmsInput.lngSeconds}
                          onChange={handleDMSChange}
                          placeholder="Secondes"
                          min="0"
                          max="59.99"
                          style={{ padding: '5px', fontSize: '12px', borderRadius: '3px', border: '1px solid #ccc' }}
                        />
                        <select
                          name="lngDirection"
                          value={dmsInput.lngDirection}
                          onChange={handleDMSChange}
                          style={{ padding: '5px', fontSize: '12px', borderRadius: '3px', border: '1px solid #ccc' }}
                        >
                          <option value="E">E</option>
                          <option value="W">W</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Affichage des coordonnées en format DMS */}
                {newPoint.latitude && newPoint.longitude && (
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    padding: '8px',
                    borderRadius: '4px',
                    marginBottom: '10px',
                    fontSize: '12px',
                    color: '#495057'
                  }}>
                    <strong>📐 Format DMS:</strong><br/>
                    <span style={{ color: '#28a745' }}>
                      Lat: {convertToDMS(parseFloat(newPoint.latitude), true)}<br/>
                      Lng: {convertToDMS(parseFloat(newPoint.longitude), false)}
                    </span>
                  </div>
                )}

                

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                    🏞️ Surface de terrain (hectares):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="surfaceArea"
                    value={newPoint.surfaceArea}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '3px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </fieldset>

              {/* Analyse de l'eau */}
              <fieldset style={{ 
                border: '1px solid #1976d2', 
                borderRadius: '5px', 
                padding: '15px', 
                marginBottom: '15px',
                backgroundColor: '#f3f8ff'
              }}>
                <legend style={{ color: '#1976d2', fontWeight: 'bold' }}>
                  💧 Analyse de l'Eau
                </legend>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                      💧 Débit (L/min):
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="flowRate"
                      value={newPoint.flowRate}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '3px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                      🧂 Salinité (g/L):
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="waterSalinity"
                      value={newPoint.waterSalinity}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '3px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>
              </fieldset>

              {/* Analyse du sol */}
              <fieldset style={{ 
                border: '1px solid #e65100', 
                borderRadius: '5px', 
                padding: '15px', 
                marginBottom: '15px',
                backgroundColor: '#fffbf0'
              }}>
                <legend style={{ color: '#e65100', fontWeight: 'bold' }}>
                  🌱 Analyse du Sol
                </legend>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                      🗿 Calcaire actif (%):
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="activeLimestone"
                      value={newPoint.activeLimestone}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '3px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                      🍃 Matière organique (%):
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="organicMatter"
                      value={newPoint.organicMatter}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '3px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                      🧂 Salinité du sol (dS/m):
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="soilSalinity"
                      value={newPoint.soilSalinity}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '3px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                      🧪 pH du sol (6.0-8.5):
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="soilPh"
                      value={newPoint.soilPh}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '3px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>
              </fieldset>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ✅ Ajouter les Analyses
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewPoint({
                      latitude: '',
                      longitude: '',
                      owner: '',
                      surfaceArea: '',
                      flowRate: '',
                      waterSalinity: '',
                      activeLimestone: '',
                      organicMatter: '',
                      soilSalinity: '',
                      soilPh: ''
                    });
                    setDmsInput({
                      showDMS: false,
                      latDegrees: '',
                      latMinutes: '',
                      latSeconds: '',
                      latDirection: 'N',
                      lngDegrees: '',
                      lngMinutes: '',
                      lngSeconds: '',
                      lngDirection: 'E'
                    });
                    setClickPosition(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ❌ Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Carte Interactive */}
      <div style={{ marginTop: '30px' }}>
        <h3 style={{ color: '#2E7D32', marginBottom: '15px' }}>
          🗺️ Carte Interactive des Points d'Eau
        </h3>
        <div style={{ height: '500px', borderRadius: '10px', overflow: 'hidden' }}>
          <MapContainer
            center={[34.5, 9.5]}
            zoom={6}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapClickHandler />
            {waterPoints.map((point, index) => (
              <Marker
                key={point._id || index}
                position={[parseFloat(point.latitude), parseFloat(point.longitude)]}
              >
                <Popup>
                  <div style={{ padding: '10px', minWidth: '200px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#2E7D32' }}>
                      💧 {point.owner}
                    </h4>
                    
                    <div style={{ marginBottom: '10px' }}>
                      <strong>📍 Position:</strong><br/>
                      {convertToDMS(parseFloat(point.latitude), true)}<br/>
                      {convertToDMS(parseFloat(point.longitude), false)}
                    </div>
                    
                    <div style={{ marginBottom: '10px' }}>
                      <strong>🏞️ Surface:</strong> {point.surfaceArea} ha
                    </div>
                    
                    <div style={{ 
                      backgroundColor: '#e3f2fd', 
                      padding: '8px', 
                      borderRadius: '5px',
                      marginBottom: '8px'
                    }}>
                      <strong>🧪 Analyse Eau:</strong><br/>
                      Débit: {point.flowRate} L/min<br/>
                      Salinité: {point.waterSalinity} g/L<br/>
                      <span style={{ 
                        color: evaluateWaterQuality(point).color,
                        fontWeight: 'bold'
                      }}>
                        Qualité: {evaluateWaterQuality(point).level}
                      </span>
                    </div>
                    
                    <div style={{ 
                      backgroundColor: '#fff3e0', 
                      padding: '8px', 
                      borderRadius: '5px',
                      marginBottom: '10px'
                    }}>
                      <strong>🌱 Analyse Sol:</strong><br/>
                      Calcaire actif: {point.activeLimestone}% | M.O.: {point.organicMatter}%<br/>
                      Salinité sol: {point.soilSalinity} dS/m | pH: {point.soilPh}<br/>
                      <span style={{ 
                        color: evaluateSoilFertility(point).color,
                        fontWeight: 'bold'
                      }}>
                        Fertilité: {evaluateSoilFertility(point).level}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        onClick={() => generatePDF(point)}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          flex: 1
                        }}
                      >
                        📄 PDF
                      </button>
                      <button
                        onClick={() => handleDelete(point._id)}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          flex: 1
                        }}
                      >
                        🗑️ Suppr
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        <div style={{
          marginTop: '10px',
          padding: '10px',
          backgroundColor: '#f8f9fa',
          borderRadius: '5px',
          fontSize: '12px',
          color: '#666'
        }}>
          💡 <strong>Astuce:</strong> Cliquez sur la carte pour ajouter un nouveau point d'eau à cette position
        </div>
      </div>

      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#d4edda',
        border: '1px solid #c3e6cb',
        borderRadius: '5px',
        fontSize: '14px'
      }}>
        <strong>ℹ️ Version Complète:</strong> Cette version combine les formulaires d'analyse complète avec 
        une carte interactive. Fonctionnalités disponibles : formulaires détaillés (eau/sol), 
        carte interactive, popups avec détails complets, génération PDF, suppression de points.
      </div>
    </div>
  );
};

export default WaterPointsMap;