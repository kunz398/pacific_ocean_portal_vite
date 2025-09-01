import MapBox from "../map/get_map";
import React, { useEffect } from 'react';
import WelcomeModal from './welcomeModal'; 


export default function MainContainer() {

  useEffect(() => {
    // Only set default region if not already set
    if (!localStorage.getItem('selectedRegion')) {
      localStorage.setItem('selectedRegion', 1);
    }
  }, []);

return (
  <>
   <WelcomeModal />
 <MapBox/>
  </>
);
}
