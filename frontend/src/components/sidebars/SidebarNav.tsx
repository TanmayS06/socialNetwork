import { NavLink } from "react-router-dom";
import { Home, Search, Heart, User, Plus } from "lucide-react";
import { Button } from "../ui/button";

const menuItems = [
  { label: "Home", icon: Home, to: "/" },
  { label: "Search", icon: Search, to: "/search" },
  { label: "Follow", icon: Heart, to: "/follow" },
  { label: "Profile", icon: User, to: "/profile" },
];

export function SidebarNav({ onCreatePost }: { onCreatePost: () => void }) {
  return (
    <nav className="space-y-1">
      {menuItems.map((item) => (
        <NavLink
          key={item.label}
          to={item.to}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium transition
              ${
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`
          }
        >
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </NavLink>
      ))}

      <Button
        onClick={onCreatePost}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/20 hover:from-violet-500 hover:to-indigo-500 transition-all active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" />
        Create Post
      </Button>
    </nav>
  );
}
