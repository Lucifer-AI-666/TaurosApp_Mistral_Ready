import React, { useState } from "react";
import ChatWindow from "./ChatWindow";
import ChatInput from "./ChatInput";
import "../styles/chat.css";

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { id: 1, author: "system", text: "Benvenuto in TaurosChat!", time: Date.now() },
  ]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const newMsg = { id: Date.now(), author: "you", text, time: Date.now() };
    setMessages((m) => [...m, newMsg]);

    // Placeholder: invia al backend e aggiungi risposta
    // const res = await fetch(`${process.env.REACT_APP_TAUROS_API_URL}/chat`, { method: "POST", body: JSON.stringify({ text }) });
    // const data = await res.json();
    // setMessages((m) => [...m, { id: Date.now()+1, author: "bot", text: data.reply, time: Date.now() }]);

    // Dry-run: simulazione risposta
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        { id: Date.now() + 1, author: "bot", text: "Risposta simulata da Tauros.", time: Date.now() },
      ]);
    }, 700);
  };

  return (
    <div className="tauros-chat-root">
      <aside className="tauros-sidebar">
        <div className="tauros-brand">TaurosApp</div>
        <nav className="tauros-nav">
          <button className="active">Chat</button>
          <button>Impostazioni</button>
        </nav>
      </aside>

      <main className="tauros-main">
        <header className="tauros-header">
          <h2>Chat</h2>
        </header>

        <ChatWindow messages={messages} />

        <ChatInput onSend={sendMessage} />
      </main>
    </div>
  );
}