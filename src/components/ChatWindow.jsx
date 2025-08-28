import React, { useEffect, useRef } from "react";

export default function ChatWindow({ messages = [] }) {
  const endRef = useRef(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  return (
    <div className="chat-window">
      {messages.map((m) => (
        <div key={m.id} className={`chat-msg ${m.author === "you" ? "out" : m.author === "bot" ? "in" : "sys"}`}>
          <div className="msg-content">{m.text}</div>
          <div className="msg-time">{new Date(m.time).toLocaleTimeString()}</div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}