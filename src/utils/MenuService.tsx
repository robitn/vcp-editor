import React, { useState, useRef, useEffect } from 'react';
import './Menu.css';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  separator?: boolean;
  onClick?: () => void;
}

export interface MenuProps {
  position?: { x: number; y: number };
  anchor?: HTMLElement;
  type?: 'context' | 'dropdown';
  alignment?: 'left' | 'right';
  onClose?: () => void;
  className?: string;
  items?: MenuItem[]; // Optional, can come from menuState
}

export interface MenuState {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  anchor: HTMLElement | null;
  items: MenuItem[];
  alignment?: 'left' | 'right';
}

/**
 * Centralized menu utility for consistent menu behavior across the app
 */
export class MenuService {
  private static instance: MenuService;
  private listeners: ((state: MenuState) => void)[] = [];
  private state: MenuState = {
    isOpen: false,
    position: null,
    anchor: null,
    items: [],
    alignment: 'left',
  };

  static getInstance(): MenuService {
    if (!MenuService.instance) {
      MenuService.instance = new MenuService();
    }
    return MenuService.instance;
  }

  private constructor() {
    // Singleton
  }

  subscribe(listener: (state: MenuState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  showContextMenu(items: MenuItem[], position: { x: number; y: number }) {
    this.state = {
      isOpen: true,
      position,
      anchor: null,
      items,
      alignment: 'left',
    };
    this.notify();
    return items;
  }

  showDropdownMenu(items: MenuItem[], anchor: HTMLElement, alignment: 'left' | 'right' = 'left') {
    const rect = anchor.getBoundingClientRect();
    this.state = {
      isOpen: true,
      position: {
        x: alignment === 'right' ? rect.right : rect.left,
        y: rect.bottom + 4,
      },
      anchor,
      items,
      alignment,
    };
    this.notify();
    return items;
  }

  hideMenu() {
    this.state = {
      isOpen: false,
      position: null,
      anchor: null,
      items: [],
      alignment: 'left',
    };
    this.notify();
  }

  getState(): MenuState {
    return this.state;
  }
}

/**
 * React component for rendering menus
 */
export const Menu: React.FC<MenuProps> = ({
  items = [],
  position,
  anchor: _anchor,
  type = 'context',
  alignment = 'left',
  onClose,
  className = '',
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    // Use setTimeout to ensure this runs after the current event cycle
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [position, onClose]);

  if (!position) return null;

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    top: position.y,
    zIndex: 10000,
  };

  // Set horizontal positioning based on alignment
  if (alignment === 'right' && type === 'dropdown') {
    // For right alignment, position the menu so its right edge aligns with position.x
    const rightOffset = window.innerWidth - position.x;
    menuStyle.right = `${rightOffset}px`;
  } else {
    // For left alignment (default), position the menu so its left edge aligns with position.x
    menuStyle.left = `${position.x}px`;
  }

  // Adjust position if menu would go off-screen
  if (menuRef.current) {
    const rect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // For right-aligned dropdowns, adjust if it goes off the left edge
    if (alignment === 'right' && type === 'dropdown') {
      if (rect.left < 10) {
        menuStyle.right = 'auto';
        menuStyle.left = '10px';
      }
    } else {
      // For left-aligned menus, adjust if it goes off the right edge
      if (rect.right > viewportWidth - 10) {
        menuStyle.left = `${viewportWidth - rect.width - 10}px`;
      }
    }
    
    // Adjust vertical position if needed
    if (rect.bottom > viewportHeight - 10) {
      menuStyle.top = `${viewportHeight - rect.height - 10}px`;
    }
  }

  return (
    <div
      ref={menuRef}
      className={`menu menu-${type} ${alignment === 'right' ? 'menu-align-right' : ''} ${className}`}
      style={menuStyle}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, index) => (
        item.separator ? (
          <div key={`separator-${index}`} className="menu-separator" />
        ) : (
          <button
            key={item.id}
            className="menu-item"
            disabled={item.disabled}
            onClick={() => {
              if (!item.disabled && item.onClick) {
                item.onClick();
                onClose?.();
              }
            }}
          >
            {item.icon && <span className="menu-item-icon">{item.icon}</span>}
            <span className="menu-item-label">{item.label}</span>
          </button>
        )
      ))}
    </div>
  );
};

/**
 * Hook for using the menu service in components
 */
export const useMenu = () => {
  const [menuState, setMenuState] = useState<MenuState>(MenuService.getInstance().getState());

  useEffect(() => {
    const unsubscribe = MenuService.getInstance().subscribe(setMenuState);
    return unsubscribe;
  }, []);

  return {
    menuState,
    showContextMenu: (items: MenuItem[], position: { x: number; y: number }) =>
      MenuService.getInstance().showContextMenu(items, position),
    showDropdownMenu: (items: MenuItem[], anchor: HTMLElement, alignment: 'left' | 'right' = 'left') =>
      MenuService.getInstance().showDropdownMenu(items, anchor, alignment),
    hideMenu: () => MenuService.getInstance().hideMenu(),
  };
};

/**
 * Higher-order component for menu rendering
 */
export const withMenu = <P extends object>(
  Component: React.ComponentType<P>,
  getMenuItems: (props: P) => MenuItem[]
) => {
  return (props: P) => {
    const { menuState, hideMenu } = useMenu();
    const menuItems = getMenuItems(props);

    return (
      <>
        <Component {...props} />
        {menuState.isOpen && menuState.position && (
          <Menu
            items={menuItems}
            position={menuState.position}
            type={menuState.anchor ? 'dropdown' : 'context'}
            alignment={menuState.alignment}
            onClose={hideMenu}
          />
        )}
      </>
    );
  };
};