"use client" // client side rendering 
import React, { useEffect, useState, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import '@/components/css/map.css'
import { useAppSelector, useAppDispatch, useAppStore } from '@/app/GlobalRedux/hooks'
import { hideModal } from '@/app/GlobalRedux/Features/modal/modalSlice';
import { setCenter, setZoom, setBounds,addMapLayer, removeMapLayer } from '@/app/GlobalRedux/Features/map/mapSlice';
import { get_url } from '@/components/json/urls';
import Loading from '@/app/loading';
import './small_map.css';

const SmallMap = ({currentDataset}) => {
  //get bounds
  
      const { bounds } = useAppSelector((state) => state.mapbox);
    const { short_name } = useAppSelector((state) => state.country);
    const mapContainer2 = useRef(null); // DOM ref only
    const mapInstance = useRef(null);   //holds the Leaflet map object
    const layer_workbench = useAppSelector((state) => state.mapbox.layers);
    const dataset_list = useAppSelector(state => state.dataset_list.value);
    const token = useAppSelector((state) => state.auth.token);
    const [isLoading, setIsLoading] = useState(false);
    const baseLayer = useRef();
    const _isMounted = useRef(true);
    const current_datatset = useRef(null);
    const layer = useRef(null);
    const dispatch = useAppDispatch()
    const boolCheck =useRef(false);
    const [error, setError] = useState('');


    const handleClick = () => {
      // Set the error message
      setError('*Warning : Layer exists in the workbench');
      setTimeout(() => {
          setError('');
      }, 5000);
  };

    useEffect(() => {  
    // FIX HERE: Cleanup previous map instance if exists
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
  }
  initMap();
  addLayer(dataset_list);

 // FIX HERE: Cleanup map instance, not DOM node
 return () => {
  if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
  }
};
}, [currentDataset, token]);

      function addBBox(map, bbox) {
     //   console.log(bbox)
        var rect = L.rectangle(bbox, {color: '#FF5733', weight: 3,id:1}).addTo(map);
        map.fitBounds(bbox);
        return rect;
      }

      function addLayer(dataset_list){
        // FIX HERE: use mapInstance.current everywhere
        if (!mapInstance.current) return;
        if (dataset_list.has_bbox){
            mapInstance.current.eachLayer(function (layer) {
                const layername = layer.options.id;
                if(layername === 1){
                    mapInstance.current.removeLayer(layer);
                }
            });

            current_datatset.current = dataset_list;
            layer.current = addBBox(
                mapInstance.current,
                [
                    [dataset_list.south_bound_latitude, dataset_list.east_bound_longitude],
                    [dataset_list.north_bound_latitude, dataset_list.west_bound_longitude]
                ]
            );
        } else {
            mapInstance.current.eachLayer(function (layer) {
                const layername = layer.options.id;
                if(layername === 1){
                    mapInstance.current.removeLayer(layer);
                }
            });
        }
    }

      const fetchData = async (dataset_list, id, token) => {

        //console.log(short_name)
        
        try {
          var url = get_url('layer', id);  // Get the URL for the layer
          // Construct the headers object
          let headers = {};
      
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;  // Add Authorization header if token is available
          }
          //console.log(token)
          // Log the URL and headers for debugging
          //console.log("Fetching URL:", url);
          //console.log("Headers:", headers);
      
          // Make the fetch request
          const response = await fetch(`${url}`, {  // Add the query string directly to the URL
            method: 'GET',
            headers: headers,  // Include headers
          });
      
          // Handle the response
          if (response.ok) {
            const data = await response.json();
            data.timeIntervalStartOriginal = data.timeIntervalStart;
            data.timeIntervalEndOriginal = data.timeIntervalEnd;
      
            const jsonWithParent = {
              id: dataset_list.id,
              south_bound_latitude: dataset_list.south_bound_latitude,
              east_bound_longitude: dataset_list.east_bound_longitude,
              north_bound_latitude: dataset_list.north_bound_latitude,
              west_bound_longitude: dataset_list.west_bound_longitude,
              layer_information: data,
            };
           // console.log(bounds)
            const datasetBox = {
              west: dataset_list.west_bound_longitude,
              east: dataset_list.east_bound_longitude,
              south: dataset_list.south_bound_latitude,
              north: dataset_list.north_bound_latitude
            };
            
            // Check if datasetBox is completely inside bounds
            const isInside = bounds && 
              datasetBox.west >= bounds.west &&
              datasetBox.east <= bounds.east &&
              datasetBox.south >= bounds.south &&
              datasetBox.north <= bounds.north;
            
           // console.log(isInside);
            
      
            dispatch(addMapLayer(jsonWithParent));  // Dispatch the action
            const savedRegion = localStorage.getItem('selectedRegion'); 
            //console.log(savedRegion)
            if (short_name == 1){
              dispatch(
                setBounds({
                  west:  dataset_list.west_bound_longitude,
                  east: dataset_list.east_bound_longitude,
                  south: dataset_list.south_bound_latitude,
                  north: dataset_list.north_bound_latitude,
                })
              );
            }
            if(isInside){
              dispatch(
              setBounds({
                west:  dataset_list.west_bound_longitude,
                east: dataset_list.east_bound_longitude,
                south: dataset_list.south_bound_latitude,
                north: dataset_list.north_bound_latitude,
              })
            );
            }
          } else {
            console.error("Error in fetch:", response.status, response.statusText);
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        }
        
      };
      
      /*
      const fetchData = async (dataset_list,id,token) => {
        try {
          var url = get_url('layer',id);
          await fetch(url)
  .then(response => response.json())
  .then(data => {
    data.timeIntervalStartOriginal = data.timeIntervalStart;
    data.timeIntervalEndOriginal = data.timeIntervalEnd;
          const jsonWithParent = {
            id:dataset_list.id,
            south_bound_latitude:dataset_list.south_bound_latitude,
            east_bound_longitude:dataset_list.east_bound_longitude,
            north_bound_latitude:dataset_list.north_bound_latitude,
            west_bound_longitude:dataset_list.west_bound_longitude,
            layer_information: data
          };
          dispatch(addMapLayer(jsonWithParent))
  })
  .catch(error => console.error(error));
          
        } catch (error) {
          //setError(error);
        }
      };*/
      

      function initMap(){
        // FIX HERE: Assign Leaflet map to mapInstance.current, use mapContainer2 ref for DOM node
        mapInstance.current = L.map(mapContainer2.current, {
            zoom: 2,
            center: [-8, 179.3053],
            attributionControl: false
        });

        mapInstance.current.attributionControl = L.control.attribution({
            prefix: '<a href="https://www.spc.int/" target="_blank">SPC</a> | &copy; Pacific Community SPC'
        }).addTo(mapInstance.current);

        const baselayer = L.tileLayer('https://spc-osm.spc.int/tile/{z}/{x}/{y}.png', {
            detectRetina: true
        }).addTo(mapInstance.current);

        var CustomButton = L.Control.extend({
            options: {
                position: 'topright'
            },

            onAdd: function (map) {
                var container = L.DomUtil.create('div', 'leaflet-control-custom');
                container.style.marginRight = '16px';

                if (currentDataset && Object.keys(currentDataset).length > 0) {
                    var button = L.DomUtil.create('button', 'custom-map-btn', container);
                    button.setAttribute('aria-label', 'Add to Map');
                    button.setAttribute('tabindex', '0');
                    button.innerHTML = 'Add to Map';
                    button.style.cssText = `
                        animation: pulse 2s infinite;
                        transition: all 0.3s ease;
                    `;
                    const style = document.createElement('style');
                    style.textContent = `
                        @keyframes pulse {
                        0% {
                            transform: scale(1);
                            box-shadow: 0 0 0 0 rgba(29, 78, 216, 0.7);
                        }
                        70% {
                            transform: scale(1.05);
                            box-shadow: 0 0 0 10px rgba(29, 78, 216, 0);
                        }
                        100% {
                            transform: scale(1);
                            box-shadow: 0 0 0 0 rgba(29, 78, 216, 0);
                        }
                        }
                        .custom-map-btn:hover {
                        animation: none;
                        transform: scale(1.05);
                        box-shadow: 0 4px 8px rgba(29, 78, 216, 0.3);
                        }
                    `;
                    document.head.appendChild(style);
                    button.onkeydown = function(e) {
                        if (e.key === 'Enter' || e.key === ' ') {
                            button.click();
                        }
                    };
                    L.DomEvent.on(button, 'click', async function () {
                        const isEqual = (a, b, epsilon = 1e-10) => Math.abs(a - b) < epsilon;
                        if (layer_workbench.length > 0){
                            for (let i = 0; i < layer_workbench.length; i++) {
                                if(parseFloat(layer_workbench[i].id) == parseFloat(current_datatset.current.id)){
                                    boolCheck.current = true;
                                    break;
                                }
                                else{
                                    boolCheck.current = false;
                                }
                            }
                        }
                        if (!boolCheck.current){
                            setIsLoading(true);
                            fetchData(currentDataset, currentDataset.layer_information, token);
                            dispatch(hideModal())
                            setIsLoading(false);
                        }
                        else{
                            handleClick()
                        }
                    });
                }
                return container;
            }
        });

        new CustomButton().addTo(mapInstance.current);
    }

    return (
        <div className="small-map-outer">
            {isLoading && <Loading />}
            {error && <div style={{ color: 'red', marginTop: '8px' }}>{error}</div>}
            {/* FIX HERE: use ref={mapContainer2} for the map container */}
            <div ref={mapContainer2} id="map2" className="small-map-container" style={{width:"100%", height:"200px",zIndex: "auto"}}></div>
        </div>
    );
};

export default SmallMap;
