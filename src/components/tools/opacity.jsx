import React,{useState} from 'react';
import { useAppDispatch } from '@/GlobalRedux/hooks'
import { updateMapLayer } from '@/GlobalRedux/Features/map/mapSlice';
import { Row,Col,Badge } from 'react-bootstrap';
//import '@/components/css/opacity.css';

function Opacity({ item,id}) {
  const dispatch = useAppDispatch();
  const [value, setValue] = useState(1);
  const handleUpdateLayer = (id, updates) => {
    dispatch(updateMapLayer({ id, updates }));
  };

  const handleChange = (event,item) => {
    setValue(parseFloat(event.target.value));
    const updatedObject = {
      ...item,
      layer_information: {
        ...item.layer_information,
        opacity: event.target.value // Updated value
      }
    };
    handleUpdateLayer(item.id, {
      layer_information: {
        ...item.layer_information,
        opacity: event.target.value,
        zoomToLayer:false // Updated value
      }
    });

    event.currentTarget.blur()
  };


return(
  <div style={{ padding: "0px 10px" }}>
  {/* Opacity Slider - matching style */}
  <Row className="align-items-center g-1" style={{ marginBottom: "8px" }}>
    <Col xs="auto" className="pe-1" style={{ paddingTop: "8px" }}>
      <span style={{ 
        fontSize: '12px', 
        whiteSpace: 'nowrap',
        fontWeight: '500',
        color: 'var(--color-text)'
      }}>Opacity:</span>
    </Col>
    
    <Col className="d-flex align-items-center gap-1">
      <div style={{ flex: 1, marginTop: "2px" }}>
        <input
          type="range"
          className="form-range custom-range-slider"
          min={0}
          max={1}
          step={0.1}
          value={value}
          onChange={(e) => handleChange(e, item)}
          style={{ "--value": value }}
          onClick={(e) => e.currentTarget.blur()}
        />
      </div>
      
      <Badge bg="secondary" className="fw-bold small" style={{
        fontSize: "11px",
        color: "white",
        backgroundColor: "#6c757d",
        padding: "2px 6px",
        borderRadius: "4px",
        minWidth: "40px",
        textAlign: "center",
        marginTop:'7px'
      }}>
        {Math.round(value * 100)}%
      </Badge>
    </Col>
  </Row>
  </div>
  
)
}
export default Opacity;
