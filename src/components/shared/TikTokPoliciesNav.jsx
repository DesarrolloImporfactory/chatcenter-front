import React from "react";
import { Link } from "react-router-dom";
import "./TikTokPoliciesNav.css";

const TikTokPoliciesNav = ({ className = "", style = {} }) => {
  return (
    <div className={`tiktok-policies-nav ${className}`} style={style}>
      <div className="tiktok-policies-links">
        <Link
          to="/politicas-tiktok"
          className="tiktok-policy-link"
          title="Ver todas las políticas para TikTok"
        >
          📱 Políticas TikTok
        </Link>
        <Link
          to="/politica-privacidad-tiktok"
          className="tiktok-policy-link"
          title="Política de Privacidad específica para TikTok"
        >
          🔒 Privacidad TikTok
        </Link>
        <Link
          to="/terminos-servicio-tiktok"
          className="tiktok-policy-link"
          title="Términos de Servicio específicos para TikTok"
        >
          📋 Términos TikTok
        </Link>
      </div>
    </div>
  );
};

export default TikTokPoliciesNav;
