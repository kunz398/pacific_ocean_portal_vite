
import React, { useEffect, useState, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAppSelector, useAppDispatch } from '../../GlobalRedux/hooks'
import '../../components/functions/L.TileLayer.BetterWMS';
import { setCenter, setZoom, setBaseMapLayer,setEEZEnable,setCoastlineEnable,setCityNameEnable, setBounds, setDataLimit } from '../../GlobalRedux/Features/map/mapSlice';
import addWMSTileLayer from '../functions/addWMSTileLayer';
import '../../components/css/legend.css';
import { get_url } from '../../components/json/urls';
import { showoffCanvas, hideoffCanvas  } from '../../GlobalRedux/Features/offcanvas/offcanvasSlice.jsx';
import { FaShare } from "react-icons/fa";
import ShareWorkbench from '../tools/shareWorkbench';
import { addCOGTileLayer } from '../functions/addCogTileLayer';
// Import marker cluster CSS
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Import markercluster directly for Vite
import 'leaflet.markercluster';

import Loading from '../../loading';
import { setCoordinates  } from '../../GlobalRedux/Features/coordinate/mapSlice';

// Add custom tile layer for Firefox CORS handling
const createFirefoxCompatibleTileLayer = (url, options = {}) => {
  const CustomTileLayer = L.TileLayer.extend({
    createTile: function(coords, done) {
      const tile = document.createElement('img');
      
      // Store coordinates on the tile for retry logic
      tile.coords = coords;
      
      L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile));
      L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile));
      
      if (this.options.crossOrigin) {
        tile.crossOrigin = '';
      }
      
      // Add cache buster for Firefox
      const cacheBuster = Date.now();
      const tileUrl = this.getTileUrl(coords) + (this.getTileUrl(coords).includes('?') ? '&' : '?') + '_cb=' + cacheBuster;
      
      tile.src = tileUrl;
      
      return tile;
    },
    
    _tileOnError: function(done, tile, e) {
      // Retry logic for Firefox
      const retryCount = tile.retryCount || 0;
      if (retryCount < 3 && tile.coords) {
        tile.retryCount = retryCount + 1;
        setTimeout(() => {
          try {
            const newUrl = this.getTileUrl(tile.coords) + (this.getTileUrl(tile.coords).includes('?') ? '&' : '?') + '_retry=' + retryCount + '&_cb=' + Date.now();
            tile.src = newUrl;
          } catch (error) {
           // console.warn('Error retrying tile load:', error);
            done(e, tile);
          }
        }, 1000 * (retryCount + 1));
      } else {
        done(e, tile);
      }
    }
  });
  
  return new CustomTileLayer(url, options);
};

const MapBox = () => {
    const mapRef = useRef();
    const isMapInitialized = useRef(false); // Track if map is initialized
    const isVisible = useAppSelector((state) => state.offcanvas.isVisible);

    const dispatch = useAppDispatch();
    const { center, zoom, bounds, maxBounds, layers, basemap, eezoverlay,enable_eez,enable_coastline,coastlineoverlay,citynamesoverlay,enable_citynames, sidebarCollapsed } = useAppSelector((state) => state.mapbox);
    const isBing = useRef(false); 
    const [selectedOption, setSelectedOption] = useState('bing'); // Changed default to 'bing' for Satellite view 
    const [checkboxChecked, setCheckboxChecked] = useState(true);
    const [checkboxCheckedCoast, setCheckboxCheckedCoast] = useState(true);
    const [checkboxCheckedCity, setCheckboxCheckedCity] = useState(true);
    const [wmsLayer, setWmsLayer] = useState(null);
    const [wmsLayer2, setWmsLayer2] = useState(null);
    const [wmsLayer3, setWmsLayer3] = useState(null);
    const [showTime, setShowTime] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoading2, setIsLoading2] = useState(false);
    const legendColorRef = useRef();
    const legendColorRef2 = useRef();
    const legendColorRef3 = useRef();
    const [wmsLayerGroup, setWmsLayerGroup] = useState(null); 
    const [wmsLayer2Details, setWmsLayer2Details] = useState(null);
    const [noDataMessage, setNoDataMessage] = useState('');
    const [showNoDataMessage, setShowNoDataMessage] = useState(false);
    const [isCheckingData, setIsCheckingData] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    // Central guarded map operations / safe fitBounds helpers
    const opQueueRef = useRef([]);
    const canOperateMap = () => {
      if (!mapRef.current) return false;
      if (mapRef.current._sidebarAnimating) return false;
      const c = mapRef.current.getContainer?.();
      if (!c) return false;
      if (c.offsetParent === null) return false; // hidden
      const r = c.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      return true;
    };
    const scheduleMapOp = (fn, attempt = 0) => {
      if (!mapRef.current) return;
      if (!canOperateMap() || !mapRef.current._loaded) {
        if (attempt < 15) return setTimeout(() => scheduleMapOp(fn, attempt + 1), 100 + 40 * attempt);
        return;
      }
      if (mapRef.current._mapPane && !mapRef.current._mapPane._leaflet_pos) {
        try { L.DomUtil.setPosition(mapRef.current._mapPane, L.point(0,0)); } catch {}
      }
      try { fn(); }
      catch (e) {
        if (e?.message?.includes('_leaflet_pos') && attempt < 10) {
          return setTimeout(() => scheduleMapOp(fn, attempt + 1), 120 * (attempt + 1));
        }
       // console.warn('Map op failed (final):', e);
      }
    };
    const flushOpQueue = () => {
      if (!canOperateMap()) return;
      while (opQueueRef.current.length) {
        const fn = opQueueRef.current.shift();
        scheduleMapOp(fn);
      }
    };
    const safeFitBoundsGlobal = (boundsInput, options = {}) => {
      if (!mapRef.current || !boundsInput) return;
      const resolve = () => {
        if (Array.isArray(boundsInput)) return boundsInput;
        if (boundsInput.getSouthWest && boundsInput.getNorthEast) return boundsInput;
        if (typeof boundsInput === 'object' && 'south' in boundsInput) {
          return [[boundsInput.south, boundsInput.west],[boundsInput.north, boundsInput.east]];
        }
        return null;
      };
      const b = resolve();
      if (!b) return;
      scheduleMapOp(() => {
        if (!mapRef.current) return;
        mapRef.current.fitBounds(b, { animate: false, ...options });
      });
    };
    
    const handleShow = (id) => {
        dispatch(showoffCanvas(id));
    };

    const handleShowShareModal = () => {
        setShowShareModal(true);
    };
    
    const handleHideShareModal = () => {
        setShowShareModal(false);
    };

    // Function to check data availability for different layer types
    // COMMENTED OUT - Data availability checking functionality
    /*
    const checkDataAvailability = async (layerType, stationId, layerId) => {
        try {
            let dataUrl = '';
            
            // Determine the appropriate data URL based on layer type
            if (layerType === 'SOFAR') {
                // For SOFAR layers, check if wave data is available
                const selectedLayer = layers.find(layer => 
                    layer.id === layerId ||  
                    (layer.layer_information && layer.layer_information.id === layerId)
                );
                
                if (selectedLayer && selectedLayer.layer_information) {
                    // For SOFAR, we need to construct the URL with the station ID
                    const baseUrl = get_url('insitu-station');
                    dataUrl = `${baseUrl}/${stationId}?limit=1000`;
                }
            } else if (layerType === 'WFS') {
                // For WFS layers, check if station data is available
                const selectedLayer = layers.find(layer => 
                    layer.id === layerId ||  
                    (layer.layer_information && layer.layer_information.id === layerId)
                );
                
                if (selectedLayer && selectedLayer.layer_information) {
                    const { timeseries_url } = selectedLayer.layer_information;
                    // Replace station placeholder with actual station ID
                    dataUrl = timeseries_url.replace('${station}', stationId);
                }
            } else if (layerType === 'TIDE') {
                // For TIDE layers, check if tide data is available
                const selectedLayer = layers.find(layer => 
                    layer.id === layerId ||  
                    (layer.layer_information && layer.layer_information.id === layerId)
                );
                
                if (selectedLayer && selectedLayer.layer_information) {
                    const { timeseries_url } = selectedLayer.layer_information;
                    // Replace station placeholder with actual station ID
                    dataUrl = timeseries_url.replace('${station}', stationId);
                }
            }

            if (!dataUrl) {
                return false;
            }

            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), 5000); // 5 second timeout
            });

            // Make a request to check if data exists with timeout
            const fetchPromise = fetch(dataUrl);
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            
            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            
            // Check if data has meaningful content
            if (layerType === 'SOFAR') {
                return data && data.data && data.data.length > 0;
            } else if (layerType === 'WFS') {
                return data && Array.isArray(data) && data.length > 0;
            } else if (layerType === 'TIDE') {
                return data && Array.isArray(data) && data.length > 0;
            }

            return false;
        } catch (error) {
            console.error('Error checking data availability:', error);
            return false;
        }
    };
    */

    // Function to show no data message
    // COMMENTED OUT - No data alert functionality
    /*
    const showNoDataAlert = (message) => {
        setNoDataMessage(message);
        setShowNoDataMessage(true);
        
        // Hide the message after 3 seconds
        setTimeout(() => {
            setShowNoDataMessage(false);
            setNoDataMessage('');
        }, 3000);
    };
    */

    const addLayerWithLoading = (layerGroup, layer, setLoading) => {
      let tilesLoading = 0;
      
      layer.on('loading', () => {
        tilesLoading++;
        setLoading(true);
      });
      
      layer.on('load', () => {
        tilesLoading--;
        if (tilesLoading <= 0) setLoading(false);
      });
      
      layer.on('tileerror', () => {
        tilesLoading--;
        if (tilesLoading <= 0) setLoading(false);
      });
      
      layerGroup.addLayer(layer);
    };

    const blueIcon = new L.Icon({
      iconUrl:  "/blue_marker.png", // URL for the blue marker icon
      iconSize: [25, 41], // Size of the icon
      iconAnchor: [12, 41], // Anchor point of the icon
      popupAnchor: [1, -34], // Popup anchor
      shadowUrl: '/shadow.png', // Shadow of the marker
      shadowSize: [41, 41], // Size of the shadow
    });
    const greenIcon = new L.Icon({
      iconUrl:  "/green_marker.png", // URL for the blue marker icon
      iconSize: [25, 41], // Size of the icon
      iconAnchor: [12, 41], // Anchor point of the icon
      popupAnchor: [1, -34], // Popup anchor
      shadowUrl: '/shadow.png', // Shadow of the marker
      shadowSize: [41, 41], // Size of the shadow
    });
    
    // reference to track makers and  requests
    const markerClusterRef = useRef(null);
    const pendingRequestRef = useRef(null);

    //  clean up markers
    const cleanupMarkers = () => {
    if (markerClusterRef.current && mapRef.current && isMapInitialized.current) {
      try {
        mapRef.current.removeLayer(markerClusterRef.current);
      } catch (error) {
       // console.error('Error removing marker cluster:', error);
      }
        markerClusterRef.current = null;
      }
      if (pendingRequestRef.current) {
        clearTimeout(pendingRequestRef.current);
        pendingRequestRef.current = null;
      }
    };

    const fetchWaveBuoy = async (url, id, selectedTypes = []) => {
     /* console.log("fetchWaveBuoy called with:", {
        url: url,
        id: id,
        selectedTypes: selectedTypes,
        selectedTypesLength: selectedTypes.length
      });*/
    
      // Cleanup any pending requests and markers
      cleanupMarkers();

      // Use a timeout to debounce rapid successive calls
      pendingRequestRef.current = setTimeout(async () => {
        try {
          const response = await fetch(url);
          const rawData = await response.json();
          
          // Process the data and create markers
          const processedGeoJSON = transformToGeoJSON(rawData, selectedTypes);
          
          // Create a new marker cluster group
          const markerClusterGroup = L.markerClusterGroup({
            maxClusterRadius: 30,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: true,
            zoomToBoundsOnClick: true,
            disableClusteringAtZoom: 14,
            chunkedLoading: true,
            chunkInterval: 100,
            iconCreateFunction: function(cluster) {
              const count = cluster.getChildCount();
              return L.divIcon({
                html: `<div style="background-color: #C7D444; 
                       color: black; 
                       border-radius: 50%; 
                       width: 40px; 
                       height: 40px; 
                       display: flex; 
                       align-items: center; 
                       justify-content: center; 
                       font-weight: bold;
                       border: 2px solid white;
                       box-shadow: 0 0 5px rgba(0,0,0,0.3);">${count}</div>`,
                className: 'marker-cluster-custom',
                iconSize: L.point(40, 40)
              });
            }
          });

          // Store the new marker cluster group
          markerClusterRef.current = markerClusterGroup;

      /*    console.log("Adding markers to map:", {
            processedGeoJSONFeatures: processedGeoJSON.features.length,
            markerClusterGroup: markerClusterGroup
          });*/
          
          // Add markers to the group
          const geoJsonLayer = L.geoJSON(processedGeoJSON, {
            pointToLayer: (feature, latlng) => {
              const dispersion = 0.0005;
              const dispersedLatLng = L.latLng(
                latlng.lat + (Math.random() * dispersion * 2 - dispersion),
                latlng.lng + (Math.random() * dispersion * 2 - dispersion)
              );
              //Adding circle
              let circleColor = "#01dddd"; // default blue
              if (feature.properties.type_id === 3) {
                circleColor = "#3f51b5"; // light purple (Material: Deep Purple 200)
              } else if (feature.properties.type_id === 4) {
                circleColor = "#fe7e0f"; // light green (Material: Green A100)
              }

              const blueCircleIcon = L.divIcon({
                html: `<div style="
                  background: ${circleColor};
                  border-radius: 50%;
                  width: 18px;
                  height: 18px;
                  border: 2px solid white;
                  box-shadow: 0 1px 5px rgba(30,144,255,0.3);
                "></div>`,
                className: '',
                iconSize: [18, 18]
              });

              const marker = L.marker(dispersedLatLng, {
                icon: blueCircleIcon,
                stationId: feature.properties.spotter_id
              });
              /*
              const marker = L.marker(dispersedLatLng, {
                icon: feature.properties.is_active === "TRUE" ? greenIcon : blueIcon,
                stationId: feature.properties.spotter_id // Add station ID to marker options
              });
              */
              const displayName = feature.properties.display_name || feature.properties.spotter_id || "Unknown";
              const tooltipContent = `
                <div style="min-width:120px;">
                 <strong>${displayName}</strong><br>
                  Status: ${feature.properties.is_active === "TRUE" ? "Active" : "Inactive"}<br>
                  Owner: ${feature.properties.owner || "Unknown"}
                </div>
              `;
              
              marker.bindTooltip(tooltipContent, {
                direction: "top",
                sticky: true,
                className: "custom-marker-tooltip"
              });

              marker.bindPopup(`
                <div>                 
                  <strong>${displayName}</strong><br>
                  Status: ${feature.properties.is_active === "TRUE" ? "Active" : "Inactive"}<br>
                  Owner: ${feature.properties.owner}
                </div>
              `);

              marker.on('click', () => {
                 // COMMENTED OUT - Data availability checking
                 // setIsCheckingData(true);
                 // try {
                 //   const isDataAvailable = await checkDataAvailability('SOFAR', feature.properties.spotter_id, id);
                 //   if (isDataAvailable) {
                  // Set data limit with fallback to default if not provided
                  const dataLimit = feature.properties.data_limit || 100;
                  dispatch(setDataLimit(dataLimit));
                        dispatch(setCoordinates({ 
                          x: feature.properties.owner,
                          y: feature.properties.is_active,
                          sizex: null, 
                          sizey: null,
                          bbox: null, 
                          station: feature.properties.spotter_id,
                          country_code: feature.properties.owner,
                          display_name:  feature.properties.display_name
                        }));
            // Use the active layer id to open the correct bottom canvas
            dispatch(showoffCanvas(id));
                 //   } else {
                 //       showNoDataAlert(`No data available for ${feature.properties.spotter_id}`);
                 //   }
                 // } catch (error) {
                 //   showNoDataAlert(`Error checking data for ${feature.properties.spotter_id}`);
                 // } finally {
                 //   setIsCheckingData(false);
                 // }
               });

              return marker;
            }
          });

          // Add the layer to the cluster group and then to the map
          markerClusterGroup.addLayers(geoJsonLayer.getLayers());
          if (mapRef.current && isMapInitialized.current) {
            try {
          mapRef.current.addLayer(markerClusterGroup);
            } catch (error) {
           //   console.error('Error adding marker cluster to map:', error);
            }
          }
          
          // Add cluster event handlers
          markerClusterGroup.on('clustermouseover', (a) => {
            const count = a.layer.getChildCount();
            a.layer.bindTooltip(
              `<div style='min-width:100px;text-align:center;'><strong>${count} buoys here</strong><br/>Zoom in to see details.</div>`,
              { direction: 'top', sticky: true, className: 'custom-cluster-tooltip' }
            ).openTooltip();
          });
          
          markerClusterGroup.on('clustermouseout', (a) => {
            a.layer.closeTooltip();
          });

        } catch (error) {
         // console.error('Error processing wave buoy data:', error);
        } finally {
          pendingRequestRef.current = null;
        }
      }, 100); // 100ms debounce time
    };

    // Helper function to transform data to GeoJSON
    const transformToGeoJSON = (raw, selectedTypes = []) => {
      const entries = Array.isArray(raw) ? raw : [raw];
      let filteredEntries = entries;
      
     /* console.log("transformToGeoJSON called with:", {
        rawLength: entries.length,
        selectedTypes: selectedTypes,
        selectedTypesLength: selectedTypes.length
      });*/
      
      // // Debug: Log first entry to see API structure
      // if (entries.length > 0) {
      //   console.log("First API entry structure:", entries[0]);
      // }
      
      if (selectedTypes && selectedTypes.length > 0) {
        filteredEntries = entries.filter(entry => {
          return selectedTypes.includes(entry.type_id);
        });
      //  console.log("Filtered entries:", filteredEntries.length);
      } else {
        // If no types selected, show no entries (empty array means no markers)
        filteredEntries = [];
        // console.log("No types selected, showing no entries:", filteredEntries.length);
      }
      
      return {
        type: "FeatureCollection",
        features: filteredEntries.map(entry => {
          var lon = entry.longitude;
          if (entry.longitude < 0) {
            lon = entry.longitude + 360;
          }
          
          const lat = entry.latitude;    
          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [lon, lat],
            },
            properties: {
              spotter_id: entry.station_id || "Unknown",      
              display_name: entry.display_name || null, //add            
              is_active: (entry.is_active ? String(entry.is_active).toUpperCase() : "FALSE"),
              owner: entry.owner || "Unknown",
              sensor: entry.type_value || "",
              type_id: entry.type_id || null,
              data_limit: entry.data_limit || 100,
            }
          };
        })
      };
    };

    // Clean up on component unmount
    useEffect(() => {
      return () => {
        cleanupMarkers();
      };
    }, []);
    
    const fetchAndPlotGeoJSON = async (url,id) => {
      try {
          // First remove any existing cluster layer
      if (mapRef.current && isMapInitialized.current) {
        try {
          mapRef.current.eachLayer(layer => {
              if (layer instanceof L.MarkerClusterGroup) {
                  mapRef.current.removeLayer(layer);
              }
          });
        } catch (error) {
        //  console.error('Error removing existing cluster layers:', error);
        }
      }
      
          // Create marker cluster group
          const markerClusterGroup = L.markerClusterGroup({
              maxClusterRadius: 35,
              spiderfyOnMaxZoom: true,
              showCoverageOnHover: true,
              zoomToBoundsOnClick: true,
              disableClusteringAtZoom: 14,
              chunkedLoading: true,
              chunkInterval: 100,
              iconCreateFunction: function(cluster) {
                  const count = cluster.getChildCount();
                  return L.divIcon({
                      html: `<div style="background-color: #C7D444; 
                             color: white;                                
                             border-radius: 50%; 
                             width: 40px; 
                             height: 40px; 
                             display: flex; 
                             align-items: center; 
                             justify-content: center; 
                             font-weight: bold;
                             border: 2px solid white;
                             box-shadow: 0 0 5px rgba(0,0,0,0.3);">${count}</div>`,
                      className: 'marker-cluster-custom',
                      iconSize: L.point(40, 40)
                  });
              }
          });
      
          // Fetch the GeoJSON data
          const response = await fetch(url);
          const geojsonData = await response.json();
      
          // Normalize longitude values to the range [-180, 180]
          const normalizeLongitude = (lon) => {
              while (lon > 180) lon -= 360;
              while (lon < -180) lon += 360;
              return lon;
          };
      
          // Process the GeoJSON data to handle points near the dateline
          const processGeoJSON = (geojson) => {
              return {
                  ...geojson,
                  features: geojson.features.map(feature => {
                      const geometry = feature.geometry;
                      if (geometry.type === 'Point') {
                          const [lon, lat] = geometry.coordinates;
                          const normalizedLon = normalizeLongitude(lon);
      
                          // If the point is near the dateline, create a duplicate on the other side
                          if (Math.abs(normalizedLon) > 150) {
                              return [
                                  {
                                      ...feature,
                                      geometry: {
                                          ...geometry,
                                          coordinates: [normalizedLon, lat],
                                      },
                                  },
                                  {
                                      ...feature,
                                      geometry: {
                                          ...geometry,
                                          coordinates: [normalizedLon + 360, lat],
                                      },
                                  },
                              ];
                          }
      
                          return {
                              ...feature,
                              geometry: {
                                  ...geometry,
                                  coordinates: [normalizedLon, lat],
                              },
                          };
                      }
                      return feature;
                  }).flat(),
              };
          };
      
          // Process the GeoJSON data
          const processedGeoJSON = processGeoJSON(geojsonData);
      
          // Create GeoJSON layer with markers
          const geoJsonLayer = L.geoJSON(processedGeoJSON, {
              id: "tide_gauge",
              pointToLayer: function(feature, latlng) {
                if (!latlng || typeof latlng.lat !== 'number' || typeof latlng.lng !== 'number') {
                //  console.warn('Invalid latlng:', latlng, feature);
                  return null;
                }
              
                const dispersion = 0.0005;
                const dispersedLatLng = L.latLng(
                  latlng.lat + (Math.random() * dispersion * 2 - dispersion),
                  latlng.lng + (Math.random() * dispersion * 2 - dispersion)
                );
      
                  const marker = L.marker(dispersedLatLng, { icon: blueIcon });
      
                  // Create popup content
                  const popupContent = `
                      ${feature.properties.station_na || "No name provided"}
                  `;
      
                  // Add popup to the marker
                  marker.bindPopup(popupContent);
      
                  // Attach a custom event handler to the popup's link
                  marker.on('popupopen', () => {
                      const link = document.querySelector('.popup-link');
                      if (link) {
                          link.addEventListener('click', (e) => {
                              e.preventDefault();
                              // Dispatch the action when the link is clicked
                          });
                      }
                  });
      
                                     marker.on('click', () => {
                        // COMMENTED OUT - Data availability checking
                        // setIsCheckingData(true);
                        // try {
                          const station = feature.properties.station_id;
                          const x = null;
                          const y = null;
                          const sizex = null;
                          const sizey = null;
                          const bbox = null;
                          // const isDataAvailable = await checkDataAvailability('WFS', station, id);
                          // if (isDataAvailable) {
                            // Set data limit with fallback to default if not provided
                            const dataLimit = feature.properties.data_limit || 100;
                         //   console.log("dataLimit", dataLimit);
                            dispatch(setDataLimit(dataLimit)); 
                            dispatch(setCoordinates({ x, y, sizex, sizey, bbox, station }));
                            // Use the active layer id to open the correct bottom canvas
                            dispatch(showoffCanvas(id));
                          // } else {
                          //   showNoDataAlert(`No data available for ${station}`);
                          // }
                        // } catch (error) {
                        //   showNoDataAlert(`Error checking data for ${feature.properties.station_id}`);
                        // } finally {
                        //   setIsCheckingData(false);
                        // }
                    });
      
                  return marker;
              }
          });
      
          // Add markers to cluster group and then to map
          markerClusterGroup.addLayer(geoJsonLayer);
          mapRef.current.addLayer(markerClusterGroup);
      
      } catch (error) {
      //    console.error('Error fetching GeoJSON data:', error);
      }
    };
    const fetchAndPlotGeoJSONTIDE = async (url, id) => {
      try {
          // Remove existing marker cluster group if it exists
          mapRef.current.eachLayer(layer => {
              if (layer instanceof L.MarkerClusterGroup) {
                  mapRef.current.removeLayer(layer);
              }
          });
    
          // Create marker cluster group
          const markerClusterGroup = L.markerClusterGroup({
              maxClusterRadius: 35,
              spiderfyOnMaxZoom: true,
              showCoverageOnHover: true,
              zoomToBoundsOnClick: true,
              disableClusteringAtZoom: 14,
              chunkedLoading: true,
              chunkInterval: 100,
              iconCreateFunction: function(cluster) {
                  const count = cluster.getChildCount();
                  return L.divIcon({
                      html: `<div style="background-color: #C7D444;
                             color: white;
                             border-radius: 50%;
                             width: 40px;
                             height: 40px;
                             display: flex;
                             align-items: center;
                             justify-content: center;
                             font-weight: bold;
                             border: 2px solid white;
                             box-shadow: 0 0 5px rgba(0,0,0,0.3);">${count}</div>`,
                      className: 'marker-cluster-custom',
                      iconSize: L.point(40, 40)
                  });
              }
          });
    
          // Fetch the GeoJSON data
          const response = await fetch(url);
          const geojsonData = await response.json();
    
          // Normalize longitude values to the range [-180, 180]
          const normalizeLongitude = (lon) => {
              while (lon > 180) lon -= 360;
              while (lon < -180) lon += 360;
              return lon;
          };
    
          // Process the GeoJSON data to handle points near the dateline
          const processGeoJSON = (geojson) => {
              return {
                  ...geojson,
                  features: geojson.features.map(feature => {
                      const geometry = feature.geometry;
                      if (geometry.type === 'Point') {
                          const [lon, lat] = geometry.coordinates;
                          const normalizedLon = normalizeLongitude(lon);
    
                          if (Math.abs(normalizedLon) > 150) {
                              return [
                                  {
                                      ...feature,
                                      geometry: { ...geometry, coordinates: [normalizedLon, lat] },
                                  },
                                  {
                                      ...feature,
                                      geometry: { ...geometry, coordinates: [normalizedLon + 360, lat] },
                                  },
                              ];
                          }
    
                          return {
                              ...feature,
                              geometry: { ...geometry, coordinates: [normalizedLon, lat] },
                          };
                      }
                      return feature;
                  }).flat(),
              };
          };
    
          const processedGeoJSON = processGeoJSON(geojsonData);
    
          // Create GeoJSON layer with markers
          const geoJsonLayer = L.geoJSON(processedGeoJSON, {
              id: "tide_gauge",
              pointToLayer: function (feature, latlng) {
                // Slight dispersion to reduce overlap
                const dispersion = 0.0005;
                const dispersedLatLng = L.latLng(
                  latlng.lat + (Math.random() * dispersion * 2 - dispersion),
                  latlng.lng + (Math.random() * dispersion * 2 - dispersion)
                );
    
                const marker = L.marker(dispersedLatLng, { icon: blueIcon });
    
                const popupContent = `
                    ${feature.properties.location || "No name provided"}
                `;
    
                marker.bindPopup(popupContent);
    
                marker.on('popupopen', () => {
                    const link = document.querySelector('.popup-link');
                    if (link) {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            // Optional link action
                        });
                    }
                });
    
               marker.on('click', () => {
                     // COMMENTED OUT - Data availability checking
                     // setIsCheckingData(true);
                     // try {
                       const station = feature.properties.station_id;
                       const x = feature.properties.country_na;
                       const y = feature.properties.location;
                       const sizex = null;
                       const sizey = null;
                       const bbox = null;
                       // const isDataAvailable = await checkDataAvailability('TIDE', station, id);
                       // if (isDataAvailable) {
                            dispatch(setCoordinates({ x, y, sizex, sizey, bbox, station }));
             // Use the active layer id to open the correct bottom canvas
             dispatch(showoffCanvas(id));
                       // } else {
                       //     showNoDataAlert(`No data available for ${station}`);
                       // }
                     // } catch (error) {
                     //   showNoDataAlert(`Error checking data for ${feature.properties.station_id}`);
                     // } finally {
                     //   setIsCheckingData(false);
                     // }
                 });
    
                return marker;
              }
          });
    
          // Add GeoJSON layer to cluster group and then to map
          markerClusterGroup.addLayer(geoJsonLayer);
          mapRef.current.addLayer(markerClusterGroup);
    
      } catch (error) {
        //  console.error('Error fetching GeoJSON data:', error);
      }
    };
    
      useEffect(() => {
        // Ensure the map container exists and has proper dimensions
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
          console.warn('Map container not found');
          return;
        }

        // Check if map is already initialized to prevent double initialization
        if (isMapInitialized.current) {
          console.warn('Map already initialized');
          return;
        }

        // Create map with custom controls
        try {
      mapRef.current = L.map('map', {
        center: center,
        zoom: zoom,
        zoomControl: false, // We'll add custom zoom control
        maxBounds: maxBounds,
        maxZoom: 18,
        minZoom: 2,
        attributionControl: false,
        zoomSnap: 0.5,
        zoomDelta: 0.5,
        wheelPxPerZoomLevel: 60,
        tap: false,
        renderer: L.canvas()
      });

          // Mark map as initialized
          isMapInitialized.current = true;
        } catch (error) {
          console.error('Error initializing map:', error);
          return;
        }

      // Make map instance globally accessible for search functionality
      window.mapInstance = mapRef.current;

      // Add custom zoom control with dark theme
      const zoomControl = L.control.zoom({
        position: 'topright',
        zoomInText: '+',
        zoomOutText: '-'
      });
      
      // Add custom styles for zoom control
      const style = document.createElement('style');
      style.textContent = `
        /* Component-specific overrides (most zoom styling in globals.css) */
        .leaflet-control-zoom a.leaflet-control-zoom-share { font-size:0; }
        @media (max-width: 700px) {
          .leaflet-control-zoom { width: 40px !important; }
        }
      `;
      document.head.appendChild(style);

      // Add zoom control to map
      zoomControl.addTo(mapRef.current);
      
      // Append share button inside the same zoom control container so they behave as one unit
      try {
        const zoomContainer = zoomControl.getContainer();
        if (zoomContainer) {
          const shareBtn = L.DomUtil.create('a', 'leaflet-control-zoom-share');
          // Insert as first (top) control above zoom in/out
          if (zoomContainer.firstChild) {
            zoomContainer.insertBefore(shareBtn, zoomContainer.firstChild);
          } else {
            zoomContainer.appendChild(shareBtn);
          }
          shareBtn.href = '#';
          shareBtn.title = 'Share Workbench';
          shareBtn.setAttribute('role','button');
          shareBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>';
          L.DomEvent.on(shareBtn, 'click', (e) => {
            L.DomEvent.preventDefault(e);
            handleShowShareModal();
          });
        }
      } catch(e) {
        console.warn('Could not append share button to zoom control', e);
      }
      
      // Add error handling for map controls
      const handleMapError = (error) => {
        if (!error || !error.message) return;
        if (error.message.includes('_leaflet_pos')) {
          // Centralised lightweight recovery – no global handler recursion
          const mapOk = mapRef.current && mapRef.current.getContainer?.();
          if (!mapOk) return;
          // Avoid hammering invalidateSize during sidebar animation
          if (mapRef.current._sidebarAnimating) {
            mapRef.current._pendingResize = true;
            return;
          }
          let attempts = 0;
          const retry = () => {
            attempts++;
            if (!mapRef.current) return;
            try {
              mapRef.current.invalidateSize?.();
            } catch (e) {
              if (attempts < 3) {
                return setTimeout(retry, 120 * attempts);
              }
            }
          };
          setTimeout(retry, 50);
        }
      };

      // Helper to check map visibility / readiness before size ops
      const isMapReady = () => {
        if (!mapRef.current) return false;
        const c = mapRef.current.getContainer?.();
        if (!c) return false;
        // offsetParent null means display:none in ancestor – wait until visible
        return c.offsetParent !== null;
      };

  // Removed separate ShareButtonControl; share button now part of zoom control
      
      // Add sidebar collapse/expand handler to fix map positioning (debounced & guarded)
      const handleSidebarToggle = () => {
        if (!mapRef.current) return;
        mapRef.current._sidebarAnimating = true;
        const startTime = Date.now();
        const finish = () => {
          if (!mapRef.current) return;
          mapRef.current._sidebarAnimating = false;
          if (mapRef.current._pendingResize) {
            mapRef.current._pendingResize = false;
            safeInvalidate();
          }
          // Try flushing deferred map operations once animation completely ends
          setTimeout(flushOpQueue, 40);
        };
        const safeInvalidate = () => {
          if (!mapRef.current) return;
            if (!isMapReady()) {
              // Try again shortly but bail out after ~2s
              if (Date.now() - startTime < 2000) {
                return setTimeout(safeInvalidate, 120);
              }
              finish();
              return;
            }
          try {
            mapRef.current.invalidateSize?.();
          } catch (e) {
            // Swallow and retry lightly if early
            if (Date.now() - startTime < 1500) {
              return setTimeout(safeInvalidate, 160);
            }
          }
          // One more delayed pass to stabilize tiles / overlays
          setTimeout(() => {
            try { mapRef.current?.invalidateSize?.(); } catch {}
            finish();
          }, 250);
        };
        // Initial delay to allow CSS transition
        setTimeout(safeInvalidate, 220);
      };
      
      // Listen for sidebar toggle events (attribute class changes)
      const observer = new MutationObserver((mutations) => {
        let shouldHandle = false;
        for (const mutation of mutations) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const cls = mutation.target.classList;
            if (cls.contains('sb-sidenav-toggled') || cls.contains('desktop-sidebar')) {
              shouldHandle = true; break;
            }
          }
        }
        if (shouldHandle) handleSidebarToggle();
      });
      
      // Observe body for sidebar class changes
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
      });
      
      // Store references for cleanup
      mapRef.current._errorHandler = handleMapError;
      mapRef.current._sidebarObserver = observer;

        // Custom attribution control with better positioning
        const attributionControl = L.control.attribution({
          prefix: '<a href="https://www.spc.int/" target="_blank">SPC</a> | © Pacific Community SPC',
          position: 'bottomright'
        }).addTo(mapRef.current);
        
        // Add custom styles to ensure proper positioning and visibility
        const attributionStyle = document.createElement('style');
        attributionStyle.textContent = `
          .leaflet-control-attribution {
            background: hsla(0, 0%, 100%, .8);
            color: #333 !important;
            font-size: 11px !important;
            
            
            margin: 0 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 300px !important;
            min-width: 180px !important;
            line-height: 1.2 !important;
            z-index: 1000 !important;
            position: absolute !important;
            bottom: 2px !important;
            left: auto !important;
            right: 5px !important;
            top: auto !important;
           
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            display: flex !important;
            align-items: center !important;
          }
          .leaflet-control-attribution a {
            color: #0066cc !important;
            text-decoration: none !important;
            font-weight: 500 !important;
            white-space: nowrap !important;
          }
          .leaflet-control-attribution a:hover {
            text-decoration: underline !important;
            color: #004499 !important;
          }
          .leaflet-container .leaflet-control-attribution {
            background: rgba(255, 255, 255, 0.9) !important;
            margin: 0 !important;
            padding: 4px 8px !important;
            white-space: nowrap !important;
          }
        `;
        document.head.appendChild(attributionStyle);
        
        // Ensure attribution is properly positioned after map initialization
        setTimeout(() => {
          const attributionElement = document.querySelector('.leaflet-control-attribution');
          if (attributionElement) {
            attributionElement.style.bottom = '5px';
            attributionElement.style.left = 'auto';
            attributionElement.style.right = '5px';
            attributionElement.style.top = 'auto';
            attributionElement.style.zIndex = '1000';
            attributionElement.style.whiteSpace = 'nowrap';
            attributionElement.style.overflow = 'hidden';
            attributionElement.style.textOverflow = 'ellipsis';
          }
        }, 100);
        let storedBaseMap = null;
        try {
          storedBaseMap = JSON.parse(localStorage.getItem('basemap'));
        } catch (e) {
          storedBaseMap = null;
        }

        // Step 2: Choose which basemap to use
        // If storedBaseMap exists and has a url, use it; else use Redux basemap
        const initialBasemap = (storedBaseMap && storedBaseMap.url) ? storedBaseMap : basemap;
       // console.log(initialBasemap)
        setSelectedOption(initialBasemap.option);
        // Step 3: Sync Redux if needed
        // If the stored basemap differs from Redux, update Redux
        // (You may want to check by url or attribution or both)
        if (storedBaseMap && storedBaseMap.url !== basemap.url) {
          dispatch(setBaseMapLayer(storedBaseMap)); // update Redux store
        }
        // Step 4: Add basemap layer
        if (initialBasemap.url.includes('opentopomap')) {
          L.tileLayer(initialBasemap.url, {
            attribution: initialBasemap.attribution || '© Pacific Community SPC'
          }).addTo(mapRef.current);
          isBing.current = false;
        } else if (initialBasemap.url.includes('bing') || initialBasemap.url.includes('ocean-plotter.spc.int/plotter/cache/basemap')) {
          L.tileLayer(initialBasemap.url, {
            attribution: initialBasemap.attribution || '© Pacific Community SPC | Tiles &copy; Esri &mdash; Source: Esri, ...',
            maxZoom: 18,
            minZoom: 2
          }).addTo(mapRef.current);
          isBing.current = true;
        } else {
          L.tileLayer(initialBasemap.url, {
            attribution: initialBasemap.attribution || '© Pacific Community SPC'
          }).addTo(mapRef.current);
          isBing.current = false;
        }

        /*
        // Check if we should use satellite view based on selectedOption
        if (selectedOption === 'bing') {
          // Use ESRI World Imagery for satellite view (free alternative to Bing)
          const satelliteLayer = L.tileLayer('https://ocean-plotter.spc.int/plotter/cache/basemap/{z}/{x}/{y}.png', {
            attribution: '© Pacific Community SPC | Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 18,
            minZoom: 2
          }).addTo(mapRef.current);
          isBing.current = true;
        } else {
          // Use SPC OpenStreetMap tiles as default
          const defaultBasemapLayer = L.tileLayer(basemap.url, {
            attribution: '© Pacific Community SPC',
          }).addTo(mapRef.current);
          isBing.current = false;
        }*/
      
      // Add fallback mechanism for SPC tiles (only if not using satellite)
      const checkSPCTilesLoaded = () => {
        // Only check SPC tiles if we're not using satellite view
        if (selectedOption !== 'bing') {
          setTimeout(() => {
            const tiles = document.querySelectorAll('img[src*="spc-osm.spc.int"]');
            let failedTiles = 0;
            let totalTiles = tiles.length;
            
            tiles.forEach(tile => {
              if (tile.naturalWidth === 0 || tile.complete === false) {
                failedTiles++;
              }
            });
            
            // If more than 50% of SPC tiles failed, switch to Bing Maps fallback
            if (totalTiles > 0 && failedTiles > totalTiles * 0.5) {
           //   console.warn('SPC tiles failed to load, switching to Bing Maps fallback');
              isBing.current = true;
              
              // Remove SPC layer
              mapRef.current.eachLayer(layer => {
                if (layer._url && layer._url.includes('spc-osm.spc.int')) {
                  mapRef.current.removeLayer(layer);
                }
              });
           
            }
          }, 3000); // Check after 3 seconds
        }
      };
      
      checkSPCTilesLoaded();

       //North Arrow - positioned at bottom left
      legendColorRef2.current = L.control({ position: "bottomleft", id:22 });
      legendColorRef2.current.onAdd = function() {
          var div = L.DomUtil.create("div", "legend");
          div.innerHTML += "<img src='/north_arrow.png' alt='North Arrow' width='50px' height='60px'>";
          div.style.backgroundColor = "transparent";
          div.style.marginLeft = '10px';
          div.style.marginBottom = '10px'; // Reduced margin to move closer to bottom
          div.style.zIndex = '999';
          div.style.position = 'absolute';
          div.style.bottom = '10px';
          div.style.left = '10px';
         // div.style.width = '50px';
         L.DomEvent.disableClickPropagation(div);
         return div;
        };
        legendColorRef2.current.addTo(mapRef.current);

      // Create a custom control with custom positioning
      const MapControls = L.Control.extend({
        onAdd: function(map) {
          const container = L.DomUtil.create('div', 'map-controls-container');
          container.style.position = 'absolute';
          container.style.right = '16px';
          container.style.top = '10px';
          container.style.zIndex = '1000';
          
          // Create the controls div inside the container
          const div = L.DomUtil.create('div', 'map-controls');
          container.appendChild(div);
          
          // Store reference to the div for later use
          this._div = div;
          return container;
        },
        getContainer: function() {
          return this._div;
        }
      });
      
      // Create the custom control instance
      legendColorRef.current = new MapControls({ position: 'topright' });
      legendColorRef.current.onAdd = function() {
        // Create a container div with the map-controls-container class
        var container = L.DomUtil.create("div", "map-controls-container");
        // Create the controls div inside the container
        var div = L.DomUtil.create("div", "map-controls");
        container.appendChild(div);
        
        // Add styles for the map controls
        const style = document.createElement('style');
        style.textContent = `
          .map-controls {
            background: var(--color-surface) !important;
            padding: 12px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            color: var(--color-text) !important;
            font-family: inherit;
            font-size: 13px;
            line-height: 1.5;
            border: 1px solid var(--color-border, #dee2e6);
          }
          .map-controls .section-title {
            font-weight: 600;
            margin: 0 0 8px 0;
            color: var(--color-primary);
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .map-controls label {
            display: flex;
            align-items: center;
            padding: 4px 8px;
            margin: 2px 0;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s;       
          }
          .map-controls label:hover {
            background-color: var(--color-background);
          }
          .map-controls input[type="radio"],
          .map-controls input[type="checkbox"] {
            margin-right: 8px;
            accent-color: var(--color-primary);
            cursor: pointer;
          }
          .map-controls .divider {
            height: 1px;
            background-color: var(--color-border, #dee2e6);
            margin: 10px 0;
            border: none;
          }
        `;
        document.head.appendChild(style);

        // Add collapsible functionality
        div.innerHTML = `
          <div class="section-title" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; z-index: 10; position: relative;">
            <span>Base Map</span>
            <span class="toggle-icon">-</span>
          </div>
          <div class="basemap-options" >
            <label>
              <input 
                type="radio" 
                name="option" 
                value="opentopo" 
                id="opentopo-radio" 
                ${selectedOption === 'opentopo' ? 'checked' : ''}
              /> OpenStreetMap
            </label>
            <label>
              <input 
                type="radio" 
                name="option" 
                value="osm" 
                id="osm-radio" 
                ${selectedOption === 'osm' ? 'checked' : ''}
              /> OpenTopoMap
            </label>
            <label>
              <input 
                type="radio" 
                name="option" 
                value="bing" 
                id="bing-radio" 
                ${selectedOption === 'bing' ? 'checked' : ''}
              /> Satellite
            </label>
          </div>
          <div class="divider"></div>
          <div class="section-title layers-title" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
            <span>Layers</span>
            <span class="toggle-icon">-</span>
          </div>
          <div class="layer-options">
            <label>
              <input
                id="eez-check" 
                type="checkbox"
                ${checkboxChecked ? 'checked' : ''}
              /> Pacific EEZ
            </label>
            <label>
              <input
                id="coast-check" 
                type="checkbox"
                ${checkboxCheckedCoast ? 'checked' : ''}
              /> Pacific Coastline
            </label>
            <label>
              <input
                id="city-check" 
                type="checkbox"
                ${checkboxCheckedCity ? 'checked' : ''}
              /> Pacific Names
            </label>
          </div>
        `;
        
        // Add click handlers for collapsible sections
        const basemapTitle = div.querySelector('.section-title:first-child');
        const layersTitle = div.querySelector('.layers-title');
        const basemapOptions = div.querySelector('.basemap-options');
        const layerOptions = div.querySelector('.layer-options');
        
        basemapTitle.addEventListener('click', function() {
          const isHidden = basemapOptions.style.display === 'none';
          basemapOptions.style.display = isHidden ? 'block' : 'none';
          this.querySelector('.toggle-icon').textContent = isHidden ? '-' : '+';
        });
        
        layersTitle.addEventListener('click', function() {
          const isHidden = layerOptions.style.display === 'none';
          layerOptions.style.display = isHidden ? 'block' : 'none';
          this.querySelector('.toggle-icon').textContent = isHidden ? '-' : '+';
        });
        
        // Initialize sections as expanded
  basemapOptions.style.display = 'none';
  // Set toggle icon to '+' when collapsed
  const basemapToggleIcon = basemapTitle.querySelector('.toggle-icon');
  if (basemapToggleIcon) basemapToggleIcon.textContent = '+';
        layerOptions.style.display = 'block';
      
        // Add event listeners to the radio buttons
        const opentopoRadio = div.querySelector("#opentopo-radio");
        const osmRadio = div.querySelector("#osm-radio");
        const bingRadio = div.querySelector("#bing-radio");
        const eezCheck = div.querySelector("#eez-check");
        const coastCheck = div.querySelector("#coast-check");
        const citynameCheck = div.querySelector("#city-check");
      
        // Add event listeners to the radio buttons
        opentopoRadio.addEventListener("change", handleRadioChange);
        osmRadio.addEventListener("change", handleRadioChange);
        bingRadio.addEventListener("change", handleRadioChange);
        eezCheck.addEventListener("change", handleCheckboxChange);
        coastCheck.addEventListener("change", handleCheckboxChangeCoast);
        citynameCheck.addEventListener("change", handleCheckboxChangeCity);
        // Return the container to Leaflet
        L.DomEvent.disableClickPropagation(container);
        return container;
      };
      
        if (mapRef.current && isMapInitialized.current) {
          try {
        legendColorRef.current.addTo(mapRef.current);
          } catch (error) {
            console.error('Error adding legend control to map:', error);
          }
        }
   
        
        if (mapRef.current && isMapInitialized.current) {
          // Guard: defer layer mutation while sidebar animating or container hidden
          const canOperate = () => {
            if (!mapRef.current) return false;
            if (mapRef.current._sidebarAnimating) return false;
            const c = mapRef.current.getContainer?.();
            if (!c) return false;
            if (c.offsetParent === null) return false; // hidden
            // zero width/height -> layout not settled
            const r = c.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return false;
            return true;
          };
          // If Leaflet not fully loaded yet, wait
          if (!mapRef.current._loaded) {
            setTimeout(() => {
              if (mapRef.current && mapRef.current._loaded) {
                try { mapRef.current.invalidateSize?.(); } catch {}
              }
            }, 120);
            return; // exit this render cycle
          }
          if (!canOperate()) {
            // schedule a retry shortly; avoid tight loop
            setTimeout(() => {
              if (mapRef.current && !mapRef.current._sidebarAnimating) {
                try { mapRef.current.invalidateSize?.(); } catch {}
              }
            }, 240);
            // Skip this cycle; effect will retrigger via state/prop changes naturally
          } else {
            try {
              // Ensure map pane has a position to avoid _leaflet_pos undefined
              if (mapRef.current._mapPane && !mapRef.current._mapPane._leaflet_pos) {
                try { L.DomUtil.setPosition(mapRef.current._mapPane, L.point(0,0)); } catch {}
              }
              mapRef.current.eachLayer((layer) => {
        if (layer._url !== 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png') {
          
          
        }
        else if (layer._url !== 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'){

        }
        else if(layer.options.bingMapsKey !== 'AnIOo4KUJfXXnHB2Sjk8T_zV-tI7FkXplU1efiiyTYrlogDKppodCvsY7-uhRe8P'){

        }
        else{
          //if(layer.layer_information.is_timeseries){
            setShowTime(false)
          //}
          mapRef.current.removeLayer(layer);
        }
      });
            } catch (error) {
              console.error('Error processing map layers:', error);
            }
          }
        }
      
       //Add new layers from state

        if(layers.length === 0){
          setShowTime(false)
        }
  
        if (bounds && mapRef.current && isMapInitialized.current) {
          safeFitBoundsGlobal(bounds);
        }
        const layerGroup = L.layerGroup();
       //   console.log('Map useEffect triggered with layers:', layers);

    layers.forEach(layer => {
    /*  console.log("Processing layer:", {
        id: layer.layer_information.id,
        title: layer.layer_information.layer_title,
        type: layer.layer_information.layer_type,
        enabled: layer.layer_information.enabled,
        url: layer.layer_information.url
      });*/

      if(layer.layer_information.enabled && !layer.layer_information.enable_cog ){
        var layer_Type = layer.layer_information.layer_type;
        layer_Type = layer_Type.replace("_FORECAST", "");
        if(layer_Type == "WMS" ){
          var dateToDisplay = layer.layer_information.timeIntervalStart;
          if (layer.layer_information.is_timeseries){
            dateToDisplay = layer.layer_information.timeIntervalStart;
          }
          else if (layer.layer_information.layer_type == "WMS_FORECAST" || layer.layer_information.layer_type == "WMS_UGRID"){
            dateToDisplay = layer.layer_information.timeIntervalStart;
          }
          else{
            dateToDisplay = layer.layer_information.timeIntervalEnd;
            
          }
         // console.log(layer.layer_information.timeIntervalStart,layer.layer_information.timeIntervalEnd, dateToDisplay)
         setIsLoading(true); 
      if(!layer.layer_information.is_timeseries){
        if (layer.layer_information.is_composite) {
          var layername = layer.layer_information.layer_name.split(',');
          var stylname = layer.layer_information.style.split(',');
          const bbox = [-23.5, -176, -15.5, -173];
          const wmsLayer = addWMSTileLayer(mapRef.current, layer.layer_information.url, {
            id: layer.layer_information.id,
            layers: layername[0],
            format: 'image/png',
            transparent: true,
            opacity: layer.layer_information.opacity,
            styles: stylname[0],
            colorscalerange: layer.layer_information.colormin+", "+layer.layer_information.colormax,
            abovemaxcolor: layer.layer_information.abovemaxcolor,
            belowmincolor: layer.layer_information.belowmincolor,
            numcolorbands: layer.layer_information.numcolorbands,
            time: dateToDisplay,
            logscale: layer.layer_information.logscale,
           // crs: L.CRS.EPSG4326,  // Define CRS as EPSG:4326
            //bbox: bbox,
          },handleShow);
          addLayerWithLoading(layerGroup, wmsLayer, setIsLoading);
          //layerGroup.addLayer(wmsLayer);
  
          const wmsLayer2 = addWMSTileLayer(mapRef.current, layer.layer_information.url, {
            id: layer.layer_information.id,
            layers: layername[1],
            format: 'image/png',
            transparent: true,
            opacity: layer.layer_information.opacity,
            styles: stylname[1],
            time: dateToDisplay,
            logscale: layer.layer_information.logscale,
           // crs: L.CRS.EPSG4326,
            //crs: L.CRS84,  // Define CRS as EPSG:4326
            //bbox: bbox,
          },handleShow);
  
          // Add the second layer of the composite
          addLayerWithLoading(layerGroup, wmsLayer2, setIsLoading);
          //layerGroup.addLayer(wmsLayer2);

          if (layername[2] != "" ){
            //console.log('layer 333')
          const wmsLayer3 = addWMSTileLayer(mapRef.current, layer.layer_information.url, {
            id: layer.layer_information.id,
            layers: layername[2],
            format: 'image/png',
            transparent: true,
            opacity: layer.layer_information.opacity,
            styles: stylname[2],
            time: dateToDisplay,
            logscale: layer.layer_information.logscale,
           // crs: L.CRS.EPSG4326,
            //crs: L.CRS84,  // Define CRS as EPSG:4326
            //bbox: bbox,
          },handleShow);
  
          // Add the second layer of the composite
          //layerGroup.addLayer(wmsLayer3);
          addLayerWithLoading(layerGroup, wmsLayer3, setIsLoading);
        }
        }
        else{

        const wmsLayer = addWMSTileLayer(mapRef.current, layer.layer_information.url, {
          id: layer.layer_information.id,
          layers: layer.layer_information.layer_name,
          format: 'image/png',
          transparent: true,
          opacity: layer.layer_information.opacity,
          styles: layer.layer_information.style,
          colorscalerange: layer.layer_information.colormin+", "+layer.layer_information.colormax,
          //abovemaxcolor: layer.layer_information.abovemaxcolor,
          //belowmincolor: layer.layer_information.belowmincolor,
          numcolorbands: layer.layer_information.numcolorbands,
          time: dateToDisplay,
          logscale: layer.layer_information.logscale,
          //crs: L.CRS.EPSG4326
        },handleShow);
        addLayerWithLoading(layerGroup, wmsLayer, setIsLoading);

       //layerGroup.addLayer(wmsLayer);
      }
    }
    else{
      if (layer.layer_information.is_composite) {
        var layername = layer.layer_information.layer_name.split(',');
        var stylname = layer.layer_information.style.split(',');
        const bbox = [-23.5, -176, -15.5, -173];
        const wmsLayer = addWMSTileLayer(mapRef.current, layer.layer_information.url, {
          id: layer.layer_information.id,
          layers: layername[0],
          format: 'image/png',
          transparent: true,
          opacity: layer.layer_information.opacity,
          styles: stylname[0],
          colorscalerange: layer.layer_information.colormin+", "+layer.layer_information.colormax,
          abovemaxcolor: layer.layer_information.abovemaxcolor,
          belowmincolor: layer.layer_information.belowmincolor,
          numcolorbands: layer.layer_information.numcolorbands,
          time: dateToDisplay,
          logscale: layer.layer_information.logscale,
          //crs: L.CRS.EPSG4326,  // Define CRS as EPSG:4326
          //bbox: bbox,
        },handleShow);
        // Track loading state
       // addLayerWithLoading(layerGroup, wmsLayer, setIsLoading);
        layerGroup.addLayer(wmsLayer);

        const wmsLayer2 = addWMSTileLayer(mapRef.current, layer.layer_information.url, {
          id: layer.layer_information.id,
          layers: layername[1],
          format: 'image/png',
          transparent: true,
          opacity: layer.layer_information.opacity,
          styles: stylname[1],
          time: dateToDisplay,
          logscale: layer.layer_information.logscale,
          //crs: L.CRS.EPSG4326,
          //crs: L.CRS84,  // Define CRS as EPSG:4326
          //bbox: bbox,
        },handleShow);

        // Add the second layer of the composite
        addLayerWithLoading(layerGroup, wmsLayer2, setIsLoading);
        //layerGroup.addLayer(wmsLayer2);
      }
      else{
        const wmsLayer = addWMSTileLayer(mapRef.current, layer.layer_information.url, {
          id: layer.layer_information.id,
          layers: layer.layer_information.layer_name,
          format: 'image/png',
          transparent: true,
          opacity: layer.layer_information.opacity,
          styles: layer.layer_information.style,
          colorscalerange: layer.layer_information.colormin+", "+layer.layer_information.colormax,
          abovemaxcolor: layer.layer_information.abovemaxcolor,
          belowmincolor: layer.layer_information.belowmincolor,
          numcolorbands: layer.layer_information.numcolorbands,
          time: dateToDisplay,
          logscale: layer.layer_information.logscale,
         // crs: L.CRS.EPSG4326,
        },handleShow);
        //layerGroup.addLayer(wmsLayer);
        addLayerWithLoading(layerGroup, wmsLayer, setIsLoading);
      }
     

  }
  layerGroup.addTo(mapRef.current);
    setWmsLayerGroup(layerGroup); 
    //set Bounds
    if(layer.layer_information.zoomToLayer){
      if (bounds === null) {
  safeFitBoundsGlobal(L.latLngBounds([[layer.south_bound_latitude, layer.east_bound_longitude],[layer.north_bound_latitude, layer.west_bound_longitude]]));
     }
    }
        }
        else if(layer.layer_information.layer_type == "WMS_UGRID"){
          if (layer.layer_information.is_composite) {
            var layername = layer.layer_information.layer_name.split('%');
            var stylname = layer.layer_information.style.split('%');
            var url = layer.layer_information.url.split('%');
          setIsLoading(true); 
          var dateToDisplay = layer.layer_information.timeIntervalStart;
          const wmsLayer = addWMSTileLayer(mapRef.current, url[0], {
            id: layer.layer_information.id,
            layers: layername[0],
            format: "image/png",
            opacity: layer.layer_information.opacity,
            styles: stylname[0],
            colorscalerange: layer.layer_information.colormin+", "+layer.layer_information.colormax,
            abovemaxcolor: layer.layer_information.abovemaxcolor,
            belowmincolor: layer.layer_information.belowmincolor,
            numcolorbands: layer.layer_information.numcolorbands,
            time: dateToDisplay,
            logscale: layer.layer_information.logscale,
            bgcolor:"extend",
            crs: L.CRS.EPSG4326
        }, handleShow);
          layerGroup.addLayer(wmsLayer);

          const wmsLayer2 = addWMSTileLayer(mapRef.current, url[1], {
            id: layer.layer_information.id,
            layers: layername[1],
            format: "image/png",
            transparent: true,
            opacity: layer.layer_information.opacity,
            styles: stylname[1],
            colorscalerange: layer.layer_information.colormin+", "+layer.layer_information.colormax,
            abovemaxcolor: layer.layer_information.abovemaxcolor,
            belowmincolor: layer.layer_information.belowmincolor,
            numcolorbands: layer.layer_information.numcolorbands,
            time: dateToDisplay,
            logscale: layer.layer_information.logscale,
            bgcolor:"extend",
            crs: L.CRS.EPSG4326
          },handleShow);
          

          setWmsLayerGroup(layerGroup); 
          addLayerWithLoading(layerGroup, wmsLayer2, setIsLoading);
        }
        else{

          setIsLoading(true); 
          var dateToDisplay = layer.layer_information.timeIntervalStart;
          const wmsLayer = addWMSTileLayer(mapRef.current, layer.layer_information.url, {
            id: layer.layer_information.id,
            layers: layer.layer_information.layer_name,
            format: "image/png",
            opacity: layer.layer_information.opacity,
            styles: layer.layer_information.style,
            colorscalerange: layer.layer_information.colormin+", "+layer.layer_information.colormax,
            abovemaxcolor: layer.layer_information.abovemaxcolor,
            belowmincolor: layer.layer_information.belowmincolor,
            numcolorbands: layer.layer_information.numcolorbands,
            time: dateToDisplay,
            logscale: layer.layer_information.logscale,
            bgcolor:"extend",
            crs: L.CRS.EPSG4326
        }, handleShow);

          layerGroup.addLayer(wmsLayer);
          setWmsLayerGroup(layerGroup); 
          addLayerWithLoading(layerGroup, wmsLayer, setIsLoading);

        }
          //set Bounds
          if(layer.layer_information.zoomToLayer){
            if (bounds === null) {
            safeFitBoundsGlobal(L.latLngBounds([[layer.south_bound_latitude, layer.east_bound_longitude],[layer.north_bound_latitude, layer.west_bound_longitude]]));
           }
          }
        }
        else if(layer.layer_information.layer_type == "WMS_HINDCAST"){
          var dateToDisplay = layer.layer_information.timeIntervalEnd;
          const compositeLayerId = layer.layer_information.composite_layer_id; // e.g. 'ww3.glob_24m./%Y%m/.nc'
          const url = layer.layer_information.url; // e.g. 'https://gemthreddshpc.spc.int/thredds/wms/POP/model/regional/bom/hindcast/hourly/wavewatch3/PROD/latest.ncml'
                  
                  // 1. Split composite_layer_id by '/'
          const compositeParts = compositeLayerId.split('/');
          // compositeParts = ['ww3.glob_24m.', '%Y%m', '.nc']

          // 2. Format the date as %Y%m
          function formatYearMonth(dateString) {
            const d = new Date(dateString);
            const yyyy = d.getUTCFullYear();
            const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
            return `${yyyy}${mm}`;
          }
          const formattedDate = formatYearMonth(dateToDisplay); // '202412'

          // 3. Construct new filename
          const newFilename = compositeParts[0] + formattedDate + compositeParts[compositeParts.length - 1];
          // 'ww3.glob_24m.202412.nc'

          // 4. Replace the last part of the url with new filename
          const urlParts = url.split('/');
          urlParts[urlParts.length - 1] = newFilename;
          const newUrl = urlParts.join('/');

          if (layer.layer_information.is_composite) {
        var layername = layer.layer_information.layer_name.split(',');
        var stylname = layer.layer_information.style.split(',');
        const bbox = [-23.5, -176, -15.5, -173];
        const wmsLayer = addWMSTileLayer(mapRef.current, newUrl, {
          id: layer.layer_information.id,
          layers: layername[0],
          format: 'image/png',
          transparent: true,
          opacity: layer.layer_information.opacity,
          styles: stylname[0],
          colorscalerange: layer.layer_information.colormin+", "+layer.layer_information.colormax,
          abovemaxcolor: layer.layer_information.abovemaxcolor,
          belowmincolor: layer.layer_information.belowmincolor,
          numcolorbands: layer.layer_information.numcolorbands,
          time: dateToDisplay,
          logscale: layer.layer_information.logscale,
          //crs: L.CRS.EPSG4326,  // Define CRS as EPSG:4326
          //bbox: bbox,
        },handleShow);
        // Track loading state
       // addLayerWithLoading(layerGroup, wmsLayer, setIsLoading);
        layerGroup.addLayer(wmsLayer);

        const wmsLayer2 = addWMSTileLayer(mapRef.current, newUrl, {
          id: layer.layer_information.id,
          layers: layername[1],
          format: 'image/png',
          transparent: true,
          opacity: layer.layer_information.opacity,
          styles: stylname[1],
          time: dateToDisplay,
          logscale: layer.layer_information.logscale,
          //crs: L.CRS.EPSG4326,
          //crs: L.CRS84,  // Define CRS as EPSG:4326
          //bbox: bbox,
        },handleShow);

        // Add the second layer of the composite
        addLayerWithLoading(layerGroup, wmsLayer2, setIsLoading);
        //layerGroup.addLayer(wmsLayer2);
      }
      else{

        const wmsLayer = addWMSTileLayer(mapRef.current, newUrl, {
          id: layer.layer_information.id,
          layers: layer.layer_information.layer_name,
          format: 'image/png',
          transparent: true,
          opacity: layer.layer_information.opacity,
          styles: layer.layer_information.style,
          colorscalerange: layer.layer_information.colormin+", "+layer.layer_information.colormax,
          abovemaxcolor: layer.layer_information.abovemaxcolor,
          belowmincolor: layer.layer_information.belowmincolor,
          numcolorbands: layer.layer_information.numcolorbands,
          time: dateToDisplay,
          logscale: layer.layer_information.logscale,
         // crs: L.CRS.EPSG4326,
        },handleShow);
        //layerGroup.addLayer(wmsLayer);
        addLayerWithLoading(layerGroup, wmsLayer, setIsLoading);
      }
          //set Bounds
          if(layer.layer_information.zoomToLayer){
            if (bounds === null) {
            safeFitBoundsGlobal(L.latLngBounds([[layer.south_bound_latitude, layer.east_bound_longitude],[layer.north_bound_latitude, layer.west_bound_longitude]]));
           }
          }
        }
    else if(layer.layer_information.layer_type == "WFS"){
      //PLOT marker here
      var geojson_url =  layer.layer_information.url;
      //console.log("TEST_1")
      fetchAndPlotGeoJSON(geojson_url, layer.layer_information.id);
    }
    else if(layer.layer_information.layer_type == "SOFAR"){
      //PLOT marker here
     /* console.log("Processing SOFAR layer:", {
        id: layer.layer_information.id,
        enabled: layer.layer_information.enabled,
        selectedTypes: layer.layer_information.selectedSofarTypes
      });*/
      var geojson_url =  layer.layer_information.url;
      //fetchFromSOFAR(geojson_url, layer.layer_information.id);
      // console.log("ID" + layer.layer_information.id);
      // Get selected SOFAR types from layer information, default to all if not set
      const selectedTypes = layer.layer_information.selectedSofarTypes || [];
    //  console.log(selectedTypes)
      // fetchWaveBuoy(geojson_url, layer.layer_information.id, selectedTypes);// prod
      fetchWaveBuoy(layer.layer_information.url, layer.layer_information.id, selectedTypes); //local
    }
    else if(layer.layer_information.layer_type == "TIDE"){
      //PLOT marker here
      var geojson_url =  layer.layer_information.url;
      //fetchFromSOFAR(geojson_url, layer.layer_information.id);

      fetchAndPlotGeoJSONTIDE(geojson_url, layer.layer_information.id);

    }
    else{
     /* console.log('Layer not enabled or unknown type:', {
        id: layer.layer_information.id,
        title: layer.layer_information.layer_title,
        type: layer.layer_information.layer_type,
        enabled: layer.layer_information.enabled
      });*/
    }
      }
      else{
       var layer_Type = layer.layer_information.layer_type;
        layer_Type = layer_Type.replace("_FORECAST", "");
        if(layer_Type == "WMS" ){
          var dateToDisplay = layer.layer_information.timeIntervalStart;
          if (layer.layer_information.is_timeseries){
            dateToDisplay = layer.layer_information.timeIntervalStart;
          }
          else if (layer.layer_information.layer_type == "WMS_FORECAST" || layer.layer_information.layer_type == "WMS_UGRID"){
            dateToDisplay = layer.layer_information.timeIntervalStart;
          }
          else{
            dateToDisplay = layer.layer_information.timeIntervalEnd;
            
          }
         // console.log(layer.layer_information.timeIntervalStart,layer.layer_information.timeIntervalEnd, dateToDisplay)
        
        if (layer.layer_information.enabled && layer.layer_information.cog_params !== null){
         setIsLoading(true); 
        const cogParamsString = layer.layer_information.cog_params;
        const cogLayer = addCOGTileLayer(mapRef.current, cogParamsString, {
          extraParams: {
            layer_id:layer.layer_information.id,
            url: layer.layer_information.url,              // dataset/source URL
            variable: layer.layer_information.layer_name,  // variable to render
            time: dateToDisplay                            // ISO date
          },
          enforceBounds: true,                             // keep your 100/300/-45/45 bounds
          tileOptions: { opacity: layer.layer_information.opacity }
        })

        // Use your existing loader and group
        addLayerWithLoading(layerGroup, cogLayer, setIsLoading);
        layerGroup.addTo(mapRef.current);
        setWmsLayerGroup(layerGroup);
      }





      }
      }
  //setIsLoading(false);
    });

   
  
       // Function to handle map move/zoom
       const handleMoveEnd = () => {
        if (mapRef.current && isMapInitialized.current) {
          try {
          const newCenter = mapRef.current.getCenter();
          const newZoom = mapRef.current.getZoom();
          const newBounds = mapRef.current.getBounds();
      
          // Extract serializable data from the LatLngBounds object
          const serializableBounds = {
            south: newBounds.getSouth(),
            west: newBounds.getWest(),
            north: newBounds.getNorth(),
            east: newBounds.getEast(),
          };
      
          // Dispatch serializable data
          dispatch(setCenter([newCenter.lat, newCenter.lng]));
          dispatch(setZoom(newZoom));
          dispatch(setBounds(serializableBounds)); // Dispatch serializable bounds
          } catch (error) {
            console.error('Error handling map move/zoom:', error);
          }
        }
      };

  
      mapRef.current.on('moveend', handleMoveEnd);

      mapRef.current.on('click', (e) => {
        if (mapRef.current && isMapInitialized.current) {
          try {
        const lat = e.latlng.lat;  // Get the latitude (y)
        const lng = e.latlng.lng;  // Get the longitude (x)
        var p1 = mapRef.current.latLngToContainerPoint(e.latlng);
        var x = p1.x;
        var y = p1.y;
        var size = mapRef.current.getSize();
        var sizex = size.x;
        var sizey = size.y;
        var bbox = mapRef.current.getBounds().toBBoxString();
        var station = null;
        // Dispatch these values to the Redux store
        dispatch(setCoordinates({ x, y, sizex, sizey,bbox,station }));
          } catch (error) {
            console.error('Error handling map click:', error);
          }
        }
      });
    

        return () => {
          if (mapRef.current && isMapInitialized.current) {
            try {
              // Cleanup observers and event listeners
              if (mapRef.current._sidebarObserver) {
                mapRef.current._sidebarObserver.disconnect();
              }
              
              // Remove global error handler
              window.removeEventListener('error', (event) => {
                if (event.error && event.error.message && event.error.message.includes('_leaflet_pos')) {
                  event.preventDefault();
                  if (mapRef.current._errorHandler) {
                    mapRef.current._errorHandler(event.error);
                  }
                }
              });
              
              mapRef.current.remove();
            } catch (error) {
              console.error('Error removing map:', error);
            }
            isMapInitialized.current = false;
          }
        };
      }, [dispatch,layers,basemap]);


  // Update map bounds when Redux bounds change
  useEffect(() => {
    if (mapRef.current && isMapInitialized.current && bounds) {
      try {
      const { west, east, south, north } = bounds;
  
      // Get the current bounds of the map
      const currentBounds = mapRef.current.getBounds();
  
      // Check if the new bounds are significantly different from the current bounds
      const areBoundsDifferent =
        Math.abs(currentBounds.getWest() - west) > 0.01 ||
        Math.abs(currentBounds.getEast() - east) > 0.01 ||
        Math.abs(currentBounds.getSouth() - south) > 0.01 ||
        Math.abs(currentBounds.getNorth() - north) > 0.01;
  
      if (areBoundsDifferent) {
        // Update the map bounds only if they are significantly different
        const newBounds = L.latLngBounds(
          [south, west], // Southwest corner
          [north, east] // Northeast corner
        );
  safeFitBoundsGlobal(newBounds);
        }
      } catch (error) {
        console.error('Error updating map bounds:', error);
      }
    }
  }, [bounds]);

  // Handle sidebar collapse/expand - invalidate map size when sidebar toggles
  useEffect(() => {
    if (mapRef.current && isMapInitialized.current) {
      // Use setTimeout to ensure the DOM has updated before invalidating size
      setTimeout(() => {
        try {
        mapRef.current.invalidateSize();
        } catch (error) {
          console.error('Error invalidating map size:', error);
        }
      }, 100);
    }
  }, [sidebarCollapsed]);


      useEffect(() => {
        setIsLoading2(true); 
        const addWithLoading = (layer, id) => {
          // Set the id if not already in options
          if (!layer.options.id) layer.options.id = id;
          if (mapRef.current && isMapInitialized.current) {
            try {
          addLayerWithLoading(mapRef.current, layer, setIsLoading2);
            } catch (error) {
              console.error('Error adding layer with loading:', error);
            }
          }
        };

        if (enable_eez) {
       //   const newWmsLayer =  L.tileLayer(eezoverlay.url,{id:'eez'});
         
          //setWmsLayer2(newWmsLayer);
          const newWmsLayer = L.tileLayer.wms(eezoverlay.url, {
            layers: eezoverlay.layer, // Replace with your WMS layer name
            format: 'image/png',
            transparent: true,
          }).addTo(mapRef.current);
          
          setWmsLayer(newWmsLayer);
          addWithLoading(newWmsLayer, 'eez');
        } else {
          if (wmsLayer && mapRef.current && isMapInitialized.current) {
            try {
            mapRef.current.removeLayer(wmsLayer);
            mapRef.current.eachLayer(layer => {
              if (layer.options?.id === "eez") mapRef.current.removeLayer(layer);
            });
            } catch (error) {
              console.error('Error removing EEZ layer:', error);
            }
            setWmsLayer(null);
          }
        }
        if(enable_coastline){
         // const newWmsLayer2 =  L.tileLayer(coastlineoverlay.url,{id:'coastline'});
          
          //setWmsLayer2(newWmsLayer2);
                    const newWmsLayer2 = L.tileLayer.wms(coastlineoverlay.url, {
            layers: coastlineoverlay.layer, // Replace with your WMS layer name
            format: 'image/png',
            transparent: true,
          }).addTo(mapRef.current);
          
          setWmsLayer2(newWmsLayer2);
          addWithLoading(newWmsLayer2, 'coastline');
          
        }
        else{
          if (wmsLayer2 && mapRef.current && isMapInitialized.current) {
            try {
            mapRef.current.removeLayer(wmsLayer2);
            mapRef.current.eachLayer(layer => {
              if (layer.options?.id === "coastline") mapRef.current.removeLayer(layer);
            });
            } catch (error) {
              console.error('Error removing coastline layer:', error);
            }
            setWmsLayer2(null);
          }
        }
        if(enable_citynames){
         // const newWmsLayer3 =  L.tileLayer(citynamesoverlay.url,{id:"pacnames"});
         // addWithLoading(newWmsLayer3, 'pacnames');
          
          const newWmsLayer3 = L.tileLayer.wms(citynamesoverlay.url, {
            layers: citynamesoverlay.layer, // Replace with your WMS layer name
            format: 'image/png',
            transparent: true,
          }).addTo(mapRef.current);
          
          setWmsLayer3(newWmsLayer3);
          addWithLoading(newWmsLayer3, 'pacnames');
        }
        else{
          if (wmsLayer3 && mapRef.current && isMapInitialized.current) {
            try {
            mapRef.current.removeLayer(wmsLayer3);
            mapRef.current.eachLayer(layer => {
              if (layer.options?.id === "pacnames") mapRef.current.removeLayer(layer);
            });
            } catch (error) {
              console.error('Error removing city names layer:', error);
            }
            setWmsLayer3(null);
          }
        }

        if (!enable_eez && !enable_coastline && !enable_citynames) setIsLoading(false);
        

      }, [layers,basemap,enable_eez,bounds,enable_citynames,enable_coastline]);
      /*
      const handleRadioChange = (event) => {
         const value = event.target.value;
        localStorage.setItem("basemap", value);
        // Remove existing base layers
        if (mapRef.current && isMapInitialized.current) {
          mapRef.current.eachLayer(layer => {
            if (layer._url && (
              layer._url.includes('spc-osm.spc.int') || 
              layer._url.includes('opentopomap') ||
              layer._url.includes('arcgisonline.com') ||
              layer.options.bingMapsKey
            )) {
              mapRef.current.removeLayer(layer);
            }
          });
        }

        if(event.target.value === "osm"){
          isBing.current = false;
          const osmLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '© Pacific Community SPC'
          }).addTo(mapRef.current);
          dispatch(setBaseMapLayer({ url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attribution:'&copy; Pacific Community SPC' }));
        }
        else if(event.target.value === "bing"){
          isBing.current = true;
          const satelliteLayer = L.tileLayer('https://ocean-plotter.spc.int/plotter/cache/basemap/{z}/{x}/{y}.png', {
            attribution: '© Pacific Community SPC | Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 18,
            minZoom: 2
          }).addTo(mapRef.current);
          dispatch(setBaseMapLayer({ url: 'https://ocean-plotter.spc.int/plotter/cache/basemap/{z}/{x}/{y}.png', attribution:'&copy; Pacific Community SPC' }));
        }
        else{
          isBing.current = false;
          const spcLayer = L.tileLayer('https://spc-osm.spc.int/tile/{z}/{x}/{y}.png', {
            attribution: '© Pacific Community SPC'
          }).addTo(mapRef.current);
          dispatch(setBaseMapLayer({ url: 'https://spc-osm.spc.int/tile/{z}/{x}/{y}.png', attribution:'&copy; Pacific Community SPC' }));
        }
        setSelectedOption(event.target.value);
      };
      */
     const handleRadioChange = (event) => {
        const value = event.target.value;
        let basemapObj;

        // Remove existing base layers
        if (mapRef.current && isMapInitialized.current) {
          mapRef.current.eachLayer(layer => {
            if (
              layer._url && (
                layer._url.includes('spc-osm.spc.int') ||
                layer._url.includes('opentopomap') ||
                layer._url.includes('arcgisonline.com') ||
                layer.options.bingMapsKey
              )
            ) {
              mapRef.current.removeLayer(layer);
            }
          });
        }

        if (value === "osm") {
          isBing.current = false;
          basemapObj = {
            url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
            attribution: '© Pacific Community SPC',
            option:value
          };
          L.tileLayer(basemapObj.url, { attribution: basemapObj.attribution }).addTo(mapRef.current);
        } else if (value === "bing") {
          isBing.current = true;
          basemapObj = {
            url: 'https://ocean-plotter.spc.int/plotter/cache/basemap/{z}/{x}/{y}.png',
            attribution: '© Pacific Community SPC | Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
            maxZoom: 18,
            minZoom: 2,
            option:value
          };
          L.tileLayer(basemapObj.url, {
            attribution: basemapObj.attribution,
            maxZoom: basemapObj.maxZoom,
            minZoom: basemapObj.minZoom
          }).addTo(mapRef.current);
        } else {
          isBing.current = false;
          basemapObj = {
            url: 'https://spc-osm.spc.int/tile/{z}/{x}/{y}.png',
            attribution: '© Pacific Community SPC',
            option:value
          };
          L.tileLayer(basemapObj.url, { attribution: basemapObj.attribution }).addTo(mapRef.current);
        }
        console.log(basemapObj)

        // Save the full basemap object to localStorage
        localStorage.setItem("basemap", JSON.stringify(basemapObj));

        // Sync to Redux store
        dispatch(setBaseMapLayer(basemapObj));

        setSelectedOption(value);
      };

      const handleCheckboxChange = (event) => {
        setCheckboxChecked(event.target.checked);
        const isChecked = event.target.checked;
      
       if (isChecked) {
        dispatch(setEEZEnable(true));
       
        } else {
          dispatch(setEEZEnable(false));
        }
      };

      const handleCheckboxChangeCoast = (event) => {
        setCheckboxCheckedCoast(event.target.checked);
        const isChecked = event.target.checked;
      
       if (isChecked) {
        dispatch(setCoastlineEnable(true));
       
        } else {
          dispatch(setCoastlineEnable(false));
        }
      };

      const handleCheckboxChangeCity = (event) => {
        setCheckboxCheckedCity(event.target.checked);
        const isChecked = event.target.checked;
      
       if (isChecked) {
        dispatch(setCityNameEnable(true));
       
        } else {
          dispatch(setCityNameEnable(false));
        }
      };


   

    
  return (
    <div>
      {(isLoading || isLoading2) && <Loading />}
      <div id="map" style={{Zindex: "auto",marginRight:-12, marginLeft:-12}}></div>
      

      {/* COMMENTED OUT - Data Checking Loading Alert */}
      {/* {isCheckingData && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '15px 20px',
            borderRadius: '8px',
            zIndex: 9999,
            fontSize: '16px',
            fontWeight: '500',
            textAlign: 'center',
            maxWidth: '300px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div className="spinner-border spinner-border-sm" role="status" style={{ width: '20px', height: '20px' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <span>Checking data availability...</span>
        </div>
      )} */}
      
      {/* COMMENTED OUT - No Data Message Alert */}
      {/* {showNoDataMessage && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '15px 20px',
            borderRadius: '8px',
            zIndex: 9999,
            fontSize: '16px',
            fontWeight: '500',
            textAlign: 'center',
            maxWidth: '300px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            animation: 'fadeInOut 3s ease-in-out'
          }}
        >
          <div style={{ marginBottom: '8px' }}>
            <span style={{ fontSize: '20px', marginRight: '8px' }}>⚠️</span>
            No Data Available
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            {noDataMessage}
          </div>
        </div>
      )} */}
      
      <style>
  {`
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      15% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    }
  `}
</style>
      
      <ShareWorkbench
        show={showShareModal}
        onHide={handleHideShareModal}
      />
    </div>
  );
};

export default MapBox;
