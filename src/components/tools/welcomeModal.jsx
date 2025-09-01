import React, { useEffect, useState } from 'react';
import { Modal, Button,Form } from 'react-bootstrap';
//import '@/components/css/welcomemodal.css';

const WelcomeModal = () => {
  const [show, setShow] = useState(false);
  const [timesShown, setTimesShown] = useState(0);
  const [isChecked, setIsChecked] = useState(true);

  useEffect(() => {
    const storedCount = localStorage.getItem('modalShownCount');

    
    if (storedCount) {
      const count = parseInt(storedCount, 10);
      setTimesShown(count);

      // Show the modal only if it has been shown less than 500 times
      if (count < 500) {
        setShow(true); // Show the modal if count is less than 500
      } 
    } else {
      // Initialize count to 0 for the first visit
      localStorage.setItem('modalShownCount', '0');
      setTimesShown(0);
      setShow(true); // Show the modal for the first time
    }
  }, []); // Runs when the component is mounted

  const handleClose = () => {
    const newCount = timesShown + 1;
    setTimesShown(newCount);
    localStorage.setItem('modalShownCount', newCount.toString());

    // If the count reaches 500, stop showing the modal
    if (newCount >= 500) {
      console.log('Modal count reached 500, stopping modal display');
      setShow(false); // Hide modal after 500
    } else {
      setShow(false); // Otherwise, just close it
    }
  };

  const handleCheckboxChange = (e) => {
    const checked = e.target.checked;
    e.target.blur();
    setIsChecked(!checked);
    if (!checked) {
      // Set modal count to 100
      localStorage.setItem("modalShownCount", 500);
      setTimesShown(500);
      setShow(false);
    }
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
      <Modal.Header closeButton style={{backgroundColor:'#3f51b5', color:'white'}} closeVariant="white">
       {/* <Modal.Title style={{ color: 'white' }}>Halo olaketa! Talitali fiefia! Talofa Koutou! Afio mai! Bula! </Modal.Title>
       */}
       <Modal.Title style={{ color: 'white' }}>{randomGreeting()}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
      <h4 className="text-center" style={{ marginTop: '-15px', color: 'var(--color-text, #1e293b)' }}>Welcome to Pacific Ocean Portal!</h4>
        

        {/* Countries Supported Section */}

        <p style={{  color: 'var(--color-text, #1e293b)',fontSize:14 }}>Countries supported:</p>
        {/*
        <div className="logos d-flex flex-wrap justify-content-center" style={{ gap: '1px', maxWidth: '100%' }}>
          <img className="img-fluid" src="/flags/CK.jpg" alt="supported-services" width="8%" height="4%" />
          <img className="img-fluid" src="/flags/FM.jpg" alt="supported-services" width="8%" height="4%" />
          <img className="img-fluid" src="/flags/FJ.jpg" alt="supported-services" width="8%" height="4%" />
          <img className="img-fluid" src="/flags/KI.jpg" alt="supported-services" width="8%" height="4%" />
          <img className="img-fluid" src="/flags/MH.jpg" alt="supported-services" width="8%" height="4%" />
          <img className="img-fluid" src="/flags/NR.jpg" alt="supported-services" width="8%" height="4%" />
          <img className="img-fluid" src="/flags/NU.jpg" alt="supported-services" width="8%" height="4%" />
          <img className="img-fluid" src="/flags/PW.jpg" alt="supported-services" width="8%" height="4%" />
          <img className="img-fluid" src="/flags/PNG.jpg" alt="supported-services" width="8%" height="4%" />
          <img className="img-fluid" src="/flags/WS.jpg" alt="supported-services" width="8%" height="4%" />
          <img className="img-fluid" src="/flags/SB.jpg" alt="supported-services" width="8%" height="4%" />
          <img className="img-fluid" src="/flags/TO.jpg" alt="supported-services" width="8%" height="4%" />
          <img className="img-fluid" src="/flags/TV.jpg" alt="supported-services" width="8%" height="4%" />
          <img className="img-fluid" src="/flags/VU.jpg" alt="supported-services" width="8%" height="4%" />
        </div>
        */}
         <div className="logos d-flex flex-wrap justify-content-center" style={{ gap: '1px', maxWidth: '100%' }}>
         <img className="img-fluid" src="/COSSPac_country_territories.png" alt="supported-services" width="100%" />
         </div>

        {/* Developed & Funded By Section */}
        <p style={{  color: 'var(--color-text, #1e293b)',fontSize:14 }}>Developed & Maintained By:</p>
        <div className="logos d-flex flex-wrap justify-content-center" style={{ gap: '5px', maxWidth: '100%' }}>

          <img className="img-fluid" src="/logos/SPC.png" alt="supported-services" width="17%" height="10%" />
        </div>

        <br />
        <p style={{  color: 'var(--color-text, #1e293b)',fontSize:15  }} className="text-center">Contact us: cosppac@spc.int</p>
       
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-between align-items-center">
      {/* Checkbox on the left */}
      <Form.Group controlId="setModalCount" className="mb-0 d-flex align-items-center">
  {/* Checkbox */}
  <Form.Check
    type="checkbox"
    checked={isChecked}
    onChange={handleCheckboxChange}
    style={{ marginRight: "8px", borderRadius:"0" }} // Add space between checkbox and text
  />
  {/* Label */}
  <Form.Label style={{ fontSize: 13, color: "var(--color-text, #1e293b)", marginBottom: 0 }}>
    Show at start-up
  </Form.Label>
</Form.Group>
      {/* Close button on the right */}
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
