
import { useEffect } from 'react';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
//import './components/css/nprogress.css';
// Configure NProgress
NProgress.configure({
  minimum: 0.3,
  easing: 'ease',
  speed: 500,
  showSpinner: false,
  trickleSpeed: 200,
});

export default function Loading() {
  useEffect(() => {
    NProgress.start();
    
    return () => {
      NProgress.done();
    };
  }, []);

  return (
    <div className="flex justify-center items-center h-screen">
      {/* Your existing loading spinner/indicator */}
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white-500"></div>
    </div>
  );
}