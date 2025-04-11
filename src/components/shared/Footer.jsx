import React from "react";
import "./styles/footer.css";

export const Footer = () => {
  return (
    <footer className="text-center text-gray-500 text-sm py-4">
    Desarrollado por{" "}
    <a
      href="https://new.imporsuitpro.com"
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-500 hover:underline"
    >
      Imporsuit
    </a>{" "}
    © {new Date().getFullYear()}
  </footer>
    
  );
};
