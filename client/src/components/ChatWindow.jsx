import React, { useState, useEffect, useRef } from 'react';
import socket from '../socket';

const ChatWindow = ({ roomId, userName, isOpen, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [currentMsg, setCurrentMsg] = useState("");
    const messagesEndRef = useRef(null);

    useEffect(() => {
        socket.on("receiveMessage", (data) => {
            setMessages((prev) => [...prev, data]);
        });
        return () => socket.off("receiveMessage");
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (currentMsg.trim() !== "") {
            const msgData = {
                roomId,
                author: userName,
                message: currentMsg,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            socket.emit("sendMessage", msgData);
            setMessages((prev) => [...prev, msgData]); // Add locally instantly
            setCurrentMsg("");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-20 right-4 w-80 h-96 bg-white rounded-lg shadow-2xl flex flex-col border border-gray-200 z-[1001]">
            {/* Header */}
            <div className="bg-blue-600 text-white p-3 rounded-t-lg flex justify-between items-center">
                <h3 className="font-bold">Group Chat</h3>
                <button onClick={onClose} className="text-xl">&times;</button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.author === userName ? "items-end" : "items-start"}`}>
                        <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                            msg.author === userName ? "bg-blue-500 text-white rounded-br-none" : "bg-gray-200 text-gray-800 rounded-bl-none"
                        }`}>
                            <p className="font-bold text-xs opacity-75 mb-1">{msg.author}</p>
                            <p>{msg.message}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1">{msg.time}</span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Footer */}
            <form onSubmit={sendMessage} className="p-3 border-t flex gap-2">
                <input
                    type="text"
                    value={currentMsg}
                    onChange={(e) => setCurrentMsg(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Send</button>
            </form>
        </div>
    );
};

export default ChatWindow;