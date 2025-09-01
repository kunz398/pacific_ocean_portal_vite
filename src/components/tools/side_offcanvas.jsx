import React from 'react';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { Button } from 'react-bootstrap';
import { hidesideoffCanvas  } from '@/GlobalRedux/Features/sideoffcanvas/sideoffcanvasSlice';
import { useAppSelector, useAppDispatch } from '@/GlobalRedux/hooks';
import { removeAllMapLayer } from '@/GlobalRedux/Features/map/mapSlice';

function SideOffCanvas({isVisible}) {
    const dispatch = useAppDispatch();
    const mapLayer = useAppSelector((state) => state.mapbox.layers);
   

    const handleClose = () => {
        dispatch(hidesideoffCanvas())
      };

      const handleSaveWorkbench = () => {
      //  console.log(mapLayer); // To verify the state

        // Loop through mapLayer and update 'enabled' to false for all layers
        const updatedMapLayer = mapLayer.map((layer) => {
            if (layer.layer_information) {
                return {
                    ...layer,
                    layer_information: {
                        ...layer.layer_information,
                        enabled: false,
                    },
                };
            }
            return layer;
        });

        // Save the updated mapLayer state to localStorage
        localStorage.setItem('savedLayers', JSON.stringify(updatedMapLayer));

        dispatch(hidesideoffCanvas())
    };

    const handleClearWorkbench = () => {
      // Clear the saved layers from localStorage
      localStorage.removeItem('savedLayers');
dispatch(removeAllMapLayer())
      // Show Toast after clearing
        dispatch(hidesideoffCanvas())
  };
 
    
return(
    <Offcanvas show={isVisible} onHide={handleClose} placement="end" className="offcanvas-end" backdrop={true} scroll={true}>
    <Offcanvas.Header closeButton>
      <Offcanvas.Title>Saving Workbench Layers</Offcanvas.Title>
    </Offcanvas.Header>
    <Offcanvas.Body>
    To save the workbench layers, simply use the option provided below. This will allow the application to remember your selected layers and display them when the application is launched.

     <br/><br/>
     <div className="d-flex justify-content-between">
                        <Button
                            variant="btn btn-primary btn-sm rounded-pill"
                            style={{ padding: '8px', color: 'white', width: '48%' }}
                            onClick={handleSaveWorkbench}
                        >
                            Save Workbench
                        </Button>
                        <Button
                            variant="btn btn-danger btn-sm rounded-pill"
                            style={{ padding: '8px', color: 'white', width: '48%',   backgroundColor: '#FF8C00',  // Orange color
                                borderColor: '#FF8C00',   }}
                            onClick={handleClearWorkbench}
                        >
                            Clear Saved Layers
                        </Button>
                    </div>
    </Offcanvas.Body>
  </Offcanvas>
)
}
export default SideOffCanvas;
