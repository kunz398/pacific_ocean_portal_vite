import { useEffect } from "react";

const GA_MEASUREMENT_ID = "G-DS5M94M39M";

const GoogleAnalytics = () => {
  useEffect(() => {
    // Add gtag.js script
    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.async = true;
    document.head.appendChild(script);

    // Add gtag config
    const script2 = document.createElement("script");
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA_MEASUREMENT_ID}');
    `;
    document.head.appendChild(script2);

    // Cleanup
    return () => {
      document.head.removeChild(script);
      document.head.removeChild(script2);
    };
  }, []);

  return null;
};

export default GoogleAnalytics;
