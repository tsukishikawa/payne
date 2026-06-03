// frontend/src/hooks/useSpaceWeather.js
import { useState, useEffect } from "react";

export function useSpaceWeather() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_data = async () => {
      const resp = await fetch("http://localhost:8000/v1/status");
      const json = await resp.json();
      setData(json);
      setLoading(false);
    };

    fetch_data();
    const interval = setInterval(fetch_data, 60000); // atualiza todo minuto
    return () => clearInterval(interval);
  }, []);

  return { data, loading };
}