import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getConversations, getMessages, sendMessage } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { PaperPlaneTilt, ChatCircle } from 'phosphor-react';
import { toast } from 'sonner';
import SiteHeader from '@/components/SiteHeader';

export default function Messages() {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConv) {
      fetchMessages(selectedConv.conversation_id);
      const interval = setInterval(() => fetchMessages(selectedConv.conversation_id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const response = await getConversations();
      setConversations(response.data);
      if (response.data.length > 0) setSelectedConv(response.data[0]);
    } catch (error) {
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId) => {
    try {
      const response = await getMessages(convId);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await sendMessage({ conversation_id: selectedConv.conversation_id, content: newMessage });
      setNewMessage('');
      fetchMessages(selectedConv.conversation_id);
      fetchConversations();
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C]">
      <SiteHeader
        links={[
          { to: '/dashboard', label: 'Dashboard', testId: 'dashboard-link' },
          { label: 'Logout', onClick: logout, testId: 'logout-button' }
        ]}
      />

      <div className="pt-24 md:pt-28 h-screen flex">
        <div className="w-1/3 border-r border-[#27272A] overflow-y-auto" data-testid="conversations-list">
          <div className="p-8">
            <h2 className="text-3xl font-playfair text-[#F2F0ED] mb-8">Messages</h2>
            {loading ? (
              <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="shimmer h-20"></div>)}</div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12" data-testid="no-conversations">
                <ChatCircle size={48} weight="thin" className="text-[#52525B] mx-auto mb-4" />
                <p className="text-[#A1A1AA]">No conversations yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {conversations.map((conv, index) => {
                  const otherPerson = user?.role === 'client' ? conv.provider : conv.client;
                  return (
                    <button key={conv.conversation_id} onClick={() => setSelectedConv(conv)} className={`w-full text-left p-4 border transition-all ${ selectedConv?.conversation_id === conv.conversation_id ? 'border-[#C6A87C] bg-[#C6A87C]/10' : 'border-[#27272A] hover:border-[#C6A87C]' }`} data-testid={`conversation-${index}`}>
                      <div className="flex items-center gap-4">
                        <img src={otherPerson?.picture || otherPerson?.photos?.[0] || 'https://via.placeholder.com/50'} alt={otherPerson?.name || otherPerson?.display_name} className="w-12 h-12 rounded-full object-cover" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[#F2F0ED] font-medium truncate">{otherPerson?.name || otherPerson?.display_name}</p>
                            {conv.unread_count > 0 && <span className="bg-[#C6A87C] text-[#0A0A0C] text-xs px-2 py-1 rounded-full font-medium">{conv.unread_count}</span>}
                          </div>
                          <p className="text-[#A1A1AA] text-sm truncate">{conv.last_message || 'No messages yet'}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col" data-testid="messages-panel">
          {selectedConv ? (
            <>
              <div className="p-8 border-b border-[#27272A]">
                <div className="flex items-center gap-4">
                  {(() => {
                    const otherPerson = user?.role === 'client' ? selectedConv.provider : selectedConv.client;
                    return (
                      <>
                        <img src={otherPerson?.picture || otherPerson?.photos?.[0] || 'https://via.placeholder.com/60'} alt={otherPerson?.name || otherPerson?.display_name} className="w-14 h-14 rounded-full object-cover" />
                        <h3 className="text-2xl font-playfair text-[#F2F0ED]">{otherPerson?.name || otherPerson?.display_name}</h3>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-4" data-testid="messages-container">
                {messages.map((msg, index) => (
                  <motion.div key={msg.message_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.sender_id === user?.user_id ? 'justify-end' : 'justify-start'}`} data-testid={`message-${index}`}>
                    <div className={`message-bubble ${msg.sender_id === user?.user_id ? 'sent' : 'received'}`}>
                      <p>{msg.content}</p>
                      <p className="text-xs opacity-60 mt-2">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-8 border-t border-[#27272A]">
                <div className="flex gap-4">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type your message..." className="input-premium flex-1" data-testid="message-input" />
                  <button type="submit" className="btn-primary" data-testid="send-button">
                    <PaperPlaneTilt size={20} weight="fill" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[#A1A1AA]">Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
