import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { BookOpen, PenTool, BarChart3, BookMarked, LogOut, Home } from 'lucide-react';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/articles', label: '素材库', icon: BookOpen },
  { path: '/stats', label: '统计', icon: BarChart3 },
  { path: '/vocabulary', label: '生词本', icon: BookMarked },
];

export function Navbar() {
  const location = useLocation();
  const { owner, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <Link to="/" className="mr-6 flex items-center space-x-2">
          <PenTool className="h-5 w-5" />
          <span className="font-bold">English Tracker</span>
        </Link>

        <nav className="flex items-center space-x-1 flex-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link key={path} to={path}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-1.5"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">@{owner}</span>
          <Button variant="ghost" size="icon" onClick={logout} title="退出登录">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
