import React, { useState, useRef, useEffect } from 'react';
import { Col, Card } from 'react-bootstrap';
import Accordion from 'react-bootstrap/Accordion';
import { useAppSelector, useAppDispatch } from '@/GlobalRedux/hooks';
import '@/components/css/workbench.css';
import ButtonGroupComp from './buttonGroup';
import BottomOffCanvas from './bottom_offcanvas';
import ColorScale from './color_scale';
import Legend from './legend';
import Opacity from './opacity';
import DateSelector from './date_selector';
import { addMapLayer,removeAllMapLayer,removeDuplicateLayers } from '@/GlobalRedux/Features/map/mapSlice';
import { hideoffCanvas } from '@/GlobalRedux/Features/offcanvas/offcanvasSlice';
import { useAccordionButton } from 'react-bootstrap/AccordionButton';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import CheckBox from './checkbox';
import RangeSlider from './range_slider';
import { IoMdRemoveCircleOutline } from "react-icons/io";
import { get_url } from '@/components/json/urls';
import SofarTypeFilter from './sofarTypeFilter';
import { toast } from 'react-hot-toast';
import { 
  getShareIdFromUrl, 
  loadSharedWorkbench, 
  restoreWorkbenchState, 
  cleanupShareUrl,
  hasShareParameter 
} from '../functions/shareUtils';
import{FaLightbulb} from 'react-icons/fa';

const MyWorkbench = () => {
  const dispatch = useAppDispatch();

  const initialLoadDone = useRef(false);
  // CustomToggle Component (for Accordion control)
  function CustomToggle({ children, eventKey, isOpen, onToggle }) {
    const decoratedOnClick = useAccordionButton(eventKey, () => {
      onToggle(eventKey);
    });

    return (
      <div
        onClick={decoratedOnClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          marginTop: -22,
          paddingLeft: 30,
          fontSize: 14,
        }}
      >
        <span>{children}</span>
        {isOpen ? <FaChevronUp /> : <FaChevronDown />}
      </div>
    );
  }

  const isVisible = useAppSelector((state) => state.offcanvas.isVisible);
  const mapLayer = useAppSelector((state) => state.mapbox.layers);
  const currentId = useAppSelector((state) => state.offcanvas.currentId);
  const _isMounted = useRef(true);
  const [openAccordions, setOpenAccordions] = useState(new Set());
  const [lastAddedId, setLastAddedId] = useState(null);
  const [isRestoringFromShare, setIsRestoringFromShare] = useState(false);

  // Clean up any existing duplicates when component mounts
  useEffect(() => {
    dispatch(removeDuplicateLayers());
  }, [dispatch]);

  // Check if layers exist in localStorage and dispatch them to Redux store
  useEffect(() => {
    if (_isMounted.current && !initialLoadDone.current) {
      async function loadLayers() {
                 // Check if there's a share parameter in the URL
         if (hasShareParameter()) {
           // console.log('Share parameter detected in URL');
           const shareId = getShareIdFromUrl();
           // console.log('Share ID from URL:', shareId ? shareId.substring(0, 50) + '...' : 'null');
           const sharedState = loadSharedWorkbench(shareId);
           
           if (sharedState) {
             console.log('Loading shared workbench state...');
             setIsRestoringFromShare(true); // Mark that we're restoring from share
             const success = await restoreWorkbenchState(sharedState, dispatch);
             if (success) {
               // Clean up the URL after successful restoration
               cleanupShareUrl();
               // Show a success toast message
              //  toast('Shared workbench loaded successfully!', {
              //    icon: '✅',
              //    style: { background: '#f0f9ff', color: '#0369a1' },
              //    duration: 4000
              //  });
              //  console.log('Shared workbench loaded successfully!');
             } else {
              //  console.error('Failed to restore shared workbench state');
              //  toast('Failed to load shared workbench. Please try again.', {
              //    icon: '❌',
              //    style: { background: '#fef2f2', color: '#dc2626' },
              //    duration: 4000
              //  });
               setIsRestoringFromShare(false);
             }
           } else {
             console.warn('No shared workbench found, loading default state');
             // Clean up the URL if no shared state found
             cleanupShareUrl();
            //  toast('Invalid or corrupted share link. Loading default workbench.', {
            //    icon: '⚠️',
            //    style: { background: '#fffbe6', color: '#ad8b00' },
            //    duration: 4000
            //  });
             loadDefaultLayers();
           }
         } else {
           // Load default layers from localStorage
           loadDefaultLayers();
         }
        
        initialLoadDone.current = true;
      }

      async function loadDefaultLayers() {
        const savedLayers = localStorage.getItem('savedLayers');
        if (savedLayers) {
          const layers = JSON.parse(savedLayers).filter(
            (layer) => layer.layer_information.restricted === false
          );
          
          // Remove any existing layers to prevent duplicates
          dispatch(removeAllMapLayer());
          
          const updatedLayers = await Promise.all(
            layers.map(async (layer) => {
              const id = layer.layer_information.id;
              try {
                const response = await fetch(get_url('layer', id));
                if (!response.ok) throw new Error('API error');
                const updatedLayerInformation = await response.json();
                return { ...layer, layer_information: updatedLayerInformation };
              } catch {
                return layer;
              }
            })
          );
          updatedLayers.forEach((layer) => {
            layer.layer_information.enabled = false;
            dispatch(addMapLayer(layer));
          });
          // Keep all accordions closed during initial load
          setOpenAccordions(new Set());
        }
      }

      loadLayers();
    }

    return () => {
      _isMounted.current = false;
    };
  }, [dispatch]);
  
  // Open accordions for newly added layers (only after initial load)
  useEffect(() => {
    if (initialLoadDone.current && mapLayer.length > 0) {
      const lastLayer = mapLayer[mapLayer.length - 1];
  
      if (lastLayer.id !== lastAddedId) {
        setLastAddedId(lastLayer.id);
        // Open the accordion for the newly added layer
        setOpenAccordions(new Set([lastLayer.id]));
      }
    }
  }, [mapLayer, lastAddedId]);

  // Special handling for shared workbench restoration
  useEffect(() => {
    // When restoring from a shared URL open ONLY the selected layer accordion
    if (isRestoringFromShare && mapLayer.length > 0 && initialLoadDone.current) {
      // Priority:
      // 1. currentId from offcanvas (if provided)
      // 2. First enabled layer
      // 3. First layer in list (fallback)
      let targetId = null;
      if (currentId) {
        targetId = currentId;
      } else {
        const enabledLayer = mapLayer.find(l => l.layer_information.enabled);
        if (enabledLayer) {
          targetId = enabledLayer.id;
        } else {
          targetId = mapLayer[0].id;
        }
      }

      setOpenAccordions(new Set(targetId ? [targetId] : []));
      console.log('Restored from share. Expanding only layer:', targetId);
      setIsRestoringFromShare(false); // reset flag
    }
  }, [mapLayer, isRestoringFromShare, currentId, initialLoadDone.current]);
  
  const handleToggle = (eventKey) => {
    const newOpenAccordions = new Set(openAccordions);
    if (newOpenAccordions.has(eventKey)) {
      newOpenAccordions.delete(eventKey);
    } else {
      newOpenAccordions.clear(); // Optional: make it always single open
      newOpenAccordions.add(eventKey);
    }
    setOpenAccordions(newOpenAccordions);
  };

  return (
    <>
      {mapLayer.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ marginBottom: '150px' }}>
            <div className="item" style={{ color: '#9CA3AF', fontSize: '16px', fontWeight: '500' }}>
              Your workbench is empty
            </div>
          </div>
          
          <div style={{ textAlign: 'left' }}>
            <h5 className="workbench-hints-title" style={{ 
              marginBottom: '15px', 
              marginTop: 0, 
              fontSize: '14px',
              fontWeight: '600'
            }}>
              Helpful hints
            </h5>
            <ul className="list-unstyled small">
              <li className="d-flex align-items-start mb-2">
                <FaLightbulb className="me-2" style={{ color: '#cacacaff', marginTop: 4, minWidth: '16px' }} />
                <span className="workbench-hints-text">
                  Select Country of Interest, Browse datasets by selecting "Explore map data."
                </span>
              </li>
              <li className="d-flex align-items-start mb-2">
                <FaLightbulb className="me-2" style={{ color: '#cacacaff', marginTop: 4, minWidth: '16px' }} />
                <span className="workbench-hints-text">
                 Select dataset and Click on "Add to Map"
                </span>
              </li>
              <li className="d-flex align-items-start mb-2">
                <FaLightbulb className="me-2" style={{ color: '#cacacaff', marginTop: 4, minWidth: '16px' }} />
                <span className="workbench-hints-text">
                  Once you've added data to the map, your active layers will appear in the workbench, where you can create plots, view timeseries at any point, adjust opacity, and control how they get displayed on the map.
                </span>
              </li>
              <li className="d-flex align-items-start mb-0">
                <FaLightbulb className="me-2" style={{ color: '#cacacaff', marginTop: 4, minWidth: '16px' }} />
                <span className="workbench-hints-text">
                  You can Share your current map view and configuration with others by clicking the Share button.
                </span>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <Col md={12} style={{ marginTop: -13, overflowY: 'auto' }}>
          <hr style={{ marginRight: -10, marginLeft: -12 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <p style={{ fontSize: '12px', marginTop: '-10px' }}>DATA SETS ({mapLayer.length})</p>
  <button 
    className="remove-all-button"
    onClick={() => {
      dispatch(removeAllMapLayer());
      // Also clear localStorage to prevent duplicates on reload
      localStorage.removeItem('savedLayers');
      // Hide bottom offcanvas and clear currentId to avoid stale references
      dispatch(hideoffCanvas());
    }}
  >
     <IoMdRemoveCircleOutline size={14} className="icon" />
    Remove All
  </button>
</div>
          <hr style={{ marginTop: -10, marginRight: -10, marginLeft: -12 }} />
          {mapLayer.map((item, index) => {
            const isOpen = openAccordions.has(item.id);
            var layer_Type = item.layer_information.layer_type;
            layer_Type = layer_Type.replace("_FORECAST", "");
            
            if (layer_Type === 'WMS' || layer_Type === 'WMS_UGRID' || layer_Type === 'WMS_HINDCAST') {
              return (
                <Accordion key={`${item.id}-${index}`} activeKey={isOpen ? item.id : null} style={{ paddingBottom: 4, border:0 }}>
                  <Card>
                    <Card.Header>
                      <CheckBox item={item} />
                      <CustomToggle 
                        eventKey={item.id}
                        isOpen={isOpen}
                        onToggle={handleToggle}
                      >
                        {item.layer_information.layer_title}
                      </CustomToggle>
                    </Card.Header>
                    <Accordion.Collapse eventKey={item.id}>
                      <Card.Body style={{ paddingLeft: 0, paddingRight: 0 }}>
                        <ButtonGroupComp item={item} />
                        <Opacity item={item} id={item.id} />

                        {item.layer_information.is_timeseries ? (
                          <RangeSlider item={item} />
                        ) : (
                          <DateSelector
                            item={item}
                            period={'daily'}
                            startDateStr={item.layer_information.timeIntervalStart}
                            endDateStr={item.layer_information.timeIntervalEnd}
                          />
                        )}
                        <ColorScale item={item} />
                      </Card.Body>
                    </Accordion.Collapse>
                  </Card>
                </Accordion>
              );
            } else if (item.layer_information.layer_type === 'SOFAR') {
              return (
                <Accordion key={`${item.id}-${index}`} activeKey={isOpen ? item.id : null} style={{ paddingBottom: 4 }}>
                  <Card>
                
                    <Card.Header>
                      <CheckBox item={item} />
                      <CustomToggle 
                        eventKey={item.id}
                        isOpen={isOpen}
                        onToggle={handleToggle}
                      >
                        {item.layer_information.layer_title}
                      </CustomToggle>
                    </Card.Header>
                    <Accordion.Collapse eventKey={item.id}>
                      <Card.Body style={{ paddingLeft: 0, paddingRight: 0 }}>
                        <ButtonGroupComp item={item} />
                        <SofarTypeFilter item={item} />
                      </Card.Body>
                    </Accordion.Collapse>
                  </Card>
                </Accordion>
              );
            } else if (item.layer_information.layer_type === 'TIDE') {
              return (
                <Accordion key={`${item.id}-${index}`} activeKey={isOpen ? item.id : null} style={{ paddingBottom: 4 }}>
                  <Card>
                    <Card.Header>
                      <CheckBox item={item} />
                      <CustomToggle 
                        eventKey={item.id}
                        isOpen={isOpen}
                        onToggle={handleToggle}
                      >
                        {item.layer_information.layer_title}
                      </CustomToggle>
                    </Card.Header>
                    <Accordion.Collapse eventKey={item.id}>
                      <Card.Body style={{ paddingLeft: 0, paddingRight: 0 }}>
                        <ButtonGroupComp item={item} />
                      </Card.Body>
                    </Accordion.Collapse>
                  </Card>
                </Accordion>
              );
            } else {
              return (
                <Accordion key={`${item.id}-${index}`} activeKey={isOpen ? item.id : null} style={{ paddingBottom: 4 }}>
                  <Card>
                    <Card.Header>
                      <CheckBox item={item} />
                      <CustomToggle 
                        eventKey={item.id}
                        isOpen={isOpen}
                        onToggle={handleToggle}
                      >
                        {item.layer_information.layer_title}
                      </CustomToggle>
                    </Card.Header>
                    <Accordion.Collapse eventKey={item.id}>
                      <Card.Body style={{ paddingLeft: 0, paddingRight: 0 }}>
                        <ButtonGroupComp item={item} />
                        <DateSelector
                          item={item}
                          period={'daily'}
                          startDateStr={item.layer_information.timeIntervalStart}
                          endDateStr={item.layer_information.timeIntervalEnd}
                        />
                      </Card.Body>
                    </Accordion.Collapse>
                  </Card>
                </Accordion>
              );
            }
          })}
        </Col>
      )}
    </>
  );
};

export default MyWorkbench;
