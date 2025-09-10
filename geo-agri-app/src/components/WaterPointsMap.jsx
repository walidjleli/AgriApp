import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, LayersControl } from 'react-leaflet';
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
  // Points stockés (démonstration ou backend si dispo)
  const [waterPoints, setWaterPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [clickPosition, setClickPosition] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const mapRef = useRef(null);
  const osmLayerRef = useRef(null);
  const satLayerRef = useRef(null);
  const [newPoint, setNewPoint] = useState({
    latitude: '',
    longitude: '',
    owner: '',
    surfaceArea: '',
    // Analyse eau
    flowRate: '',
    waterSalinity: '',
    // Analyse sol
    activeLimestone: '',
    organicMatter: '',
    soilSalinity: '',
    soilPh: ''
  });
  // Etat DMS synchronisé
  const [dms, setDms] = useState({
    latDeg: '', latMin: '', latSec: '', latDir: 'N',
    lngDeg: '', lngMin: '', lngSec: '', lngDir: 'E'
  });

  // Points de démonstration supprimés - utilise uniquement la base de données

  // Gestion du clic sur la carte pour remplir les coordonnées si le formulaire est ouvert
  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        if (showAddForm) {
          const { lat, lng } = e.latlng;
            setClickPosition({ lat, lng });
            setNewPoint(prev => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
        }
      }
    });
    return null;
  };

  // Conversion décimal -> DMS (gardé pour affichage lisible)
  const convertToDMS = (decimal, isLatitude) => {
    const absolute = Math.abs(parseFloat(decimal));
    if (isNaN(absolute)) return '';
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = ((minutesFloat - minutes) * 60).toFixed(2);
    const direction = isLatitude ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W');
    return `${degrees}°${minutes}'${seconds}"${direction}`;
  };

  // Helpers conversion décimal <-> DMS
  const decimalToDMSParts = (value, isLat) => {
    if (value === '' || value === null || isNaN(parseFloat(value))) return { deg: '', min: '', sec: '', dir: isLat ? 'N' : 'E' };
    const dec = parseFloat(value);
    const dir = isLat ? (dec >= 0 ? 'N' : 'S') : (dec >= 0 ? 'E' : 'W');
    const abs = Math.abs(dec);
    const deg = Math.floor(abs);
    const minutesFloat = (abs - deg) * 60;
    const min = Math.floor(minutesFloat);
    const sec = ((minutesFloat - min) * 60).toFixed(2);
    return { deg: String(deg), min: String(min), sec: String(sec), dir };
  };
  const dmsPartsToDecimal = (deg, min, sec, dir, isLat) => {
    let d = parseInt(deg || '0', 10);
    let m = parseInt(min || '0', 10);
    let s = parseFloat(sec || '0');
    if (isNaN(d) || isNaN(m) || isNaN(s)) return '';
    // clamp
    if (isLat) { d = Math.min(Math.max(d, 0), 90); } else { d = Math.min(Math.max(d, 0), 180); }
    m = Math.min(Math.max(m, 0), 59);
    s = Math.min(Math.max(s, 0), 59.9999);
    let decimal = d + (m / 60) + (s / 3600);
    if ((dir === 'S' && isLat) || (dir === 'W' && !isLat)) decimal = -decimal;
    return decimal.toFixed(6);
  };
  // Effets de synchronisation (décimal -> DMS)
  useEffect(() => {
    if (newPoint.latitude !== '') {
      const { deg, min, sec, dir } = decimalToDMSParts(newPoint.latitude, true);
      setDms(prev => ({ ...prev, latDeg: deg, latMin: min, latSec: sec, latDir: dir }));
    } else {
      setDms(prev => ({ ...prev, latDeg: '', latMin: '', latSec: '', latDir: 'N' }));
    }
  }, [newPoint.latitude]);
  useEffect(() => {
    if (newPoint.longitude !== '') {
      const { deg, min, sec, dir } = decimalToDMSParts(newPoint.longitude, false);
      setDms(prev => ({ ...prev, lngDeg: deg, lngMin: min, lngSec: sec, lngDir: dir }));
    } else {
      setDms(prev => ({ ...prev, lngDeg: '', lngMin: '', lngSec: '', lngDir: 'E' }));
    }
  }, [newPoint.longitude]);

  // Gestion modifications DMS -> décimal
  const handleDmsChange = (e, field) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setDms(prev => ({ ...prev, [field]: value }));
  };
  const handleDmsDirChange = (e, field) => {
    const value = e.target.value;
    setDms(prev => ({ ...prev, [field]: value }));
  };
  const applyDmsToDecimal = (isLat) => {
    setDms(prev => {
      if (isLat) {
        const dec = dmsPartsToDecimal(prev.latDeg, prev.latMin, prev.latSec, prev.latDir, true);
        if (dec !== '') setNewPoint(p => ({ ...p, latitude: dec }));
      } else {
        const dec = dmsPartsToDecimal(prev.lngDeg, prev.lngMin, prev.lngSec, prev.lngDir, false);
        if (dec !== '') setNewPoint(p => ({ ...p, longitude: dec }));
      }
      return prev;
    });
  };

  // Chargement initial (backend seulement - pas de fallback démo)
  useEffect(() => {
    fetch('http://localhost:5000/api/points')
      .then(res => { if (!res.ok) throw new Error('Backend indisponible'); return res.json(); })
      .then(data => setWaterPoints(Array.isArray(data) ? data : []))
      .catch(() => setWaterPoints([]))
      .finally(() => setLoading(false));
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPoint(prev => ({ ...prev, [name]: value }));
  };

  const filteredPoints = waterPoints.filter(p => (p.owner ?? '').toLowerCase().includes(searchTerm.toLowerCase()));

  const handleAddPoint = async (e) => {
    e.preventDefault();
    const payload = { ...newPoint };
    try {
      const res = await fetch('http://localhost:5000/api/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        setWaterPoints(prev => [...prev, saved]);
      } else {
        // fallback local si backend absent
        setWaterPoints(prev => [...prev, { ...payload, _id: 'local_' + Date.now() }]);
      }
    } catch {
      setWaterPoints(prev => [...prev, { ...payload, _id: 'local_' + Date.now() }]);
    }
    // reset
    setShowAddForm(false);
    setNewPoint({ latitude: '', longitude: '', owner: '', surfaceArea: '', flowRate: '', waterSalinity: '', activeLimestone: '', organicMatter: '', soilSalinity: '', soilPh: '' });
    setClickPosition(null);
  };

  const handleDeletePoint = async (pointId) => {
    if (!window.confirm('Supprimer ce point ?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/points/${pointId}`, { method: 'DELETE' });
      if (res.ok || pointId.startsWith('local_') || pointId.startsWith('demo')) {
        setWaterPoints(p => p.filter(pt => pt._id !== pointId));
      }
    } catch {
      setWaterPoints(p => p.filter(pt => pt._id !== pointId));
    }
  };

  // Utilitaire: conversion image URL -> dataURL (fallback static map)
  const urlToDataURL = (url) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(c.toDataURL('image/png'));
      } catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = url + (url.includes('?') ? '&' : '?') + 'cacheBust=' + Date.now();
  });

  const getStaticMapFallback = async (lat, lng) => {
    const zoom = 15;
    const size = '600x400';
    const staticURL = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${size}&markers=${lat},${lng},lightblue1`;
    try { return await urlToDataURL(staticURL); } catch { return null; }
  };

  const captureMapFocused = async (lat, lng) => {
    const map = mapRef.current;
    if (!map) return null;
    try {
      const prevCenter = map.getCenter();
      const prevZoom = map.getZoom();
      // Basculer sur satellite si dispo
      let switchedBase = false;
      if (satLayerRef.current) {
        const hasSat = map.hasLayer(satLayerRef.current);
        if (!hasSat) {
          // retirer OSM si présent
            if (osmLayerRef.current && map.hasLayer(osmLayerRef.current)) map.removeLayer(osmLayerRef.current);
          map.addLayer(satLayerRef.current);
          switchedBase = true;
          // attendre premier chargement tuiles sat
          await new Promise(r => setTimeout(r, 400));
        }
      }
      map.closePopup();
      const targetZoom = 15;
      const highlight = L.circle([lat, lng], { radius: 70, color: '#ff5722', weight: 2, fill: false });
      highlight.addTo(map);
      map.setView([lat, lng], targetZoom, { animate: false });
      await new Promise(r => map.once('moveend', r));
      const mapContainer = map.getContainer();
      // attendre tuiles satellite
      const tiles = Array.from(mapContainer.querySelectorAll('img.leaflet-tile'));
      if (tiles.length) {
        await new Promise(resolve => {
          let remaining = tiles.length;
          const done = () => { if (--remaining === 0) resolve(); };
          tiles.forEach(img => {
            if (img.complete && img.naturalWidth > 0) done(); else {
              img.addEventListener('load', done, { once: true });
              img.addEventListener('error', done, { once: true });
            }
          });
          setTimeout(resolve, 2000);
        });
      } else {
        await new Promise(r => setTimeout(r, 500));
      }
      await new Promise(r => setTimeout(r, 120));
      const canvas = await html2canvas(mapContainer, { useCORS: true, logging: false, scale: 2, backgroundColor: '#ffffff' });
      const data = canvas.toDataURL('image/jpeg', 0.92);
      map.setView(prevCenter, prevZoom, { animate: false });
      highlight.remove();
      // Restaurer couche précédente si on a forcé
      if (switchedBase && osmLayerRef.current) {
        map.addLayer(osmLayerRef.current);
        if (satLayerRef.current && map.hasLayer(satLayerRef.current)) map.removeLayer(satLayerRef.current);
      }
      return data;
    } catch (e) {
      return null;
    }
  };

  // Fallback mosaïque tuiles (construction manuelle sans html2canvas)
  const buildTileMosaic = async (lat, lng, zoom = 15, radius = 1) => {
    try {
      const tileSize = 256;
      const lon2tile = (lon, z) => Math.floor((lon + 180) / 360 * Math.pow(2, z));
      const lat2tile = (la, z) => Math.floor((1 - Math.log(Math.tan(la * Math.PI / 180) + 1 / Math.cos(la * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
      const centerX = lon2tile(lng, zoom);
      const centerY = lat2tile(lat, zoom);
      const tiles = [];
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const x = centerX + dx;
          const y = centerY + dy;
          const url = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
          tiles.push({ dx, dy, url });
        }
      }
      // Fetch en parallèle
      const fetched = await Promise.all(tiles.map(async t => {
        try {
          const resp = await fetch(t.url, { mode: 'cors' });
          const blob = await resp.blob();
          const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(blob); });
          return { ...t, img };
        } catch { return null; }
      }));
      if (!fetched.filter(f => f).length) return null;
      const side = radius * 2 + 1;
      const canvas = document.createElement('canvas');
      canvas.width = side * tileSize; canvas.height = side * tileSize;
      const ctx = canvas.getContext('2d');
      fetched.forEach(f => { if (f && f.img) ctx.drawImage(f.img, (f.dx + radius) * tileSize, (f.dy + radius) * tileSize); });
      // Marqueur centre
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 10, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255,87,34,0.9)';
      ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  };

  // Mosaïque satellite (ArcGIS World Imagery) pour PDF fiable
  const buildSatelliteMosaic = async (lat, lng, zoom = 15, radius = 1) => {
    try {
      const tileSize = 256;
      const lon2tile = (lon, z) => Math.floor((lon + 180) / 360 * Math.pow(2, z));
      const lat2tile = (la, z) => Math.floor((1 - Math.log(Math.tan(la * Math.PI / 180) + 1 / Math.cos(la * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
      const centerX = lon2tile(lng, zoom);
      const centerY = lat2tile(lat, zoom);
      const tiles = [];
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const x = centerX + dx;
            const y = centerY + dy;
            // ArcGIS: z / y / x
            const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;
            tiles.push({ dx, dy, url });
        }
      }
      const fetched = await Promise.all(tiles.map(async t => {
        try {
          const resp = await fetch(t.url, { mode: 'cors' });
          const blob = await resp.blob();
          const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(blob); });
          return { ...t, img };
        } catch { return null; }
      }));
      if (!fetched.filter(f => f).length) return null;
      const side = radius * 2 + 1;
      const canvas = document.createElement('canvas');
      canvas.width = side * tileSize; canvas.height = side * tileSize;
      const ctx = canvas.getContext('2d');
      fetched.forEach(f => { if (f && f.img) ctx.drawImage(f.img, (f.dx + radius) * tileSize, (f.dy + radius) * tileSize); });
      // Point central (marqueur)
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 10, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255,87,34,0.9)';
      ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.stroke();
      return canvas.toDataURL('image/png');
    } catch { return null; }
  };

  // Génération PDF simple pour un point + snapshot carte (zoom centré sans popup)
  const generatePDF = async (point) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Rapport Point d'Eau", 15, 20);
    doc.setFontSize(12);
    let y = 35;
    const addLine = (txt) => { doc.text(txt, 15, y); y += 7; };
    addLine(`Propriétaire: ${point.owner || 'N/A'}`);
    addLine(`Surface: ${point.surfaceArea || 'N/A'} ha`);
    addLine(`Latitude: ${point.latitude || 'N/A'} (${convertToDMS(point.latitude, true)})`);
    addLine(`Longitude: ${point.longitude || 'N/A'} (${convertToDMS(point.longitude, false)})`);
    y += 5;
    doc.setFontSize(13); doc.text("Analyse de l'Eau", 15, y); y += 8; doc.setFontSize(12);
    addLine(`Débit (L/min): ${point.flowRate || 'N/A'}`);
    addLine(`Salinité (g/L): ${point.waterSalinity || 'N/A'}`);
    y += 5;
    doc.setFontSize(13); doc.text('Analyse du Sol', 15, y); y += 8; doc.setFontSize(12);
    addLine(`Calcaire actif (%): ${point.activeLimestone || 'N/A'}`);
    addLine(`Matière organique (%): ${point.organicMatter || 'N/A'}`);
    addLine(`Salinité sol (dS/m): ${point.soilSalinity || 'N/A'}`);
    addLine(`pH sol: ${point.soilPh || 'N/A'}`);

    const lat = parseFloat(point.latitude); const lng = parseFloat(point.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      // 1. Mosaïque satellite (priorité pour garantir satellite)
      let imgData = await buildSatelliteMosaic(lat, lng, 15, 1);
      // 2. Capture dynamique (peut déjà être satellite si couche active)
      if (!imgData) imgData = await captureMapFocused(lat, lng);
      // 3. Mosaïque OSM
      if (!imgData) imgData = await buildTileMosaic(lat, lng, 15, 1);
      // 4. Static OSM fallback
      if (!imgData) imgData = await getStaticMapFallback(lat, lng);
      if (imgData) {
        if (y > 180) { doc.addPage(); y = 20; }
        doc.setFontSize(13); doc.text('Vue Carte (point) - Satellite', 15, y); y += 5;
        const pageWidth = doc.internal.pageSize.getWidth();
        const maxImgWidth = pageWidth - 30;
        const imgWidth = maxImgWidth;
        const tmpImg = new Image();
        tmpImg.src = imgData;
        await new Promise(r => { tmpImg.onload = r; tmpImg.onerror = r; });
        const imgHeight = (tmpImg.naturalHeight / tmpImg.naturalWidth) * imgWidth;
        doc.addImage(imgData, 'PNG', 15, y, imgWidth, imgHeight);
        y += imgHeight + 5;
      } else {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(10); doc.text('Carte non disponible (CORS / réseau)', 15, y); y += 6;
      }
    }

    doc.setFontSize(10);
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(`Généré le ${new Date().toLocaleString('fr-FR')}` , 15, y + 5);
    doc.save(`point_eau_${(point.owner||'inconnu').replace(/\s+/g,'_')}.pdf`);
  };

  if (loading) {
    return (
      <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'400px',background:'#f8f9fa',borderRadius:'10px'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'48px',marginBottom:'20px'}}>🗺️</div>
          <h3>Chargement...</h3>
        </div>
      </div>
    );
  }

  return (
    <div style={{background:'white',borderRadius:'10px',padding:'20px',boxShadow:'0 2px 10px rgba(0,0,0,0.1)'}}>
      <h2 style={{color:'#2E7D32',marginBottom:'20px',display:'flex',alignItems:'center',gap:'10px'}}>🗺️ Points d'Eau (Vue Simplifiée)</h2>

      {/* Contrôles */}
      <div style={{marginBottom:'15px',display:'flex',flexWrap:'wrap',gap:'10px',alignItems:'center'}}>
        <button onClick={() => setShowAddForm(true)} style={{padding:'10px 20px',background:'#28a745',color:'#fff',border:'none',borderRadius:'5px',cursor:'pointer',fontSize:'14px'}}>➕ Ajouter Point</button>
        <div style={{padding:'6px 14px',background:'#e3f2fd',borderRadius:'20px',fontSize:'13px',color:'#1976d2'}}>💧 {filteredPoints.length}/{waterPoints.length} point(s)</div>
        <input
          type="text"
          placeholder="Rechercher propriétaire..."
          value={searchTerm}
          onChange={(e)=>setSearchTerm(e.target.value)}
          style={{flex:'1 1 220px',minWidth:'220px',padding:'8px 10px',border:'1px solid #ccc',borderRadius:'5px',fontSize:'13px'}}
        />
      </div>

      {/* Liste très simple */}
      {waterPoints.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'15px',marginBottom:'25px'}}>
          {filteredPoints.map((p,i) => (
            <div key={p._id || i} style={{border:'1px solid #ddd',borderRadius:'8px',padding:'12px',background:'#fafafa'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                <strong style={{color:'#2E7D32'}}>Point #{i+1}</strong>
                <button onClick={() => handleDeletePoint(p._id)} style={{background:'#dc3545',color:'#fff',border:'none',borderRadius:'3px',padding:'4px 8px',cursor:'pointer',fontSize:'11px'}}>✖</button>
              </div>
              <p style={{margin:'4px 0',fontSize:'13px'}}><strong>👤</strong> {p.owner}</p>
              <p style={{margin:'4px 0',fontSize:'13px'}}><strong>🏞️</strong> {p.surfaceArea} ha</p>
              <p style={{margin:'4px 0',fontSize:'11px',color:'#555'}}><strong>📍</strong><br/>Lat: {convertToDMS(p.latitude,true)}<br/>Lng: {convertToDMS(p.longitude,false)}</p>
            </div>
          ))}
          {filteredPoints.length === 0 && (
            <div style={{gridColumn:'1 / -1',textAlign:'center',padding:'30px',color:'#888',border:'1px dashed #ccc',borderRadius:'8px'}}>
              Aucun propriétaire ne correspond à "{searchTerm}".
            </div>
          )}
        </div>
      )}

      {waterPoints.length === 0 && (
        <div style={{textAlign:'center',padding:'40px',color:'#666'}}>
          <div style={{fontSize:'40px',marginBottom:'10px'}}>📭</div>
          <p>Aucun point pour le moment.</p>
        </div>
      )}

      {/* Formulaire simplifié */}
      {showAddForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',justifyContent:'center',alignItems:'center',zIndex:1000,padding:'20px'}}>
          <div style={{background:'#fff',padding:'20px',borderRadius:'10px',width:'420px',maxHeight:'90vh',overflow:'auto'}}>
            <h3 style={{marginTop:0,color:'#2E7D32'}}>➕ Nouveau Point</h3>

            {clickPosition && (
              <div style={{background:'#e8f5e8',padding:'8px',borderRadius:'5px',marginBottom:'12px',fontSize:'12px'}}>
                <strong>📍 Position sélectionnée:</strong><br/>
                Lat: {parseFloat(newPoint.latitude).toFixed(6)}<br/>
                Lng: {parseFloat(newPoint.longitude).toFixed(6)}
              </div>
            )}

            <form onSubmit={handleAddPoint}>
              <div style={{marginBottom:'10px'}}>
                <label style={{display:'block',marginBottom:'4px',fontSize:'13px'}}>👤 Propriétaire</label>
                <input type="text" name="owner" value={newPoint.owner} onChange={handleInputChange} required style={{width:'100%',padding:'8px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'13px'}} />
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'10px'}}>
                {/* Champs décimaux */}
                <div>
                  <label style={{display:'block',marginBottom:'4px',fontSize:'13px'}}>Latitude (décimal)</label>
                  <input type="number" step="0.000001" name="latitude" value={newPoint.latitude} onChange={handleInputChange} required style={{width:'100%',padding:'8px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'13px'}} />
                </div>
                <div>
                  <label style={{display:'block',marginBottom:'4px',fontSize:'13px'}}>Longitude (décimal)</label>
                  <input type="number" step="0.000001" name="longitude" value={newPoint.longitude} onChange={handleInputChange} required style={{width:'100%',padding:'8px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'13px'}} />
                </div>
              </div>
              {/* Saisie DMS synchronisée */}
              <fieldset style={{border:'1px solid #ccc',padding:'10px',borderRadius:'6px',marginBottom:'12px'}}>
                <legend style={{fontSize:'11px',color:'#555'}}>Coordonnées en DMS</legend>
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:'4px',alignItems:'center'}}>
                    <span style={{gridColumn:'span 8',fontSize:'11px',fontWeight:'600',color:'#2E7D32'}}>Latitude</span>
                    <input placeholder="Deg" value={dms.latDeg} onChange={(e)=>handleDmsChange(e,'latDeg')} onBlur={()=>applyDmsToDecimal(true)} style={{gridColumn:'span 2',padding:'4px',fontSize:'11px'}} />
                    <input placeholder="Min" value={dms.latMin} onChange={(e)=>handleDmsChange(e,'latMin')} onBlur={()=>applyDmsToDecimal(true)} style={{gridColumn:'span 2',padding:'4px',fontSize:'11px'}} />
                    <input placeholder="Sec" value={dms.latSec} onChange={(e)=>handleDmsChange(e,'latSec')} onBlur={()=>applyDmsToDecimal(true)} style={{gridColumn:'span 3',padding:'4px',fontSize:'11px'}} />
                    <select value={dms.latDir} onChange={(e)=>{handleDmsDirChange(e,'latDir'); applyDmsToDecimal(true);}} style={{gridColumn:'span 1',padding:'4px',fontSize:'11px'}}>
                      <option>N</option><option>S</option>
                    </select>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:'4px',alignItems:'center'}}>
                    <span style={{gridColumn:'span 8',fontSize:'11px',fontWeight:'600',color:'#2E7D32'}}>Longitude</span>
                    <input placeholder="Deg" value={dms.lngDeg} onChange={(e)=>handleDmsChange(e,'lngDeg')} onBlur={()=>applyDmsToDecimal(false)} style={{gridColumn:'span 2',padding:'4px',fontSize:'11px'}} />
                    <input placeholder="Min" value={dms.lngMin} onChange={(e)=>handleDmsChange(e,'lngMin')} onBlur={()=>applyDmsToDecimal(false)} style={{gridColumn:'span 2',padding:'4px',fontSize:'11px'}} />
                    <input placeholder="Sec" value={dms.lngSec} onChange={(e)=>handleDmsChange(e,'lngSec')} onBlur={()=>applyDmsToDecimal(false)} style={{gridColumn:'span 3',padding:'4px',fontSize:'11px'}} />
                    <select value={dms.lngDir} onChange={(e)=>{handleDmsDirChange(e,'lngDir'); applyDmsToDecimal(false);}} style={{gridColumn:'span 1',padding:'4px',fontSize:'11px'}}>
                      <option>E</option><option>W</option>
                    </select>
                  </div>
                  <div style={{fontSize:'10px',color:'#777'}}>La modification des valeurs DMS met automatiquement à jour les champs décimaux.</div>
                </div>
              </fieldset>
              <div style={{marginBottom:'12px'}}>
                <label style={{display:'block',marginBottom:'4px',fontSize:'13px'}}>Surface (hectares)</label>
                <input type="number" step="0.1" name="surfaceArea" value={newPoint.surfaceArea} onChange={handleInputChange} required style={{width:'100%',padding:'8px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'13px'}} />
              </div>
              {/* Analyse de l'eau */}
              <fieldset style={{border:'1px solid #1976d2',padding:'10px',borderRadius:'6px',marginBottom:'12px'}}>
                <legend style={{fontSize:'12px',color:'#1976d2',padding:'0 6px'}}>Analyse de l'Eau</legend>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <div>
                    <label style={{display:'block',marginBottom:'4px',fontSize:'12px'}}>Débit (L/min)</label>
                    <input type="number" step="0.1" name="flowRate" value={newPoint.flowRate} onChange={handleInputChange} style={{width:'100%',padding:'6px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'12px'}} />
                  </div>
                  <div>
                    <label style={{display:'block',marginBottom:'4px',fontSize:'12px'}}>Salinité (g/L)</label>
                    <input type="number" step="0.1" name="waterSalinity" value={newPoint.waterSalinity} onChange={handleInputChange} style={{width:'100%',padding:'6px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'12px'}} />
                  </div>
                </div>
              </fieldset>
              {/* Analyse du sol */}
              <fieldset style={{border:'1px solid #e65100',padding:'10px',borderRadius:'6px',marginBottom:'12px'}}>
                <legend style={{fontSize:'12px',color:'#e65100',padding:'0 6px'}}>Analyse du Sol</legend>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <div>
                    <label style={{display:'block',marginBottom:'4px',fontSize:'12px'}}>Calcaire actif (%)</label>
                    <input type="number" step="0.1" name="activeLimestone" value={newPoint.activeLimestone} onChange={handleInputChange} style={{width:'100%',padding:'6px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'12px'}} />
                  </div>
                  <div>
                    <label style={{display:'block',marginBottom:'4px',fontSize:'12px'}}>Matière org. (%)</label>
                    <input type="number" step="0.1" name="organicMatter" value={newPoint.organicMatter} onChange={handleInputChange} style={{width:'100%',padding:'6px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'12px'}} />
                  </div>
                  <div>
                    <label style={{display:'block',marginBottom:'4px',fontSize:'12px'}}>Salinité sol (dS/m)</label>
                    <input type="number" step="0.1" name="soilSalinity" value={newPoint.soilSalinity} onChange={handleInputChange} style={{width:'100%',padding:'6px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'12px'}} />
                  </div>
                  <div>
                    <label style={{display:'block',marginBottom:'4px',fontSize:'12px'}}>pH sol</label>
                    <input type="number" step="0.1" name="soilPh" value={newPoint.soilPh} onChange={handleInputChange} style={{width:'100%',padding:'6px',border:'1px solid #ddd',borderRadius:'4px',fontSize:'12px'}} />
                  </div>
                </div>
              </fieldset>

              {newPoint.latitude && newPoint.longitude && (
                <div style={{background:'#f8f9fa',border:'1px solid #dee2e6',padding:'8px',borderRadius:'4px',fontSize:'11px',marginBottom:'12px'}}>
                  <strong>📐 Format DMS:</strong><br/>
                  <span style={{color:'#28a745'}}>Lat: {convertToDMS(newPoint.latitude,true)}<br/>Lng: {convertToDMS(newPoint.longitude,false)}</span>
                </div>
              )}

              <div style={{display:'flex',gap:'10px'}}>
                <button type="submit" style={{flex:1,padding:'10px',background:'#28a745',color:'#fff',border:'none',borderRadius:'5px',cursor:'pointer',fontSize:'14px'}}>✅ Ajouter</button>
                <button type="button" onClick={() => { setShowAddForm(false); setNewPoint({latitude:'',longitude:'',owner:'',surfaceArea:'',flowRate:'',waterSalinity:'',activeLimestone:'',organicMatter:'',soilSalinity:'',soilPh:''}); setClickPosition(null); }} style={{flex:1,padding:'10px',background:'#6c757d',color:'#fff',border:'none',borderRadius:'5px',cursor:'pointer',fontSize:'14px'}}>❌ Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Carte uniquement */}
      <div style={{ marginTop: '10px' }}>
        <h3 style={{ color: '#2E7D32', marginBottom: '10px' }}>Carte Interactive</h3>
        <div style={{ height: '450px', borderRadius: '10px', overflow: 'hidden' }}>
          <MapContainer center={[34.5, 9.5]} zoom={6} style={{ height: '100%', width: '100%' }} whenCreated={(map)=>{ mapRef.current = map; }}>
            {/* Contrôle des couches pour basculer entre carte standard et satellite */}
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Carte">
                <TileLayer
                  ref={osmLayerRef}
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  crossOrigin="anonymous"
                  attribution='&copy; OpenStreetMap contributors'
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Satellite">
                <TileLayer
                  ref={satLayerRef}
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  crossOrigin="anonymous"
                  attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                />
              </LayersControl.BaseLayer>
            </LayersControl>
            <MapClickHandler />
            {filteredPoints.map((p,i) => (
              <Marker key={p._id || i} position={[parseFloat(p.latitude), parseFloat(p.longitude)]}>
                <Popup>
                  <div style={{fontSize:'12px'}}>
                    <strong style={{color:'#2E7D32'}}>💧 {p.owner}</strong><br/>
                    Surface: {p.surfaceArea} ha<br/>
                    {convertToDMS(p.latitude,true)}<br/>
                    {convertToDMS(p.longitude,false)}<br/>
                    <div style={{display:'flex',gap:'6px',marginTop:'6px'}}>
                      <button onClick={() => generatePDF(p)} style={{padding:'4px 8px',background:'#007bff',color:'#fff',border:'none',borderRadius:'3px',cursor:'pointer',fontSize:'11px'}}>PDF</button>
                      <button onClick={() => handleDeletePoint(p._id)} style={{padding:'4px 8px',background:'#dc3545',color:'#fff',border:'none',borderRadius:'3px',cursor:'pointer',fontSize:'11px'}}>Supprimer</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
        <div style={{marginTop:'8px',padding:'8px',background:'#f8f9fa',borderRadius:'5px',fontSize:'12px',color:'#666'}}>💡 Astuce: Cliquez sur la carte après avoir ouvert le formulaire pour remplir les coordonnées automatiquement.</div>
      </div>
    </div>
  );
};

export default WaterPointsMap;