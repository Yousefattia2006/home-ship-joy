/// <reference types="vite/client" />

// Google Maps global types
declare namespace google.maps {
  // This is a stub - actual types come from @types/google.maps
}

interface Window {
  google: typeof google;
}
