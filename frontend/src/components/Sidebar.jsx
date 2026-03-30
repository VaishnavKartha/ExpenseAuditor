import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import NotificationPanel from "./NotificationPanel";
import { House, Camera, LogOut, Menu, X } from "lucide-react";

export default function Sidebar() {
  const [activePath, setActivePath] = useState(null);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  useEffect(() => {
    setActivePath(location.pathname);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

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

        {/* User info */}
        <div className="py-4 px-2 border-b border-gray-200 mb-4">
          <p className="hidden md:block text-sm font-semibold text-gray-800 truncate">
            {user?.name || "Employee"}
          </p>
          <p className="hidden md:block text-xs text-gray-400 truncate">
            {user?.email}
          </p>
        </div>

        <ul className="flex flex-col gap-2">
          <li
            className={`${
              activePath === "/" ? "bg-primary text-white" : "hover:bg-gray-100"
            } li-items rounded-full transition-colors`}
            onClick={() => {
              navigate("/");
              setOpen(false);
            }}
          >
            <span>
              <House />
            </span>
            <span className="hidden md:block">Home</span>
          </li>

          <li
            className={`${
              activePath === "/createclaim"
                ? "bg-primary text-white"
                : "hover:bg-gray-100"
            } li-items rounded-full transition-colors`}
            onClick={() => {
              navigate("/createclaim");
              setOpen(false);
            }}
          >
            <span>
              <Camera />
            </span>
            <span className="hidden md:block">Create Claim</span>
          </li>
        </ul>

        <div className="absolute bottom-8 left-0 right-0 px-4 flex flex-col gap-2">
          {/* Notification bell */}
          <div className="flex justify-center md:justify-start">
            <NotificationPanel />
          </div>

          <li
            className="li-items rounded-full hover:bg-red-50 text-red-500 cursor-pointer transition-colors"
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