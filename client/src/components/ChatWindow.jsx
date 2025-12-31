import React, { useEffect, useState, useRef } from 'react';
import socket from '../socket';
import EmojiPicker from 'emoji-picker-react';
import { IoMdSend, IoMdClose } from 'react-icons/io';
import { BsEmojiSmileFill, BsReplyFill } from 'react-icons/bs';

const ChatWindow = ({ roomId, userName, isOpen, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null); 
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen, replyingTo]);

    useEffect(() => {
        const handleReceiveMessage = (data) => {
            setMessages((prev) => [...prev, data]);
        };
        socket.on("receiveMessage", handleReceiveMessage);
        return () => socket.off("receiveMessage", handleReceiveMessage);
    }, []);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (currentMessage.trim() !== "") {
            const messageData = {
                roomId,
                author: userName,
                message: currentMessage,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                replyTo: replyingTo 
            };

            await socket.emit("sendMessage", messageData);
            setMessages((list) => [...list, messageData]);
            
            setCurrentMessage("");
            setReplyingTo(null);
            setShowEmojiPicker(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-24 right-4 w-[95%] md:w-96 h-[65vh] md:h-[550px] z-[2000] flex flex-col font-sans animate-in slide-in-from-bottom-10 duration-300 shadow-2xl rounded-2xl overflow-hidden border border-white/20 bg-white">
            
            {/* Header */}
            <div className="bg-blue-600/95 backdrop-blur-md text-white p-4 flex justify-between items-center shadow-md z-10">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img 
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} 
                            className="w-10 h-10 rounded-full bg-white border-2 border-green-400"
                            alt="avatar"
                        />
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-blue-600 rounded-full"></span>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg leading-tight">Team Chat</h3>
                        <p className="text-xs text-blue-100 opacity-80 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                            Live • {roomId}
                        </p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition text-white/80 hover:text-white">
                    <IoMdClose size={24} />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 bg-slate-50 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3" 
                 style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-70">
                        <BsEmojiSmileFill className="text-5xl mb-3 text-blue-200" />
                        <p className="text-sm font-medium">No messages yet.</p>
                        <p className="text-xs">Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.author === userName;
                        return (
                            <div key={index} className={`flex w-full group ${isMe ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                    
                                    {!isMe && <span className="text-[10px] text-gray-500 ml-1 mb-0.5 font-bold">{msg.author}</span>}
                                    
                                    <div className={`relative px-4 py-2 text-sm shadow-sm transition-all hover:shadow-md ${
                                        isMe 
                                        ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-2xl rounded-tr-none" 
                                        : "bg-white text-gray-800 rounded-2xl rounded-tl-none border border-gray-100"
                                    }`}>
                                        
                                        <button 
                                            onClick={() => setReplyingTo(msg)}
                                            className={`absolute top-2 ${isMe ? '-left-8 text-blue-500' : '-right-8 text-gray-400'} opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:scale-110`}
                                            title="Reply"
                                        >
                                            <BsReplyFill size={20} />
                                        </button>

                                        {msg.replyTo && (
                                            <div className={`mb-2 p-2 rounded-lg text-xs border-l-4 ${
                                                isMe ? "bg-white/20 border-white/50 text-white" : "bg-gray-100 border-blue-500 text-gray-600"
                                            }`}>
                                                <p className="font-bold opacity-80">{msg.replyTo.author}</p>
                                                <p className="truncate opacity-70 line-clamp-1">{msg.replyTo.message}</p>
                                            </div>
                                        )}

                                        <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                                        
                                        <div className={`text-[9px] mt-1 text-right font-medium ${isMe ? "text-blue-100" : "text-gray-400"}`}>
                                            {msg.time}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white p-2 rounded-b-2xl shadow-[0_-5px_15px_rgba(0,0,0,0.05)] relative z-20">
                
                {replyingTo && (
                    <div className="flex justify-between items-center bg-gray-50 p-2 mb-2 rounded-lg border-l-4 border-blue-500 animate-in slide-in-from-bottom-2 mx-1">
                        <div className="text-xs overflow-hidden">
                            <span className="font-bold text-blue-600">Replying to {replyingTo.author}</span>
                            <p className="text-gray-500 truncate max-w-[200px]">{replyingTo.message}</p>
                        </div>
                        <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-200 transition">
                            <IoMdClose size={16} />
                        </button>
                    </div>
                )}

                {showEmojiPicker && (
                    <div className="absolute bottom-16 left-2 z-50 shadow-2xl rounded-xl overflow-hidden border border-gray-100">
                        <EmojiPicker 
                            onEmojiClick={(emojiObject) => setCurrentMessage((prev) => prev + emojiObject.emoji)}
                            width={300}
                            height={350}
                            previewConfig={{ showPreview: false }}
                        />
                    </div>
                )}

                <form onSubmit={sendMessage} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-full border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    
                    <button 
                        type="button" 
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="text-gray-400 hover:text-yellow-500 transition hover:bg-yellow-50 rounded-full p-1.5"
                    >
                        <BsEmojiSmileFill size={20} />
                    </button>

                    <input
                        type="text"
                        value={currentMessage}
                        onChange={(event) => setCurrentMessage(event.target.value)}
                        placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
                        className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400"
                    />

                    <button 
                        type="submit" 
                        disabled={!currentMessage.trim()}
                        className={`p-2 rounded-full transition-all duration-200 flex items-center justify-center ${
                            currentMessage.trim() 
                            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md transform active:scale-95" 
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                    >
                        <IoMdSend size={18} className={currentMessage.trim() ? "ml-0.5" : ""} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatWindow;