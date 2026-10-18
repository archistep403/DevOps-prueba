import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
  async function fetchData() {
    const data = await fetchSomething();
  }
  fetchData();
}, []);
  return null;
}
