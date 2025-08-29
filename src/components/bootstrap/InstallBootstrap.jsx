import { useEffect } from 'react';

const InstallBootstrap = () => {
  useEffect(() => {
    import("bootstrap/dist/js/bootstrap.bundle.min.js")
      .then(() => {
        // Bootstrap JS loaded
      })
      .catch((error) => {
        console.error("Failed to load Bootstrap JS:", error);
      });
  }, []);

  return null;
};

export default InstallBootstrap;