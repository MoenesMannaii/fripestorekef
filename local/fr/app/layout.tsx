import "./globals.css";
import LayoutClient from "./layoutClient";
import localFont from 'next/font/local';
import { AuthProvider } from '../lib/contexts/AuthContext';

const roboto = localFont({
  src: '../assets/fonts/roboto.ttf',
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata = {
  title: "ÆVE - Logiciel Point de Vente",
  description: "Point of Sale software ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={roboto.variable}>
      <body className="antialiased" style={{ fontFamily: 'var(--font-roboto)' }}>
        <AuthProvider>
          <LayoutClient>{children}</LayoutClient>
        </AuthProvider>
      </body>
    </html>
  );
}
