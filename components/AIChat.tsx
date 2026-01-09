import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { chatWithCurriculum } from '../services/gemini';
import { Send, Bot, User, X } from 'lucide-react';
import { GenerateContentResponse } from '@google/genai';

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIChat: React.FC<AIChatProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Hola! Soc el teu assistent curricular. Com et puc ajudar avui amb la planificació?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const history = messages.map(m => ({role: m.role, text: m.text}));
    
    try {
      const stream = await chatWithCurriculum(userMsg.text, history);
      
      let fullResponse = '';
      const botMsgId = (Date.now() + 1).toString();
      
      setMessages(prev => [...prev, { id: botMsgId, role: 'model', text: '', isLoading: true }]);

      for await (const chunk of stream) {
          const c = chunk as GenerateContentResponse;
          const text = c.text;
          if (text) {
              fullResponse += text;
              setMessages(prev => 
                  prev.map(msg => 
                      msg.id === botMsgId 
                      ? { ...msg, text: fullResponse, isLoading: false } 
                      : msg
                  )
              );
          }
      }

    } catch (error) {
      console.error("Chat error", error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Ho sento, hi ha hagut un error connectant amb Gemini." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col border border-gray-200 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-t-2xl flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
                <div className="bg-white/20 p-1.5 rounded-full">
                    <Bot size={18} />
                </div>
                <span className="font-medium">Assistent Curricular</span>
            </div>
            <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition-colors">
                <X size={18} />
            </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                    }`}>
                        {msg.text}
                        {msg.isLoading && <span className="inline-block w-1.5 h-4 ml-1 bg-blue-400 animate-pulse align-middle"></span>}
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t bg-white rounded-b-2xl">
            <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex gap-2"
            >
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Pregunta sobre el currículum..."
                    className="flex-1 px-3 py-2 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <button 
                    type="submit" 
                    disabled={!input.trim() || isLoading}
                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    </div>
  );
};