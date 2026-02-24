/**
 * ╔════════════════════════════════════════════════════════════╗
 * ║  PAGE — ChatPage                                          ║
 * ║                                                           ║
 * ║  MIGRACIÓN:                                               ║
 * ║  Reemplaza: src/pages/chat/Chat.jsx (3200+ líneas)        ║
 * ║  Ahora: ~40 líneas, solo composición de features.         ║
 * ║                                                           ║
 * ║  REGLA: las pages NO contienen lógica de negocio.         ║
 * ║  Solo importan features y las componen.                   ║
 * ╚════════════════════════════════════════════════════════════╝
 */

import React, { useState } from "react";
import { ChatShell, TemplateModal } from "../features/chat";

// TODO: Cuando se migre el sidebar, importar desde features/chat
// import { ConversationSidebar } from "../features/chat";

export default function ChatPage() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar de conversaciones */}
      {/* 
        TODO: Migrar Sidebar.jsx → features/chat/components/ConversationSidebar
        <ConversationSidebar 
          onSelect={setSelectedChat}
          selected={selectedChat}
        />
      */}
      <div className="w-80 border-r border-slate-200 bg-white flex-shrink-0">
        {/* Placeholder — insertar sidebar migrado aquí */}
        <div className="p-4 text-center text-slate-400">
          Sidebar de conversaciones
        </div>
      </div>

      {/* Chat principal */}
      <ChatShell
        chat={selectedChat}
        onBack={() => setSelectedChat(null)}
        onOpenTemplates={() => setShowTemplateModal(true)}
      />

      {/* Modal de plantillas */}
      <TemplateModal
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        selectedChat={selectedChat}
      />
    </div>
  );
}
