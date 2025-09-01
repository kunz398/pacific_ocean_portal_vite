import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Button, InputGroup, Form } from 'react-bootstrap';
import { useAppSelector, useAppDispatch } from '../../GlobalRedux/hooks';
import { hideModal, showModaler } from '../../GlobalRedux/Features/modal/modalSlice';
import MyWorkbench from '../tools/workbench';
import { setDataset } from '../../GlobalRedux/Features/dataset/dataSlice';
import { setAccordion } from '../../GlobalRedux/Features/accordion/accordionSlice';
import { showsideoffCanvas } from '../../GlobalRedux/Features/sideoffcanvas/sideoffcanvasSlice';
import { setBounds } from '../../GlobalRedux/Features/map/mapSlice';
import SideOffCanvas from '../tools/side_offcanvas';
import { hideoffCanvas } from '../../GlobalRedux/Features/offcanvas/offcanvasSlice';
import { MdAddCircleOutline } from "react-icons/md";
import { CgMoreO, CgSearch, CgAdd } from "react-icons/cg";
import { get_url } from '../json/urls';
import { setShortName } from "../../GlobalRedux/Features/country/countrySlice";

const ExploreModal = React.lazy(() => import('../tools/model'));

const SideBar = () => {
    const _isMounted = useRef(true);

    const handleShowCanvas = () => {
      dispatch(showsideoffCanvas())
    };
    

    const isVisiblecanvas = useAppSelector((state) => state.sideoffcanvas.isVisible);
    const isLoggedin = useAppSelector((state) => state.auth.isLoggedin);
    const isVisible = useAppSelector((state) => state.modal.isVisible);
    const dispatch = useAppDispatch();
    
    const handleShow = () => {
      dispatch(setAccordion(''))
      dispatch(setDataset([]))
      dispatch(showModaler());
      dispatch(hideoffCanvas());
    };
    
    const handleClose = () => {
      dispatch(hideModal())
    };

    const [regions, setRegions] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState("1"); 
  
    // Fetch regions data from API
    useEffect(() => {
      // Example API URL - replace with your actual API endpoint
      fetch(get_url('country'))
        .then((response) => response.json())
        .then((data) => {
          const sortedData = [...data].sort((a, b) => a.long_name.localeCompare(b.long_name));
          setRegions(sortedData); // Set regions data to state
          const savedRegion = localStorage.getItem('selectedRegion'); // Check localStorage for saved region
          // Only apply persisted selection for anonymous users. If a user is logged in, prefer their session country.
          if (savedRegion && !isLoggedin) {
            // Check if the saved region exists in the fetched data
            const regionExists = data.find((region) => region.id.toString() === savedRegion);
            if (regionExists) {
              setSelectedRegion(savedRegion); // Set the region from localStorage if valid
              // Persisting already done; ensure redux gets current selection
              dispatch(setShortName(savedRegion));
              // Set bounds based on the saved region
              dispatch(
                setBounds({
                  west: regionExists.west_bound_longitude,
                  east: regionExists.east_bound_longitude,
                  south: regionExists.south_bound_latitude,
                  north: regionExists.north_bound_latitude,
                })
              );
            }
          }
        })
        .catch((error) => console.error('Error fetching regions:', error));
    }, [dispatch]);
  
    // Handle region selection
    const handleRegionChange = (e) => {
      dispatch(hideoffCanvas());
      const regionId = e.target.value;
      setSelectedRegion(regionId);
      // If user is not logged in, persist selection to localStorage so it survives refresh.
      if (!isLoggedin) {
        localStorage.setItem('selectedRegion', regionId);
      }
      // Always update the redux country short_name so the UI can preview the selection.
      dispatch(setShortName(regionId))

      // If user is logged in, emit a transient event so Navbar can preview the flag without persisting
      try {
        if (isLoggedin && typeof window !== 'undefined') {
          const ev = new CustomEvent('regionSelected', { detail: { regionId } });
          window.dispatchEvent(ev);
        }
      } catch {
        // ignore
      }
  
      // Find the selected region by its id
      const region = regions.find((region) => region.id === parseInt(regionId));
  
      if (region) {
        // Set the bounds for the selected region
        dispatch(
          setBounds({
            west: region.west_bound_longitude,
            east: region.east_bound_longitude,
            south: region.south_bound_latitude,
            north: region.north_bound_latitude,
          })
        );
      } else {
        dispatch(setBounds(null)); // Reset bounds if no valid region is selected
      }
      e.target.blur();
    };
  

  
  
  return (
    <div
      className="sidebar-responsive-wrapper"
      style={{
        marginRight: '3px',
        marginLeft: '3px',
        // Responsive: overlay on mobile
        position: 'relative',
        zIndex: 1200,
      }}
    >
        <Row  
        style={{paddingTop:'10px', margin: '0', paddingLeft: '0', paddingRight: '0'}} 
        className="sidebar-row">
        <Col md={12} style={{ paddingLeft: '0', paddingRight: '0' }}>
      <div style={{ position: 'relative', width: '100%' }}>
  <span
    aria-hidden="true"
    style={{
      position: 'absolute',
      left: 10,
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#519ac2',
      pointerEvents: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1
    }}
  >
    <CgSearch size={16} />
  </span>

  <select
    className="form-select w-100 region-select region-select-override"
    aria-label="Select a region"
    value={selectedRegion}
    onChange={handleRegionChange}
    style={{
      borderRadius: '20px',
      border: '1px solid rgb(58 59 62)',
      fontSize: '0.875rem',
      padding: '0.375rem 0.75rem',
      paddingLeft: '32px', // space for the icon
      backgroundColor: 'white',
      color: '#212529',
      width: '100%'
    }}
  >
    {regions.map((region) => (
      <option key={region.id} value={region.id}>
        {region.long_name}
      </option>
    ))}
  </select>
</div>
        </Col>
        </Row>

          <div className="d-flex justify-content-between sidebar-buttons" style={{paddingTop:'10px', gap: '8px'}}>
                                <Button
                                    variant="btn btn-primary btn-sm rounded-pill"
                                    style={{ 
                                        padding: '10px 12px', 
                                        color: 'white', 
                                        width: '55%', 
                                        fontSize: '0.85rem',
                                        fontWeight: '500',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        transition: 'all 0.2s ease-in-out'
                                    }}
                                    className="explore-button"
                                    onClick={e => {
                                      handleShow();
                                      e.currentTarget.blur();
                                    }}
                                >
                                    <MdAddCircleOutline size={18} style={{marginTop:-1}}/>&nbsp;Explore Map Data
                                </Button>
                                <Button
    variant="btn btn-sm rounded-pill"
    style={{
        padding: '10px 12px',
        color: 'white',
        width: '45%',
        backgroundColor: '#b8c93a',
        border: 'none',
        fontSize: '0.85rem',
        fontWeight: '500',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease-in-out'
    }}
    className="more-button"
    onClick={handleShowCanvas}
>
    <CgMoreO size={16} style={{marginTop:-1}}/>&nbsp;More
</Button>


                            </div>
        

      <Row style={{paddingTop:10,marginRight:-6,marginLeft:-4}} className="workbench-row"> {/* Reduced negative margins for thinner sidebar */}
        <MyWorkbench/>
      </Row>
      <SideOffCanvas isVisible={isVisiblecanvas}/>
      <React.Suspense fallback={<div>Loading...</div>}>
        <ExploreModal
         show={isVisible} 
         onClose={handleClose} 
         title="Data Catalogue" 
         bodyContent="This is the modal body content." 
         />
      </React.Suspense>

    </div>
  );
};

export default SideBar;
