import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  FileText,
  LogOut,
  Menu,
  X,
  Shield,
} from "lucide-react";

export default function AdminSidebar() {
  const [activePath, setActivePath] = useState(null);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    setActivePath(location.pathname);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { path: "/admin", label: "Dashboard", icon: <LayoutDashboard /> },
    { path: "/admin/policies", label: "Policies", icon: <FileText /> },
  ];

  return (
    <>
      <span
        onClick={() => setOpen(!open)}
        className="sm:hidden cursor-pointer absolute bg-white z-10 p-2"
      >
        <Menu />
      </span>

      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-10 sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`sm:block lg:mr-4 absolute bg-white max-md:z-10 sm:relative px-4 h-screen w-16 md:w-56 shadow-[4px_0_6px_-1px_rgba(0,0,0,0.1)] transition-transform ${
          open ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        }`}
      >
        <span
          onClick={() => setOpen(!open)}
          className="sm:hidden cursor-pointer"
        >
          <X />
        </span>

        <div className="flex items-center gap-2 py-6 px-2 border-b border-gray-200 mb-4">
          <Shield className="text-primary" size={24} />
          <span className="hidden md:block font-bold text-primary text-lg">
            Admin Panel
          </span>
        </div>

        <ul className="h-[calc(100%-180px)] flex flex-col gap-2">
          {navItems.map((item) => (
            <li
              key={item.path}
              className={`${
                activePath === item.path ? "bg-primary text-white" : "hover:bg-gray-100"
              } li-items rounded-xl transition-colors`}
              onClick={() => {
                navigate(item.path);
                setOpen(false);
              }}
            >
              <span>{item.icon}</span>
              <span className="hidden md:block">{item.label}</span>
            </li>
          ))}
        </ul>

        <div className="absolute bottom-8 left-0 right-0 px-4">
          <li
            className="li-items rounded-xl hover:bg-red-50 text-red-500 cursor-pointer"
            onClick={handleLogout}
          >
            <span>
              <LogOut />
            </span>
            <span className="hidden md:block">Logout</span>
          </li>
        </div>
      </div>
    </>
  );
}
