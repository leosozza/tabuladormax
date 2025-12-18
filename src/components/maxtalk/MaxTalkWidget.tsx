import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Minus, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMaxTalkConversations } from '@/hooks/useMaxTalkConversations';
import { useMaxTalkMessages } from '@/hooks/useMaxTalkMessages';
import MaxTalkCompact from './MaxTalkCompact';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

const STORAGE_KEYS = {
  open: 'maxtalk_widget_open',
  position: 'maxtalk_widget_position',
  size: 'maxtalk_widget_size',
  minimized: 'maxtalk_widget_minimized',
};

const DEFAULT_SIZE = { width: 420, height: 520 };
const MIN_SIZE = { width: 320, height: 380 };
const FAB_SIZE = 56;

export default function MaxTalkWidget() {
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.open);
    return stored === 'true';
  });
  
  const [isMinimized, setIsMinimized] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.minimized);
    return stored === 'true';
  });
  
  const [position, setPosition] = useState<Position>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.position);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { x: window.innerWidth - DEFAULT_SIZE.width - 20, y: window.innerHeight - DEFAULT_SIZE.height - 20 };
      }
    }
    return { x: window.innerWidth - DEFAULT_SIZE.width - 20, y: window.innerHeight - DEFAULT_SIZE.height - 20 };
  });
  
  const [size, setSize] = useState<Size>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.size);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_SIZE;
      }
    }
    return DEFAULT_SIZE;
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasNewMessage, setHasNewMessage] = useState(false);
  
  const widgetRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  const { conversations, createPrivateConversation, createGroupConversation, markAsRead } = useMaxTalkConversations();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  
  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;
  const { messages, loading: messagesLoading, sendMessage, sendMediaMessage, deleteMessage } = useMaxTalkMessages(selectedConversationId);

  // Calculate total unread
  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  // Persist state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.open, String(isOpen));
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.minimized, String(isMinimized));
  }, [isMinimized]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.position, JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.size, JSON.stringify(size));
  }, [size]);

  // New message animation
  useEffect(() => {
    if (totalUnread > 0 && !isOpen) {
      setHasNewMessage(true);
      const timer = setTimeout(() => setHasNewMessage(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [totalUnread, isOpen]);

  // Constrain position to viewport
  const constrainPosition = useCallback((pos: Position, currentSize: Size = size): Position => {
    const maxX = window.innerWidth - currentSize.width;
    const maxY = window.innerHeight - currentSize.height;
    return {
      x: Math.max(0, Math.min(pos.x, maxX)),
      y: Math.max(0, Math.min(pos.y, maxY)),
    };
  }, [size]);

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = widgetRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newPos = constrainPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
      setPosition(newPos);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, constrainPosition]);

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  // Handle resize move
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(MIN_SIZE.width, Math.min(e.clientX - position.x, window.innerWidth - position.x));
      const newHeight = Math.max(MIN_SIZE.height, Math.min(e.clientY - position.y, window.innerHeight - position.y));
      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, position]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => constrainPosition(prev));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [constrainPosition]);

  const handleToggle = () => {
    if (!isOpen) {
      // Opening - reset position if off screen
      setPosition(constrainPosition(position));
    }
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    markAsRead(id);
  };

  const handleSendMessage = async (content: string) => {
    return sendMessage(content);
  };

  const handleNewChat = async () => {
    // For now, this could open a modal or be implemented later
    console.log('New chat clicked');
  };

  // FAB when closed
  if (!isOpen) {
    return (
      <Button
        ref={fabRef}
        onClick={handleToggle}
        className={cn(
          "fixed z-50 rounded-full shadow-lg transition-all duration-300",
          "bg-primary hover:bg-primary/90 text-primary-foreground",
          "flex items-center justify-center",
          hasNewMessage && "animate-pulse ring-2 ring-primary/50 ring-offset-2"
        )}
        style={{
          width: FAB_SIZE,
          height: FAB_SIZE,
          right: 20,
          bottom: 20,
        }}
      >
        <MessageCircle className="h-6 w-6" />
        {totalUnread > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-xs px-1"
          >
            {totalUnread > 99 ? '99+' : totalUnread}
          </Badge>
        )}
      </Button>
    );
  }

  // Expanded widget
  return (
    <div
      ref={widgetRef}
      className={cn(
        "fixed z-50 bg-background border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden",
        "transition-shadow duration-200",
        isDragging && "shadow-xl cursor-grabbing",
        isResizing && "select-none"
      )}
      style={{
        left: position.x,
        top: position.y,
        width: isMinimized ? 280 : size.width,
        height: isMinimized ? 48 : size.height,
      }}
    >
      {/* Header - Draggable */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border cursor-grab",
          isDragging && "cursor-grabbing"
        )}
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">MaxTalk</span>
          {totalUnread > 0 && (
            <Badge variant="destructive" className="h-5 text-xs px-1.5">
              {totalUnread}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 no-drag">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleMinimize}
          >
            {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
            onClick={handleClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 overflow-hidden">
          <MaxTalkCompact
            conversations={conversations}
            selectedConversation={selectedConversation}
            messages={messages}
            messagesLoading={messagesLoading}
            onSelectConversation={handleSelectConversation}
            onSendMessage={handleSendMessage}
            onNewChat={handleNewChat}
          />
        </div>
      )}

      {/* Resize handle */}
      {!isMinimized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize no-drag"
          onMouseDown={handleResizeStart}
        >
          <svg
            className="w-4 h-4 text-muted-foreground/50"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
          </svg>
        </div>
      )}
    </div>
  );
}
