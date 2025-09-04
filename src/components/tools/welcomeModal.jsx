import React, { useEffect, useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useDispatch } from 'react-redux';
import { setBaseMapLayer } from '../../GlobalRedux/Features/map/mapSlice';// Adjust import path as needed

const basemapOptions = [
  {
    key: "osm",
    label: "OpenTopoMap",
    img: "/basemaps/opentopo.png",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "© Pacific Community SPC",
    option:'osm'
  },
  {
    key: "bing",
    label: "Satellite",
    img: "/basemaps/bing.png",
    url: "https://ocean-plotter.spc.int/plotter/cache/basemap/{z}/{x}/{y}.png",
    attribution: "© Pacific Community SPC | Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    option: "bing"
  },
  {
    key: "spc",
    label: "SPC OSM",
    img: "/basemaps/osm.png",
    url: "https://spc-osm.spc.int/tile/{z}/{x}/{y}.png",
    attribution: "© Pacific Community SPC",
    option:"opentopo"
  }
];

const WelcomeModal = () => {
  const dispatch = useDispatch();
  const [show, setShow] = useState(false);
  const [timesShown, setTimesShown] = useState(0);
  const [isChecked, setIsChecked] = useState(true);

  // Basemap selector state
  const [selectedBasemap, setSelectedBasemap] = useState(() => {
    // Try to get from localStorage
    const stored = localStorage.getItem("basemap");
    if (stored) {
      try {
        const obj = JSON.parse(stored);
        return basemapOptions.find(o => o.url === obj.url)?.key || "osm";
      } catch {
        return "osm";
      }
    }
    return "osm";
  });

  useEffect(() => {
    const storedCount = localStorage.getItem('modalShownCount');
    if (storedCount) {
      const count = parseInt(storedCount, 10);
      setTimesShown(count);
      if (count < 500) {
        setShow(true);
      }
    } else {
      localStorage.setItem('modalShownCount', '0');
      setTimesShown(0);
      setShow(true);
    }
  }, []);

  // Set basemap in localStorage and Redux when selected
  useEffect(() => {
    const basemapObj = basemapOptions.find(o => o.key === selectedBasemap);
    if (basemapObj) {
      localStorage.setItem("basemap", JSON.stringify({ url: basemapObj.url, attribution: basemapObj.attribution,option:basemapObj.option }));
      dispatch(setBaseMapLayer({ url: basemapObj.url, attribution: basemapObj.attribution,option:basemapObj.option }));
    }
  }, [selectedBasemap, dispatch]);

  const handleClose = () => {
    const newCount = timesShown + 1;
    setTimesShown(newCount);
    localStorage.setItem('modalShownCount', newCount.toString());
    setShow(false);
  };

  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;
    e.target.blur();
    setIsChecked(!checked);
    if (!checked) {
      localStorage.setItem("modalShownCount", 500);
      setTimesShown(500);
      setShow(false);
    }
  };

  const handleBasemapChange = (key) => {
    setSelectedBasemap(key);
  };

  function randomGreeting() {
    const greetings = [
      "Halo olaketa!",
      "Bula!",
      "Talofa!",
      "Malo e lelei!",
      "Mauri!"
    ];
    const randomIndex = Math.floor(Math.random() * greetings.length);
    return greetings[randomIndex];
  }

  return (
    <Modal show={show} onHide={handleClose} centered className="custom-modal" size="lg">
      <Modal.Header closeButton style={{ backgroundColor: '#3f51b5', color: 'white' }} closeVariant="white">
        <Modal.Title style={{ color: 'white' }}>{randomGreeting()}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h4 className="text-center" style={{ marginTop: '-15px', color: 'var(--color-text, #1e293b)' }}>Welcome to Pacific Ocean Portal!</h4>
      
        {/* Basemap Selector */}
        <div>
          <h5 className="mb-2" style={{ color: "var(--color-text, #1e293b)", fontSize:14 }}>Choose your Base Map:</h5>
          <div className="d-flex flex-wrap justify-content-center" style={{ gap: '28px', marginBottom: '10px' }}>
            {basemapOptions.map(opt => (
              <div
                key={opt.key}
                style={{
                  border: selectedBasemap === opt.key ? "2px solid #3f51b5" : "1px solid #eee",
                  borderRadius: "6px",
                  padding: "6px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: selectedBasemap === opt.key ? "#f4f7ff" : "#fff",
                  width: "110px",
                  boxShadow: selectedBasemap === opt.key ? "0 2px 12px rgba(63,81,181,0.15)" : "none"
                }}
                onClick={() => handleBasemapChange(opt.key)}
                tabIndex={0}
                aria-label={`Select ${opt.label} base map`}
              >
                <img
                  src={opt.img}
                  alt={opt.label}
                  style={{
                    width: "95px",
                    height: "60px",
                    objectFit: "cover",
                    borderRadius: "4px",
                    marginBottom: "4px",
                    boxShadow: selectedBasemap === opt.key ? "0 0 0 2px #3f51b5" : "none"
                  }}
                />
                <div style={{ fontSize: "13px", fontWeight: 500, color: "#233" }}>{opt.label}</div>
              </div>
            ))}
          </div>
               <div className="alert alert-warning" style={{background:'#fffbe7', border:'1px solid #ffe58f', color:'#ad8b00', borderRadius:6, padding:'8px 12px', marginBottom:'14px', fontSize:'15px'}}>
  <strong>Important Note:</strong> For high performance and faster loading on Low bandwidth connections, please use the <strong>SPC OSM</strong> basemap.
</div>

        </div>
        <hr/>
       
        <p style={{ color: 'var(--color-text, #1e293b)', fontSize: 14 }}>Countries supported:</p>
        <div className="logos d-flex flex-wrap justify-content-center" style={{ gap: '1px', maxWidth: '100%' }}>
          <img className="img-fluid" src="/COSSPac_country_territories.png" alt="supported-services" width="100%" />
        </div>
        <p style={{ color: 'var(--color-text, #1e293b)', fontSize: 14 }}>Developed & Maintained By:</p>
        <div className="logos d-flex flex-wrap justify-content-center" style={{ gap: '5px', maxWidth: '100%' }}>
          <img className="img-fluid" src="/logos/SPC.png" alt="supported-services" width="17%" height="10%" />
        </div>
        <br />
        <p style={{ color: 'var(--color-text, #1e293b)', fontSize: 15 }} className="text-center">Contact us: cosppac@spc.int</p>
       
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-between align-items-center">
        <Form.Group controlId="setModalCount" className="mb-0 d-flex align-items-center">
          <Form.Check
            type="checkbox"
            checked={isChecked}
            onChange={handleCheckboxChange}
            style={{ marginRight: "8px", borderRadius: "0" }}
          />
          <Form.Label style={{ fontSize: 13, color: "var(--color-text, #1e293b)", marginBottom: 0 }}>
            Show at start-up
          </Form.Label>
        </Form.Group>
        <Button
          variant="secondary"
          onClick={handleClose}
          size="sm"
          style={{ borderRadius: "0", padding: "5px 10px" }}
          aria-label="Close welcome modal"
        >
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default WelcomeModal;