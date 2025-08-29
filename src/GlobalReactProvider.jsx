import React from 'react';
import ReactDOM from 'react-dom';

if (typeof window !== 'undefined') {
  window.React = React;
  window.ReactDOM = ReactDOM;
}

export default function GlobalReactProvider({ children }) {
  return children;
}