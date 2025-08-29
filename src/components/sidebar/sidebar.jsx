import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';

const SideBar = () => {
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("1");

  // Example: Replace this with your actual region API or static
  useEffect(() => {
    // For this minimal version, just use a hardcoded example array:
    setRegions([
      { id: 1, long_name: 'Pacific Ocean' },
      { id: 2, long_name: 'Fiji' },
      { id: 3, long_name: 'Vanuatu' },
    ]);
  }, []);

  const handleRegionChange = (e) => {
    setSelectedRegion(e.target.value);
  };

  return (
    <div style={{
      padding: '12px',
      background: '#f5f6fa',
      borderRadius: '8px',
      minWidth: 200,
      maxWidth: 260,
      margin: '0 auto',
      marginTop: 20,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="region-select" style={{fontWeight: 500, fontSize: '0.95em'}}>Region</label>
        <select
          id="region-select"
          className="form-select"
          value={selectedRegion}
          onChange={handleRegionChange}
          style={{ marginTop: 6, borderRadius: 6, fontSize: '0.95em', width: '100%' }}
        >
          {regions.map(region => (
            <option key={region.id} value={region.id}>{region.long_name}</option>
          ))}
        </select>
      </div>
      <Button
        variant="primary"
        style={{ width: '100%', borderRadius: 6, fontWeight: 500 }}
        onClick={() => alert('Explore Map Data (placeholder)!')}
      >
        Explore Map Data
      </Button>
    </div>
  );
};

export default SideBar;