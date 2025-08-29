

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  coordinates: {
    x: null,
    y: null,
    sizex:null,
    sizey:null,
    bbox:null,
    station:null
  },
  // other state...
};

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    setCoordinates: (state, action) => {
      state.coordinates = action.payload;
    },
    // other reducers...
  },
});

export const { setCoordinates } = mapSlice.actions;

export default mapSlice.reducer;
