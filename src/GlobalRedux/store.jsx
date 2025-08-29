import { configureStore } from '@reduxjs/toolkit';

import datasetReducer from './Features/dataset/dataSlice';
import modalReducer from './Features/modal/modalSlice';
import accordionReducer from './Features/accordion/accordionSlice';
import mapReducer from './Features/map/mapSlice';
import offcanvasReducer from './Features/offcanvas/offcanvasSlice';
import sideoffcanvasReducer from './Features/sideoffcanvas/sideoffcanvasSlice';
import countryReducer from './Features/country/countrySlice';
import coordinateReducer from './Features/coordinate/mapSlice';
import authReducer from './Features/auth/authSlice';

export const store = configureStore({
  reducer: {
    dataset_list: datasetReducer,
    modal: modalReducer,
    accordion: accordionReducer,
    mapbox: mapReducer,
    offcanvas: offcanvasReducer,
    sideoffcanvas: sideoffcanvasReducer,
    country: countryReducer,
    coordinate: coordinateReducer,
    auth: authReducer,
  }
});