import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Toast from './Toast';

export default function SiteLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
      <Toast />
    </>
  );
}
