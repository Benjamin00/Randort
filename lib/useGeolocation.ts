"use client";

import { useState, useEffect, useCallback } from "react";
import type { GeolocationState, GeolocationError } from "./types";

interface UseGeolocationReturn extends GeolocationState {
  retry: () => void;
  setManualLocation: (lat: number, lng: number) => void;
}

function mapError(code: number): GeolocationError {
  switch (code) {
    case 1:
      return "PERMISSION_DENIED";
    case 2:
      return "POSITION_UNAVAILABLE";
    case 3:
      return "TIMEOUT";
    default:
      return "POSITION_UNAVAILABLE";
  }
}

export function useGeolocation(): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    error: null,
    loading: true,
  });

  const requestPosition = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setState({ lat: null, lng: null, error: "NOT_SUPPORTED", loading: false });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (err) => {
        setState({
          lat: null,
          lng: null,
          error: mapError(err.code),
          loading: false,
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 300_000,
      },
    );
  }, []);

  useEffect(() => {
    requestPosition();
  }, [requestPosition]);

  const setManualLocation = useCallback((lat: number, lng: number) => {
    setState({ lat, lng, error: null, loading: false });
  }, []);

  return {
    ...state,
    retry: requestPosition,
    setManualLocation,
  };
}
