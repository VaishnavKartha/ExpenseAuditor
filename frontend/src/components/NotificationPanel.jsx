import React, { useEffect, useState } from "react";
import api from "../utils/api";
import {
  Bell,
  X,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Check,
} from "lucide-react";

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications/");
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getIcon = (type) => {
    switch (type) {
      case "approved":
        return <ShieldCheck size={16} className="text-green-500" />;
      case "flagged":
        return <AlertTriangle size={16} className="text-yellow-500" />;
      case "rejected":
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <Bell size={16} className="text-blue-500" />;
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now - date) / 1000;

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <div className="notification-wrapper">
      <button
        onClick={() => setOpen(!open)}
        className="notification-bell"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount}</span>
        )}
      </button>

      {open && (
        <>
          <div
            className="notification-overlay"
            onClick={() => setOpen(false)}
          />
          <div className="notification-panel">
            <div className="notification-header">
              <h3>Notifications</h3>
              <button onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="notification-list">
              {loading ? (
                <div className="notification-loading">
                  <RefreshCw size={20} className="spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="notification-empty">
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif._id}
                    className={`notification-item ${
                      !notif.is_read ? "unread" : ""
                    }`}
                  >
                    <div className="notification-icon">{getIcon(notif.type)}</div>
                    <div className="notification-content">
                      <p className="notification-message">{notif.message}</p>
                      <span className="notification-time">
                        {formatTime(notif.created_at)}
                      </span>
                    </div>
                    {!notif.is_read && (
                      <button
                        onClick={() => markAsRead(notif._id)}
                        className="notification-read-btn"
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
