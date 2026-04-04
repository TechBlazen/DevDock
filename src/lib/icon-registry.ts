import {
  LayoutDashboard, GitFork, GitBranch, Cpu, Activity,
  Settings, Layers, Hammer, Puzzle, FileText, Network, Users,
  Wrench, Braces, Send, Search, User, MessageSquare,
  Globe, Wifi, FileSearch, ShieldCheck, LayoutList,
  Cable, Waypoints, FileDiff, Binary, Regex,
  Table, GitMerge, Container, BarChart3,
  Circle, ExternalLink, Link, Code, Bot, Database,
  Terminal, BookOpen, Bookmark, Folder, Home, Star,
  Zap, Cloud, Shield, Lock, Bell, Mail,
  Calendar, Clock, Map, Tag, Heart, Flag,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, GitFork, GitBranch, Cpu, Activity,
  Settings, Layers, Hammer, Puzzle, FileText, Network, Users,
  Wrench, Braces, Send, Search, User, MessageSquare,
  Globe, Wifi, FileSearch, ShieldCheck, LayoutList,
  Cable, Waypoints, FileDiff, Binary, Regex,
  Table, GitMerge, Container, BarChart3,
  ExternalLink, Link, Code, Bot, Database,
  Terminal, BookOpen, Bookmark, Folder, Home, Star,
  Zap, Cloud, Shield, Lock, Bell, Mail,
  Calendar, Clock, Map, Tag, Heart, Flag,
  Circle,
};

export const getIcon = (name: string): LucideIcon => ICON_MAP[name] ?? Circle;

export const iconNames = Object.keys(ICON_MAP).filter((n) => n !== 'Circle').sort();
