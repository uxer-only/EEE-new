import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ChatCircle, MapPin } from 'phosphor-react';
import SiteHeader from '@/components/SiteHeader';

export default function ClientDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#0A0A0C]">
      <SiteHeader />

      <div className="pt-32 pb-20 section-padding">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <h2 className="text-5xl text-[#F2F0ED] mb-4" data-testid="welcome-message">
 Welcome back, {user?.name}
 </h2>
            <p className="text-[#A1A1AA] text-lg">Discover verified providers and manage your conversations</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            <Link to="/browse" className="card-premium p-8 hover:border-[#7A2357] transition-all group" data-testid="quick-action-browse">
              <MapPin size={32} weight="thin" className="text-[#7A2357] mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl text-[#F2F0ED] mb-2">Discover</h3>
              <p className="text-[#A1A1AA] text-sm">Browse verified providers</p>
            </Link>
            <Link to="/messages" className="card-premium p-8 hover:border-[#7A2357] transition-all group" data-testid="quick-action-messages">
              <ChatCircle size={32} weight="thin" className="text-[#7A2357] mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl text-[#F2F0ED] mb-2">Messages</h3>
              <p className="text-[#A1A1AA] text-sm">Your conversations</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
