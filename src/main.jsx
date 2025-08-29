import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import ClientBootstrap from "./components/bootstrap/ClientBootstrap";
import { Toaster } from 'react-hot-toast';
import GlobalReactProvider from './GlobalReactProvider';
import StoreProviderWrapper from "./components/StoreProviderWrapper";
import GoogleAnalytics from "./components/tools/googleAnalytics";
import App from './App';
import Navigationbar from "./components/navbar/Navbar";

import { BrowserRouter } from "react-router-dom";

// Import all CSS (unchanged)
import './components/css/mapmain.css';
import './components/css/accordionmetadata.css';
import './components/css/butttongroup.css';
import './components/css/datepicker.css';
import './components/css/modal.css';
import './components/css/accordion.css';
import './components/css/opacity.css';
import './components/css/timeseries_scroll.css';
import './components/css/welcomemodal.css';
import './components/css/workbench.css';
import './components/navbar/navbarmodal.css';
import "./components/navbar/navbar.css";
import "./components/navbar/sidebar.css";
import "./components/css/app.css";
import "./components/css/mapnav.css";
import './components/css/nprogress.css';

function Root() {
  return (
    <GlobalReactProvider>
      <Toaster position="bottom-right" />
      <GoogleAnalytics />
      <StoreProviderWrapper>
        <BrowserRouter>
          <Navigationbar>
            <App />
          </Navigationbar>
        </BrowserRouter>
      </StoreProviderWrapper>
      <ClientBootstrap />
    </GlobalReactProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);