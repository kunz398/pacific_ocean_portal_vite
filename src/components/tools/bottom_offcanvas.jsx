
import React, { useState, useRef, useEffect } from 'react';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { hideoffCanvas, setSelectedTab } from '../../GlobalRedux/Features/offcanvas/offcanvasSlice.jsx';
import { useAppDispatch, useAppSelector } from '../../GlobalRedux/hooks';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import { Button } from 'react-bootstrap';
import 'chart.js/auto';
import Timeseries from './timeseries'; 
import Tabular from './tablular'; 
import DynamicImage from './getMap';
import Download from './download';
import TimeseriesWfs from './timeseries_wfs';
import TimeseriesSofar from './timeseries_sofar';
import TideImageComponent from './tide_image';
import Histogram from './histogram';
import ShareWorkbench from './shareWorkbench';
import { FaShare } from 'react-icons/fa';
import GetMapIcon from '../icons/GetMapIcon';

// Custom tab styles
const customTabStyles = `
  .custom-bottom-tabs .nav-link.active {
    color: rgb(0, 123, 255) !important;
    background-color: transparent !important;
    border-color: transparent transparent rgb(0, 123, 255) transparent !important;
    border-bottom: 2px solid rgb(0, 123, 255) !important;
  }
  .custom-bottom-tabs .nav-link.active:hover,
  .custom-bottom-tabs .nav-link.active:focus {
    color: rgb(0, 123, 255) !important;
    border-bottom: 2px solid rgb(0, 123, 255) !important;
  }
  .custom-bottom-tabs .nav-tabs .nav-link {
    border: none !important;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05) !important;
  }
  .custom-bottom-tabs.nav-tabs {
    border-bottom: 1px solid rgba(0, 0, 0, 0.05) !important;
  }
  body.dark-mode .custom-bottom-tabs .nav-link.active {
    color: rgb(0, 123, 255) !important;
    background-color: transparent !important;
    border-color: transparent transparent rgb(0, 123, 255) transparent !important;
    border-bottom: 2px solid rgb(0, 123, 255) !important;
  }
  body.dark-mode .custom-bottom-tabs .nav-link.active:hover,
  body.dark-mode .custom-bottom-tabs .nav-link.active:focus {
    color: rgb(0, 123, 255) !important;
    border-bottom: 2px solid rgb(0, 123, 255) !important;
  }
  body.dark-mode .custom-bottom-tabs .nav-tabs .nav-link {
    border: none !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
  }
  body.dark-mode .custom-bottom-tabs.nav-tabs {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
  }
  
  /* Remove square borders from close button - more aggressive */
  #close-offcanvas-btn,
  #close-offcanvas-btn:hover,
  #close-offcanvas-btn:focus,
  #close-offcanvas-btn:active,
  #close-offcanvas-btn.active,
  #close-offcanvas-btn:focus-visible,
  #close-offcanvas-btn.btn-link:focus {
    box-shadow: none !important;
    border: none !important;
    outline: none !important;
    text-decoration: none !important;
    background: transparent !important;
    color: rgb(0, 123, 255) !important;
  }
`;

function BottomOffCanvas({ isVisible, id }) {
  const currentId = useAppSelector((state) => state.offcanvas.currentId);
  const mapLayer = useAppSelector((state) => state.mapbox.layers);
  const [layerType, setLayerType] = useState('');
  const [layerInfo, setLayerInfo] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const globalSelectedTab = useAppSelector((state) => state.offcanvas.selectedTabKey);
  
  useEffect(() => {
    if (currentId === id) {
      const selectedLayer = mapLayer.find(layer => 
        layer.id === currentId ||  
        (layer.layer_information && layer.layer_information.id === currentId)
      );
      
      if (selectedLayer && selectedLayer.layer_information) {
        let layer_type = selectedLayer.layer_information.layer_type;
        layer_type = layer_type.replace("_FORECAST", "");
        layer_type = layer_type.replace("_UGRID", "");
        layer_type = layer_type.replace("_HINDCAST", "");
        setLayerType(layer_type);
        setLayerInfo(selectedLayer.layer_information);
      }
    }
  }, [mapLayer, currentId, id]);

  const data = {
    labels: ['January', 'February', 'March', 'April', 'May'],
    datasets: [
      {
        label: 'Dataset',
        data: [65, 59, 80, 81, 56],
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  const dispatch = useAppDispatch();
  const [height, setHeight] = useState(470);
  const [selectedTab, setSelectedTabLocal] = useState(globalSelectedTab || 'tab4');

  // Keep local state in sync with global state (restored from share)
  useEffect(() => {
    if (globalSelectedTab && globalSelectedTab !== selectedTab) {
      setSelectedTabLocal(globalSelectedTab);
    }
  }, [globalSelectedTab]);

  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  const handleClose = () => {
    dispatch(hideoffCanvas());
  };

  const handleShowShareModal = () => {
    setShowShareModal(true);
  };

  const handleHideShareModal = () => {
    setShowShareModal(false);
  };

  const handleMouseMove = (e) => {
    if (draggingRef.current) {
      const deltaY = e.clientY - startYRef.current;
      const newHeight = startHeightRef.current - deltaY;
      if (newHeight > 100) {
        setHeight(newHeight);
      }
    }
  };

  const handleMouseUp = () => {
    draggingRef.current = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDown = (e) => {
    draggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTabSelect = (k) => {
    setSelectedTabLocal(k);
    dispatch(setSelectedTab(k));
  };

  // Compute available WMS tab keys based on layerInfo flags
  const getAvailableWMSTabKeys = () => {
    const keys = [];
    if (layerInfo?.enable_get_map) keys.push('tab4'); // Get Map
    if (layerInfo?.enable_chart_timeseries) {
      keys.push('tab2'); // Timeseries
      keys.push('tab5'); // Histogram
    }
    if (layerInfo?.enable_chart_table) keys.push('tab1'); // Tabular
    keys.push('tab3'); // Download always available
    return keys;
  };

  // Ensure selected tab exists among available WMS tabs when layer/flags change
  useEffect(() => {
    if (layerType === 'WMS') {
      const available = getAvailableWMSTabKeys();
      if (available.length > 0 && !available.includes(selectedTab)) {
        setSelectedTabLocal(available[0]);
        dispatch(setSelectedTab(available[0]));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerType, layerInfo]);

  const renderTabsBasedOnLayerType = () => {
    switch (layerType) {
      case 'WMS': {
        const tabs = [];
        if (layerInfo?.enable_get_map) {
          tabs.push(
            <Tab eventKey="tab4" title="Get Map" key="tab4">
              <DynamicImage height={height - 100} />
            </Tab>
          );
        }
        if (layerInfo?.enable_chart_timeseries) {
          tabs.push(
            <Tab eventKey="tab2" title="Timeseries" key="tab2">
              <Timeseries height={height - 100} data={data} />
            </Tab>
          );
          tabs.push(
            <Tab eventKey="tab5" title="Histogram" key="tab5">
              <Histogram height={height - 100} data={data} />
            </Tab>
          );
        }
        if (layerInfo?.enable_chart_table) {
          tabs.push(
            <Tab eventKey="tab1" title="Tabular" key="tab1">
              <Tabular
                labels={['Wind Speed', 'Wave Direction', 'Wave Height']}
                dateCount={24}
              />
            </Tab>
          );
        }
        // Download tab remains visible
        tabs.push(
          <Tab eventKey="tab3" title="Download" key="tab3">
            <Download/>
          </Tab>
        );

        return (
          <Tabs activeKey={selectedTab} onSelect={handleTabSelect} id="offcanvas-tabs" className="mb-3 custom-bottom-tabs">
            {tabs}
          </Tabs>
        );
      }

      case 'WFS':
        return (
          <Tabs activeKey={selectedTab} onSelect={handleTabSelect} id="offcanvas-tabs" className="mb-3 custom-bottom-tabs">
            <Tab eventKey="tab4" title="Timeseries">
              <TimeseriesWfs height={height - 100} data={data} />
            </Tab>
          </Tabs>
        );
      
      case 'SOFAR':
        return (
          <Tabs activeKey={selectedTab} onSelect={handleTabSelect} id="offcanvas-tabs" className="mb-3 custom-bottom-tabs">
            <Tab eventKey="tab4" title="Timeseries">
              <TimeseriesSofar height={height - 100} data={data} /> 
            </Tab>
          </Tabs>
        );

      case 'TIDE':
        return (
          <Tabs activeKey={selectedTab} onSelect={handleTabSelect} id="offcanvas-tabs" className="mb-3 custom-bottom-tabs">
            <Tab eventKey="tab4" title="Tide Chart">
              <TideImageComponent height={height - 100} data={data} /> 
            </Tab>
          </Tabs>
        );
      
      default:
        return null;
    }
  };

  return (
    <Offcanvas
      show={isVisible}
      onHide={handleClose}
      placement="bottom"
      className="offcanvas-bottom"
      backdrop={false}
      scroll={true}
      style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        height: `${height}px`,
      }}
    >
      <div
        style={{
          height: '8px',
          backgroundColor: '#ccc',
          cursor: 'ns-resize',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onMouseDown={handleMouseDown}
      >
        <div
          style={{
            width: '40px',
            height: '4px',
            backgroundColor: '#888',
            borderRadius: '4px',
          }}
        ></div>
      </div>

      {/* Share Button */}
      <Button
        onClick={handleShowShareModal}
        style={{
          position: 'absolute',
          bottom: '15px',
          right: '15px',
          zIndex: 10,
          width: '40px',
          height: '40px',
          background: 'var(--color-surface, #fff)',
          color: 'var(--color-text, #333)',
          border: '1px solid var(--color-border, #ddd)',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 5px rgba(0,0,0,0.2)',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'var(--color-background, #f8f9fa)';
          e.target.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'var(--color-surface, #fff)';
          e.target.style.transform = 'scale(1)';
        }}
        title="Share Workbench"
      >
        <GetMapIcon width={16} height={16} color={'#333'} />
      </Button>

      {/* Close Button */}
      <Button
        id="close-offcanvas-btn"
        variant="link"
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10,
          fontSize: '1.5rem',
          padding: '0',
          paddingRight: '10px',
          color: 'rgb(0, 123, 255)',
          border: 'none',
          boxShadow: 'none',
          outline: 'none'
        }}
      >
        <span>&times;</span>
      </Button>

      <style>{customTabStyles}</style>
      
      <Offcanvas.Body style={{ paddingTop: '3', borderRadius: 0 }}>
        {renderTabsBasedOnLayerType()}
      </Offcanvas.Body>

      {/* Share Workbench Modal */}
      <ShareWorkbench 
        show={showShareModal} 
        onHide={handleHideShareModal} 
      />
    </Offcanvas>
  );
}

export default BottomOffCanvas;
