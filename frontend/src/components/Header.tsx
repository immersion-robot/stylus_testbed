import { Link, useLocation } from 'react-router-dom';
import { useMetaMask } from '@/hooks/useMetaMask';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut } from 'lucide-react';

export function Header() {
  const location = useLocation();
  const { isConnected, account, connect, disconnect, formatAddress } = useMetaMask();

  const navItems = [
    { label: 'HOME', path: '/' },
    { label: 'CREATE', path: '/create' },
    { label: 'LIBRARY', path: '/library' },
    { label: 'RESERVATIONS', path: '/reservations' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="font-display text-xl font-bold tracking-wider">
            ROBOAD
          </Link>

          <div className="flex items-center gap-8">
            <nav className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${location.pathname === item.path ? 'nav-link-active' : ''}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {isConnected && account ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground font-mono">
                  {formatAddress(account)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={disconnect}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={connect} className="btn-hero">
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
