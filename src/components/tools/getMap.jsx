import React, { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '@/GlobalRedux/hooks';
import { Modal, Button } from 'react-bootstrap';
import { Spinner } from 'react-bootstrap';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { get_url } from '@/components/json/urls';
import { saveAs } from 'file-saver';


function DynamicImage({ height }) {
  const isLoggedin = useAppSelector((state) => state.auth.isLoggedin); 
  const token = useAppSelector((state) => state.auth.token); 
  const currentId = useAppSelector((state) => state.offcanvas.currentId);
  const { short_name } = useAppSelector((state) => state.country);
  const mapLayer = useAppSelector((state) => state.mapbox.layers);
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timestamps, setTimestamps] = useState([]);
  const [error, setError] = useState(null);
  const [dotOffset, setDotOffset] = useState(0);
  const [enabledMap, setEnabledMap] = useState(false);

  const dateFormatAccepted = useRef(null);
  const dateToDisplay = useRef(null);
  const [loadingTime, setLoadingTime] = useState(0);
  const MAX_VISIBLE_DOTS = 25;
  const imgHeight = height || 200;
  // whether to use cached images; default true
  const [useCache, setUseCache] = useState(true);

  function generateDateArray(start_date, end_date, stepHours) {
    const dateArray = [];
    let currentDate = new Date(start_date);
    const endDate = new Date(end_date);

    const stepMilliseconds = stepHours <= 24 ? stepHours * 60 * 60 * 1000 : 24 * stepHours * 60 * 60 * 1000;

    while (currentDate <= endDate) {
      dateArray.push(currentDate.toISOString().slice(0, -5) + "Z");
      currentDate = new Date(currentDate.getTime() + stepMilliseconds);
    }

    return dateArray;
  }

  const savedRegion = localStorage.getItem('selectedRegion');

  function getLayerById(layersArray, id) {
    for (let i = 0; i < layersArray.length; i++) {
      const layer = layersArray[i];
     
      if (layer.id === id || (layer.layer_information && layer.layer_information.id === id)) {
        return layer;
      }
    }
    return undefined; // Return undefined if not found
  }
  useEffect(() => {
    if (mapLayer.length > 0) {
      // console.log("mapLayer: " + JSON.stringify(mapLayer));
      // console.log("currentId: " + JSON.stringify(currentId));
      var selected_layer = getLayerById(mapLayer, currentId);

      // console.log("selected_layer: " + JSON.stringify(selected_layer));
      // Add null check for selected_layer
      if (!selected_layer || !selected_layer.layer_information) {
        console.error(`No layer found with id: ${currentId}`);
        return;
      }
      
      const layerInformation = selected_layer.layer_information;
      const period = layerInformation.period;
      const enable_map = layerInformation.enable_get_map;
      setEnabledMap(enable_map)
      // console.log("layerInformation: "+  JSON.stringify(layerInformation) );
      if (layerInformation.is_timeseries){
        dateToDisplay.current = layerInformation.timeIntervalStart;
      }
      else if (layerInformation.layer_type == "WMS_FORECAST"){
        dateToDisplay.current = layerInformation.timeIntervalStart;
      }
      else{
        dateToDisplay.current = layerInformation.timeIntervalEnd;
        
      }

      if (layerInformation.is_timeseries){
        dateFormatAccepted.current = "timeseries";
      }
      else if (layerInformation.datetime_format == 'DAILY'){
        dateFormatAccepted.current = "daily";
      }
      else if (layerInformation.datetime_format == 'MONTHLY'){
        dateFormatAccepted.current = "monthly";
      }
      else if (layerInformation.datetime_format == '3MONTHLY'){
        dateFormatAccepted.current = "3monthly";
      }
      else if (layerInformation.datetime_format == 'WEEKLY'){
        dateFormatAccepted.current = "weekly";
      }
      else{
        dateFormatAccepted.current = "timeseries";
      }
      var token_id = null;
      if(isLoggedin){
        token_id = token
      }

      if (period === "PT6H" || period === "COMMA" || period === "PT1H") {        
        const start_date = layerInformation.timeIntervalStartOriginal;
        const end_date = layerInformation.timeIntervalEndOriginal;
        const step = (period === "PT6H" || period === "PT1H") ? layerInformation.interval_step : 24;
        var result = generateDateArray(start_date, end_date, step);
        var limit = layerInformation.no_of_plots;
        if (limit !== 999) {
            result = result.slice(-limit);
        }

        /*
        if (result.length > 30) {
            result.splice(0, result.length - 30);
        }*/
        var coral = 'False';
        if (layerInformation.id == 4 || layerInformation.id == 19){
          coral = 'True'
        }
        const dynamicImages = result.map((date) => {
          const base = get_url('getMap') + `region=` + short_name + `&layer_map=` + layerInformation.id + `&time=${date}`;
          const cacheParam = `&use_cache=${useCache ? 'True' : 'False'}`;
          const nocache = useCache ? '' : `&nocache=${Date.now()}`;
          return base + cacheParam + nocache + `&token=${token_id}`;
        });
        setImages(dynamicImages);
        setTimestamps(result);
        setLoading(true);
        setDotOffset(0);
      }
      else if (period === "OPENDAP") {
        const result_str = layerInformation.specific_timestemps;
        const result_process = result_str.split(",");

        const result = result_process.map(item => {
          const trimmedItem = item.trim();
          return trimmedItem.endsWith('Z') ? trimmedItem : `${trimmedItem}Z`;
        });
        
        if (result.length > 30) {
          result.splice(0, result.length - 30);
        }
        var coral = 'False';
        if (layerInformation.id == 4 || layerInformation.id == 19){
          coral = 'True'
        }
        const dynamicImages = result.map((date) => {
          const cleanDate = date.replace(/\s/g, "");
          const base = get_url('getMap') + `region=` + short_name + `&layer_map=` + layerInformation.id + `&time=${cleanDate}`;
          const cacheParam = `&use_cache=${useCache ? 'True' : 'False'}`;
          const nocache = useCache ? '' : `&nocache=${Date.now()}`;
          return base + cacheParam + nocache + `&token=${token_id}`;
        });

        setImages(dynamicImages);
        setTimestamps(result);
        setLoading(true);
        setDotOffset(0);
      }
    }
  }, [mapLayer, savedRegion,short_name,enabledMap,currentId, useCache]);

  useEffect(() => {
    if (images.length > 0 && currentIndex >= images.length) {
      setCurrentIndex(images.length - 1);
    }
  }, [images, currentIndex,isLoggedin,token]);
  
  useEffect(() => {
    let interval;
    if (loading) {
      setLoadingTime(0);
      interval = setInterval(() => {
        setLoadingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Add this new useEffect to set the initial index based on dateToDisplay
  useEffect(() => {
    if (timestamps.length > 0 && dateToDisplay.current) {
      // Normalize both dates to compare them properly
      const targetDate = new Date(dateToDisplay.current);
      // Find the closest timestamp to the target date
      const foundIndex = timestamps.reduce((closestIdx, timestamp, idx) => {
        const currentDate = new Date(timestamp);
        const currentDiff = Math.abs(targetDate - currentDate);
        const closestDiff = Math.abs(targetDate - new Date(timestamps[closestIdx]));
        return currentDiff < closestDiff ? idx : closestIdx;
      }, 0);
      
      setCurrentIndex(foundIndex);
      // Adjust dot offset to ensure the found index is visible
      setDotOffset(Math.max(0, foundIndex - Math.floor(MAX_VISIBLE_DOTS / 2)));
    }
  }, [timestamps, dateToDisplay.current]);

  const navigateImage = async (newIndex) => {
    setLoading(true);
    setError(null);
    setCurrentIndex(newIndex);
    // Keep the selected dot visible
    setDotOffset(Math.max(0, Math.min(
      newIndex - Math.floor(MAX_VISIBLE_DOTS / 2),
      timestamps.length - MAX_VISIBLE_DOTS
    )));
  };

  const goToNext = () => {
    navigateImage((currentIndex + 1) % images.length);
  };

  const goToPrevious = () => {
    navigateImage((currentIndex - 1 + images.length) % images.length);
  };

  const scrollDotsLeft = () => {
    const newOffset = Math.max(0, dotOffset - MAX_VISIBLE_DOTS);
    setDotOffset(newOffset);
  };

  const scrollDotsRight = () => {
    const newOffset = Math.min(
      dotOffset + MAX_VISIBLE_DOTS,
      Math.max(0, timestamps.length - MAX_VISIBLE_DOTS)
    );
    // Ensure we don't scroll if we're already at the end
    if (newOffset !== dotOffset) {
      setDotOffset(newOffset);
    }
  };

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  const handleImageLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleImageError = () => {
    setLoading(false);
    setError('Failed to load image');
  };

  const handleDotClick = (index) => {
    navigateImage(index);
  };

  const formatTimestamp = (timestamp, currentIndex) => {
    var formatType = dateFormatAccepted.current;
    if (!timestamp) return 'No date';
    try {
        const sanitizedTimestamp = String(timestamp).trim().replace(/\s+/g, '');
        const date = new Date(sanitizedTimestamp);

        if (isNaN(date.getTime())) return 'Invalid date';

        // Define format options based on the formatType
        const formatOptions = {
            timeseries: {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: 'UTC'
            },
            daily: {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC'
            },
            monthly: {
                year: 'numeric',
                month: 'short',
                timeZone: 'UTC'
            }
        };

        // Get the right format based on formatType (default: timeseries)
        const options = formatOptions[formatType] || formatOptions.timeseries;
        const formatted = date.toLocaleString('en-GB', options);

         // For timeseries, manually append "UTC" and format as desired
         if (formatType === 'timeseries') {
              const day = date.getUTCDate();
              const month = date.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
              const year = date.getUTCFullYear();
              const hours = String(date.getUTCHours()).padStart(2, '0');
              const minutes = String(date.getUTCMinutes()).padStart(2, '0');
              const time = `${hours}${minutes}`;
              return `${day} ${month}, ${year}, ${time}UTC`;
          }
          if (formatType === 'monthly') {
            // Create a new date in local time to get correct month
            const localDate = new Date(sanitizedTimestamp);
            return localDate.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short'
            });
        }
          if (formatType === '3monthly') {
            // Expecting input like "2025-01-01T00:00:00"
            const match = sanitizedTimestamp.match(/^(\d{4})-(\d{2})/);
            if (!match) return '';
          
            const month = parseInt(match[2], 10) - 1; // 0-based index
            const startMonthIndex = month;
            const endMonthIndex = (startMonthIndex + 2) % 12;
          
            const startMonth = new Date(Date.UTC(2000, startMonthIndex)).toLocaleString('en-US', {
              month: 'short',
              timeZone: 'UTC',
            });
            const endMonth = new Date(Date.UTC(2000, endMonthIndex)).toLocaleString('en-US', {
              month: 'short',
              timeZone: 'UTC',
            });
          
            return `${startMonth} – ${endMonth}`;
          }
          if (formatType === 'weekly') {
            var name = '4 Weekly'
            if (currentIndex == 0){
              name = '4 Weekly'
            }
            else if (currentIndex == 1){
              name = '8 Weekly'
            }
            else if (currentIndex == 2){
              name = '12 Weekly'
            }
            else if (currentIndex == 3){
              name = '16 Weekly'
            }
            return name
          }
          
      return formatted;

    } catch {
        return 'Invalid date';
    }

};

const formatShortTimestamp = (timestamp, currentIndex) => {
  var formatType = dateFormatAccepted.current;

  if (!timestamp) return '';
    try {
        const sanitizedTimestamp = String(timestamp).trim();
        const date = new Date(sanitizedTimestamp);

        if (isNaN(date.getTime())) return '';

        // Define format options based on formatType
        const formatOptions = {
            timeseries: {
              day: 'numeric',
              month: 'short',  // "16"
                hour: '2-digit',   // "12 AM"
                minute: '2-digit', // "00"
                hour12: false,      // Force 12-hour format
                timeZone: 'UTC'    // Use UTC (remove for local time)
            },
            daily: {
              day: 'numeric',
              month: 'short',   // "16"
                timeZone: 'UTC'
            },
            monthly: {
              year: 'numeric',
              month: 'short',
              timeZone: 'UTC'
          }
        };
        if (formatType === 'monthly') {
          // Create a new date in local time to get correct month
          const localDate = new Date(sanitizedTimestamp);
          return localDate.toLocaleString('en-US', {
              year: 'numeric',
              month: 'short'
          });
      }
      if (formatType === '3monthly') {
        // Expecting input like "2025-01-01T00:00:00"
        const match = sanitizedTimestamp.match(/^(\d{4})-(\d{2})/);
        if (!match) return '';
      
        const month = parseInt(match[2], 10) - 1; // 0-based index
        const startMonthIndex = month;
        const endMonthIndex = (startMonthIndex + 2) % 12;
      
        const startMonth = new Date(Date.UTC(2000, startMonthIndex)).toLocaleString('en-US', {
          month: 'short',
          timeZone: 'UTC',
        });
        const endMonth = new Date(Date.UTC(2000, endMonthIndex)).toLocaleString('en-US', {
          month: 'short',
          timeZone: 'UTC',
        });
      
        return `${startMonth} – ${endMonth}`;
      }
      if (formatType === 'weekly') {
        var name = '4 Weekly'
        if (currentIndex == 0){
          name = '4 Weekly'
        }
        else if (currentIndex == 1){
          name = '8 Weekly'
        }
        else if (currentIndex == 2){
          name = '12 Weekly'
        }
        else if (currentIndex == 3){
          name = '16 Weekly'
        }
        return name
      }

        // Select the format (default to 'timeseries' if invalid)
        const options = formatOptions[formatType] || formatOptions.timeseries;
        return date.toLocaleString('en-GB', options);

    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
};

  const handleDownload = () => {
    saveAs(images[currentIndex], generateFilename(timestamps[currentIndex]));
  };

  const generateFilename = (timestamp) => {
    let filename = 'map_image';
    try {
      const date = new Date(timestamp);
      filename = `map_${date.toISOString().slice(0, 10)}_${date.getHours()}${String(date.getMinutes()).padStart(2, '0')}.png`;
    } catch (e) {
      filename = `map_image_${currentIndex}.png`;
    }
    return filename;
  };
  if (!enabledMap) {
    return (
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
      }}>
        <p style={{ fontSize: 16, color: 'var(--color-text, #333)' }}>This Feature is disabled.</p>
      </div>
    );
  }

  // Calculate navigation states
  const showLeftArrow = dotOffset > 0;
  const showRightArrow = dotOffset + MAX_VISIBLE_DOTS < timestamps.length;
// In your dots navigation section, replace the visibleDots calculation with:
const startOffset = Math.min(
  Math.max(0, currentIndex - Math.floor(MAX_VISIBLE_DOTS / 2)),
  Math.max(0, timestamps.length - MAX_VISIBLE_DOTS)
);
const visibleDots = timestamps.slice(
  Math.max(0, dotOffset),
  Math.min(dotOffset + MAX_VISIBLE_DOTS, timestamps.length)
);
  return (
    <div style={{ display: 'flex', width: '100%', height: `${imgHeight}px`, overflow: 'hidden' }}>
      {/* Left sidebar with controls */}
      <div style={{
        width: '250px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '10px',
        boxSizing: 'border-box',
        backgroundColor: 'var(--color-surface, #fff)',
        color: 'var(--color-text, #333)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button
            onClick={goToPrevious}
            className="btn btn-primary"
            style={{
              padding: '5px 15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              flex: 1,
            }}
            disabled={loading || error || images.length <= 1}
          >
            <FaChevronLeft style={{ marginRight: '8px' }} /> Previous
          </button>
          <button
            onClick={goToNext}
            className="btn btn-primary"
            style={{
              padding: '5px 15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              flex: 1,
            }}
            disabled={loading || error || images.length <= 1}
          >
            Next <FaChevronRight style={{ marginLeft: '8px' }} />
          </button>
        </div>

        {/* Use Cache toggle (Bootstrap switch) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px'}}>
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              id="use-cache-toggle"
              type="checkbox"
              role="switch"
              checked={useCache}
              onChange={(e) => setUseCache(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="use-cache-toggle" style={{ fontSize: '13px', color: 'var(--color-text, #333)' }}>
              Use cache for images
            </label>
          </div>
        </div>

        {timestamps.length > 0 && (
          <div style={{
            marginTop: '10px',
            textAlign: 'center',
            fontSize: '14px',
            color: 'var(--color-text, #555)',
          }}>
            {formatTimestamp(timestamps[currentIndex], currentIndex)}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(() => {
            const isDarkMode = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
            return (
              <>
                <button
                  onClick={openModal}
                  className="btn"
                  style={{
                    padding: '5px 15px',
                    cursor: 'pointer',
                    backgroundColor: isDarkMode ? '#28a745' : 'transparent',
                    border: isDarkMode ? '1px solid #28a745' : '1px solid #28a745',
                    color: isDarkMode ? '#ffffff' : '#28a745',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = isDarkMode ? '#218838' : '#28a745';
                    e.target.style.color = isDarkMode ? '#ffffff' : '#ffffff';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = isDarkMode ? '#28a745' : 'transparent';
                    e.target.style.color = isDarkMode ? '#ffffff' : '#28a745';
                  }}
                  disabled={loading || error}
                >
                  View in Popup
                </button>
                <a
                  onClick={handleDownload}
                  className="btn"
                  style={{
                    padding: '5px 15px',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    backgroundColor: isDarkMode ? '#ff8c00' : '#f8f9fa',
                    border: isDarkMode ? '1px solid #ff8c00' : '1px solid #dee2e6',
                    color: isDarkMode ? '#ffffff' : '#ff8c00',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = isDarkMode ? '#6c757d' : '#e9ecef';
                    e.target.style.color = isDarkMode ? '#ffffff' : '#495057';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = isDarkMode ? '#495057' : '#f8f9fa';
                    e.target.style.color = isDarkMode ? '#ffa500' : '#ff8c00';
                  }}
                  disabled={loading || error}
                >
                  Download
                </a>
              </>
            );
          })()}
        </div>
      </div>

      <div style={{
        width: '2px',
        backgroundColor: 'var(--color-border, lightgray)',
        height: '100%',
      }}></div>

      {/* Main image area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {loading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
          }}>
            <Spinner animation="border" role="status" variant="primary"/>
            <span style={{ marginLeft: '10px', fontSize: '18px', color: 'var(--color-text, #333)' }}>
      {loadingTime > 11 
        ? "Rendering complex geospatial data... Almost there!" 
        : loadingTime > 5 
          ? "Processing layers and generating visualization..." 
          : "Initializing map plotter..."}
    </span>
          </div>
        )}

        {error && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'column',
            color: 'red',
            textAlign: 'center',
            padding: '20px',
            backgroundColor: 'var(--color-surface, rgba(255, 255, 255, 0.9))',
            borderRadius: '5px',
            border: '1px solid var(--color-border, #ddd)',
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Error Loading Image</div>
            <div>{error}</div>
            <Button
              variant="warning"
              onClick={() => navigateImage(currentIndex)}
              style={{ marginTop: '10px' }}
            >
              Retry
            </Button>
          </div>
        )}

        <img
          src={images[currentIndex]}
          alt="Dynamic Image"
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            width: '100%',
            height: 'calc(100% - 24px)',
            objectFit: 'contain',
            visibility: loading || error ? 'hidden' : 'visible',
            paddingBottom:5
          }}
        />
        {/* Dots navigation */}
        {timestamps.length > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '1px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '5px',
            alignItems: 'center',
            padding: '3px',
            height: '24px',
          }}>
            {showLeftArrow && (
              <button
                onClick={scrollDotsLeft}
                disabled={!showLeftArrow}
                style={{
                  background: 'none',
                  border: 'none',
                  color: showLeftArrow ? '#0275d8' : '#cccccc',
                  cursor: showLeftArrow ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  padding: '0 5px',
                  opacity: showLeftArrow ? 1 : 0.5,
                }}
              >
                <FaChevronLeft />
              </button>
            )}

            {visibleDots.map((_, index) => {
              const actualIndex = dotOffset + index;
              // Double-check we're not going beyond our data
              if (actualIndex >= timestamps.length) return null;
              return actualIndex === currentIndex ? (
                <div
                  key={actualIndex}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '3px',
                    backgroundColor: '#0275d8',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    height: '28px',
                    marginBottom: '3px',
                  }}
                  onClick={() => handleDotClick(actualIndex)}
                >
                  {formatShortTimestamp(timestamps[actualIndex], actualIndex)}
                </div>
              ) : (
                <div
                  key={actualIndex}
                  onClick={() => handleDotClick(actualIndex)}
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#A9A9A9',
                    cursor: 'pointer',
                    marginBottom: '2px', 
                  }}
                ></div>
              );
            })}

            {showRightArrow && (
              <button
                onClick={scrollDotsRight}
                disabled={!showRightArrow}
                style={{
                  background: 'none',
                  border: 'none',
                  color: showRightArrow ? '#0275d8' : '#cccccc',
                  cursor: showRightArrow ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  padding: '0 5px',
                  opacity: showRightArrow ? 1 : 0.5,
                }}
              >
                <FaChevronRight />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal for enlarged view */}
      <Modal show={showModal} onHide={closeModal} size="lg">
        <Modal.Header closeButton style={{backgroundColor:'#3f51b5', color:'white'}} closeVariant="white">
          <Modal.Title style={{color: 'white !important'}}>Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              color: 'red',
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Error Loading Image</div>
              <div>{error}</div>
            </div>
          ) : (
            <img
              src={images[currentIndex]}
              alt="Dynamic Image"
              onError={(e) => {
                e.target.onerror = null;
                setError('Failed to load image in preview');
              }}
              style={{
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
                display: error ? 'none' : 'block',
              }}
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          <a
            onClick={handleDownload}
            className="btn btn-success"
            style={{
              padding: '5px 15px',
              cursor: 'pointer',
              color:'white'
            }}
            disabled={!!error}
          >
            Download
          </a>
          <Button variant="secondary" onClick={closeModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default DynamicImage;
