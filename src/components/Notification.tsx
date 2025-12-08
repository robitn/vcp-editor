import React, { useEffect } from "react";
import "./Notification.css";

export type NotificationType = "error" | "warning" | "success" | "info";

interface NotificationProps {
  message: string;
  type: NotificationType;
  onClose: () => void;
  duration?: number; // Auto-close after this many milliseconds (0 = manual close only)
}

const Notification: React.FC<NotificationProps> = ({ 
  message, 
  type, 
  onClose, 
  duration = 5000 
}) => {
  const [isClosing, setIsClosing] = React.useState(false);

  const handleClose = () => {
    setIsClosing(true);
    // Wait for animation to complete before calling onClose
    setTimeout(() => {
      onClose();
    }, 1000); // Match fadeOut animation duration
  };

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(handleClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const getIcon = () => {
    switch (type) {
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      case "success":
        return "✓";
      case "info":
        return "ℹ";
    }
  };

  return (
    <div className={`notification notification-${type} ${isClosing ? 'closing' : ''}`}>
      <div className="notification-icon">{getIcon()}</div>
      <div className="notification-message">{message}</div>
      <button className="notification-close" onClick={handleClose}>
        ✕
      </button>
    </div>
  );
};

export default Notification;
